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

    def test_default_assignments_matching_teacher_view(self):
        print("\n--- Test 3: Default Assignments matching Teacher View (MATH-46, HW-95, QB-24) ---")
        for name, html in [('Root index.html', self.root_html), ('Public index.html', self.public_html)]:
            self.assertIn('MATH-46', html, f"{name}: MATH-46 must exist in DEFAULT_ASSIGNMENTS")
            self.assertIn('HW-95', html, f"{name}: HW-95 must exist in DEFAULT_ASSIGNMENTS")
            self.assertIn('QB-24', html, f"{name}: QB-24 must exist in DEFAULT_ASSIGNMENTS")
            self.assertIn('SAT Masters 2026', html, f"{name}: SAT Masters 2026 cohort must exist in DEFAULT_ASSIGNMENTS")
            self.assertIn('assign-vocab-lesson-1', html, f"{name}: assign-vocab-lesson-1 must exist")
            self.assertIn('assign-vocab-lesson-4', html, f"{name}: assign-vocab-lesson-4 must exist")
            self.assertIn('assign-qb-01', html, f"{name}: assign-qb-01 must exist")
        print("✅ Default assignments matching teacher view verified: PASS")

    def test_square_cards_and_completion_tracking(self):
        print("\n--- Test 4: Square Card Layout, Auto-Settings, and Completion Tracking ---")
        for name, html in [('Root index.html', self.root_html), ('Public index.html', self.public_html)]:
            self.assertIn('function markHomeworkCompleted(', html, f"{name}: markHomeworkCompleted function must exist")
            self.assertIn('function getCompletedHomeworkList(', html, f"{name}: getCompletedHomeworkList function must exist")
            self.assertIn('function getHomeworkSubmission(', html, f"{name}: getHomeworkSubmission function must exist")
            self.assertIn('Done • Completed', html, f"{name}: Done • Completed status text must exist")
            self.assertIn('🚀 Solve Homework', html, f"{name}: Solve Homework button text must exist")
            self.assertIn('Drill Size:', html, f"{name}: Drill Size metric must exist in card")
            self.assertIn('Student PIN:', html, f"{name}: Student PIN metric must exist in card")
            self.assertIn('handleStartStudentQuiz', html, f"{name}: handleStartStudentQuiz must launch drills with teacher settings")
        print("✅ Square cards and completion tracking verified: PASS")

if __name__ == '__main__':
    unittest.main()
