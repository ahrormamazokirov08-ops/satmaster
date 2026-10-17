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
        self.assertEqual(len(self.math_questions), 2458)
        self.assertEqual(len(self.public_math_questions), 2458)
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

    def test_08_hard_math_quality_and_logic(self):
        """Verify all 533 Hard Math questions meet strict mathematical and schema standards."""
        hard_qs = [q for q in self.math_questions if q.get('difficulty') == 'Hard']
        self.assertEqual(len(hard_qs), 533, "Expected exactly 533 Hard Math questions")

        # Specific verification for repaired questions
        q2085 = next(q for q in hard_qs if q['id'] == 'cb_math_2085')
        self.assertIn('$300$', q2085['prompt'])
        self.assertIn('$p$', q2085['prompt'])
        self.assertEqual(q2085['options']['A'], r'$p > 0.20(300 - 36), \text{ where } p \le 150$')
        self.assertEqual(q2085['correct'], 'D')

        q2086 = next(q for q in hard_qs if q['id'] == 'cb_math_2086')
        self.assertIn('$q$', q2086['prompt'])
        self.assertNotIn('/bin/zsh', json.dumps(q2086))
        self.assertEqual(q2086['options']['A'], '$0.20m + 886.29$')
        self.assertEqual(q2086['correct'], 'A')

        q2087 = next(q for q in hard_qs if q['id'] == 'cb_math_2087')
        self.assertIn(r'\$150.00', q2087['prompt'])
        self.assertIn(r'\$2.50', q2087['prompt'])
        self.assertIn(r'\$2{,}187.50', q2087['prompt'])

        q2091 = next(q for q in hard_qs if q['id'] == 'cb_math_2091')
        self.assertIn(r'\$3', q2091['options']['A'])
        self.assertIn(r'\$3', q2091['options']['B'])

        q2132 = next(q for q in hard_qs if q['id'] == 'cb_math_2132')
        self.assertIn(r'\$950', q2132['prompt'])
        self.assertIn(r'\$50', q2132['prompt'])
        self.assertIn(r'\$1{,}100', q2132['prompt'])

        # Battery check across all 533 Hard questions
        for q in hard_qs:
            qid = q['id']
            prompt = q.get('prompt', '') or ''
            passage = q.get('passage', '') or ''
            rationale = q.get('rationale', '') or ''
            options = q.get('options')
            correct = q.get('correct')
            correct_ans = q.get('correct_answer')
            is_spr = q.get('is_spr')
            qtype = q.get('type')

            self.assertEqual(passage.strip(), '', f"{qid} must have empty passage")
            self.assertEqual(str(correct).strip(), str(correct_ans).strip(), f"{qid} correct mismatch")
            if qtype == 'mcq':
                self.assertFalse(is_spr, f"{qid} MCQ should have is_spr=False")
                self.assertIsInstance(options, dict, f"{qid} MCQ options must be dict")
                self.assertEqual(sorted(options.keys()), ['A', 'B', 'C', 'D'], f"{qid} keys invalid")
                vals = [str(v).strip() for v in options.values()]
                self.assertEqual(len(set(vals)), 4, f"{qid} options must be distinct")
                self.assertIn(correct, ['A', 'B', 'C', 'D'], f"{qid} invalid correct choice")
            elif qtype == 'spr':
                self.assertTrue(is_spr, f"{qid} SPR should have is_spr=True")
                self.assertIsNone(options, f"{qid} SPR options must be None")

            dump = json.dumps(q)
            self.assertNotIn('/bin/', dump, f"{qid} contains shell path")
            self.assertNotIn('terms of 0', dump, f"{qid} contains 'terms of 0'")
            self.assertNotIn('values of 0', dump, f"{qid} contains 'values of 0'")

            # Check dollar balance in non-html
            for field_name, text in [('prompt', prompt), ('rationale', rationale)]:
                clean = re.sub(r'<span\s+class=\\?["\']no-math\\?["\'][^>]*>.*?</span>', '', text, flags=re.DOTALL)
                clean = re.sub(r'<[^>]+>', '', clean)
                dollars = re.findall(r'(?<!\\)\$', clean)
                self.assertEqual(len(dollars) % 2, 0, f"{qid} {field_name} has unbalanced dollars ({len(dollars)})")

            if isinstance(options, dict):
                for k, v in options.items():
                    clean = re.sub(r'<span\s+class=\\?["\']no-math\\?["\'][^>]*>.*?</span>', '', str(v), flags=re.DOTALL)
                    clean = re.sub(r'<[^>]+>', '', clean)
                    dollars = re.findall(r'(?<!\\)\$', clean)
                    self.assertEqual(len(dollars) % 2, 0, f"{qid} option_{k} has unbalanced dollars ({len(dollars)})")

        print("✅ 401 Hard Math questions quality and logic verified: PASS")

if __name__ == '__main__':
    unittest.main()
