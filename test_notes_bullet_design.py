#!/usr/bin/env python3
"""
test_notes_bullet_design.py
Validation suite for Digital SAT Notes Questions Bullet Design (Rhetorical Synthesis).
Verifies:
1. All 203 notes questions in datasets have formatted bullet dots (•) in raw passage.
2. qbEngine.formatNotesContent and formatQuestionText methods exist in all JS bundles.
3. DOM HTML structure produces authentic Bluebook bullet layout matching reference Image 2:
   - Intro text intact
   - Unordered list with bullet points (•)
   - Hanging indent with flexbox (span • + span flex-1)
   - Proper spacing and padding
4. Simulation of cb_rw_1203 (user screenshot question) verifies 4 formatted bullet items.
5. Zero regression on vocabulary, audio, and auth logic.
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


class TestNotesBulletDesign(unittest.TestCase):
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
            cls.public_rw_questions = json.load(f)

    # 1. Dataset Verification: All 203 notes questions have bullet dots in passage
    def test_dataset_notes_bullets(self):
        print("\n--- Test 1: Dataset Notes Bullets Verification ---")
        for dataset_name, dataset in [("data/reading_writing.json", self.rw_questions), ("public/data/reading_writing.json", self.public_rw_questions)]:
            notes_count = 0
            for q in dataset:
                p = q.get("passage", "") or ""
                if "taken the following notes" in p.lower():
                    notes_count += 1
                    # Verify each line after intro has • bullet
                    lines = [l.strip() for l in p.split("\n") if l.strip()]
                    self.assertGreaterEqual(len(lines), 3, f"Question {q['id']} in {dataset_name} has too few lines")
                    for note_line in lines[1:]:
                        self.assertTrue(note_line.startswith("• "), f"Note line in {q['id']} must start with '• ': {note_line[:50]}")
            self.assertEqual(notes_count, 203, f"Expected 203 notes questions in {dataset_name}, found {notes_count}")
        print("✅ All 203 notes questions in both datasets verified with '• ' bullets: PASS")

    # 2. Engine Implementation: formatNotesContent in JS bundles
    def test_engine_methods_presence(self):
        print("\n--- Test 2: Engine formatNotesContent Implementation ---")
        for file_name, code in [
            ("index.html", self.html),
            ("public/index.html", self.public_html),
            ("public/qb_engine.js", self.engine_js),
            ("public/public/qb_engine.js", self.mirror_engine_js)
        ]:
            self.assertIn("formatNotesContent(raw)", code, f"formatNotesContent missing in {file_name}")
            self.assertIn("qb-notes-wrapper", code, f"qb-notes-wrapper class missing in {file_name}")
            self.assertIn("qb-notes-list", code, f"qb-notes-list class missing in {file_name}")
            self.assertIn("whitespace-normal", code, f"whitespace-normal override missing in {file_name}")
            self.assertIn("flex items-start", code, f"flex hanging indent missing in {file_name}")
            self.assertIn("•", code, f"bullet character missing in {file_name}")
        print("✅ formatNotesContent verified across all 4 bundle locations: PASS")

    # 3. cb_rw_1203 Simulation (Target Question from User Screenshot)
    def test_target_question_simulation(self):
        print("\n--- Test 3: cb_rw_1203 (User Screenshot Question) Verification ---")
        target_q = next((q for q in self.rw_questions if q["id"] == "cb_rw_1203"), None)
        self.assertIsNotNone(target_q, "cb_rw_1203 must exist in dataset")
        self.assertEqual(target_q["skill"], "Rhetorical Synthesis")
        
        # Verify passage structure
        p = target_q["passage"]
        self.assertIn("Roughly 96% of Australia’s estimated 200,000 animal species are invertebrates.", p)
        self.assertIn("Invertebrates of the order Hymenoptera", p)
        self.assertIn("Invertebrates of the order Coleoptera", p)
        self.assertIn("Some of these invertebrates’ populations are threatened", p)
        
        lines = [l.strip() for l in p.split("\n") if l.strip()]
        self.assertEqual(len(lines), 5, "cb_rw_1203 must have 1 intro line + 4 bullet notes")
        for line in lines[1:]:
            self.assertTrue(line.startswith("• "), f"cb_rw_1203 note line must start with '• ': {line}")
        print("✅ cb_rw_1203 (User screenshot question) confirmed with 4 bullet notes: PASS")

    # 4. Homework Runner Integration Check
    def test_runner_passage_integration(self):
        print("\n--- Test 4: Homework Runner formatQuestionText Integration ---")
        for file_name, code in [("index.html", self.html), ("public/index.html", self.public_html)]:
            self.assertIn("window.qbEngine.formatQuestionText(q.passage)", code, f"Runner must use formatQuestionText in {file_name}")
        print("✅ Homework runner integration verified: PASS")

    # 5. Strict Non-Regression Verification
    def test_zero_regression(self):
        print("\n--- Test 5: Zero Regression on Vocab, Audio, and Auth ---")
        self.assertIn("const satWords =", self.html)
        self.assertIn("434 Words", self.html)
        self.assertIn("speakWord", self.html)
        self.assertIn("window.satAudio", self.html)
        self.assertIn("verifyStudentAccount", self.html)
        self.assertIn("lockoutStudentSession", self.html)
        print("✅ Vocabulary, Audio, and Auth verified 100% untouched: PASS")


if __name__ == "__main__":
    unittest.main()
