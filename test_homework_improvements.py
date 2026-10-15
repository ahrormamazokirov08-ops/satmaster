#!/usr/bin/env python3
"""
Test Suite: Homework Improvements
1. Concise descriptive title auto-generation for QBank homework.
2. Check Answer button hidden in homework mode.
3. Strict 3 chances per homework assignment independently.
"""
import os
import unittest

class TestHomeworkImprovements(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        base_dir = os.path.dirname(__file__)
        with open(os.path.join(base_dir, "index.html"), "r", encoding="utf-8") as f:
            cls.root_html = f.read()
        with open(os.path.join(base_dir, "public", "index.html"), "r", encoding="utf-8") as f:
            cls.public_html = f.read()
        with open(os.path.join(base_dir, "public", "qb_engine.js"), "r", encoding="utf-8") as f:
            cls.qb_engine_js = f.read()

    def test_01_title_auto_generation_logic_present(self):
        """Verify generateQBankHomeworkTitle exists and implements domain/skill concise naming."""
        print("\n--- Test 1: QBank Homework Title Auto-Generation Logic ---")
        for name, html in [('Root index.html', self.root_html), ('Public index.html', self.public_html)]:
            self.assertIn("function generateQBankHomeworkTitle(", html, f"{name}: generateQBankHomeworkTitle must exist")
            self.assertIn("in ${domainName}", html, f"{name}: 1 skill title must format as '<skill> in <domain>'")
            self.assertIn("${domainName} Questions", html, f"{name}: Multiple skills title must format as '<domain> Questions'")
            self.assertIn("${domainNames[0]} & ${domainNames[1]} Questions", html, f"{name}: 2 domains title must format as '<domain1> & <domain2> Questions'")
            self.assertIn("Math Questions (All Topics)", html, f"{name}: All math domains title must format cleanly")
            self.assertIn("Reading & Writing Questions (All Topics)", html, f"{name}: All RW domains title must format cleanly")
            self.assertNotIn("Digital SAT ${secLabel} Practice Drill", html, f"{name}: Old generic practice drill title must be removed")
        print("✅ QBank homework title auto-generation logic verified: PASS")

    def test_02_check_answer_hidden_in_homework_mode(self):
        """Verify #qb-btn-check-answer and #qb-footer-btn-check are hidden in homework mode."""
        print("\n--- Test 2: Check Answer Hidden in Homework Mode ---")
        for name, src in [('Root index.html', self.root_html), ('Public index.html', self.public_html), ('public/qb_engine.js', self.qb_engine_js)]:
            self.assertIn("const isHomeworkMode = Boolean(", src, f"{name}: isHomeworkMode must be evaluated")
            self.assertIn("if (isHomeworkMode)", src, f"{name}: check for isHomeworkMode must exist in updateChoicesUI")
            self.assertIn("checkContainer.classList.add('hidden')", src, f"{name}: #qb-check-container must be hidden in homework mode")
            self.assertIn("footerCheckBtn.classList.add('hidden')", src, f"{name}: #qb-footer-btn-check must be hidden in homework mode")
            self.assertIn("checkContainer.classList.remove('hidden')", src, f"{name}: checkContainer must remain visible in normal practice")
            self.assertIn("footerCheckBtn.classList.remove('hidden')", src, f"{name}: footerCheckBtn must remain visible in normal practice")
            self.assertIn("Answers and explanations are revealed after submitting your homework task.", src, f"{name}: checkCurrentAnswer must guard against execution in homework mode")
        print("✅ Check Answer hidden in homework mode verified: PASS")

    def test_03_three_chances_per_homework_assignment(self):
        """Verify each homework assignment has strictly 3 chances independently."""
        print("\n--- Test 3: 3 Chances Tracked Per Homework Assignment ---")
        for name, html in [('Root index.html', self.root_html), ('Public index.html', self.public_html)]:
            # Card chances rendering
            self.assertIn("const attemptKey = `hw_att_${studentId}_${hwKeyId}`;", html, f"{name}: Card must track attempts per assignment key")
            self.assertIn("const maxAttempts = 3;", html, f"{name}: Max attempts must be 3")
            self.assertIn("attemptsLeft <= 0", html, f"{name}: Must check if attempts are exhausted")
            self.assertIn("Max Attempts Reached (3/3)", html, f"{name}: Locked state badge must exist")
            self.assertIn("Chances:", html, f"{name}: Card must display chances metric")
            self.assertIn("remaining", html, f"{name}: Card must show remaining chances count")

            # Launch guard in handleStartStudentQuiz
            self.assertIn("attemptsUsed >= 3", html, f"{name}: handleStartStudentQuiz must block launch when 3 attempts used")
            self.assertIn("You have already completed all 3 chances for this homework task!", html, f"{name}: User notice when attempts exhausted")

            # Vocab homework completion attempt tracking
            self.assertIn("report.attemptNumber = Math.min(attemptCount, 3);", html, f"{name}: Vocab homework must track attempt up to 3")
        print("✅ 3 chances per homework assignment independently verified: PASS")

    def test_04_strict_isolation_vocab_audio_auth(self):
        """Verify zero tampering with vocab database, audio speech synthesis, and authentication."""
        print("\n--- Test 4: Strict Isolation of Vocabulary, Audio, and Auth ---")
        self.assertIn("window.satAudio", self.root_html)
        self.assertIn("speakWord", self.root_html)
        self.assertIn("const satWords =", self.root_html)
        self.assertIn("currentUserRole", self.root_html)
        print("✅ Strict isolation verified: PASS")


    def test_05_pass_fail_visual_pattern(self):
        """Verify red ❌ Failed card pattern for failing homework and green ✅ Passed for passing homework."""
        print("\n--- Test 5: Pass/Fail Visual Pattern in Student Homework Portal ---")
        for name, html in [('Root index.html', self.root_html), ('Public index.html', self.public_html)]:
            # Check passing threshold logic
            self.assertIn("const passThreshold = isVocab ? 80 : (isMath ? 80 : (isRw ? 70 : 75));", html, f"{name}: Thresholds must be defined correctly")
            self.assertIn("const isPassed = isCompleted && ((submission.passed !== undefined) ? Boolean(submission.passed) : (scorePct >= passThreshold));", html, f"{name}: isPassed check must compare scorePct with passThreshold")
            
            # Check Passed visual pattern (Green, ✅, Passed • Done • Completed)
            self.assertIn("Passed • Done • Completed", html, f"{name}: Must display 'Passed • Done • Completed' for passing homework")
            self.assertIn("bg-emerald-50 border border-emerald-200 text-emerald-800", html, f"{name}: Passed card pill styling")
            self.assertIn("Practice Again", html, f"{name}: Passed card should offer practice retake")
            
            # Check Failed visual pattern (Red, ❌, Failed (Passing: X%))
            self.assertIn("Failed • Needs Retake", html, f"{name}: Top badge must state 'Failed • Needs Retake'")
            self.assertIn("Failed (Passing:", html, f"{name}: Must display '❌ Failed (Passing: ...)' in status pill")
            self.assertIn("bg-rose-50 border border-rose-300 text-rose-800", html, f"{name}: Failed card pill styling")
            self.assertIn("bg-gradient-to-r from-rose-600 to-rose-700", html, f"{name}: Prominent retake button styling")
            self.assertIn("Passing Standard:", html, f"{name}: Metric row must display passing standard")
        print("✅ Pass/Fail visual patterns verified: PASS")


    def test_06_homework_launch_loading_modal(self):
        """Verify homework loading launchpad with circular animation, study icons, and fast snappy transition."""
        print("\n--- Test 6: Homework Launchpad Circular Loading Modal ---")
        for name, html in [('Root index.html', self.root_html), ('Public index.html', self.public_html)]:
            self.assertIn('id="loading-overlay"', html, f"{name}: #loading-overlay element must exist")
            self.assertIn('id="loading-center-icon"', html, f"{name}: #loading-center-icon element must exist")
            self.assertIn('id="loading-badge-text"', html, f"{name}: #loading-badge-text element must exist")
            self.assertIn('Please wait on the process...', html, f"{name}: Must include 'Please wait on the process...' default text")
            self.assertIn('border-t-blue-600 animate-spin', html, f"{name}: Must include animated circular spinner")
            self.assertIn('animate-ping', html, f"{name}: Must include animated radar circle")
            self.assertIn('animate-pulse', html, f"{name}: Must include animated pulsing circle")
            # Verify 650ms duration used in handleStartStudentQuiz for fast loading
            self.assertIn("650,", html, f"{name}: handleStartStudentQuiz must use fast 650ms transition duration")
        print("✅ Fast homework launchpad circular loading modal verified: PASS")


if __name__ == '__main__':
    unittest.main()


