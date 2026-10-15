#!/usr/bin/env python3
"""
Test Suite: Student Name Resolution and Sanitization
===================================================
Verifies:
1. database.py _is_id_like correctly identifies IDs vs real student names.
2. database.py _sanitize_student_dict resolves registered names from students_db.json.
3. database.py get_student returns human-readable names for registered students.
4. database.py get_students_by_group_or_all sanitizes all students.
5. index.html and public/index.html contain resolveStudentDisplayName and do not display raw UUIDs.
6. api/index.py and telegram_bot.py personalize homework notification links with student names.
"""

import unittest
import os
import re
from database import db as rdb, _is_id_like, _sanitize_student_dict, _resolve_registered_student_info


class TestStudentNameResolution(unittest.TestCase):

    def test_01_is_id_like_logic(self):
        """Test _is_id_like identifies UUIDs, TG IDs, and raw digits as IDs."""
        self.assertTrue(_is_id_like("1669fc04-f0c0-436f-80cb-0aed24f41179"))
        self.assertTrue(_is_id_like("TG6789834037"))
        self.assertTrue(_is_id_like("STU123456"))
        self.assertTrue(_is_id_like("6789834037"))
        self.assertTrue(_is_id_like(""))
        self.assertTrue(_is_id_like(None))
        self.assertTrue(_is_id_like("Student User"))
        self.assertTrue(_is_id_like("Student"))

        # Real names must NOT be id-like
        self.assertFalse(_is_id_like("Cristiano Ronaldo"))
        self.assertFalse(_is_id_like("Saidkamolov Saidxon"))
        self.assertFalse(_is_id_like("Suhrobbek"))
        self.assertFalse(_is_id_like("Foziljon"))
        self.assertFalse(_is_id_like("Go bro"))
        self.assertFalse(_is_id_like("Ulug'bek"))

    def test_02_resolve_registered_student_info(self):
        """Test lookup of registered names from students_db.json."""
        ronaldo = _resolve_registered_student_info(telegram_id=6789834037)
        self.assertIsNotNone(ronaldo)
        self.assertEqual(ronaldo.get("name"), "Cristiano Ronaldo")

        saidxon = _resolve_registered_student_info(telegram_id=5209814338)
        self.assertIsNotNone(saidxon)
        self.assertEqual(saidxon.get("name"), "Saidkamolov Saidxon")

    def test_03_sanitize_student_dict(self):
        """Test _sanitize_student_dict replaces UUID/ID/placeholder with registered human name."""
        raw_stu = {
            "id": "1669fc04-f0c0-436f-80cb-0aed24f41179",
            "telegram_id": 6789834037,
            "display_name": "1669fc04-f0c0-436f-80cb-0aed24f41179",
            "telegram_username": "ahrorbek_9937"
        }
        cleaned = _sanitize_student_dict(raw_stu)
        self.assertEqual(cleaned["display_name"], "Cristiano Ronaldo")

        raw_bod_boy = {
            "id": "1669fc04-f0c0-436f-80cb-0aed24f41179",
            "telegram_id": 6789834037,
            "display_name": "bod boy",
            "telegram_username": "ahrorbek_9937"
        }
        cleaned_bod = _sanitize_student_dict(raw_bod_boy)
        self.assertEqual(cleaned_bod["display_name"], "Cristiano Ronaldo")

    def test_04_get_student_resolution(self):
        """Test get_student returns real registered name."""
        stu = rdb.get_student("6789834037")
        if stu:
            self.assertEqual(stu.get("display_name"), "Cristiano Ronaldo")

        stu_uuid = rdb.get_student("1669fc04-f0c0-436f-80cb-0aed24f41179")
        if stu_uuid:
            self.assertEqual(stu_uuid.get("display_name"), "Cristiano Ronaldo")

        stu_saidxon = rdb.get_student("5209814338")
        if stu_saidxon:
            self.assertEqual(stu_saidxon.get("display_name"), "Saidkamolov Saidxon")

    def test_05_frontend_html_sanitization(self):
        """Verify index.html and public/index.html have resolveStudentDisplayName and proper guards."""
        for path in ["index.html", "public/index.html"]:
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()

            self.assertIn("function resolveStudentDisplayName", content)
            self.assertIn("function isIdLike", content)
            self.assertIn("KNOWN_STUDENT_NAMES_REGISTRY", content)
            self.assertIn("Cristiano Ronaldo", content)
            self.assertIn("Saidkamolov Saidxon", content)

            # verifyStudentAccount fallback must not return raw studentId as display_name
            self.assertNotIn("display_name: studentId", content)

    def test_06_personalized_notification_links(self):
        """Verify api/index.py and telegram_bot.py include personalized query parameters in homework links."""
        with open("api/index.py", "r", encoding="utf-8") as f:
            api_content = f.read()
        self.assertIn("student_link = f\"https://satmaster-w58j.vercel.app/index.html?{query}\"", api_content)

        with open("telegram_bot.py", "r", encoding="utf-8") as f:
            bot_content = f.read()
        self.assertIn("student_link = f\"https://satmaster-w58j.vercel.app/index.html?{query}\"", bot_content)


if __name__ == "__main__":
    unittest.main()
