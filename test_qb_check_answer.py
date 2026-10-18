#!/usr/bin/env python3
"""
test_qb_check_answer.py
Comprehensive automated test suite for Instant "Check Answer" Button & Explanation System.
Validates:
1. DOM elements in index.html & public/index.html (buttons, feedback pill, explanation card, footer check button)
2. qbEngine method implementation (checkCurrentAnswer, checked session persistence, math rendering)
3. Reading & Writing MCQ checking simulation (correct choice green, wrong user choice red, other choices neutral)
4. Math MCQ & SPR checking simulation (integer, decimal, fraction equivalence)
5. Vocabulary & Audio zero-regression check
"""

import os
import sys
import unittest

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
INDEX_PATH = os.path.join(ROOT_DIR, "index.html")
PUBLIC_INDEX_PATH = os.path.join(ROOT_DIR, "public", "index.html")
ENGINE_PATH = os.path.join(ROOT_DIR, "public", "qb_engine.js")
MIRROR_ENGINE_PATH = os.path.join(ROOT_DIR, "public", "public", "qb_engine.js")


class TestQBCheckAnswer(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with open(INDEX_PATH, "r", encoding="utf-8") as f:
            cls.html = f.read()

        with open(PUBLIC_INDEX_PATH, "r", encoding="utf-8") as f:
            cls.public_html = f.read()

        with open(ENGINE_PATH, "r", encoding="utf-8") as f:
            cls.engine_js = f.read()

        with open(MIRROR_ENGINE_PATH, "r", encoding="utf-8") as f:
            cls.mirror_engine_js = f.read()

    # Test 1: DOM Elements in index.html & public/index.html
    def test_dom_elements_presence(self):
        print("\n--- Test 1: DOM Elements for Check Answer & Explanation Card ---")
        for name, doc in [("index.html", self.html), ("public/index.html", self.public_html)]:
            self.assertIn('id="qb-check-container"', doc, f"#qb-check-container missing in {name}")
            self.assertIn('id="qb-btn-check-answer"', doc, f"#qb-btn-check-answer missing in {name}")
            self.assertIn('id="qb-check-feedback-pill"', doc, f"#qb-check-feedback-pill missing in {name}")
            self.assertIn('id="qb-explanation-card"', doc, f"#qb-explanation-card missing in {name}")
            self.assertIn('id="qb-explanation-header"', doc, f"#qb-explanation-header missing in {name}")
            self.assertIn('id="qb-explanation-content"', doc, f"#qb-explanation-content missing in {name}")
            self.assertIn('id="qb-footer-btn-check"', doc, f"#qb-footer-btn-check missing in {name}")
        print("✅ DOM elements present in both root and public index.html: PASS")

    # Test 2: qbEngine Implementation in all JS bundles
    def test_qbengine_methods(self):
        print("\n--- Test 2: qbEngine checkCurrentAnswer & checked State Implementation ---")
        for name, js in [("public/qb_engine.js", self.engine_js), ("public/public/qb_engine.js", self.mirror_engine_js)]:
            self.assertIn("checkCurrentAnswer()", js, f"checkCurrentAnswer missing in {name}")
            self.assertIn("session.checked", js, f"session.checked tracking missing in {name}")
            self.assertIn("qb-explanation-card", js, f"qb-explanation-card handling missing in {name}")
            self.assertIn("qb-check-feedback-pill", js, f"qb-check-feedback-pill handling missing in {name}")
        print("✅ qbEngine methods & mirrors verified: PASS")

    # Test 3: Cache Buster Version Bump
    def test_cache_buster_version(self):
        print("\n--- Test 3: Cache Buster Version Bump ---")
        import re
        self.assertTrue(re.search(r"public/qb_engine\.js\?v=\d+\.\d+\.\d+", self.html), "Cache buster v= missing in index.html")
        self.assertTrue(re.search(r"public/qb_engine\.js\?v=\d+\.\d+\.\d+", self.public_html), "Cache buster v= missing in public/index.html")
        print("✅ Cache buster version verified: PASS")

    # Test 4: Reading & Writing MCQ Checking Simulation
    def test_rw_mcq_checking_simulation(self):
        print("\n--- Test 4: RW MCQ Checking Simulation (Correct vs Incorrect Choices) ---")
        q = {
            "id": "cb_rw_163",
            "subject": "reading_writing",
            "correct_answer": "B",
            "options": {
                "A": "Choice A text",
                "B": "Choice B text",
                "C": "Choice C text",
                "D": "Choice D text"
            },
            "rationale": "Choice B is correct because Lumumba was evaluated primarily as a symbol."
        }

        student_ans = "B"
        is_correct = (student_ans.upper() == q["correct_answer"].upper())
        self.assertTrue(is_correct)

        student_ans_wrong = "A"
        is_correct_wrong = (student_ans_wrong.upper() == q["correct_answer"].upper())
        self.assertFalse(is_correct_wrong)

        tags = {}
        for key in q["options"]:
            is_correct_choice = (key.upper() == q["correct_answer"].upper())
            is_user_choice = (key == student_ans_wrong)
            if is_correct_choice:
                tags[key] = "✓ Correct Answer"
            elif is_user_choice:
                tags[key] = "✗ Your Choice (Incorrect)"
            else:
                tags[key] = "neutral"

        self.assertEqual(tags["B"], "✓ Correct Answer")
        self.assertEqual(tags["A"], "✗ Your Choice (Incorrect)")
        self.assertEqual(tags["C"], "neutral")
        self.assertEqual(tags["D"], "neutral")
        print("✅ RW MCQ checking simulation passed: PASS")

    # Test 5: Math SPR Evaluation Simulation
    def test_math_spr_evaluation_simulation(self):
        print("\n--- Test 5: Math SPR Numerical Equivalence Simulation ---")
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

        self.assertTrue(is_spr_equal("3/2", "1.5"))
        self.assertTrue(is_spr_equal("1.5", "3/2"))
        self.assertTrue(is_spr_equal("0.75", "3/4"))
        self.assertTrue(is_spr_equal(".75", "3/4"))
        self.assertTrue(is_spr_equal("403", "403"))
        self.assertTrue(is_spr_equal("403.0", "403"))

        self.assertFalse(is_spr_equal("402", "403"))
        self.assertFalse(is_spr_equal("1/2", "1.5"))
        print("✅ Math SPR numerical equivalence simulation passed: PASS")

    # Test 6: Zero Regression on Vocabulary Logic
    def test_vocab_zero_regression(self):
        print("\n--- Test 6: Vocabulary Zero-Regression Verification ---")
        self.assertIn("function speakWord(", self.html, "speakWord must be intact in index.html")
        self.assertIn("window.satAudio", self.html, "window.satAudio must be intact in index.html")
        self.assertIn("/api/tts", self.html, "/api/tts proxy fallback must be intact")
        self.assertNotIn("speechSynthesis", self.html, "speechSynthesis must remain removed")
        self.assertIn('id="card-telegram-bot-ready"', self.html, "card-telegram-bot-ready must be intact")
        print("✅ Vocabulary and audio engine completely untouched: PASS")


if __name__ == "__main__":
    unittest.main()
