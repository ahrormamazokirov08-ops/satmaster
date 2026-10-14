#!/usr/bin/env python3
"""
test_homework_creator.py
Verifies the new streamlined Teacher Homework Creator UI,
SAT Vocab vs SAT Question Bank selection, dynamic domain checkboxes,
and the guaranteed selection from unsolved questions pool.
"""

import unittest
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

class TestHomeworkCreator(unittest.TestCase):
    def setUp(self):
        with open(os.path.join(BASE_DIR, "index.html"), "r", encoding="utf-8") as f:
            self.root_html = f.read()
        with open(os.path.join(BASE_DIR, "public", "index.html"), "r", encoding="utf-8") as f:
            self.public_html = f.read()

    def test_01_creator_ui_elements_exist_in_both_files(self):
        for name, html in [("root index.html", self.root_html), ("public/index.html", self.public_html)]:
            self.assertIn('id="creator-class-select"', html, f"Class select missing in {name}")
            self.assertIn('id="creator-hw-title"', html, f"Title input missing in {name}")
            self.assertIn('id="creator-hw-deadline"', html, f"Deadline input missing in {name}")
            self.assertIn('id="creator-hw-timer"', html, f"Timer select missing in {name}")
            self.assertIn('id="creator-card-type-vocab"', html, f"Vocab card missing in {name}")
            self.assertIn('id="creator-card-type-qbank"', html, f"QBank card missing in {name}")
            self.assertIn('id="creator-vocab-settings"', html, f"Vocab settings missing in {name}")
            self.assertIn('id="creator-qbank-settings"', html, f"QBank settings missing in {name}")
            self.assertIn('id="creator-domains-container"', html, f"Domains container missing in {name}")
            self.assertIn('id="btn-submit-homework"', html, f"Submit button missing in {name}")

    def test_02_unsolved_questions_guarantee_banner_and_logic(self):
        for name, html in [("root index.html", self.root_html), ("public/index.html", self.public_html)]:
            self.assertIn('Unsolved Questions Guarantee', html, f"Unsolved guarantee banner missing in {name}")
            self.assertIn("filter: 'unsolved'", html, f"Strict unsolved filter setting missing in {name}")
            self.assertIn("activeStatusFilter = 'unsolved'", html, f"Engine activeStatusFilter unsolved missing in {name}")

    def test_03_qbank_section_and_domain_metadata(self):
        for name, html in [("root index.html", self.root_html), ("public/index.html", self.public_html)]:
            self.assertIn('Craft and Structure', html)
            self.assertIn('Information and Ideas', html)
            self.assertIn('Standard English Conventions', html)
            self.assertIn('Expression of Ideas', html)
            self.assertIn('Algebra', html)
            self.assertIn('Advanced Math', html)
            self.assertIn('Problem-Solving and Data Analysis', html)
            self.assertIn('Geometry and Trigonometry', html)

    def test_04_student_one_click_launch_wiring(self):
        for name, html in [("root index.html", self.root_html), ("public/index.html", self.public_html)]:
            self.assertIn("targetHw.type === 'vocab'", html)
            self.assertIn("targetHw.type === 'qbank'", html)
            self.assertIn("window.qbEngine.activeStatusFilter = 'unsolved'", html)
            self.assertIn("window.qbEngine.startPractice()", html)

    def test_05_vocab_and_audio_zero_tampering(self):
        for name, html in [("root index.html", self.root_html), ("public/index.html", self.public_html)]:
            self.assertIn('satWords', html)
            self.assertIn('satAudio', html)
            self.assertIn('speakWord', html)

if __name__ == '__main__':
    unittest.main()
