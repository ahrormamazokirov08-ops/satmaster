import os
import json
import re
import unittest

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_MATH = os.path.join(ROOT_DIR, "data", "questions", "math.json")
PUBLIC_MATH = os.path.join(ROOT_DIR, "public", "data", "questions", "math.json")
DATA_RW = os.path.join(ROOT_DIR, "data", "questions", "reading_writing.json")
PUBLIC_RW = os.path.join(ROOT_DIR, "public", "data", "questions", "reading_writing.json")

class TestQuestionBankFormatting(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with open(DATA_MATH, "r", encoding="utf-8") as f:
            cls.math_q = json.load(f)
        with open(PUBLIC_MATH, "r", encoding="utf-8") as f:
            cls.pub_math_q = json.load(f)
        with open(DATA_RW, "r", encoding="utf-8") as f:
            cls.rw_q = json.load(f)
        with open(PUBLIC_RW, "r", encoding="utf-8") as f:
            cls.pub_rw_q = json.load(f)

    def test_question_counts_and_parity(self):
        """Strict question count and canonical/public mirror parity."""
        self.assertEqual(len(self.math_q), 1925)
        self.assertEqual(len(self.pub_math_q), 1925)
        self.assertEqual(len(self.rw_q), 1845)
        self.assertEqual(len(self.pub_rw_q), 1845)
        self.assertEqual(self.math_q, self.pub_math_q, "Math canonical and public copies must match exactly")
        self.assertEqual(self.rw_q, self.pub_rw_q, "RW canonical and public copies must match exactly")

    def test_zero_screen_reader_speech_tokens(self):
        """Ensures zero TTS speech artifacts, triple dollars, or currency glitches exist in Math."""
        dump_m = json.dumps(self.math_q)
        self.assertEqual(len(re.findall(r"\bend\s+fraction\b", dump_m, re.I)), 0, "Spoken 'end fraction' must be 0")
        self.assertEqual(len(re.findall(r"\bend\s+root\b", dump_m, re.I)), 0, "Spoken 'end root' must be 0")
        self.assertEqual(len(re.findall(r"\bwith\s+numerator\b", dump_m, re.I)), 0, "Spoken 'with numerator' must be 0")
        self.assertEqual(len(re.findall(r"\bStartFraction\b", dump_m, re.I)), 0, "Spoken 'StartFraction' must be 0")
        self.assertEqual(len(re.findall(r"\${3,}", dump_m)), 0, "Triple dollars must be 0")
        self.assertEqual(len(re.findall(r"\${2,}\s*\d[\d\s,.]*\$", dump_m)), 0, "Currency glitches like $$15 400$ must be 0")
        self.assertEqual(len(re.findall(r"\b(RootIndex|StartRoot|EndRoot|Superscript|Baseline)\b", dump_m)), 0, "MathML speech tokens must be 0")

    def test_calibrated_difficulty_coverage(self):
        """Ensures calibrated_difficulty field exists and has valid values on all questions."""
        for q in self.math_q:
            self.assertIn("calibrated_difficulty", q)
            self.assertIn(q["calibrated_difficulty"], ["Easy", "Medium", "Hard"])
        for q in self.rw_q:
            self.assertIn("calibrated_difficulty", q)
            self.assertIn(q["calibrated_difficulty"], ["Easy", "Medium", "Hard"])

if __name__ == "__main__":
    unittest.main()
