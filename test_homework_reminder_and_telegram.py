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
        """Verify Telegram notifications are sent in api/index.py and telegram_bot.py."""
        for name, code in [('api/index.py', self.api_code), ('telegram_bot.py', self.bot_code)]:
            self.assertIn("NEW HOMEWORK ASSIGNED", code, f"{name}: Notification title must exist")
            self.assertIn("You have new homework on the website", code, f"{name}: Reminder prompt must exist")
            self.assertIn("🚀 Open Homework on Website", code, f"{name}: Action button must exist")
            self.assertIn("get_students_by_group_or_all", code, f"{name}: Must look up enrolled students")

if __name__ == '__main__':
    unittest.main()
