import unittest
import os
import re

class TestGroupsOfflineLockout(unittest.TestCase):
    def setUp(self):
        root_dir = os.path.dirname(os.path.abspath(__file__))
        with open(os.path.join(root_dir, "index.html"), "r", encoding="utf-8") as f:
            self.root_html = f.read()
        with open(os.path.join(root_dir, "public", "index.html"), "r", encoding="utf-8") as f:
            self.pub_html = f.read()

    def test_dashboard_nav_strictly_hidden(self):
        """Teacher Dashboard nav buttons must have class hidden in root and public index.html"""
        for html, name in [(self.root_html, "root"), (self.pub_html, "public")]:
            self.assertIn('id="nav-dashboard" class="hidden', html, f"Desktop nav-dashboard must be hidden in {name}")
            self.assertIn('id="mob-nav-dashboard" class="hidden', html, f"Mobile mob-nav-dashboard must be hidden in {name}")

    def test_default_groups_list_structure(self):
        """DEFAULT_GROUPS_LIST must define the 3 cohorts and their students"""
        for html, name in [(self.root_html, "root"), (self.pub_html, "public")]:
            self.assertIn("DEFAULT_GROUPS_LIST", html, f"DEFAULT_GROUPS_LIST missing in {name}")
            self.assertIn("SAT Masters 2026", html, f"SAT Masters 2026 missing in {name}")
            self.assertIn("Ivy League Prep", html, f"Ivy League Prep missing in {name}")
            self.assertIn("Digital SAT Intensive", html, f"Digital SAT Intensive missing in {name}")
            self.assertIn("Elena Rostova", html, f"Elena Rostova missing in {name}")
            self.assertIn("Alex Chen", html, f"Alex Chen missing in {name}")
            self.assertIn("Frank Miller", html, f"Frank Miller missing in {name}")
            self.assertIn("Jasmine Patel", html, f"Jasmine Patel missing in {name}")
            self.assertIn("David Kim", html, f"David Kim missing in {name}")
            self.assertIn("Sarah Williams", html, f"Sarah Williams missing in {name}")

    def test_student_lockout_logic(self):
        """Permanent deletion and lockout functions must be present"""
        for html, name in [(self.root_html, "root"), (self.pub_html, "public")]:
            self.assertIn("getDeletedStudentIds", html, f"getDeletedStudentIds missing in {name}")
            self.assertIn("addDeletedStudentId", html, f"addDeletedStudentId missing in {name}")
            self.assertIn("isStudentDeleted", html, f"isStudentDeleted missing in {name}")
            self.assertIn("satmaster_deleted_students", html, f"satmaster_deleted_students storage key missing in {name}")

    def test_offline_database_resilience(self):
        """fetchAndRenderGroups and fetchAndRenderGroupDetail must handle offline/404 without error box"""
        for html, name in [(self.root_html, "root"), (self.pub_html, "public")]:
            self.assertIn("cachedGroups = getLocalGroups()", html, f"cachedGroups local initialization missing in {name}")
            self.assertIn("fromLocalFallback", html, f"fromLocalFallback missing in {name}")

    def test_history_and_deletion_actions(self):
        """Detail table must have View Test History and Delete Student buttons"""
        for html, name in [(self.root_html, "root"), (self.pub_html, "public")]:
            self.assertIn("openStudentHistoryModal", html, f"openStudentHistoryModal missing in {name}")
            self.assertIn("confirmDeleteStudent", html, f"confirmDeleteStudent missing in {name}")
            self.assertIn("executeDeleteStudent", html, f"executeDeleteStudent missing in {name}")

if __name__ == "__main__":
    unittest.main()
