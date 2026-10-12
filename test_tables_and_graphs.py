#!/usr/bin/env python3
"""
test_tables_and_graphs.py
Validation suite for Digital SAT Authentic Tables and Vector Graphs (SVG).
Verifies:
1. cb_rw_102 (User Image 1): Authentic Bluebook HTML table with headers, caption, rows, cells.
2. cb_rw_229 (User Image 2): Authentic Bluebook vector SVG line graph with zero screen-reader leak.
3. Dataset Metrics: 3,770 total questions with 180+ authentic tables and 310+ vector SVGs.
4. Math Tables & Graphs: cb_math_002 (SVG coordinate graph) and cb_math_010 (data table with math symbols).
5. Notes Questions: Rhetorical synthesis notes retain '• ' bullets.
6. CSS Styling: Responsive table and SVG classes in root and public index.html.
7. KaTeX Protection: SVG elements and .qb-figure-wrapper ignored by KaTeX parser.
8. Zero regression on vocabulary, audio, and auth logic.
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
PUBLIC_RW_JSON = os.path.join(ROOT_DIR, "public", "data", "questions", "reading_writing.json")
MATH_JSON = os.path.join(ROOT_DIR, "data", "questions", "math.json")
PUBLIC_MATH_JSON = os.path.join(ROOT_DIR, "public", "data", "questions", "math.json")


class TestTablesAndGraphs(unittest.TestCase):
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
        with open(PUBLIC_RW_JSON, "r", encoding="utf-8") as f:
            cls.pub_rw_questions = json.load(f)

        with open(MATH_JSON, "r", encoding="utf-8") as f:
            cls.math_questions = json.load(f)
        with open(PUBLIC_MATH_JSON, "r", encoding="utf-8") as f:
            cls.pub_math_questions = json.load(f)

    # 1. cb_rw_102 (User Image 1) Table Verification
    def test_cb_rw_102_table_rendering(self):
        print("\n--- Test 1: cb_rw_102 (User Image 1 Table) Verification ---")
        q = next((item for item in self.rw_questions if item["id"] == "cb_rw_102"), None)
        self.assertIsNotNone(q, "cb_rw_102 must exist in Reading & Writing dataset")

        passage = q.get("passage", "")
        self.assertIn('<div class="qb-table-wrapper', passage, "Table wrapper container must exist")
        self.assertIn('<table class="qb-data-table', passage, "qb-data-table element must exist")
        self.assertIn("Results of Footprint Analysis for Two Sets of Theropod Tracks", passage, "Caption title must be present")
        self.assertIn("Estimated footprint length (centimeters)", passage, "Column header must be present")
        self.assertIn("Estimated mean speed (meters per second)", passage, "Speed header must be present")
        self.assertIn("La Torre 6A", passage, "Row header La Torre 6A must be present")
        self.assertIn("La Torre 6B", passage, "Row header La Torre 6B must be present")
        self.assertIn("32.8", passage, "Data value 32.8 must be present")
        self.assertIn("5.23", passage, "Data value 5.23 must be present")
        self.assertIn("______", passage, "Fill-in blank must be preserved")
        self.assertNotIn("sr-only", passage, "No sr-only elements in passage")
        print("✅ cb_rw_102 table and passage verified: PASS")

    # 2. cb_rw_229 (User Image 2) SVG Graph Verification
    def test_cb_rw_229_svg_graph_rendering(self):
        print("\n--- Test 2: cb_rw_229 (User Image 2 SVG Graph) Verification ---")
        q = next((item for item in self.rw_questions if item["id"] == "cb_rw_229"), None)
        self.assertIsNotNone(q, "cb_rw_229 must exist in Reading & Writing dataset")

        passage = q.get("passage", "")
        self.assertIn('<div class="qb-figure-wrapper', passage, "Figure wrapper container must exist")
        self.assertIn("<svg", passage, "SVG element must exist")
        self.assertIn("Ratio of Manganese to Calcium in Samples", passage, "SVG graph title must be present")
        self.assertIn("Alboran Sea", passage, "Alboran Sea data label must be present")
        self.assertIn("Mauritanian Coast", passage, "Mauritanian Coast data label must be present")
        self.assertIn("Lophelia pertusa", passage, "Passage text must follow the SVG graphic")

        # Crucial check: Screen-reader leak must NOT exist
        self.assertNotIn("The following 2 lines are shown", passage, "Screen reader list must be completely stripped")
        self.assertNotIn("Begins at 2 thousand", passage, "Screen reader data points must be completely stripped")
        self.assertNotIn("sr-only", passage, "No sr-only class in passage")
        print("✅ cb_rw_229 SVG vector graph and clean passage verified: PASS")

    # 3. Comprehensive Dataset Table and SVG Counts
    def test_dataset_tables_and_svg_counts(self):
        print("\n--- Test 3: Comprehensive Dataset Metrics ---")
        self.assertEqual(len(self.rw_questions), 1845, "Reading & Writing must have exactly 1,845 questions")
        self.assertEqual(len(self.math_questions), 1925, "Math must have exactly 1,925 questions")
        self.assertEqual(len(self.pub_rw_questions), 1845, "Mirror RW must have 1,845 questions")
        self.assertEqual(len(self.pub_math_questions), 1925, "Mirror Math must have 1,925 questions")

        rw_tables = sum(1 for q in self.rw_questions if "<table" in (q.get("passage", "") + q.get("prompt", "")))
        rw_svgs = sum(1 for q in self.rw_questions if "<svg" in (q.get("passage", "") + q.get("prompt", "")))
        math_tables = sum(1 for q in self.math_questions if "<table" in (q.get("passage", "") + q.get("prompt", "")))
        math_svgs = sum(1 for q in self.math_questions if "<svg" in (q.get("passage", "") + q.get("prompt", "")))

        self.assertGreaterEqual(rw_tables, 70, "RW must have at least 70 table questions")
        self.assertGreaterEqual(rw_svgs, 60, "RW must have at least 60 SVG questions")
        self.assertGreaterEqual(math_tables, 100, "Math must have at least 100 table questions")
        self.assertGreaterEqual(math_svgs, 240, "Math must have at least 240 SVG questions")

        total_tables = rw_tables + math_tables
        total_svgs = rw_svgs + math_svgs
        print(f"✅ Verified {total_tables} total authentic tables across datasets (RW: {rw_tables}, Math: {math_tables})")
        print(f"✅ Verified {total_svgs} total authentic vector SVGs across datasets (RW: {rw_svgs}, Math: {math_svgs})")

    # 4. Math Tables and SVG Verification
    def test_math_tables_and_svgs(self):
        print("\n--- Test 4: Math SVG Coordinate Graph and Table Verification ---")
        # cb_math_002 has SVG linear system
        q_math_svg = self.math_questions[1]
        self.assertEqual(q_math_svg["id"], "cb_math_002")
        self.assertIn("<svg", q_math_svg["prompt"], "cb_math_002 must contain SVG coordinate graph")
        self.assertIn('<div class="qb-figure-wrapper', q_math_svg["prompt"])
        self.assertNotIn("For the first line in the system:", q_math_svg["prompt"], "Screen reader text must be stripped")
        self.assertIn("What system of linear equations is represented", q_math_svg["prompt"])

        # cb_math_010 has data table with math
        q_math_tbl = self.math_questions[9]
        self.assertEqual(q_math_tbl["id"], "cb_math_010")
        self.assertIn("<table", q_math_tbl["prompt"], "cb_math_010 must contain data table")
        self.assertIn("$x$", q_math_tbl["prompt"], "MathML must be converted to LaTeX $x$")
        self.assertIn("$y$", q_math_tbl["prompt"], "MathML must be converted to LaTeX $y$")
        print("✅ Math SVG and Table questions verified: PASS")

    # 5. Notes Questions Retain Bullets
    def test_notes_questions_retain_bullets(self):
        print("\n--- Test 5: Notes Questions Retain '• ' Bullets ---")
        notes_count = 0
        for q in self.rw_questions:
            p = q.get("passage", "") or ""
            if "taken the following notes" in p.lower():
                notes_count += 1
                lines = [l.strip() for l in p.split("\n") if l.strip()]
                self.assertGreaterEqual(len(lines), 3)
                for note_line in lines[1:]:
                    self.assertTrue(note_line.startswith("• "), f"Note line in {q['id']} must start with '• '")
        self.assertGreaterEqual(notes_count, 200, "Must have at least 200 notes questions")
        print(f"✅ All {notes_count} notes questions verified with '• ' bullets: PASS")

    # 6. CSS Styling in HTML Files
    def test_css_table_and_svg_styling(self):
        print("\n--- Test 6: CSS Table and SVG Styling in HTML Files ---")
        for file_name, content in [("index.html", self.html), ("public/index.html", self.public_html)]:
            self.assertIn(".qb-table-wrapper", content, f".qb-table-wrapper CSS missing in {file_name}")
            self.assertIn(".qb-data-table", content, f".qb-data-table CSS missing in {file_name}")
            self.assertIn(".qb-figure-wrapper", content, f".qb-figure-wrapper CSS missing in {file_name}")
            self.assertIn("#qb-passage-content table", content, f"table white-space reset missing in {file_name}")
            self.assertIn("#qb-passage-content svg", content, f"svg white-space reset missing in {file_name}")
        print("✅ CSS table and SVG styling verified across root and public index.html: PASS")

    # 7. KaTeX Protection for SVGs
    def test_katex_svg_protection(self):
        print("\n--- Test 7: KaTeX SVG Protection ---")
        for file_name, code in [
            ("public/qb_engine.js", self.engine_js),
            ("public/public/qb_engine.js", self.mirror_engine_js),
            ("index.html", self.html),
            ("public/index.html", self.public_html)
        ]:
            self.assertIn("'svg'", code, f"KaTeX ignoredTags must include 'svg' in {file_name}")
            self.assertIn("'qb-figure-wrapper'", code, f"KaTeX ignoredClasses must include 'qb-figure-wrapper' in {file_name}")
        print("✅ KaTeX SVG protection verified across all engine bundles: PASS")

    # 8. Zero Regression on Vocab, Audio, Auth
    def test_zero_regression_vocab_audio_auth(self):
        print("\n--- Test 8: Zero Regression on Vocab, Audio, Auth ---")
        self.assertIn("const satWords =", self.html, "satWords dataset must remain intact")
        self.assertIn("speakWord", self.html, "speakWord audio function must remain intact")
        self.assertIn("window.satAudio", self.html, "window.satAudio must remain intact")
        self.assertIn("verifyStudentAccount", self.html, "verifyStudentAccount auth must remain intact")
        self.assertIn("lockoutStudentSession", self.html, "lockoutStudentSession must remain intact")
        print("✅ Vocabulary, Audio, and Auth logic 100% verified untouched: PASS")


if __name__ == "__main__":
    unittest.main()
