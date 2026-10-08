#!/usr/bin/env python3
"""
test_bot_sync.py
================
Automated verification suite for:
TASK: FIX BOT REGISTRATION FLOW & REMOVE HARDCODED GROUPS
- Mandatory role selection on /start (Student vs Teacher)
- No groups in database -> halts with exact warning text:
  "There is no available group right now. Please talk with your teacher to create your class group first."
- Teacher path -> teacher guidance & dashboard link, no student DB record created
- Student path with active groups -> dynamic group buttons, full name prompt, RelationalDB upsert
- Name updates preserved across /name and satmaster.db
- Hard reset & CASCADE isolation
"""

import sys
import os
import unittest

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from database import RelationalDB, db as rdb
import telegram_bot


class MockTelegramBot:
    def __init__(self):
        self.sent_messages = []
        self.answered_callbacks = []

    def send_message(self, chat_id, text, reply_markup=None, parse_mode="HTML"):
        msg = {
            "chat_id": chat_id,
            "text": text,
            "reply_markup": reply_markup,
            "parse_mode": parse_mode
        }
        self.sent_messages.append(msg)
        return {"ok": True, "result": msg}

    def answer_callback_query(self, callback_query_id, text=None):
        self.answered_callbacks.append({"id": callback_query_id, "text": text})
        return {"ok": True}

    def last_message(self):
        return self.sent_messages[-1] if self.sent_messages else None

    def messages_for(self, chat_id):
        return [m for m in self.sent_messages if m["chat_id"] == chat_id]

    def clear(self):
        self.sent_messages.clear()
        self.answered_callbacks.clear()


