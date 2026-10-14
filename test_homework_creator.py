#!/usr/bin/env python3
"""
test_homework_creator.py
Verifies the new streamlined Teacher Homework Creator UI,
SAT Vocab vs SAT Question Bank selection, dynamic detailed skills hierarchy,
custom title protection, and guaranteed selection from unsolved questions pool.
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
            self.assertIn('id="creator-hw-type-select"', html, f"Compact type select missing in {name}")
            self.assertIn('id="creator-vocab-settings"', html, f"Vocab settings missing in {name}")
            self.assertIn('id="creator-qbank-settings"', html, f"QBank settings missing in {name}")
            self.assertIn('id="creator-domains-container"', html, f"Domains container missing in {name}")
            self.assertIn('id="btn-add-done-homework"', html, f"Done button missing in {name}")

    def test_02_unsolved_questions_guarantee_banner_and_logic(self):
        for name, html in [("root index.html", self.root_html), ("public/index.html", self.public_html)]:
            self.assertIn('Unsolved Questions Guarantee', html, f"Unsolved guarantee banner missing in {name}")
            self.assertIn("filter: 'unsolved'", html, f"Strict unsolved filter setting missing in {name}")
            self.assertIn("activeStatusFilter = 'unsolved'", html, f"Engine activeStatusFilter unsolved missing in {name}")

    def test_03_detailed_skills_hierarchy_matching_pic_5(self):
        for name, html in [("root index.html", self.root_html), ("public/index.html", self.public_html)]:
            # Check domains
            self.assertIn('Algebra', html)
            self.assertIn('Advanced Math', html)
            self.assertIn('Problem-Solving and Data Analysis', html)
            self.assertIn('Geometry and Trigonometry', html)
            self.assertIn('Craft and Structure', html)
            self.assertIn('Information and Ideas', html)
            self.assertIn('Standard English Conventions', html)
            self.assertIn('Expression of Ideas', html)
            # Check detailed skills from Pic 5
            self.assertIn('Linear functions', html)
            self.assertIn('Linear equations in two variables', html)
            self.assertIn('Systems of two linear equations in two variables', html)
            self.assertIn('Nonlinear functions', html)
            self.assertIn('Equivalent expressions', html)
            self.assertIn('Ratios, rates, proportional relationships, and units', html)

    def test_04_custom_title_handling_preserves_user_input(self):
        for name, html in [("root index.html", self.root_html), ("public/index.html", self.public_html)]:
            self.assertIn('handleCreatorTitleInput', html)
            self.assertIn('hasCustomTitle', html)

    def test_05_student_one_click_launch_wiring(self):
        for name, html in [("root index.html", self.root_html), ("public/index.html", self.public_html)]:
            self.assertIn("targetHw.type === 'vocab'", html)
            self.assertIn("targetHw.type === 'qbank'", html)
            self.assertIn("window.qbEngine.activeStatusFilter = 'unsolved'", html)
            self.assertIn("window.qbEngine.startPractice()", html)

    def test_06_vocab_and_audio_zero_tampering(self):
        for name, html in [("root index.html", self.root_html), ("public/index.html", self.public_html)]:
            self.assertIn('satWords', html)
            self.assertIn('satAudio', html)
            self.assertIn('speakWord', html)

    def test_07_homework_hub_views_and_staging_queue_dom(self):
        for name, html in [("root index.html", self.root_html), ("public/index.html", self.public_html)]:
            self.assertIn('id="creator-hub-view"', html, f"Hub view missing in {name}")
            self.assertIn('id="creator-form-view"', html, f"Form view missing in {name}")
            self.assertIn('id="creator-staging-section"', html, f"Staging section missing in {name}")
            self.assertIn('id="creator-staging-list"', html, f"Staging list missing in {name}")
            self.assertIn('id="staging-select-all"', html, f"Staging select-all missing in {name}")
            self.assertIn('id="btn-send-selected-staged"', html, f"Send selected button missing in {name}")
            self.assertIn('id="btn-add-done-homework"', html, f"Add done button missing in {name}")
            self.assertIn('id="btn-creator-back"', html, f"Back button missing in {name}")
            # Ensure eliminated elements per user request are not present
            self.assertNotIn('id="btn-hub-create-new"', html, f"Top hub header banner button should be removed in {name}")
            self.assertNotIn('id="btn-add-another-homework"', html, f"Add another button should be removed in {name}")

    def test_08_active_homework_grid_and_deadline_persistence(self):
        for name, html in [("root index.html", self.root_html), ("public/index.html", self.public_html)]:
            self.assertIn('id="creator-active-cards-grid"', html, f"Active cards grid missing in {name}")
            self.assertIn('id="active-hw-count-badge"', html, f"Active count badge missing in {name}")
            self.assertIn('dl >= now', html, f"Deadline expiration filter missing in {name}")
            self.assertIn('handleNotifyOrCopyHomework', html, f"Notify/share handler missing in {name}")
            self.assertIn('handleDeleteActiveHomework', html, f"Delete active hw handler missing in {name}")

    def test_09_staging_and_selective_batch_dispatch_controllers(self):
        for name, html in [("root index.html", self.root_html), ("public/index.html", self.public_html)]:
            self.assertIn('getStagedHomework', html, f"getStagedHomework missing in {name}")
            self.assertIn('saveStagedHomework', html, f"saveStagedHomework missing in {name}")
            self.assertIn('handleAddToQueue', html, f"handleAddToQueue missing in {name}")
            self.assertIn('renderStagingQueue', html, f"renderStagingQueue missing in {name}")
            self.assertIn('toggleSelectAllStagedHomework', html, f"toggleSelectAllStagedHomework missing in {name}")
            self.assertIn('handleSendSelectedHomework', html, f"handleSendSelectedHomework missing in {name}")
            self.assertIn('handleSendSingleStagedHomework', html, f"handleSendSingleStagedHomework missing in {name}")
            self.assertIn('renderActiveHomeworkGrid', html, f"renderActiveHomeworkGrid missing in {name}")

if __name__ == '__main__':
    unittest.main()
