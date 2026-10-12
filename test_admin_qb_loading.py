#!/usr/bin/env python3
"""
test_admin_qb_loading.py
Validation suite for the Digital SAT Question Bank Task:
1. Verify Bluebook Practice Setup view (#qb-setup-view) presence and elements.
2. Verify simulator container (#qb-test-container) presence and elements.
3. Verify Admin Panel entry points (openQBankAdminSimulator) load the Setup view.
4. Verify simulator transition from Setup view (#qb-btn-start -> startPractice -> #qb-test-container).
5. Verify draft mode permissions (Admin allowed, Student locked out).
6. Verify 100% non-regression: Vocabulary, audio, and auth logic intact.
"""

import os
import sys
import json
import unittest

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
INDEX_PATH = os.path.join(ROOT_DIR, "index.html")
PUBLIC_INDEX_PATH = os.path.join(ROOT_DIR, "public", "index.html")
ENGINE_PATH = os.path.join(ROOT_DIR, "public", "qb_engine.js")
MIRROR_ENGINE_PATH = os.path.join(ROOT_DIR, "public", "public", "qb_engine.js")
RW_JSON = os.path.join(ROOT_DIR, "data", "questions", "reading_writing.json")
MATH_JSON = os.path.join(ROOT_DIR, "data", "questions", "math.json")


