#!/usr/bin/env python3
"""
test_homework_timer_and_review.py
Verifies:
1. Deduplication logic in backend (api/index.py & telegram_bot.py).
2. Timer resolution in startPractice (teacher selected timer e.g. 45 min, 15 min, 0 min untimed).
3. Auto-submit on timeout (remainingSec <= 0 triggers finishSession).
4. Review mistakes feature (presence of reviewHomeworkAnswers, Review buttons in modal and student portal, and answers/questions persistence).
5. 100% Byte-for-byte Mirror Parity.
"""

import os
import sys
import unittest

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))

class TestHomeworkTimerAndReview(unittest.TestCase):

    def test_01_backend_deduplication_logic(self):
        """Verify in-memory 60s broadcast deduplication helper in api/index.py."""
        sys.path.insert(0, os.path.join(ROOT_DIR, "api"))
        import index as api_module

        # Clean cache
        api_module.RECENT_HOMEWORK_NOTIFICATIONS.clear()

        cid = 123456789
        hw_id = "hw_test_1001"

        # First call should succeed (return False for skip)
        skip_1 = api_module.should_skip_duplicate_telegram_notification(cid, hw_id, window_sec=60)
        self.assertFalse(skip_1, "First notification should NOT be skipped")

        # Second immediate call should be skipped (return True)
        skip_2 = api_module.should_skip_duplicate_telegram_notification(cid, hw_id, window_sec=60)
        self.assertTrue(skip_2, "Duplicate notification within 60s MUST be skipped")

        # Different chat ID should NOT be skipped
        skip_other_cid = api_module.should_skip_duplicate_telegram_notification(987654321, hw_id, window_sec=60)
        self.assertFalse(skip_other_cid, "Notification to a different chat ID should NOT be skipped")

        # Different homework ID should NOT be skipped
        skip_other_hw = api_module.should_skip_duplicate_telegram_notification(cid, "hw_test_1002", window_sec=60)
        self.assertFalse(skip_other_hw, "Notification for a different homework ID should NOT be skipped")

        print("✅ Backend Telegram broadcast deduplication logic verified: PASS")

    def test_02_no_redundant_frontend_broadcast_call(self):
        """Verify frontend dispatchers do not make duplicate broadcast calls."""
        for path in [os.path.join(ROOT_DIR, "index.html"), os.path.join(ROOT_DIR, "public", "index.html")]:
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()

            # In handleCreateHomeworkSubmit, broadcast must not be called right after /api/homework
            self.assertNotIn(
                "await broadcastHomeworkTelegramNotification(newAssignment, config);",
                content,
                f"Redundant broadcast in handleCreateHomeworkSubmit found in {path}"
            )

            # In dispatchAssignmentObject, broadcast must only be guarded as a fallback
            self.assertIn("let backendNotified = false;", content, f"Missing backendNotified guard in {path}")
            self.assertIn("if (!backendNotified && typeof broadcastHomeworkTelegramNotification === 'function')", content, f"Unguarded broadcast found in {path}")

        print("✅ Elimination of redundant frontend broadcast calls verified: PASS")

    def test_03_timer_duration_resolution_logic(self):
        """Verify timer resolution handles any teacher selected duration and Untimed (0)."""
        for path in [os.path.join(ROOT_DIR, "index.html"), os.path.join(ROOT_DIR, "public", "qb_engine.js")]:
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()

            self.assertIn("activeHw.timeLimitMinutes !== undefined", content, f"Missing activeHw.timeLimitMinutes check in {path}")
            self.assertIn("activeHw.config?.timeLimitMinutes !== undefined", content, f"Missing activeHw.config.timeLimitMinutes check in {path}")
            self.assertIn("activeHw.config?.timer !== undefined", content, f"Missing activeHw.config.timer check in {path}")
            self.assertIn("timeLimitMinutes = parseInt(activeHw.timeLimitMinutes, 10);", content, f"Missing parseInt in {path}")

            # Verify that old bug pattern is GONE:
            self.assertNotIn(
                "(activeHw.config?.time_limit || (activeHw.duration ? parseInt(activeHw.duration) : 20))",
                content,
                f"Old hardcoded 20-min timer fallback bug pattern still present in {path}"
            )

        print("✅ Exact homework timer resolution verified: PASS")

    def test_04_auto_submit_on_timeout(self):
        """Verify initTimer automatically submits when remainingSec <= 0."""
        for path in [os.path.join(ROOT_DIR, "index.html"), os.path.join(ROOT_DIR, "public", "qb_engine.js")]:
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()

            self.assertIn("if (isCountdown && remainingSec <= 0)", content, f"Timeout check missing in {path}")
            self.assertIn("this.finishSession();", content, f"finishSession call on timeout missing in {path}")

        print("✅ Auto-submit on countdown timeout verified: PASS")

    def test_05_review_mistakes_feature(self):
        """Verify reviewHomeworkAnswers, modal review button, student portal review button, and answer storage."""
        for path in [os.path.join(ROOT_DIR, "index.html"), os.path.join(ROOT_DIR, "public", "index.html")]:
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()

            self.assertIn("reviewHomeworkAnswers(hwId)", content, f"reviewHomeworkAnswers missing in {path}")
            self.assertIn("qbEngine.reviewHomeworkAnswers()", content, f"Review button in results modal missing in {path}")
            self.assertIn("handleReviewHomeworkSubmission(", content, f"handleReviewHomeworkSubmission missing in {path}")
            self.assertIn("👁️ Review Mistakes & Answers", content, f"Review Mistakes button in student portal cards missing in {path}")
            self.assertIn("answers: session.answers || {}", content, f"Session answers persistence missing in {path}")
            self.assertIn("questions: session.questions || []", content, f"Session questions persistence missing in {path}")

            # Verify review mode unhides explanations
            self.assertIn("session.feedbackStyle === 'simulation') && !session.isReview", content, f"isReview check missing for isHomeworkMode in {path}")

        # Also verify in qb_engine.js
        for p in [os.path.join(ROOT_DIR, "public", "qb_engine.js"), os.path.join(ROOT_DIR, "public", "public", "qb_engine.js")]:
            with open(p, "r", encoding="utf-8") as f:
                c = f.read()
            self.assertIn("reviewHomeworkAnswers(hwId)", c, f"reviewHomeworkAnswers missing in {p}")
            self.assertIn("qbEngine.reviewHomeworkAnswers()", c, f"Review button missing in {p}")
            self.assertIn("session.feedbackStyle === 'simulation') && !session.isReview", c, f"isReview check missing in {p}")

        print("✅ Review Mistakes & Step-by-Step Rationales feature verified: PASS")

    def test_06_100_percent_mirror_parity(self):
        """Invariant 9: 100% byte-for-byte mirror parity between root and public mirrors."""
        pairs = [
            (os.path.join(ROOT_DIR, "index.html"), os.path.join(ROOT_DIR, "public", "index.html")),
            (os.path.join(ROOT_DIR, "public", "qb_engine.js"), os.path.join(ROOT_DIR, "public", "public", "qb_engine.js")),
        ]
        for src, dst in pairs:
            with open(src, "rb") as f1, open(dst, "rb") as f2:
                b1 = f1.read()
                b2 = f2.read()
            self.assertEqual(len(b1), len(b2), f"Size mismatch between {src} and {dst}: {len(b1)} != {len(b2)}")
            self.assertEqual(b1, b2, f"Byte mismatch between {src} and {dst}")

        print("✅ 100% Byte-for-byte Mirror Parity verified: PASS")

if __name__ == "__main__":
    unittest.main()
