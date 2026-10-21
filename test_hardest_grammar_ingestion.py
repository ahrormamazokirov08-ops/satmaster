#!/usr/bin/env python3
"""
test_hardest_grammar_ingestion.py
Verifies that all 144 newly ingested grammar questions (cb_rw_1846 - cb_rw_1989)
conform strictly to Digital SAT quality standards, Invariant 12, and schema invariants.
"""

import json
import hashlib
import unittest
import os

class TestHardestGrammarIngestion(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with open('data/questions/reading_writing.json', 'r', encoding='utf-8') as f:
            cls.rw_data = json.load(f)
        with open('public/data/questions/reading_writing.json', 'r', encoding='utf-8') as f:
            cls.public_rw_data = json.load(f)

    def test_01_total_dataset_counts_and_parity(self):
        """Assert total RW questions equals 1,989 and 100% SHA-256 byte parity."""
        self.assertEqual(len(self.rw_data), 1989)
        self.assertEqual(len(self.public_rw_data), 1989)

        with open('data/questions/reading_writing.json', 'rb') as f:
            h1 = hashlib.sha256(f.read()).hexdigest()
        with open('public/data/questions/reading_writing.json', 'rb') as f:
            h2 = hashlib.sha256(f.read()).hexdigest()
        self.assertEqual(h1, h2, 'Byte-for-byte SHA-256 mismatch between root and public RW datasets')

    def test_02_id_sequence_continuity(self):
        """Assert all 144 questions exist with IDs cb_rw_1846 through cb_rw_1989."""
        by_id = {q['id']: q for q in self.rw_data}
        for num in range(1846, 1990):
            qid = f'cb_rw_{num:04d}'
            self.assertIn(qid, by_id, f'Missing question ID {qid}')

    def test_03_domain_skill_and_calibration(self):
        """Assert domain is Standard English Conventions, skills are Boundaries/FSS, and calibrated difficulty."""
        new_questions = [q for q in self.rw_data if 1846 <= int(q['id'].split('_')[-1]) <= 1989]
        self.assertEqual(len(new_questions), 144)

        hard_count = 0
        medium_count = 0

        for q in new_questions:
            qid = q['id']
            self.assertEqual(q['subject'], 'Reading & Writing')
            self.assertEqual(q['domain'], 'Standard English Conventions')
            self.assertIn(q['skill'], ['Boundaries', 'Form, Structure, and Sense'])
            self.assertIn(q['difficulty'], ['Hard', 'Medium'])
            self.assertEqual(q['calibrated_difficulty'], q['difficulty'])

            if q['difficulty'] == 'Hard':
                hard_count += 1
            else:
                medium_count += 1

        self.assertEqual(hard_count, 126)
        self.assertEqual(medium_count, 18)

    def test_04_authentic_blank_invariant(self):
        """Assert every question passage contains the authentic 6-underscore blank '______' (Invariant 12.1)."""
        new_questions = [q for q in self.rw_data if 1846 <= int(q['id'].split('_')[-1]) <= 1989]
        for q in new_questions:
            self.assertIn('______', q['passage'], f"Question {q['id']} missing authentic '______' blank")

    def test_05_clean_options_invariant(self):
        """Assert options are clean strings without leading option labels, bullets, or OCR artifacts (Invariant 12.5)."""
        new_questions = [q for q in self.rw_data if 1846 <= int(q['id'].split('_')[-1]) <= 1989]
        for q in new_questions:
            opts = q['options']
            self.assertIsInstance(opts, dict)
            self.assertEqual(set(opts.keys()), {'A', 'B', 'C', 'D'})
            for letter in ['A', 'B', 'C', 'D']:
                val = opts[letter]
                self.assertTrue(len(val) > 0, f"Empty option {letter} in {q['id']}")
                self.assertFalse(val.startswith(('A) ', 'B) ', 'C) ', 'D) ')), f"Leading label in {q['id']} {letter}")
                self.assertFalse(val.startswith(('• ', '® ', '© ', '@ ')), f"Leading bullet/OCR in {q['id']} {letter}")

    def test_06_correct_answers_and_rationales(self):
        """Assert answers are valid and rationales follow College Board pedagogical structure (Invariant 10)."""
        new_questions = [q for q in self.rw_data if 1846 <= int(q['id'].split('_')[-1]) <= 1989]
        for q in new_questions:
            correct = q['correct_answer']
            self.assertIn(correct, ['A', 'B', 'C', 'D'])
            self.assertFalse(q['is_spr'])
            rationale = q['rationale']
            self.assertTrue(len(rationale) > 50, f"Rationale too short in {q['id']}")
            self.assertIn(f'Choice {correct} is the best answer.', rationale, f"Malformed rationale in {q['id']}")

if __name__ == '__main__':
    unittest.main()
