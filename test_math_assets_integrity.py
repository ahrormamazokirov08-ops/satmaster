#!/usr/bin/env python3
"""
test_math_assets_integrity.py
Comprehensive integrity test suite for Math Question Bank assets:
- XML validity and viewBox presence in all SVGs
- SPR vs MCQ classification and completeness of choices
- Restoration of cb_math_334 and cb_math_359 options
- KaTeX currency protection
- Math SPR numerical and fraction evaluation equivalence
"""

import os
import json
import re
import unittest
import xml.etree.ElementTree as ET

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_MATH = os.path.join(ROOT_DIR, "data", "questions", "math.json")
PUBLIC_MATH = os.path.join(ROOT_DIR, "public", "data", "questions", "math.json")

def mock_is_answer_correct(question, student_ans):
    if not question or student_ans is None:
        return False
    s_clean = str(student_ans).strip().lower()
    if not s_clean:
        return False

    is_spr = bool(
        question.get("type") == "spr" or 
        question.get("is_spr") or 
        not question.get("options") or 
        len(question.get("options") or {}) == 0
    )

    if not is_spr and question.get("options"):
        correct_opt = str(question.get("correct") or question.get("correct_answer") or "").strip().lower()
        return s_clean == correct_opt

    raw_correct = question.get("correct") or question.get("correct_answer") or ""
    accepted = [str(a).strip().lower() for a in (question.get("acceptedAnswers") or [raw_correct])]
    if s_clean in accepted:
        return True

    def parse_num_or_frac(s):
        if not s:
            return None
        if "/" in s:
            parts = s.split("/")
            if len(parts) == 2:
                try:
                    num, den = float(parts[0]), float(parts[1])
                    if den != 0:
                        return num / den
                except ValueError:
                    pass
        try:
            return float(s)
        except ValueError:
            return None

    student_val = parse_num_or_frac(s_clean)
    if student_val is not None:
        for acc in accepted:
            acc_val = parse_num_or_frac(acc)
            if acc_val is not None and abs(student_val - acc_val) < 0.0001:
                return True

    return False


