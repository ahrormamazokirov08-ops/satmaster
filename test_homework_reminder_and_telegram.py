#!/usr/bin/env python3
"""
Test Suite: Student Homework Reminder Badge and Telegram Notifications
1. Red badge on desktop nav (#hw-badge-count) and mobile nav (#mob-hw-badge-count)
2. getStudentActiveUncompletedHomework, updateHomeworkNavBadge, and markHomeworkAsSeenByStudent
3. switchTab('student') calls markHomeworkAsSeenByStudent to clear badge on entry
4. Database helper get_students_by_group_or_all
5. Telegram notification formatting and dispatch in api/index.py and telegram_bot.py
"""
import os
import unittest
from database import RelationalDB, db

class TestHomeworkReminderAndTelegram(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        base_dir = os.path.dirname(__file__)
        with open(os.path.join(base_dir, "index.html"), "r", encoding="utf-8") as f:
            cls.root_html = f.read()
        with open(os.path.join(base_dir, "public", "index.html"), "r", encoding="utf-8") as f:
            cls.public_html = f.read()
        with open(os.path.join(base_dir, "api", "index.py"), "r", encoding="utf-8") as f:
            cls.api_code = f.read()
        with open(os.path.join(base_dir, "telegram_bot.py"), "r", encoding="utf-8") as f:
            cls.bot_code = f.read()

    def test_01_nav_badge_elements_exist(self):
        """Verify red count badge elements exist in desktop and mobile navigation."""
        for name, html in [('Root index.html', self.root_html), ('Public index.html', self.public_html)]:
            self.assertIn('id="hw-badge-count"', html, f"{name}: Desktop #hw-badge-count badge must exist")
            self.assertIn('id="mob-hw-badge-count"', html, f"{name}: Mobile #mob-hw-badge-count badge must exist")
            self.assertIn('bg-rose-600', html, f"{name}: Badge must have rose/red styling")

    def test_02_badge_functions_exist(self):
        """Verify getStudentActiveUncompletedHomework, updateHomeworkNavBadge, and markHomeworkAsSeenByStudent exist."""
        for name, html in [('Root index.html', self.root_html), ('Public index.html', self.public_html)]:
            self.assertIn("function getStudentActiveUncompletedHomework()", html, f"{name}: getStudentActiveUncompletedHomework must exist")
            self.assertIn("function updateHomeworkNavBadge()", html, f"{name}: updateHomeworkNavBadge must exist")
            self.assertIn("function markHomeworkAsSeenByStudent()", html, f"{name}: markHomeworkAsSeenByStudent must exist")
            self.assertIn("hw_seen_ids_", html, f"{name}: seen IDs must be tracked in localStorage")

    def test_03_switch_tab_student_clears_badge(self):
        """Verify switchTab('student') calls markHomeworkAsSeenByStudent."""
        for name, html in [('Root index.html', self.root_html), ('Public index.html', self.public_html)]:
            self.assertIn("markHomeworkAsSeenByStudent();", html, f"{name}: switchTab must call markHomeworkAsSeenByStudent")

    def test_04_database_student_retrieval(self):
        """Verify get_students_by_group_or_all exists and returns students."""
        students_all = db.get_students_by_group_or_all(None)
        self.assertIsInstance(students_all, list)
        students_specific = db.get_students_by_group_or_all("All Students")
        self.assertIsInstance(students_specific, list)

    def test_05_telegram_notification_dispatch_in_backends(self):
        """Verify Telegram notifications are sent in api/index.py and telegram_bot.py with question count and link."""
        for name, code in [('api/index.py', self.api_code), ('telegram_bot.py', self.bot_code)]:
            self.assertIn("NEW HOMEWORK ON THE WEBSITE", code, f"{name}: Notification title must exist")
            self.assertIn("You have new homework on the website", code, f"{name}: Reminder prompt must exist")
            self.assertIn("Questions:</b> {q_count_text}", code, f"{name}: Question count must be rendered")
            self.assertIn("Direct Link:</b> https://satmaster-w58j.vercel.app", code, f"{name}: Direct link must be rendered")
            self.assertIn("🚀 Open Homework on Website", code, f"{name}: Action button must exist")
            self.assertIn("get_students_by_group_or_all", code, f"{name}: Must look up enrolled students")

    def test_06_group_isolation_in_notification(self):
        """Verify students are strictly filtered by cohort so other groups do not receive messages."""
        sat_students = db.get_students_by_group_or_all(group_name="SAT Masters 2026")
        self.assertGreaterEqual(len(sat_students), 1)
        sat_tg_ids = {s["telegram_id"] for s in sat_students if s.get("telegram_id")}
        
        ivy_students = db.get_students_by_group_or_all(group_name="Ivy League Prep")
        ivy_tg_ids = {s["telegram_id"] for s in ivy_students if s.get("telegram_id")}

        # Ensure no overlap between different groups
        overlap = sat_tg_ids.intersection(ivy_tg_ids)
        self.assertEqual(len(overlap), 0, f"Group students must be isolated without overlap, found: {overlap}")

    def test_07_manual_pin_and_class_select_hidden_in_student_header(self):
        """Verify the manual PIN and cohort dropdown wrapper is hidden in the student homework view."""
        for name, html in [('Root index.html', self.root_html), ('Public index.html', self.public_html)]:
            self.assertIn('<div class="hidden items-center gap-2 self-start sm:self-auto flex-wrap">', html,
                          f"{name}: Manual PIN and class select wrapper must be hidden")

    def test_08_homework_cohort_resolution(self):
        """Verify homework assignments created and retrieved have className and groupId resolved."""
        created = db.create_homework_assignment(
            title="Cohort Resolution Test",
            hw_type="vocab",
            group_id="SAT Masters 2026",
            config={"timeLimitMinutes": 15, "question_count": 20}
        )
        self.assertIsNotNone(created)
        self.assertEqual(created.get("className"), "SAT Masters 2026")
        
        assignments = db.get_homework_assignments(group_id="SAT Masters 2026")
        self.assertTrue(any(a["id"] == created["id"] for a in assignments))
        matched = next(a for a in assignments if a["id"] == created["id"])
        self.assertEqual(matched.get("className"), "SAT Masters 2026")
        self.assertEqual(matched.get("group_name"), "SAT Masters 2026")

if __name__ == '__main__':
    unittest.main()