class TestBotRegistrationFlow(unittest.TestCase):
    def setUp(self):
        self.bot = MockTelegramBot()
        self.config = telegram_bot.load_config()
        self.legacy_db = telegram_bot.load_db()
        self.test_user_id = 88776655
        self.test_username = "test_sync_student"
        
        telegram_bot.clear_user_state(str(self.test_user_id))
        rdb.delete_student(self.test_user_id)
        if str(self.test_user_id) in self.legacy_db.get("students", {}):
            del self.legacy_db["students"][str(self.test_user_id)]
            telegram_bot.save_db(self.legacy_db)

    def tearDown(self):
        telegram_bot.clear_user_state(str(self.test_user_id))
        rdb.delete_student(self.test_user_id)
        fresh_db = telegram_bot.load_db()
        if str(self.test_user_id) in fresh_db.get("students", {}):
            del fresh_db["students"][str(self.test_user_id)]
            telegram_bot.save_db(fresh_db)

    def test_01_start_mandatory_role_selection(self):
        """When ANY unregistered user sends /start, bot MUST display exactly 2 role selection buttons."""
        update = {
            "update_id": 1,
            "message": {
                "chat": {"id": self.test_user_id},
                "from": {"id": self.test_user_id, "username": self.test_username},
                "text": "/start"
            }
        }
        telegram_bot.handle_update(self.bot, update, self.config, self.legacy_db)
        last = self.bot.last_message()
        self.assertIsNotNone(last)
        self.assertIn("Welcome to SATMaster", last["text"])
        self.assertIsNotNone(last.get("reply_markup"))

        keyboard = last["reply_markup"]["inline_keyboard"]
        buttons = [btn for row in keyboard for btn in row]
        self.assertEqual(len(buttons), 2, "Expected exactly 2 role selection buttons")

        callbacks = [btn["callback_data"] for btn in buttons]
        self.assertIn("role_student", callbacks)
        self.assertIn("role_teacher", callbacks)

        # Ensure NO groups and NO name prompts are shown at this stage
        for btn in buttons:
            self.assertFalse(btn["callback_data"].startswith("join_group:"))
        self.assertNotIn("Please enter your Full Name", last["text"])

    def test_02_teacher_path_guidance_and_no_student_creation(self):
        """Selecting 'I am a Teacher' sends dashboard URL and guidance without registering into students table."""
        update = {
            "update_id": 2,
            "callback_query": {
                "id": "cq_teach_1",
                "from": {"id": self.test_user_id, "username": self.test_username},
                "message": {"chat": {"id": self.test_user_id}},
                "data": "role_teacher"
            }
        }
        telegram_bot.handle_update(self.bot, update, self.config, self.legacy_db)
        last = self.bot.last_message()
        self.assertIsNotNone(last)
        self.assertIn("Teacher & Administrator Access", last["text"])
        self.assertIn("Dashboard URL", last["text"])
        self.assertIn("satmaster2026", last["text"])

        # Strictly verify NOT in students table
        student = rdb.get_student(self.test_user_id)
        self.assertIsNone(student, "Teacher should NOT be added to students table")
        self.assertNotIn(str(self.test_user_id), self.legacy_db.get("students", {}))

    def test_03_student_path_zero_groups_halts_registration(self):
        """When 0 groups exist, clicking 'I am a Student' halts with exact required warning text."""
        isolated_db_path = os.path.join(CURRENT_DIR, "test_empty_cohorts.db")
        if os.path.exists(isolated_db_path):
            os.remove(isolated_db_path)

        empty_db = RelationalDB(isolated_db_path)
        orig_rdb = telegram_bot.rdb
        try:
            telegram_bot.rdb = empty_db
            update = {
                "update_id": 3,
                "callback_query": {
                    "id": "cq_stud_0",
                    "from": {"id": self.test_user_id, "username": self.test_username},
                    "message": {"chat": {"id": self.test_user_id}},
                    "data": "role_student"
                }
            }
            telegram_bot.handle_update(self.bot, update, self.config, self.legacy_db)
            last = self.bot.last_message()
            self.assertIsNotNone(last)
            expected_text = "There is no available group right now. Please talk with your teacher to create your class group first."
            self.assertEqual(last["text"], expected_text)
            self.assertIsNone(last.get("reply_markup"))

            # Ensure no registration took place
            self.assertNotIn(str(self.test_user_id), telegram_bot.user_states)
            self.assertIsNone(empty_db.get_student(self.test_user_id))
        finally:
            telegram_bot.rdb = orig_rdb
            if os.path.exists(isolated_db_path):
                os.remove(isolated_db_path)

    def test_04_student_path_with_groups_full_registration_flow(self):
        """Student selects role -> picks live group -> enters name -> registered into satmaster.db."""
        cohort_name = "SAT Cambridge Elite"
        grp = rdb.get_group(cohort_name)
        if not grp:
            grp = rdb.create_group(cohort_name)
        group_id = grp["id"]

        try:
            # 1. User sends /start -> role selection
            self.bot.clear()
            update_start = {
                "update_id": 10,
                "message": {
                    "chat": {"id": self.test_user_id},
                    "from": {"id": self.test_user_id, "username": self.test_username},
                    "text": "/start"
                }
            }
            telegram_bot.handle_update(self.bot, update_start, self.config, self.legacy_db)
            last = self.bot.last_message()
            role_cbs = [b["callback_data"] for row in last["reply_markup"]["inline_keyboard"] for b in row]
            self.assertIn("role_student", role_cbs)

            # 2. User taps 'I am a Student'
            self.bot.clear()
            update_role = {
                "update_id": 11,
                "callback_query": {
                    "id": "cq_stud_active",
                    "from": {"id": self.test_user_id, "username": self.test_username},
                    "message": {"chat": {"id": self.test_user_id}},
                    "data": "role_student"
                }
            }
            telegram_bot.handle_update(self.bot, update_role, self.config, self.legacy_db)
            last = self.bot.last_message()
            self.assertIsNotNone(last.get("reply_markup"))
            grp_cbs = [b["callback_data"] for row in last["reply_markup"]["inline_keyboard"] for b in row]
            self.assertIn(f"join_group:{group_id}", grp_cbs)

            # 3. User taps the group button
            self.bot.clear()
            update_join = {
                "update_id": 12,
                "callback_query": {
                    "id": "cq_join",
                    "from": {"id": self.test_user_id, "username": self.test_username},
                    "message": {"chat": {"id": self.test_user_id}},
                    "data": f"join_group:{group_id}"
                }
            }
            telegram_bot.handle_update(self.bot, update_join, self.config, self.legacy_db)
            last = self.bot.last_message()
            self.assertIn("Please enter your Full Name", last["text"])
            self.assertEqual(telegram_bot.user_states.get(str(self.test_user_id), {}).get("step"), "STUDENT_WAITING_NAME")

            # 4. User sends full name
            self.bot.clear()
            student_name = "Marcus Aurelius"
            update_name = {
                "update_id": 13,
                "message": {
                    "chat": {"id": self.test_user_id},
                    "from": {"id": self.test_user_id, "username": self.test_username},
                    "text": student_name
                }
            }
            telegram_bot.handle_update(self.bot, update_name, self.config, self.legacy_db)
            user_msgs = self.bot.messages_for(self.test_user_id)
            self.assertTrue(len(user_msgs) > 0)
            combined = " ".join(m["text"] for m in user_msgs)
            self.assertIn("Registration Complete", combined)
            self.assertIn(student_name, combined)
            self.assertIn("Your Personal Portal Link", combined)

            # 5. Verify directly in satmaster.db (RelationalDB)
            db_student = rdb.get_student(self.test_user_id)
            self.assertIsNotNone(db_student)
            self.assertEqual(db_student["telegram_id"], self.test_user_id)
            self.assertEqual(db_student["display_name"], student_name)
            self.assertEqual(db_student["telegram_username"], self.test_username)
            self.assertEqual(db_student["group_id"], group_id)
            self.assertEqual(db_student["group_name"], cohort_name)

            # User state must be cleared
            self.assertNotIn(str(self.test_user_id), telegram_bot.user_states)

        finally:
            rdb.delete_group(group_id)

    def test_05_name_update_synchronization(self):
        """Existing student updates name via /name command; satmaster.db updates and preserves username."""
        grp = rdb.create_group("SAT Name Sync Cohort")
        group_id = grp["id"]
        try:
            rdb.upsert_student(
                telegram_id=self.test_user_id,
                display_name="Initial Name",
                group_id=group_id,
                telegram_username=self.test_username
            )

            self.bot.clear()
            updated_name = "Marcus A. Aurelius"
            update_rename = {
                "update_id": 20,
                "message": {
                    "chat": {"id": self.test_user_id},
                    "from": {"id": self.test_user_id, "username": self.test_username},
                    "text": f"/name {updated_name}"
                }
            }
            telegram_bot.handle_update(self.bot, update_rename, self.config, self.legacy_db)
            user_msgs = self.bot.messages_for(self.test_user_id)
            combined = " ".join(m["text"] for m in user_msgs)
            self.assertIn("Name updated to:", combined)
            self.assertIn(updated_name, combined)

            db_student = rdb.get_student(self.test_user_id)
            self.assertIsNotNone(db_student)
            self.assertEqual(db_student["display_name"], updated_name)
            self.assertEqual(db_student["telegram_username"], self.test_username)
            self.assertEqual(db_student["group_id"], group_id)

        finally:
            rdb.delete_group(group_id)

    def test_06_hard_reset_on_deleted_student(self):
        """Deleted student sending /start is treated as unregistered and prompted for role selection."""
        grp = rdb.create_group("SAT Reset Cohort")
        group_id = grp["id"]
        try:
            rdb.upsert_student(
                telegram_id=self.test_user_id,
                display_name="Student To Be Reset",
                group_id=group_id,
                telegram_username=self.test_username
            )
            rdb.delete_student(self.test_user_id)
            self.assertIsNone(rdb.get_student(self.test_user_id))

            self.bot.clear()
            update_start = {
                "update_id": 30,
                "message": {
                    "chat": {"id": self.test_user_id},
                    "from": {"id": self.test_user_id, "username": self.test_username},
                    "text": "/start"
                }
            }
            telegram_bot.handle_update(self.bot, update_start, self.config, self.legacy_db)
            last = self.bot.last_message()
            self.assertNotIn("Welcome back", last["text"])
            self.assertIsNotNone(last.get("reply_markup"))
            callbacks = [btn["callback_data"] for row in last["reply_markup"]["inline_keyboard"] for btn in row]
            self.assertIn("role_student", callbacks)
            self.assertIn("role_teacher", callbacks)

        finally:
            rdb.delete_group(group_id)

    def test_07_hard_reset_on_cascade_deleted_group(self):
        """When group is deleted, CASCADE removes student; interaction triggers role selection."""
        grp = rdb.create_group("SAT Cascade Test Cohort")
        group_id = grp["id"]
        rdb.upsert_student(
            telegram_id=self.test_user_id,
            display_name="Student in Cascade Test",
            group_id=group_id,
            telegram_username=self.test_username
        )
        self.assertIsNotNone(rdb.get_student(self.test_user_id))

        # Teacher hard-deletes group via CASCADE
        rdb.delete_group(group_id)
        self.assertIsNone(rdb.get_student(self.test_user_id))

        # Student sends message
        self.bot.clear()
        update_msg = {
            "update_id": 40,
            "message": {
                "chat": {"id": self.test_user_id},
                "from": {"id": self.test_user_id, "username": self.test_username},
                "text": "Hello, can I take my test?"
            }
        }
        telegram_bot.handle_update(self.bot, update_msg, self.config, self.legacy_db)
        last = self.bot.last_message()
        self.assertIsNotNone(last.get("reply_markup"))
        callbacks = [btn["callback_data"] for row in last["reply_markup"]["inline_keyboard"] for btn in row]
        self.assertIn("role_student", callbacks)
        self.assertIn("role_teacher", callbacks)


if __name__ == "__main__":
    print("=" * 70)
    print("🚀 RUNNING AUTOMATED SUITE: test_bot_sync.py")
    print("=" * 70)
    unittest.main()