class TestMathAssetsIntegrity(unittest.TestCase):

    def test_math_files_exist_and_match(self):
        self.assertTrue(os.path.exists(DATA_MATH), f"Missing {DATA_MATH}")
        self.assertTrue(os.path.exists(PUBLIC_MATH), f"Missing {PUBLIC_MATH}")
        
        with open(DATA_MATH, "r", encoding="utf-8") as f1, open(PUBLIC_MATH, "r", encoding="utf-8") as f2:
            data1 = json.load(f1)
            data2 = json.load(f2)
            
        self.assertEqual(len(data1), 2326, "Expected 2,326 Math questions")
        self.assertEqual(len(data1), len(data2), "Mirrored files must have identical counts")

    def test_all_math_svgs_are_valid_xml_with_viewbox(self):
        with open(DATA_MATH, "r", encoding="utf-8") as f:
            questions = json.load(f)

        svg_count = 0
        for q in questions:
            passage = q.get("passage", "") or ""
            prompt = q.get("prompt", "") or ""
            full_text = passage + " " + prompt
            
            svg_matches = re.findall(r"(<svg[\s\S]*?<\/svg>)", full_text, flags=re.I)
            for raw_svg in svg_matches:
                svg_count += 1
                q_id = q.get("id")
                
                # Check viewBox presence
                has_viewbox = "viewBox=" in raw_svg or "viewbox=" in raw_svg
                self.assertTrue(has_viewbox, f"Question {q_id} SVG is missing viewBox!")

                # Check max-w-full responsive class
                self.assertIn("max-w-full", raw_svg, f"Question {q_id} SVG missing responsive max-w-full class")
                self.assertNotIn(r'class=\"', raw_svg, f"Question {q_id} has literal backslash in class")

                # Parse XML cleanly
                try:
                    root = ET.fromstring(raw_svg)
                    self.assertEqual(root.tag.split("}")[-1], "svg", f"Root tag should be svg in {q_id}")
                except Exception as e:
                    self.fail(f"Question {q_id} SVG failed XML parsing: {e}\nSVG: {raw_svg[:200]}")

        self.assertEqual(svg_count, 275, f"Expected 275 SVGs across Math, found {svg_count}")

        # Verify cb_math_1493 authentic vector SVG bar graph
        q1493 = next(q for q in questions if q["id"] == "cb_math_1493")
        self.assertIn("<svg", q1493["prompt"])
        self.assertIn("Results of Five Quality Control Trials", q1493["prompt"])
        self.assertNotIn("The figure presents a bar graph", q1493["prompt"])

    def test_spr_and_mcq_classification(self):
        with open(DATA_MATH, "r", encoding="utf-8") as f:
            questions = json.load(f)

        spr_count = 0
        mcq_count = 0

        for q in questions:
            qid = q.get("id")
            if q.get("type") == "spr":
                spr_count += 1
                self.assertTrue(q.get("is_spr"), f"{qid} should have is_spr=True")
                self.assertIsNone(q.get("options"), f"{qid} SPR question should have null options")
                ans = q.get("correct") or q.get("correct_answer")
                self.assertTrue(ans and str(ans).strip(), f"{qid} SPR missing correct answer")
            else:
                mcq_count += 1
                self.assertEqual(q.get("type"), "mcq", f"{qid} should have type='mcq'")
                self.assertFalse(q.get("is_spr"), f"{qid} should have is_spr=False")
                opts = q.get("options") or {}
                for letter in ["A", "B", "C", "D"]:
                    self.assertIn(letter, opts, f"{qid} missing option {letter}")
                    self.assertTrue(str(opts[letter]).strip(), f"{qid} option {letter} is empty")
                correct = q.get("correct")
                self.assertIn(correct, ["A", "B", "C", "D"], f"{qid} invalid correct choice {correct}")

        self.assertEqual(spr_count, 629, f"Expected 629 SPR questions, found {spr_count}")
        self.assertEqual(mcq_count, 1697, f"Expected 1,697 MCQ questions, found {mcq_count}")

    def test_cb_math_334_and_359_restored(self):
        with open(DATA_MATH, "r", encoding="utf-8") as f:
            q_map = {q["id"]: q for q in json.load(f)}

        q334 = q_map.get("cb_math_334")
        self.assertIsNotNone(q334)
        self.assertEqual(q334["options"]["A"], "$5$")
        self.assertEqual(q334["correct"], "D")
        self.assertIn("w - 10 = 2(w + 5)", q334["prompt"])

        q359 = q_map.get("cb_math_359")
        self.assertIsNotNone(q359)
        self.assertEqual(q359["options"]["A"], "$30$")
        self.assertEqual(q359["options"]["B"], "$22$")
        self.assertEqual(q359["options"]["C"], "$11$")
        self.assertEqual(q359["options"]["D"], "$-23$")
        self.assertEqual(q359["correct"], "C")
        self.assertIn("g(x) = 5x + a", q359["prompt"])

    def test_zero_unclosed_double_dollar_math(self):
        with open(DATA_MATH, "r", encoding="utf-8") as f:
            questions = json.load(f)

        broken_double_dollars = []
        for q in questions:
            qid = q.get("id")
            for field in ["passage", "prompt", "rationale"]:
                val = q.get(field) or ""
                m = re.findall(r"\$\$(\d+(?:,\d+)*(?:\.\d+)?)\$", val)
                if m:
                    broken_double_dollars.append((qid, field, m))

        self.assertEqual(len(broken_double_dollars), 0, f"Found broken $$digits$ in: {broken_double_dollars[:5]}")

    def test_spr_numerical_equivalence_evaluation(self):
        sample_spr_frac = {"type": "spr", "is_spr": True, "correct": "5/2", "correct_answer": "5/2"}
        self.assertTrue(mock_is_answer_correct(sample_spr_frac, "5/2"))
        self.assertTrue(mock_is_answer_correct(sample_spr_frac, "2.5"))
        self.assertTrue(mock_is_answer_correct(sample_spr_frac, "2.50"))
        self.assertFalse(mock_is_answer_correct(sample_spr_frac, "2.4"))

        sample_spr_whole = {"type": "spr", "is_spr": True, "correct": "403", "correct_answer": "403"}
        self.assertTrue(mock_is_answer_correct(sample_spr_whole, "403"))
        self.assertTrue(mock_is_answer_correct(sample_spr_whole, "403.0"))
        self.assertFalse(mock_is_answer_correct(sample_spr_whole, "400"))

    def test_math_passages_merged_and_sticky_footer(self):
        # 1. Dataset verification: All Math questions have empty passage (equations are in prompt)
        with open(DATA_MATH, "r", encoding="utf-8") as f:
            questions = json.load(f)

        math_with_passage = [q["id"] for q in questions if q.get("passage") and q.get("passage").strip()]
        self.assertEqual(len(math_with_passage), 0, f"Math questions must have empty passages: {math_with_passage[:5]}")

        # cb_math_688 verification (User Image 3 question)
        q688 = next(q for q in questions if q["id"] == "cb_math_688")
        self.assertEqual(q688.get("passage", ""), "")
        self.assertIn("S(n) = 38{,}000 a^n", q688["prompt"])
        self.assertEqual(q688["options"]["C"], "1.04")
        self.assertEqual(q688["options"]["D"], "1.4")

        # 2. UI verification: sticky footers and explanation card direct Next button
        index_path = os.path.join(ROOT_DIR, "index.html")
        pub_index_path = os.path.join(ROOT_DIR, "public", "index.html")

        for p in [index_path, pub_index_path]:
            with open(p, "r", encoding="utf-8") as f:
                html = f.read()
            self.assertIn('id="qb-test-footer" class="sticky bottom-0 z-30', html)
            self.assertIn('onclick="qbEngine.nextQuestion()"', html)
            self.assertIn('qPane.scrollTop = 0', html)

    def test_math_coordinates_have_commas(self):
        # 1. Dataset verification: cb_math_1088 (user screenshot question) has comma between coordinates
        with open(DATA_MATH, "r", encoding="utf-8") as f:
            questions = json.load(f)

        q1088 = next(q for q in questions if q["id"] == "cb_math_1088")
        self.assertIn(r"\left(0, y\right)", q1088["prompt"])
        self.assertIn(r"(0, 4)", q1088["rationale"])
        self.assertIn(r"(0, y)", q1088["rationale"])

        # Check cb_math_219, cb_math_594, cb_math_1015
        for target_id in ["cb_math_219", "cb_math_594", "cb_math_1015"]:
            q = next(item for item in questions if item["id"] == target_id)
            self.assertIn(r"\left(0, y\right)", q["prompt"])

        # Ensure no un-comma'd \left(0 y\right) or (0 y) exists in any math question
        for q in questions:
            for field in ["prompt", "rationale"]:
                val = q.get(field, "")
                self.assertNotIn(r"\left(0 y\right)", val, f"{q['id']} {field} still has \\left(0 y\\right)")
                self.assertNotIn(r"(0 y)", val, f"{q['id']} {field} still has (0 y)")

        # 2. Engine verification: formatQuestionText has coordinate comma normalization
        for p in [os.path.join(ROOT_DIR, "index.html"), os.path.join(ROOT_DIR, "public", "index.html"), os.path.join(ROOT_DIR, "public", "qb_engine.js"), os.path.join(ROOT_DIR, "public", "public", "qb_engine.js")]:
            with open(p, "r", encoding="utf-8") as f:
                code = f.read()
            self.assertIn("Normalize coordinate points without commas", code, f"{p} missing coordinate normalization")
            self.assertIn("dataVersion: '2.6.0'", code, f"{p} missing dataVersion 2.6.0")


if __name__ == "__main__":
    unittest.main()

