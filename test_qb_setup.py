#!/usr/bin/env python3
"""
test_qb_setup.py
Validation suite for Step 2: Bluebook Question Bank Practice Setup & Filter Screen.
Verifies DOM structure, aesthetics classes, filter options, state engine logic,
sessionStorage schema, and placeholder interface.
"""

import os
import sys
import json
import re
import unittest

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
INDEX_PATH = os.path.join(ROOT_DIR, "index.html")
ENGINE_PATH = os.path.join(ROOT_DIR, "public", "qb_engine.js")
RW_JSON = os.path.join(ROOT_DIR, "data", "questions", "reading_writing.json")
MATH_JSON = os.path.join(ROOT_DIR, "data", "questions", "math.json")


class TestQBSetupScreen(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with open(INDEX_PATH, "r", encoding="utf-8") as f:
            cls.html = f.read()

        with open(ENGINE_PATH, "r", encoding="utf-8") as f:
            cls.engine_js = f.read()

        with open(RW_JSON, "r", encoding="utf-8") as f:
            cls.rw_questions = json.load(f)

        with open(MATH_JSON, "r", encoding="utf-8") as f:
            cls.math_questions = json.load(f)

    # 1. Navigation Integration
    def test_navigation_integration(self):
        print("\n--- Test 1: Navigation Integration ---")
        self.assertIn("switchTab('qbank')", self.html, "switchTab('qbank') should be wired to navbar")
        self.assertIn('id="nav-qbank"', self.html, "nav-qbank element should exist")
        self.assertIn('id="tab-qbank"', self.html, "tab-qbank section should exist")
        
        # Verify switchTab calls qbEngine.init()
        self.assertIn("qbEngine.init()", self.html, "switchTab('qbank') should trigger qbEngine.init()")
        print("✅ Navigation integration verified: PASS")

    # 2. Bluebook-Styled Topic Selector UI
    def test_bluebook_ui_container_and_aesthetics(self):
        print("\n--- Test 2: Authentic Bluebook-Styled Container & Aesthetics ---")
        self.assertIn('id="qb-setup-view"', self.html, "#qb-setup-view must exist in index.html")
        self.assertIn('id="qb-test-container"', self.html, "#qb-test-container must exist in index.html")
        
        # Verify Bluebook aesthetics: #0f172a, #334155
        self.assertIn("#0f172a", self.html, "Container must use dark navy #0f172a")
        self.assertIn("#334155", self.html, "Container must use slate border #334155")
        print("✅ Bluebook container & color scheme verified: PASS")

    # 3. Subject Tabs
    def test_subject_tabs(self):
        print("\n--- Test 3: Subject Tabs ---")
        self.assertIn('id="qb-tab-rw"', self.html, "Reading & Writing tab button must exist")
        self.assertIn('id="qb-tab-math"', self.html, "Math tab button must exist")
        self.assertIn('id="qb-tab-combined"', self.html, "Combined / All tab button must exist")
        print("✅ Subject Tabs (RW, Math, Combined) verified: PASS")

    # 4. Domain Checkboxes Grid
    def test_domain_checkboxes_grid(self):
        print("\n--- Test 4: Domain Checkbox Grid ---")
        # English domains
        english_domains = [
            "Information and Ideas",
            "Craft and Structure",
            "Standard English Conventions",
            "Expression of Ideas"
        ]
        for d in english_domains:
            self.assertIn(f'value="{d}"', self.html, f"English domain checkbox '{d}' must exist")

        # Math domains
        math_domains = [
            "Algebra",
            "Advanced Math",
            "Problem-Solving and Data Analysis",
            "Geometry and Trigonometry"
        ]
        for d in math_domains:
            self.assertIn(f'value="{d}"', self.html, f"Math domain checkbox '{d}' must exist")

        # Select All / Deselect All button
        self.assertIn('id="qb-btn-toggle-domains"', self.html, "Toggle All domains button must exist")
        print("✅ Domain checkboxes (4 RW + 4 Math) & Toggle button verified: PASS")

    # 5. Difficulty Filter Pills
    def test_difficulty_filter_pills(self):
        print("\n--- Test 5: Difficulty Filter Pills ---")
        self.assertIn('id="qb-diff-Easy"', self.html, "Easy difficulty pill must exist")
        self.assertIn('id="qb-diff-Medium"', self.html, "Medium difficulty pill must exist")
        self.assertIn('id="qb-diff-Hard"', self.html, "Hard difficulty pill must exist")
        print("✅ Difficulty pills (Easy, Medium, Hard) verified: PASS")

    # 6. Question Count Selector
    def test_question_count_selector(self):
        print("\n--- Test 6: Question Count Selector ---")
        for count in [5, 10, 15, 20, 30, "custom"]:
            self.assertIn(f'id="qb-count-{count}"', self.html, f"Count pill for {count} must exist")
        self.assertIn('id="qb-custom-count-input"', self.html, "Custom count number input must exist")
        print("✅ Question count selector (5, 10, 15, 20, 30, custom) verified: PASS")

    # 7. Live Matching Question Counter & Start Button
    def test_matching_counter_and_start_button(self):
        print("\n--- Test 7: Matching Counter & Start Button ---")
        self.assertIn('id="qb-matching-count"', self.html, "Live matching count element must exist")
        self.assertIn('id="qb-btn-start"', self.html, "Start Practice primary button must exist")
        print("✅ Live matching counter & Start button verified: PASS")

    # 8. State Engine Logic & Session Storage
    def test_state_engine_and_session_storage(self):
        print("\n--- Test 8: State Engine & sessionStorage ---")
        # Check engine methods
        engine_methods = [
            "init", "loadQuestions", "setSubject", "getActiveDomains",
            "toggleAllDomains", "toggleDifficulty", "setCount",
            "getFilteredQuestions", "updateMatchingCount", "startPractice",
            "returnToSetup"
        ]
        for m in engine_methods:
            self.assertIn(m, self.engine_js, f"qbEngine must implement {m}()")

        # Verify sessionStorage key
        self.assertIn("sessionStorage.setItem('qb_active_session'", self.engine_js, (
            "qbEngine must store session under 'qb_active_session' in sessionStorage"
        ))

        # Verify required session schema fields
        for field in ["questions", "currentIdx", "answers", "timePerQuestion"]:
            self.assertIn(field, self.engine_js, f"Session object must contain '{field}'")

        # Verify placeholder text
        self.assertIn("Ready for Step 3 Interface", self.html, (
            "#qb-test-container must display 'Ready for Step 3 Interface'"
        ))
        print("✅ State engine & sessionStorage persistence verified: PASS")

    # 9. Simulation of Filter Logic Against Actual Datasets
    def test_filter_simulation(self):
        print("\n--- Test 9: Question Filter Simulation on Official Data ---")
        # 1. Total Reading & Writing
        self.assertEqual(len(self.rw_questions), 1845)
        # 2. Total Math
        self.assertEqual(len(self.math_questions), 1925)
        
        # 3. Simulate English Easy filter
        rw_easy = [q for q in self.rw_questions if q["difficulty"] == "Easy"]
        self.assertGreater(len(rw_easy), 500)

        # 4. Simulate Math Algebra filter
        math_alg = [q for q in self.math_questions if q["domain"] == "Algebra"]
        self.assertEqual(len(math_alg), 616)

        # 5. Simulate Combined Hard filter
        combined = self.rw_questions + self.math_questions
        combined_hard = [q for q in combined if q["difficulty"] == "Hard"]
        self.assertEqual(len(combined_hard), 610 + 610)
        print(f"✅ Filter simulation passed: RW={len(self.rw_questions)}, Math={len(self.math_questions)}, Combined={len(combined)}")


def main():
    suite = unittest.TestLoader().loadTestsFromTestCase(TestQBSetupScreen)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    if not result.wasSuccessful():
        sys.exit(1)


if __name__ == "__main__":
    main()
