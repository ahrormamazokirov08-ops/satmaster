#!/usr/bin/env python3
"""
test_decouple_webapp.py
Verification suite for decoupling Telegram WebApp SDK and transitioning SATMaster
to a pure browser web app.
"""

import os
import unittest

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))

class TestDecoupleWebApp(unittest.TestCase):

    def setUp(self):
        index_path = os.path.join(ROOT_DIR, "index.html")
        with open(index_path, "r", encoding="utf-8") as f:
            self.index_html = f.read()

        bot_path = os.path.join(ROOT_DIR, "telegram_bot.py")
        with open(bot_path, "r", encoding="utf-8") as f:
            self.bot_code = f.read()

    def test_sdk_script_removed_from_index(self):
        """Ensure telegram-web-app.js script tag is completely removed from index.html."""
        self.assertNotIn("telegram-web-app.js", self.index_html,
                         "telegram-web-app.js script tag must be removed from index.html")

    def test_no_telegram_webapp_calls_in_index(self):
        """Ensure no window.Telegram or WebApp calls remain in index.html."""
        self.assertNotIn("window.Telegram", self.index_html,
                         "index.html must not reference window.Telegram")
        self.assertNotIn("Telegram.WebApp", self.index_html,
                         "index.html must not reference Telegram.WebApp")
        self.assertNotIn("initDataUnsafe", self.index_html,
                         "index.html must not reference initDataUnsafe")

    def test_pure_browser_auth_flow_in_index(self):
        """Ensure URL query params and dual storage persistence are intact."""
        self.assertIn("URLSearchParams(window.location.search)", self.index_html)
        self.assertIn("params.get('uid')", self.index_html)
        self.assertIn("params.get('role')", self.index_html)
        self.assertIn("params.get('name')", self.index_html)
        self.assertIn("params.get('class')", self.index_html)
        self.assertIn("satmaster_user_session", self.index_html)
        self.assertIn("saveSessionToStorage(candidate)", self.index_html)
        self.assertIn("getStoredSession()", self.index_html)

    def test_header_ui_clean(self):
        """Ensure Telegram-specific badges are removed from header."""
        self.assertNotIn("Telegram Bot Session", self.index_html)
        self.assertIn('id="display-user-role">Web Session<', self.index_html)
        self.assertIn('id="btn-session-info"', self.index_html)
        self.assertIn('<span>👤 Session</span>', self.index_html)

    def test_pwa_viewport_preserved(self):
        """Ensure standalone PWA viewport and meta tags remain active."""
        self.assertIn('name="apple-mobile-web-app-capable" content="yes"', self.index_html)
        self.assertIn('viewport-fit=cover', self.index_html)

    def test_telegram_bot_no_web_app_buttons(self):
        """Ensure telegram_bot.py generates standard browser url buttons and no web_app embeds."""
        self.assertNotIn('"web_app": {', self.bot_code,
                         "telegram_bot.py must not generate inline buttons with 'web_app': {'url': ...}")
        self.assertNotIn('"web_app":{', self.bot_code)

    def test_telegram_bot_make_url_button(self):
        """Verify make_url_button returns standard url button."""
        import telegram_bot
        btn = telegram_bot.make_url_button("Test Label", "https://example.com")
        self.assertEqual(btn, {"text": "Test Label", "url": "https://example.com"})

    def test_telegram_bot_link_generation(self):
        """Verify link generation helper retains standard query parameters."""
        import telegram_bot
        link = telegram_bot.generate_student_link(
            "https://satmaster-w58j.vercel.app/index.html",
            "TG12345",
            "Alex Chen",
            "Cohort A"
        )
        self.assertTrue(link.startswith("https://satmaster-w58j.vercel.app/index.html?"))
        self.assertIn("role=student", link)
        self.assertIn("uid=TG12345", link)
        self.assertIn("name=Alex+Chen", link)
        self.assertIn("class=Cohort+A", link)


if __name__ == "__main__":
    print("==================================================================")
    print("🧪 TELEGRAM WEBAPP SDK DECOUPLING & PURE BROWSER TEST SUITE")
    print("==================================================================")
    unittest.main()
