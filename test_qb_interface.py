#!/usr/bin/env python3
"""
test_qb_interface.py
Validation suite for Step 3: Authentic Bluebook Test-Taking Interface & KaTeX Rendering.
Verifies KaTeX CDN links, Bluebook top header, stopwatch timer, Desmos calculator placeholder,
split-screen passage & question panes, MCQ choice elimination, Math SPR grid-in,
question navigation controls, and navigator & review modals.
"""

import os
import sys
import json
import unittest

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
INDEX_PATH = os.path.join(ROOT_DIR, "index.html")
ENGINE_PATH = os.path.join(ROOT_DIR, "public", "qb_engine.js")


class TestQBTestTakingInterface(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with open(INDEX_PATH, "r", encoding="utf-8") as f:
            cls.html = f.read()

        with open(ENGINE_PATH, "r", encoding="utf-8") as f:
            cls.engine_js = f.read()

    # 1. KaTeX CDN Mathematical Typesetting Integration
    def test_katex_cdn_integration(self):
        print("\n--- Test 1: KaTeX CDN Mathematical Typesetting Integration ---")
        self.assertIn("katex.min.css", self.html, "KaTeX stylesheet must be included in index.html <head>")
        self.assertIn("katex.min.js", self.html, "KaTeX JS library must be included in index.html <head>")
        self.assertIn("contrib/auto-render.min.js", self.html, "KaTeX auto-render extension must be included in <head>")
        print("✅ KaTeX CDN integration verified: PASS")

    # 2. Top Bluebook Header Elements
    def test_top_bluebook_header(self):
        print("\n--- Test 2: Top Bluebook Header Structure & Controls ---")
        self.assertIn('id="qb-test-header"', self.html, "Top Bluebook header #qb-test-header must exist")
        self.assertIn('id="qb-header-subject"', self.html, "Subject title #qb-header-subject must exist")
        self.assertIn('id="qb-header-domain"', self.html, "Domain badge #qb-header-domain must exist")
        self.assertIn('id="qb-header-qnum"', self.html, "Question counter #qb-header-qnum must exist")
        self.assertIn('id="qb-btn-flag"', self.html, "Mark for review button #qb-btn-flag must exist")
        self.assertIn('id="qb-timer-display"', self.html, "Stopwatch timer display #qb-timer-display must exist")
        self.assertIn('id="qb-btn-toggle-timer"', self.html, "Toggle timer visibility button must exist")
        self.assertIn('id="qb-btn-calculator"', self.html, "Desmos calculator button #qb-btn-calculator must exist")
        self.assertIn('disabled', self.html, "Calculator button should be disabled for now with Coming Soon")
        print("✅ Top Bluebook header elements verified: PASS")

    # 3. Split-Screen Layout (Passage Pane & Question Pane)
    def test_split_screen_layout(self):
        print("\n--- Test 3: Authentic Split-Screen Layout ---")
        self.assertIn('id="qb-split-container"', self.html, "Split container #qb-split-container must exist")
        self.assertIn('id="qb-passage-pane"', self.html, "Passage pane #qb-passage-pane must exist")
        self.assertIn('id="qb-passage-content"', self.html, "Passage content container must exist")
        self.assertIn('id="qb-question-pane"', self.html, "Question pane #qb-question-pane must exist")
        self.assertIn('id="qb-prompt-content"', self.html, "Prompt content container must exist")
        self.assertIn('id="qb-q-difficulty"', self.html, "Difficulty badge #qb-q-difficulty must exist")
        self.assertIn('id="qb-q-id"', self.html, "Question ID label #qb-q-id must exist")
        print("✅ Split-screen layout panes verified: PASS")

    # 4. MCQ Choices & Option Elimination (Strikethrough)
    def test_mcq_and_strikethrough(self):
        print("\n--- Test 4: MCQ Choices & Option Elimination ---")
        self.assertIn('id="qb-mcq-container"', self.html, "MCQ choices container must exist")
        self.assertIn('toggleStrikethrough', self.engine_js, "Engine must implement toggleStrikethrough method")
        self.assertIn('selectOption', self.engine_js, "Engine must implement selectOption method")
        self.assertIn('strikethroughs', self.engine_js, "Active session schema must track strikethroughs")
        print("✅ MCQ choices & strikethrough eliminator verified: PASS")

    # 5. Student-Produced Response (SPR Grid-in for Math)
    def test_spr_gridin_input(self):
        print("\n--- Test 5: Math Student-Produced Response (SPR) ---")
        self.assertIn('id="qb-spr-container"', self.html, "SPR container #qb-spr-container must exist")
        self.assertIn('id="qb-spr-input"', self.html, "SPR input field #qb-spr-input must exist")
        self.assertIn('onSPRInput', self.engine_js, "Engine must implement onSPRInput method")
        self.assertIn('isSPREqual', self.engine_js, "Engine must implement isSPREqual fraction/decimal evaluator")
        print("✅ SPR grid-in numerical input verified: PASS")

    # 6. Bottom Navigation Controls
    def test_bottom_navigation_controls(self):
        print("\n--- Test 6: Bottom Navigation Controls ---")
        self.assertIn('id="qb-test-footer"', self.html, "Footer navigation bar must exist")
        self.assertIn('id="qb-btn-prev"', self.html, "Back button #qb-btn-prev must exist")
        self.assertIn('id="qb-btn-navigator"', self.html, "Question Navigator trigger button must exist")
        self.assertIn('id="qb-btn-next"', self.html, "Next button #qb-btn-next must exist")
        self.assertIn('id="qb-next-label"', self.html, "Next button label element must exist")
        self.assertIn('prevQuestion', self.engine_js, "Engine must implement prevQuestion()")
        self.assertIn('nextQuestion', self.engine_js, "Engine must implement nextQuestion()")
        print("✅ Bottom navigation controls verified: PASS")

    # 7. Modals: Question Navigator & Review/Submit
    def test_modals_presence_and_structure(self):
        print("\n--- Test 7: Modals (Navigator, Review & Submit, Results) ---")
        self.assertIn('id="qb-navigator-modal"', self.html, "Navigator modal #qb-navigator-modal must exist")
        self.assertIn('id="qb-navigator-grid"', self.html, "Navigator 1..N grid #qb-navigator-grid must exist")
        self.assertIn('id="qb-review-submit-modal"', self.html, "Review modal #qb-review-submit-modal must exist")
        self.assertIn('id="qb-stat-answered"', self.html, "Answered stat element must exist")
        self.assertIn('id="qb-stat-unanswered"', self.html, "Unanswered stat element must exist")
        self.assertIn('id="qb-stat-flagged"', self.html, "Flagged stat element must exist")
        self.assertIn('id="qb-results-modal"', self.html, "Results modal #qb-results-modal must exist")
        self.assertIn('openNavigatorModal', self.engine_js, "Engine must implement openNavigatorModal()")
        self.assertIn('openReviewSubmitModal', self.engine_js, "Engine must implement openReviewSubmitModal()")
        self.assertIn('finishSession', self.engine_js, "Engine must implement finishSession()")
        print("✅ Modal structures and methods verified: PASS")

    # 8. Stopwatch Timer Logic & Flags in Session Storage
    def test_stopwatch_and_flags_logic(self):
        print("\n--- Test 8: Stopwatch Timer & Review Flags Logic ---")
        self.assertIn('startTimer', self.engine_js, "Engine must implement startTimer()")
        self.assertIn('toggleTimerVisibility', self.engine_js, "Engine must implement toggleTimerVisibility()")
        self.assertIn('toggleFlagReview', self.engine_js, "Engine must implement toggleFlagReview()")
        self.assertIn('timePerQuestion', self.engine_js, "timePerQuestion must be tracked per index")
        self.assertIn('flags', self.engine_js, "flags must be tracked per index")
        print("✅ Stopwatch timer & review flags logic verified: PASS")

    # 9. Fraction & Decimal Math Evaluation Simulation
    def test_spr_math_evaluation_simulation(self):
        print("\n--- Test 9: Fraction & Decimal SPR Simulation ---")
        # Simulate isSPREqual logic
        def is_spr_equal(student, correct):
            if not student or not correct:
                return False
            s_str = str(student).strip().lower()
            c_str = str(correct).strip().lower()
            if s_str == c_str:
                return True

            def parse_val(v):
                if "/" in v:
                    parts = v.split("/")
                    if len(parts) == 2:
                        try:
                            num = float(parts[0])
                            den = float(parts[1])
                            if den != 0:
                                return num / den
                        except ValueError:
                            pass
                try:
                    return float(v)
                except ValueError:
                    return None

            s_num = parse_val(s_str)
            c_num = parse_val(c_str)
            if s_num is not None and c_num is not None:
                return abs(s_num - c_num) < 0.001
            return False

        # Positive tests
        self.assertTrue(is_spr_equal("3/2", "1.5"))
        self.assertTrue(is_spr_equal("1.50", "1.5"))
        self.assertTrue(is_spr_equal(".1764", "0.1764"))
        self.assertTrue(is_spr_equal("403", "403"))
        self.assertTrue(is_spr_equal("7/4", "1.75"))
        self.assertTrue(is_spr_equal("-1/2", "-0.5"))

        # Negative tests
        self.assertFalse(is_spr_equal("3/2", "2.5"))
        self.assertFalse(is_spr_equal("403", "402"))
        print("✅ SPR math fraction and decimal evaluation simulation passed: PASS")


def main():
    suite = unittest.TestLoader().loadTestsFromTestCase(TestQBTestTakingInterface)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    if not result.wasSuccessful():
        sys.exit(1)


if __name__ == "__main__":
    main()
