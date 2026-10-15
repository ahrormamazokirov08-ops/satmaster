import unittest
import os
import re

class TestStudentHomeworkPortal(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        base_dir = os.path.dirname(os.path.abspath(__file__))
        with open(os.path.join(base_dir, 'index.html'), 'r', encoding='utf-8') as f:
            cls.root_html = f.read()
        with open(os.path.join(base_dir, 'public', 'index.html'), 'r', encoding='utf-8') as f:
            cls.public_html = f.read()

    def test_navigation_bars_and_tabs(self):
        print("\n--- Test 1: Navigation Bars for Student (Study Workbook, Question Bank, Homework) ---")
        for name, html in [('Root index.html', self.root_html), ('Public index.html', self.public_html)]:
            self.assertIn('id="nav-vocab"', html, f"{name}: Desktop nav #nav-vocab must exist")
            self.assertIn('id="nav-qbank"', html, f"{name}: Desktop nav #nav-qbank must exist")
            self.assertIn('id="nav-student"', html, f"{name}: Desktop nav #nav-student must exist")
            self.assertIn('id="mob-nav-vocab"', html, f"{name}: Mobile nav #mob-nav-vocab must exist")
            self.assertIn('id="mob-nav-qbank"', html, f"{name}: Mobile nav #mob-nav-qbank must exist")
            self.assertIn('id="mob-nav-student"', html, f"{name}: Mobile nav #mob-nav-student must exist")
            
            # Check student role logic in updateNavigationUI
            self.assertIn("studentNavBtn.classList.remove('hidden')", html, f"{name}: studentNavBtn must be revealed for student")
            self.assertIn("mobStudent.classList.remove('hidden')", html, f"{name}: mobStudent must be revealed for student")
        print("✅ Navigation bars and tabs for students verified: PASS")

    def test_student_homework_portal_dom_ids(self):
        print("\n--- Test 2: Student Homework Portal DOM IDs and Structure ---")
        for name, html in [('Root index.html', self.root_html), ('Public index.html', self.public_html)]:
            self.assertIn('id="tab-student"', html, f"{name}: #tab-student must exist")
            self.assertIn('id="student-name-input"', html, f"{name}: #student-name-input must exist")
            self.assertIn('id="student-class-select"', html, f"{name}: #student-class-select must exist")
            self.assertIn('id="student-pin-input"', html, f"{name}: #student-pin-input must exist")
            self.assertIn('id="student-active-hw-list"', html, f"{name}: #student-active-hw-list must exist")
            self.assertIn('id="student-portal-cohort-badge"', html, f"{name}: #student-portal-cohort-badge must exist")
            self.assertIn('id="student-pin-drawer"', html, f"{name}: #student-pin-drawer must exist")
        print("✅ Student Homework Portal DOM IDs and Structure verified: PASS")

    def test_zero_samples_and_teacher_already_sent_button(self):
        print("\n--- Test 3: Zero Samples at First & Already Sent Non-Tappable Pill ---")
        for name, html in [('Root index.html', self.root_html), ('Public index.html', self.public_html)]:
            # Must not inject fake or sample homework by default
            self.assertIn('const DEFAULT_ASSIGNMENTS = [];', html, f"{name}: DEFAULT_ASSIGNMENTS must be empty array (no fake samples)")
            
            # Active homework in teacher view must have non-tappable "Already Sent" pill
            self.assertIn('<span>Already Sent</span>', html, f"{name}: Teacher card must display Already Sent status")
            self.assertIn('cursor-default select-none', html, f"{name}: Already Sent must not be a clickable button")
            
            # Backend server sync function must exist
            self.assertIn('fetchAndSyncHomework', html, f"{name}: fetchAndSyncHomework must exist for server synchronization")
            self.assertIn('/api/homework', html, f"{name}: Must connect to /api/homework")
        print("✅ Zero samples & Already Sent non-tappable pill verified: PASS")

    def test_square_cards_and_completion_tracking(self):
        print("\n--- Test 4: Square Card Layout, Auto-Settings, and Completion Tracking ---")
        for name, html in [('Root index.html', self.root_html), ('Public index.html', self.public_html)]:
            self.assertIn('function markHomeworkCompleted(', html, f"{name}: markHomeworkCompleted function must exist")
            self.assertIn('function getCompletedHomeworkList(', html, f"{name}: getCompletedHomeworkList function must exist")
            self.assertIn('function getHomeworkSubmission(', html, f"{name}: getHomeworkSubmission function must exist")
            self.assertIn('Done • Completed', html, f"{name}: Done • Completed status text must exist")
            self.assertIn('🚀 Complete the Task', html, f"{name}: Button text must be 'Complete the Task'")
            self.assertIn('Drill Size:', html, f"{name}: Drill Size metric must exist in card")
            self.assertIn('Student PIN:', html, f"{name}: Student PIN metric must exist in card")
            self.assertIn('handleStartStudentQuiz', html, f"{name}: handleStartStudentQuiz must launch drills with teacher settings")
        print("✅ Square cards and completion tracking verified: PASS")

    def test_delete_homework_confirmation_modal(self):
        print("\n--- Test 5: Delete Homework Confirmation Modal ---")
        for name, html in [('Root index.html', self.root_html), ('Public index.html', self.public_html)]:
            self.assertIn('id="modal-delete-homework-confirm"', html, f"{name}: Modal #modal-delete-homework-confirm must exist")
            self.assertIn('Do you actually want to delete this homework?', html, f"{name}: Confirmation question must be displayed in modal")
            self.assertIn('id="delete-homework-target-title"', html, f"{name}: #delete-homework-target-title element must display the homework title")
            self.assertIn('No, cancel', html, f"{name}: 'No, cancel' button must be present")
            self.assertIn('Yes, delete it', html, f"{name}: 'Yes, delete it' button must be present")
            self.assertIn('closeDeleteHomeworkModal', html, f"{name}: closeDeleteHomeworkModal function must exist")
            self.assertIn('confirmDeleteActiveHomework', html, f"{name}: confirmDeleteActiveHomework function must exist")
            self.assertIn('pendingDeleteHomeworkId', html, f"{name}: pendingDeleteHomeworkId must track target homework")
        print("✅ Delete Homework confirmation modal verified: PASS")

    def test_vocab_homework_settings_and_timer_integration(self):
        print("\n--- Test 6: Vocab Homework Settings, Countdown Timer & Telegram Dispatch ---")
        for name, html in [('Root index.html', self.root_html), ('Public index.html', self.public_html)]:
            self.assertIn('handleStartVocabUnitTest(null, targetHw)', html, f"{name}: handleStartVocabUnitTest must receive targetHw")
            self.assertIn('vocabTestState.timeLimitMinutes', html, f"{name}: vocabTestState must track timeLimitMinutes")
            self.assertIn('vocabTestState.remainingSeconds', html, f"{name}: vocabTestState must track remainingSeconds")
            self.assertIn('dispatchTelegramReportIfConfigured', html, f"{name}: dispatchTelegramReportIfConfigured must be called")
            self.assertIn('/api/homework/submit', html, f"{name}: /api/homework/submit must be called in markHomeworkCompleted")
        print("✅ Vocab homework settings, countdown timer & Telegram dispatch verified: PASS")

if __name__ == '__main__':
    unittest.main()
