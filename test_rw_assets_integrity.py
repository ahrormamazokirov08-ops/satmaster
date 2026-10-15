#!/usr/bin/env python3
"""
test_rw_assets_integrity.py
Unit tests for Reading & Writing question bank visual assets integrity:
- XML validity and viewBox presence in all SVGs
- Table structure and formatting
- Snippet extraction without tag bleeding
"""

import os
import json
import re
import unittest
import xml.etree.ElementTree as ET

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_RW = os.path.join(ROOT_DIR, "data", "questions", "reading_writing.json")
PUBLIC_RW = os.path.join(ROOT_DIR, "public", "data", "questions", "reading_writing.json")

def mock_get_passage_snippet(html_str, max_len=90):
    if not html_str:
        return ""
    text = re.sub(r"<svg[\s\S]*?<\/svg>", "", html_str, flags=re.I)
    text = re.sub(r"<table[\s\S]*?<\/table>", "", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        return ""
    return (text[:max_len].strip() + "...") if len(text) > max_len else text


class TestRWAssetsIntegrity(unittest.TestCase):

    def test_rw_files_exist_and_match(self):
        self.assertTrue(os.path.exists(DATA_RW), f"Missing {DATA_RW}")
        self.assertTrue(os.path.exists(PUBLIC_RW), f"Missing {PUBLIC_RW}")
        
        with open(DATA_RW, "r", encoding="utf-8") as f1, open(PUBLIC_RW, "r", encoding="utf-8") as f2:
            data1 = json.load(f1)
            data2 = json.load(f2)
            
        self.assertEqual(len(data1), 1845, "Expected 1,845 RW questions")
        self.assertEqual(len(data1), len(data2), "Mirrored files must have identical counts")

    def test_all_rw_svgs_are_valid_xml_with_viewbox(self):
        with open(DATA_RW, "r", encoding="utf-8") as f:
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

                # Parse XML cleanly
                try:
                    root = ET.fromstring(raw_svg)
                    self.assertEqual(root.tag.split("}")[-1], "svg", f"Root tag should be svg in {q_id}")
                except Exception as e:
                    self.fail(f"Question {q_id} SVG failed XML parsing: {e}\nSVG: {raw_svg[:200]}")

        self.assertEqual(svg_count, 62, f"Expected 62 SVGs across RW, found {svg_count}")

    def test_all_rw_tables_are_well_formed(self):
        with open(DATA_RW, "r", encoding="utf-8") as f:
            questions = json.load(f)

        table_count = 0
        for q in questions:
            passage = q.get("passage", "") or ""
            if "<table" in passage.lower():
                table_count += 1
                q_id = q.get("id")
                self.assertIn("</table>", passage.lower(), f"Question {q_id} has unclosed table")
                self.assertIn("qb-table-wrapper", passage, f"Question {q_id} table missing qb-table-wrapper")
                self.assertNotIn(r'class=\"', passage, f"Question {q_id} has escaped backslash in class attributes")

        self.assertEqual(table_count, 71, f"Expected 71 tables in RW, found {table_count}")

    def test_passage_snippet_sanitization(self):
        sample_svg_passage = '<div class="qb-figure-wrapper"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40"/></svg></div>The graph above illustrates the relationship.'
        snippet = mock_get_passage_snippet(sample_svg_passage, 50)
        self.assertNotIn("<svg", snippet)
        self.assertNotIn("circle", snippet)
        self.assertNotIn("qb-figure", snippet)
        self.assertTrue(snippet.startswith("The graph above illustrates"))

        sample_table_passage = '<div class="qb-table-wrapper"><table><tr><th>Header</th></tr></table></div>According to the data presented in the table above, the trend continues.'
        snippet_tbl = mock_get_passage_snippet(sample_table_passage, 50)
        self.assertNotIn("<table", snippet_tbl)
        self.assertNotIn("Header", snippet_tbl)
        self.assertTrue(snippet_tbl.startswith("According to the data"))


if __name__ == "__main__":
    unittest.main()
