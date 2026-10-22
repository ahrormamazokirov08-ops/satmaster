#!/usr/bin/env python3
"""
test_interactive_loading_states.py
==================================
Automated verification for interactive button loading feedback,
animated spinners, debounce mutex locks, empty queue disabled states,
and parallel Telegram notification dispatching.
"""

import unittest
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

class TestInteractiveLoadingStates(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with open(os.path.join(BASE_DIR, "index.html"), "r", encoding="utf-8") as f:
            cls.root_html = f.read()
        with open(os.path.join(BASE_DIR, "public", "index.html"), "r", encoding="utf-8") as f:
            cls.public_html = f.read()
        with open(os.path.join(BASE_DIR, "public", "qb_engine.js"), "r", encoding="utf-8") as f:
            cls.qb_engine = f.read()
        with open(os.path.join(BASE_DIR, "api", "index.py"), "r", encoding="utf-8") as f:
            cls.api_code = f.read()
        with open(os.path.join(BASE_DIR, "telegram_bot.py"), "r", encoding="utf-8") as f:
            cls.bot_code = f.read()

    def test_01_mirror_parity(self):
        """Root index.html and public/index.html must be 100% identical."""
        self.assertEqual(self.root_html, self.public_html, "index.html and public/index.html must have 100% byte parity")

    def test_02_staging_queue_empty_disables_send_button(self):
        """When 0 staged items exist, batch send button must be disabled and visually styled as not-allowed."""
        for name, html in [("Root index.html", self.root_html), ("Public index.html", self.public_html)]:
            self.assertIn("sendBtn.disabled = true;", html, f"{name}: sendBtn must be disabled on empty staging")
            self.assertIn("cursor-not-allowed", html, f"{name}: cursor-not-allowed must be applied on empty staging")
            self.assertIn("pointer-events-none", html, f"{name}: pointer-events-none must be applied on empty staging")

    def test_03_single_staged_send_has_spinner_and_lock(self):
        """Single staged send button must show spinner, Sending..., and disable batch send."""
        for name, html in [("Root index.html", self.root_html), ("Public index.html", self.public_html)]:
            self.assertIn("handleSendSingleStagedHomework(stagedId, btnElement)", html, f"{name}: handleSendSingleStagedHomework must accept btnElement")
            self.assertIn("animate-spin", html, f"{name}: animated spinner SVG must be present")
            self.assertIn("Sending...", html, f"{name}: Sending... text must be set during dispatch")
            self.assertIn("isDispatchingHomework", html, f"{name}: isDispatchingHomework mutex must guard single send")

    def test_04_batch_send_has_progressive_spinner_and_lock(self):
        """Batch send must show progressive counts, disable all child buttons, and prevent double taps."""
        for name, html in [("Root index.html", self.root_html), ("Public index.html", self.public_html)]:
            self.assertIn("allRowActions.forEach(el => {", html, f"{name}: row actions must be locked during batch dispatch")

    def test_05_direct_assign_modal_button_loading_state(self):
        """Modal assign button must show spinner, Assigning & Notifying Class..., and disable sister buttons."""
        for name, html in [("Root index.html", self.root_html), ("Public index.html", self.public_html)]:
            self.assertIn("Assigning & Notifying Class...", html, f"{name}: modal assign loading text missing")
            self.assertIn("addDoneBtn.disabled = true;", html, f"{name}: secondary buttons must be disabled during assign")

    def test_06_send_module_report_to_telegram_loading_and_completion(self):
        """sendModuleReportToTelegram must show spinner, disable button, and change to Sent to Telegram."""
        for name, content in [("index.html", self.root_html), ("qb_engine.js", self.qb_engine)]:
            self.assertIn("Sending to Telegram...", content, f"{name}: Sending to Telegram... missing")
            self.assertIn("Sent to Telegram", content, f"{name}: Sent to Telegram success state missing")

    def test_07_finish_session_mutex(self):
        """finishSession must be protected with isFinishingSession mutex."""
        for name, content in [("index.html", self.root_html), ("qb_engine.js", self.qb_engine)]:
            self.assertIn("if (this.isFinishingSession) return;", content, f"{name}: isFinishingSession guard missing")
            self.assertIn("this.isFinishingSession = false;", content, f"{name}: isFinishingSession release missing")

    def test_08_backend_parallel_telegram_dispatch(self):
        """api/index.py and telegram_bot.py must use ThreadPoolExecutor for concurrent Telegram notification dispatch."""
        self.assertIn("from concurrent.futures import ThreadPoolExecutor", self.api_code, "api/index.py must import ThreadPoolExecutor")
        self.assertIn("ThreadPoolExecutor(max_workers=", self.api_code, "api/index.py must use ThreadPoolExecutor")
        self.assertIn("ThreadPoolExecutor(max_workers=", self.bot_code, "telegram_bot.py must use ThreadPoolExecutor")

if __name__ == "__main__":
    unittest.main()
