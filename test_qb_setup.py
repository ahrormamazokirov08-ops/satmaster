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
        # Starting presets
        for count in [20, 30, 40, 50, "custom"]:
            self.assertIn(f'id="qb-count-{count}"', self.html, f"Count pill for {count} must exist")
        # Quick selection buttons in custom panel
        for quick in [5, 10, 15, 25, "max"]:
            self.assertIn(f'id="qb-count-{quick}"', self.html, f"Quick button for {quick} must exist")
        self.assertIn('id="qb-custom-count-input"', self.html, "Custom count input must exist")
        self.assertIn('id="qb-custom-count-wrapper"', self.html, "Downward custom wrapper must exist")
        self.assertIn('id="qb-custom-count-display"', self.html, "Custom count display must exist")
        self.assertIn('id="qb-custom-max-badge"', self.html, "Section availability remark badge must exist")
        self.assertIn('id="qb-custom-max-remark"', self.html, "Section availability remark text must exist")
        self.assertIn('adjustCustomCount', self.engine_js, "Engine must implement adjustCustomCount")
        self.assertIn('setCustomCountDirect', self.engine_js, "Engine must implement setCustomCountDirect")
        self.assertIn('updateCustomRemark', self.engine_js, "Engine must implement updateCustomRemark")
        print("✅ Question count selector (presets 20, 30, 40, 50, downward custom button selector, & remark) verified: PASS")

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
        self.assertEqual(len(self.math_questions), 2030)
        
        # 3. Simulate English Easy filter
        rw_easy = [q for q in self.rw_questions if q["difficulty"] == "Easy"]
        self.assertGreater(len(rw_easy), 500)

        # 4. Simulate Math Algebra filter
        math_alg = [q for q in self.math_questions if q["domain"] == "Algebra"]
        self.assertEqual(len(math_alg), 649)

        # 5. Simulate Combined Hard filter (610 RW + 105 Math authentic hard questions)
        combined = self.rw_questions + self.math_questions
        combined_hard = [q for q in combined if q["difficulty"] == "Hard"]
        self.assertEqual(len(combined_hard), 610 + 105)
        print(f"✅ Filter simulation passed: RW={len(self.rw_questions)}, Math={len(self.math_questions)}, Combined={len(combined)}")

    # 10. Two-Stage Navigation DOM Structure (Hub vs Detail Views)
    def test_two_stage_navigation_elements(self):
        print("\n--- Test 10: Two-Stage Navigation DOM Elements (Hub vs Detail Views) ---")
        public_html_path = os.path.join(ROOT_DIR, "public", "index.html")
        with open(public_html_path, "r", encoding="utf-8") as f:
            pub_html = f.read()

        for name, markup in [("index.html", self.html), ("public/index.html", pub_html)]:
            self.assertIn('id="qb-hub-view"', markup, f"#qb-hub-view must exist in {name}")
            self.assertIn('id="qb-detail-view"', markup, f"#qb-detail-view must exist in {name}")
            self.assertIn('id="btn-qb-back-hub"', markup, f"#btn-qb-back-hub must exist in {name}")
            self.assertIn('id="qb-skills-list-container"', markup, f"#qb-skills-list-container must exist in {name}")
            self.assertIn('id="qb-practice-all-subtitle"', markup, f"#qb-practice-all-subtitle must exist in {name}")
            self.assertIn("qbEngine.selectSubjectView('rw')", markup, f"RW card must call selectSubjectView('rw') in {name}")
            self.assertIn("qbEngine.selectSubjectView('math')", markup, f"Math card must call selectSubjectView('math') in {name}")
            self.assertIn("qbEngine.backToHub()", markup, f"Back button must call backToHub() in {name}")
            self.assertIn("qbEngine.startPracticeAll()", markup, f"Hero card must call startPracticeAll() in {name}")
        print("✅ Two-stage navigation DOM elements verified across root and public index.html: PASS")

    # 11. OnePrep Hierarchical Engine Methods
    def test_oneprep_engine_methods(self):
        print("\n--- Test 11: OnePrep Hierarchical State Engine Methods ---")
        mirror_path = os.path.join(ROOT_DIR, "public", "public", "qb_engine.js")
        with open(mirror_path, "r", encoding="utf-8") as f:
            mirror_js = f.read()

        new_methods = [
            "selectSubjectView", "backToHub", "normalizeSkill",
            "renderSkillList", "onSkillChange", "toggleDomainSkills",
            "toggleAllSkills", "startPracticeAll", "syncSubjectDetailHeader"
        ]
        for name, js_code in [("public/qb_engine.js", self.engine_js), ("public/public/qb_engine.js", mirror_js)]:
            for m in new_methods:
                self.assertIn(m, js_code, f"{name} must implement {m}()")
            self.assertIn("skillHierarchy", js_code, f"{name} must define skillHierarchy")
            self.assertIn("activeView: 'hub'", js_code, f"{name} must default activeView to 'hub'")
            self.assertIn("selectedSkills: new Set()", js_code, f"{name} must define selectedSkills Set")
        print("✅ OnePrep engine methods verified across bundles: PASS")

    # 12. Authentic College Board Skill Hierarchy Counts
    def test_authentic_skill_hierarchy_counts(self):
        print("\n--- Test 12: Authentic Skill Hierarchy Counts (10 RW + 19 Math) ---")
        from collections import Counter

        def norm_s(s):
            if not s: return ""
            s = s.strip()
            if s.lower() == "cross-text connections":
                return "Cross-Text Connections"
            return s

        rw_skills = Counter(norm_s(q.get("skill")) for q in self.rw_questions)
        self.assertEqual(len(rw_skills), 10, "RW dataset must contain exactly 10 skills")
        expected_rw = {
            "Words in Context": 261,
            "Text Structure and Purpose": 149,
            "Cross-Text Connections": 61,
            "Command of Evidence": 277,
            "Inferences": 140,
            "Central Ideas and Details": 138,
            "Boundaries": 213,
            "Form, Structure, and Sense": 208,
            "Rhetorical Synthesis": 204,
            "Transitions": 194
        }
        for sk, count in expected_rw.items():
            self.assertEqual(rw_skills[sk], count, f"RW Skill '{sk}' must have exactly {count} questions")
        self.assertEqual(sum(rw_skills.values()), 1845, "RW skills must sum to 1,845 questions")

        math_skills = Counter(norm_s(q.get("skill")) for q in self.math_questions)
        self.assertEqual(len(math_skills), 19, "Math dataset must contain exactly 19 skills")
        expected_math = {
            "Linear functions": 177,
            "Linear equations in two variables": 134,
            "Systems of two linear equations in two variables": 130,
            "Linear equations in one variable": 119,
            "Linear inequalities in one or two variables": 89,
            "Nonlinear functions": 291,
            "Nonlinear equations in one variable and systems of equations in two variables": 177,
            "Equivalent expressions": 130,
            "Ratios, rates, proportional relationships, and units": 97,
            "Percentages": 93,
            "One-variable data: Distributions and measures of center and spread": 84,
            "Two-variable data: Models and scatterplots": 72,
            "Probability and conditional probability": 49,
            "Inference from sample statistics and margin of error": 28,
            "Evaluating statistical claims: Observational studies and experiments": 12,
            "Area and volume": 110,
            "Lines, angles, and triangles": 102,
            "Right triangles and trigonometry": 69,
            "Circles": 67
        }
        for sk, count in expected_math.items():
            self.assertEqual(math_skills[sk], count, f"Math Skill '{sk}' must have exactly {count} questions")
        self.assertEqual(sum(math_skills.values()), 2030, "Math skills must sum to 2,030 questions")
        print("✅ Official 10 RW + 19 Math skills exactly match ingested datasets (3,875 total): PASS")

    # 13. Skill-Level Filtering Simulation
    def test_skill_level_filtering_simulation(self):
        print("\n--- Test 13: Skill-Level Practice Filtering Simulation ---")
        def norm_s(s):
            if not s: return ""
            s = s.strip()
            if s.lower() == "cross-text connections":
                return "Cross-Text Connections"
            return s

        # 1. Practice ONLY Transitions
        transitions_only = [q for q in self.rw_questions if norm_s(q.get("skill")) == "Transitions"]
        self.assertEqual(len(transitions_only), 194)

        # 2. Practice Transitions + Words in Context
        combo = [q for q in self.rw_questions if norm_s(q.get("skill")) in {"Transitions", "Words in Context"}]
        self.assertEqual(len(combo), 194 + 261)

        # 3. Practice Nonlinear functions only in Math
        nonlinear = [q for q in self.math_questions if norm_s(q.get("skill")) == "Nonlinear functions"]
        self.assertEqual(len(nonlinear), 291)

        # 4. Empty skill selection produces 0 questions
        empty_sel = [q for q in self.rw_questions if norm_s(q.get("skill")) in set()]
        self.assertEqual(len(empty_sel), 0)
        print("✅ Skill-level practice filtering simulation passed: PASS")


def main():
    suite = unittest.TestLoader().loadTestsFromTestCase(TestQBSetupScreen)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    if not result.wasSuccessful():
        sys.exit(1)


if __name__ == "__main__":
    main()
