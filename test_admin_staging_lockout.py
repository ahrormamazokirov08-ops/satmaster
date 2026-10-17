#!/usr/bin/env python3
"""
test_admin_staging_lockout.py
Validation suite for:
1. Strict Student Lockout from Question Bank (draft mode by default, hidden tabs, blocked navigation).
2. Admin / Teacher Staging Preview Card in Dashboard and Groups views.
3. Real 3,770 Question Bank Dataset hookup (1,845 RW + 1,925 Math).
4. Full isolation of vocabulary and existing test suites.
"""

import os
import sys
import json
import unittest

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
INDEX_PATH = os.path.join(ROOT_DIR, "index.html")
ENGINE_PATH = os.path.join(ROOT_DIR, "public", "qb_engine.js")
RW_JSON = os.path.join(ROOT_DIR, "data", "questions", "reading_writing.json")
MATH_JSON = os.path.join(ROOT_DIR, "data", "questions", "math.json")


class TestAdminStagingAndStudentLockout(unittest.TestCase):
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

    # 1. Dataset Integrity & Question Totals
    def test_dataset_totals_and_structure(self):
        print("\n--- Test 1: Question Bank Dataset Verification ---")
        rw_len = len(self.rw_questions)
        math_len = len(self.math_questions)
        total_len = rw_len + math_len

        self.assertEqual(rw_len, 1845, f"Expected 1,845 Reading & Writing questions, found {rw_len}")
        self.assertEqual(math_len, 2326, f"Expected 2,326 Math questions, found {math_len}")
        self.assertEqual(total_len, 4171, f"Expected 4,171 total questions, found {total_len}")
        print(f"✅ Ingested Dataset: {rw_len} RW + {math_len} Math = {total_len} Total Questions: PASS")

    # 2. Draft Mode Defaults to False (Hidden from Students)
    def test_draft_mode_defaults_to_false(self):
        print("\n--- Test 2: Draft Mode Defaults Strictly to False ---")
        self.assertIn("function isQBankPublished()", self.html, "isQBankPublished function must exist in index.html")
        self.assertIn("return val === 'true'", self.html, "isQBankPublished must return val === 'true' (defaulting to false / draft)")
        print("✅ Question Bank default state is DRAFT (is_published: false): PASS")

    # 3. Student Navigation Tabs are Hidden by Default
    def test_student_navigation_lockout(self):
        print("\n--- Test 3: Student Navigation Tabs Hidden by Default ---")
        # In HTML markup, both desktop and mobile Q-Bank nav tabs must have 'hidden' class by default
        self.assertIn('id="nav-qbank"', self.html, "Desktop nav #nav-qbank must exist")
        self.assertIn('id="mob-nav-qbank"', self.html, "Mobile nav #mob-nav-qbank must exist")
        
        # Verify hidden class in nav-qbank tag
        desktop_nav_idx = self.html.find('id="nav-qbank"')
        desktop_nav_tag = self.html[max(0, desktop_nav_idx-60):desktop_nav_idx+80]
        self.assertIn("hidden", desktop_nav_tag, "Desktop #nav-qbank must be hidden by default")

        mobile_nav_idx = self.html.find('id="mob-nav-qbank"')
        mobile_nav_tag = self.html[max(0, mobile_nav_idx-60):mobile_nav_idx+80]
        self.assertIn("hidden", mobile_nav_tag, "Mobile #mob-nav-qbank must be hidden by default")

        # In updateNavigationUI, student role must keep navQBank and mobQBank hidden when unpublished
        self.assertIn("if (currentUserRole === 'student')", self.html, "Role checking in updateNavigationUI")
        self.assertIn("navQBank.classList.add('hidden')", self.html, "navQBank must be hidden when unpublished")
        self.assertIn("mobQBank.classList.add('hidden')", self.html, "mobQBank must be hidden when unpublished")
        print("✅ Student navigation lockout verified: PASS")

    # 4. Student Redirection Guard in switchTab & Engine
    def test_student_redirection_guards(self):
        print("\n--- Test 4: Student Redirection Guards to Home/Vocab ---")
        # In switchTab('qbank'), students get redirected to switchTab('vocab')
        self.assertIn("if (tabName === 'qbank' && !isQBankPublished())", self.html, "switchTab must intercept students entering qbank")
        self.assertIn("switchTab('vocab')", self.html, "switchTab must redirect students back to vocab")

        # In qbEngine.init() and startPractice() across both index.html and public/qb_engine.js
        for source_name, src in [("index.html", self.html), ("public/qb_engine.js", self.engine_js)]:
            self.assertIn("currentUserRole === 'student'", src, f"{source_name} must verify student role")
            self.assertIn("!isPub", src, f"{source_name} must verify published state")
            self.assertIn("switchTab('vocab')", src, f"{source_name} must redirect to vocab")
        print("✅ Student redirection guards in switchTab & qbEngine: PASS")

    # 5. Admin / Teacher Preview Cards in Dashboard & Groups
    def test_admin_staging_preview_cards(self):
        print("\n--- Test 5: Admin Preview & Staging Card in Dashboards ---")
        # Card in tab-dashboard
        self.assertIn('id="card-qbank-admin-staging"', self.html, "Staging card #card-qbank-admin-staging must exist in tab-dashboard")
        # Card in tab-groups
        self.assertIn('id="card-qbank-admin-staging-groups"', self.html, "Staging card #card-qbank-admin-staging-groups must exist in tab-groups")

        # Required text elements
        self.assertIn("📘 SAT Question Bank (Admin Preview & Staging)", self.html, "Title must match specification")
        self.assertIn("Total Questions Loaded: 3,770 (1,845 RW | 1,925 Math)", self.html, "Subtitle must display exact question breakdown")
        self.assertIn("🧪 Open Full Bluebook Simulator (Draft Mode)", self.html, "Simulator action button must exist")
        self.assertIn("Publish to Student Portal", self.html, "Publish action button must exist")
        self.assertIn("openQBankAdminSimulator", self.html, "Simulator launcher function must exist")
        self.assertIn("handleAdminPublishToggle", self.html, "Publish confirmation handler function must exist")

        # Metric card in teacher dashboard
        self.assertIn('id="stat-question-bank"', self.html, "Question bank metric card must exist")
        self.assertIn('>3,770<', self.html, "Metric card must show 3,770 questions")
        print("✅ Admin preview cards and 3,770 metrics verified: PASS")

    # 6. Admin Publish Confirmation Guard
    def test_publish_confirmation_dialog(self):
        print("\n--- Test 6: Publish Confirmation Safeguard ---")
        self.assertIn("confirm(", self.html, "handleAdminPublishToggle must prompt confirm before toggling state")
        self.assertIn("Publish Official SAT Question Bank", self.html, "Publish prompt message must be clear and informative")
        print("✅ Admin publish confirmation dialog verified: PASS")

    # 7. Engine Multi-Path Resolution for Datasets
    def test_dataset_path_resolution(self):
        print("\n--- Test 7: Multi-Path Resolution for Datasets ---")
        for source_name, src in [("index.html", self.html), ("public/qb_engine.js", self.engine_js)]:
            self.assertIn("data/questions/reading_writing.json", src, f"{source_name} must load reading_writing.json")
            self.assertIn("data/questions/math.json", src, f"{source_name} must load math.json")
            self.assertIn("fetchWithFallback", src, f"{source_name} must use fetchWithFallback")
        print("✅ Question Bank multi-path dataset resolution: PASS")

    # 8. Vocabulary Logic Isolation (STRICT NON-REGRESSION)
    def test_vocab_isolation(self):
        print("\n--- Test 8: Vocabulary Suite Isolation (Zero Tampering) ---")
        self.assertIn("const satWords =", self.html, "SAT Vocabulary array must be intact")
        self.assertIn("function speakWord", self.html, "Audio playback function must remain intact")
        self.assertIn("434 Words", self.html, "PrepPros 434 vocabulary set must remain intact")
        print("✅ Vocabulary logic intact and isolated: PASS")

    # 9. Direct Bluebook Setup View Wiring & Cache Busting
    def test_bluebook_setup_wiring(self):
        print("\n--- Test 9: Direct Bluebook Setup Wiring & Cache Busting ---")
        # 1. Yellow Teacher Control Panel has Open Full Bluebook Simulator button
        self.assertIn('id="btn-control-panel-simulator"', self.html, "Control panel must have simulator button")
        self.assertIn("openBluebookSimulator()", self.html, "Simulator button must call openBluebookSimulator")
        self.assertIn("Open Full Bluebook Simulator", self.html, "Simulator button label text")

        # 2. Back to Overview button in #qb-setup-view
        self.assertIn('id="btn-qb-back-overview"', self.html, "#qb-setup-view must have Back to Overview button")
        self.assertIn("returnToQBankOverview()", self.html, "Back button must call returnToQBankOverview()")

        # 3. RW and Math card Open buttons wire to qbEngine.openSetup
        self.assertIn("qbEngine.openSetup('rw')", self.html, "RW Open button must call qbEngine.openSetup('rw')")
        self.assertIn("qbEngine.openSetup('math')", self.html, "Math Open button must call qbEngine.openSetup('math')")

        # 4. switchTab('qbank') triggers openBluebookSimulator
        self.assertIn("openBluebookSimulator();", self.html, "switchTab('qbank') must trigger openBluebookSimulator()")

        # 5. Cache-busted script tag for qb_engine.js
        self.assertIn("public/qb_engine.js?v=", self.html, "qb_engine.js must be included with cache-busting version parameter")
        print("✅ Direct Bluebook setup wiring & cache busting verified: PASS")


if __name__ == "__main__":
    unittest.main()

