import unittest
import json
import os
import re

class TestMathFormatBugfixes(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with open('data/questions/math.json') as f:
            cls.math_questions = json.load(f)
        with open('public/data/questions/math.json') as f:
            cls.public_math_questions = json.load(f)
        with open('data/questions/reading_writing.json') as f:
            cls.rw_questions = json.load(f)

    def test_01_math_datasets_parity(self):
        """Ensure canonical and public math.json are completely identical."""
        self.assertEqual(len(self.math_questions), 2086)
        self.assertEqual(len(self.public_math_questions), 2086)
        with open('data/questions/math.json', 'rb') as f1, open('public/data/questions/math.json', 'rb') as f2:
            self.assertEqual(f1.read(), f2.read(), "data/questions/math.json and public/data/questions/math.json must be byte-for-byte identical")
        print("\n✅ Dataset parity verified: PASS")

    def test_02_no_superscript_ordinals(self):
        """Ensure no question uses superscript exponents for ordinals (th, st, nd, rd)."""
        all_qs = self.math_questions + self.rw_questions
        for q in all_qs:
            dump = json.dumps(q)
            for suffix in ['th', 'st', 'nd', 'rd']:
                self.assertNotIn(f'^{{\\text{{{suffix}}}}}', dump, f"Superscript ordinal found in {q['id']}")
                self.assertNotIn(f'^{{{suffix}}}', dump, f"Superscript ordinal found in {q['id']}")
        print("✅ No superscript ordinals across all 3,931 questions: PASS")

    def test_03_cb_math_1973_nth_term(self):
        """Verify cb_math_1973 displays nth term without exponent."""
        q = next((item for item in self.math_questions if item['id'] == 'cb_math_1973'), None)
        self.assertIsNotNone(q)
        self.assertIn(r'$n\text{th}$ term', q['prompt'])
        self.assertNotIn(r'n^{\text{th}}', q['prompt'])
        self.assertIn(r'$n\text{th}$', q['rationale'])
        self.assertNotIn(r'n^{\text{th}}', q['rationale'])
        print("✅ cb_math_1973 nth term fix verified: PASS")

    def test_04_cb_math_1978_spacing_and_ordinal(self):
        """Verify cb_math_1978 piecewise options have generous spacing and nth month."""
        q = next((item for item in self.math_questions if item['id'] == 'cb_math_1978'), None)
        self.assertIsNotNone(q)
        self.assertIn(r'$n\text{th}$ month', q['prompt'])
        self.assertNotIn(r'n^{\text{th}}', q['prompt'])
        for letter in ['A', 'B', 'C', 'D']:
            opt = q['options'][letter]
            self.assertIn(r'\qquad b_n =', opt, f"Option {letter} in cb_math_1978 should contain \\qquad spacing before second b_n")
        print("✅ cb_math_1978 piecewise options spacing verified: PASS")

    def test_05_cb_math_1984_systems_newline(self):
        """Verify cb_math_1984 options have clean newlines separating inequalities."""
        q = next((item for item in self.math_questions if item['id'] == 'cb_math_1984'), None)
        self.assertIsNotNone(q)
        for letter in ['A', 'B', 'C', 'D']:
            opt = q['options'][letter]
            self.assertIn('\n', opt)
            lines = opt.split('\n')
            self.assertEqual(len(lines), 2, f"Option {letter} must have exactly 2 lines")
        print("✅ cb_math_1984 inequality system newlines verified: PASS")

    def test_06_cb_math_038_valid_syntax(self):
        """Verify cb_math_038 has properly formed inequalities without broken math delimiters."""
        q = next((item for item in self.math_questions if item['id'] == 'cb_math_038'), None)
        self.assertIsNotNone(q)
        self.assertEqual(q['options']['C'], '$x < 0$\n$y > 0$')
        self.assertEqual(q['options']['D'], '$x < 0$\n$y < 0$')
        print("✅ cb_math_038 inequality syntax verified: PASS")

    def test_07_engine_pre_line_styling(self):
        """Verify all engine files and stylesheets include whitespace-pre-line for options."""
        files = [
            'index.html',
            'public/index.html',
            'public/qb_engine.js',
            'public/public/qb_engine.js'
        ]
        for fpath in files:
            with open(fpath) as f:
                content = f.read()
            self.assertIn('qb-choice-text whitespace-pre-line', content, f"{fpath} must have 'qb-choice-text whitespace-pre-line'")

        for html_path in ['index.html', 'public/index.html']:
            with open(html_path) as f:
                html = f.read()
            self.assertIn('.qb-choice-text {', html)
            self.assertIn('white-space: pre-line !important;', html)
            self.assertIn('leading-relaxed whitespace-pre-line', html) # homework runner option span
        print("✅ Engine and CSS pre-line styling verified across all 4 bundle locations: PASS")

if __name__ == '__main__':
    unittest.main()