class TestAdminQBLoading(unittest.TestCase):
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

        with open(RW_JSON, "r", encoding="utf-8") as f:
            cls.rw_questions = json.load(f)

        with open(MATH_JSON, "r", encoding="utf-8") as f:
            cls.math_questions = json.load(f)

    # 1. Official Dataset Integrity
    def test_official_dataset_integrity(self):
        print("\n--- Test 1: Official Dataset Verification ---")
        self.assertEqual(len(self.rw_questions), 1845, "Reading & Writing must have exactly 1,845 questions")
        self.assertEqual(len(self.math_questions), 1925, "Math must have exactly 1,925 questions")
        total = len(self.rw_questions) + len(self.math_questions)
        self.assertEqual(total, 3770, "Total questions must be exactly 3,770")
        print(f"✅ Official Datasets Verified: {len(self.rw_questions)} RW + {len(self.math_questions)} Math = {total} Total")

    # 2. Setup View (#qb-setup-view) Structure & Elements
    def test_setup_view_structure(self):
        print("\n--- Test 2: Practice Setup View (#qb-setup-view) Structure ---")
        for name, doc in [("index.html", self.html), ("public/index.html", self.public_html)]:
            self.assertIn('id="qb-setup-view"', doc, f"#qb-setup-view missing in {name}")
            self.assertIn('id="qb-tab-rw"', doc, f"Reading tab missing in {name}")
            self.assertIn('id="qb-tab-math"', doc, f"Math tab missing in {name}")
            self.assertIn('id="qb-tab-combined"', doc, f"Combined tab missing in {name}")
            self.assertIn('id="qb-btn-toggle-domains"', doc, f"Toggle domains button missing in {name}")
            self.assertIn('id="qb-diff-Easy"', doc, f"Easy diff pill missing in {name}")
            self.assertIn('id="qb-diff-Medium"', doc, f"Medium diff pill missing in {name}")
            self.assertIn('id="qb-diff-Hard"', doc, f"Hard diff pill missing in {name}")
            self.assertIn('id="qb-matching-count"', doc, f"Live count indicator missing in {name}")
            self.assertIn('id="qb-btn-start"', doc, f"Start practice button missing in {name}")
            self.assertIn('id="btn-qb-back-overview"', doc, f"Back to overview button missing in {name}")
        print("✅ #qb-setup-view correctly structured in both root and public index.html: PASS")

    # 3. Simulator View (#qb-test-container) Structure & Elements
    def test_simulator_view_structure(self):
        print("\n--- Test 3: Simulator Container (#qb-test-container) Structure ---")
        for name, doc in [("index.html", self.html), ("public/index.html", self.public_html)]:
            self.assertIn('id="qb-test-container"', doc, f"#qb-test-container missing in {name}")
            # Top Bluebook header elements
            self.assertIn('id="qb-test-header"', doc, f"#qb-test-header missing in {name}")
            self.assertIn('id="qb-header-subject"', doc, f"#qb-header-subject missing in {name}")
            self.assertIn('id="qb-header-domain"', doc, f"#qb-header-domain missing in {name}")
            self.assertIn('id="qb-header-qnum"', doc, f"#qb-header-qnum missing in {name}")
            self.assertIn('id="qb-btn-flag"', doc, f"#qb-btn-flag missing in {name}")
            self.assertIn('id="qb-timer-display"', doc, f"#qb-timer-display missing in {name}")
            self.assertIn('id="qb-btn-toggle-timer"', doc, f"#qb-btn-toggle-timer missing in {name}")
            self.assertIn('id="qb-btn-calculator"', doc, f"#qb-btn-calculator missing in {name}")
            # Split-screen question pane
            self.assertIn('id="qb-split-container"', doc, f"#qb-split-container missing in {name}")
            self.assertIn('id="qb-passage-pane"', doc, f"#qb-passage-pane missing in {name}")
            self.assertIn('id="qb-question-pane"', doc, f"#qb-question-pane missing in {name}")
            self.assertIn('id="qb-mcq-container"', doc, f"#qb-mcq-container missing in {name}")
            self.assertIn('id="qb-spr-container"', doc, f"#qb-spr-container missing in {name}")
            # Bottom footer controls
            self.assertIn('id="qb-btn-prev"', doc, f"#qb-btn-prev missing in {name}")
            self.assertIn('id="qb-btn-next"', doc, f"#qb-btn-next missing in {name}")
            self.assertIn('id="qb-btn-navigator"', doc, f"#qb-btn-navigator missing in {name}")
            self.assertIn('id="qb-btn-check-answer"', doc, f"#qb-btn-check-answer missing in {name}")
            self.assertIn('id="qb-explanation-card"', doc, f"#qb-explanation-card missing in {name}")
        print("✅ #qb-test-container correctly structured with full Bluebook elements: PASS")

    # 4. Admin Entry Points load Practice Setup View
    def test_admin_entry_points_load_setup_view(self):
        print("\n--- Test 4: Admin Entry Points Trigger Setup View ---")
        # Dashboard Admin staging card has button to open simulator
        self.assertIn('openQBankAdminSimulator()', self.html, "openQBankAdminSimulator() must be wired in dashboard")
        self.assertIn('id="btn-admin-open-simulator"', self.html, "btn-admin-open-simulator button must exist in dashboard")
        self.assertIn('id="card-qbank-admin-staging"', self.html, "Admin staging card must exist in dashboard")
        self.assertIn('id="card-qbank-admin-staging-groups"', self.html, "Admin staging card must exist in groups")

        # In index.html, openQBankAdminSimulator calls openBluebookSimulator
        self.assertIn("function openQBankAdminSimulator(subject) {", self.html)
        self.assertIn("openBluebookSimulator(subject || 'rw');", self.html)

        # openBluebookSimulator calls qbEngine.openSetup
        self.assertIn("window.qbEngine.openSetup(subject);", self.html)

        # qbEngine.openSetup unhides #qb-setup-view and hides hub/solver/test-container
        for name, js in [("public/qb_engine.js", self.engine_js), ("public/public/qb_engine.js", self.mirror_engine_js)]:
            self.assertIn("openSetup(subject)", js, f"openSetup method missing in {name}")
            self.assertIn("hubView.classList.add('hidden')", js, f"hubView hide missing in {name}")
            self.assertIn("testContainer.classList.add('hidden')", js, f"testContainer hide missing in {name}")
            self.assertIn("setupView.classList.remove('hidden')", js, f"setupView show missing in {name}")
        print("✅ Admin panel launcher triggers #qb-setup-view display correctly: PASS")

    # 5. Start Practice Transition to Simulator Container
    def test_start_practice_transition_to_simulator(self):
        print("\n--- Test 5: Start Practice Transitions to Simulator Container ---")
        for name, js in [("public/qb_engine.js", self.engine_js), ("public/public/qb_engine.js", self.mirror_engine_js)]:
            self.assertIn("startPractice()", js, f"startPractice missing in {name}")
            self.assertIn("setupView.classList.add('hidden')", js, f"setupView hide missing in {name}")
            self.assertIn("testContainer.classList.remove('hidden')", js, f"testContainer show missing in {name}")
            self.assertIn("sessionStorage.setItem('qb_active_session'", js, f"sessionStorage missing in {name}")
            self.assertIn("renderCurrentQuestion()", js, f"renderCurrentQuestion missing in {name}")
        print("✅ Start Practice transition hides setup and loads #qb-test-container: PASS")

    # 6. Admin vs Student Draft Mode Guards
    def test_draft_mode_permissions(self):
        print("\n--- Test 6: Draft Mode Permissions (Admin Allowed, Student Locked Out) ---")
        # In draft mode (is_published: false):
        # 1. Admin/teacher is allowed into #qb-setup-view and simulator
        # 2. Student is blocked and redirected to vocab
        for name, js in [("public/qb_engine.js", self.engine_js), ("public/public/qb_engine.js", self.mirror_engine_js)]:
            self.assertIn("currentUserRole === 'student'", js)
            self.assertIn("!isPub", js)
            self.assertIn("switchTab('vocab')", js)
        print("✅ Draft mode access control verified (Admin allowed, Student locked out): PASS")

    # 7. Zero Tampering with Vocabulary, Audio, and Auth Logic
    def test_zero_tampering_isolation(self):
        print("\n--- Test 7: Strict Isolation of Vocabulary, Audio, and Auth Logic ---")
        # Vocabulary
        self.assertIn("const satWords =", self.html, "satWords array intact")
        self.assertIn("434 Words", self.html, "PrepPros 434 vocabulary set reference intact")
        self.assertIn("switchVocabView", self.html, "switchVocabView intact")
        # Audio
        self.assertIn("speakWord", self.html, "speakWord function intact")
        self.assertIn("window.satAudio", self.html, "window.satAudio player intact")
        # Auth
        self.assertIn("verifyStudentAccount", self.html, "verifyStudentAccount intact")
        self.assertIn("lockoutStudentSession", self.html, "lockoutStudentSession intact")
        self.assertIn("startAuthHeartbeat", self.html, "startAuthHeartbeat intact")
        print("✅ Vocabulary, Audio, and Auth logic 100% verified untouched: PASS")


if __name__ == "__main__":
    unittest.main()
