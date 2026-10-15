#!/usr/bin/env python3
"""
test_desmos_calculator_integration.py
Verification test suite for Official Digital SAT Desmos Graphing Calculator:
- DOM structure & official College Board Desmos endpoint
- Draggable header and non-modal floating panel
- Question Bank and Homework Runner toolbar buttons
- Math vs Reading & Writing exam section visibility rules
"""

import os
import unittest

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
INDEX_PATH = os.path.join(ROOT_DIR, "index.html")
PUBLIC_INDEX_PATH = os.path.join(ROOT_DIR, "public", "index.html")

OFFICIAL_DESMOS_URL = "https://www.desmos.com/testing/collegeboard/graphing"

class TestDesmosCalculatorIntegration(unittest.TestCase):

    def setUp(self):
        with open(INDEX_PATH, "r", encoding="utf-8") as f:
            self.root_html = f.read()
        with open(PUBLIC_INDEX_PATH, "r", encoding="utf-8") as f:
            self.pub_html = f.read()

    def test_desmos_modal_panel_dom_present(self):
        for name, html in [("root", self.root_html), ("public", self.pub_html)]:
            self.assertIn('id="desmos-calculator-panel"', html, f"Missing desmos-calculator-panel in {name}")
            self.assertIn('id="desmos-drag-header"', html, f"Missing desmos-drag-header in {name}")
            self.assertIn('id="desmos-drag-shield"', html, f"Missing desmos-drag-shield in {name}")
            self.assertIn('id="desmos-iframe"', html, f"Missing desmos-iframe in {name}")
            self.assertIn(OFFICIAL_DESMOS_URL, html, f"Missing official Desmos URL in {name}")

    def test_toolbar_calculator_buttons(self):
        for name, html in [("root", self.root_html), ("public", self.pub_html)]:
            self.assertIn('id="qb-btn-calculator"', html, f"Missing qb-btn-calculator in {name}")
            self.assertIn('id="runner-btn-calculator"', html, f"Missing runner-btn-calculator in {name}")
            self.assertIn('onclick="toggleDesmosCalculator()"', html, f"Missing toggleDesmosCalculator click handler in {name}")

    def test_desmos_controller_functions(self):
        for name, html in [("root", self.root_html), ("public", self.pub_html)]:
            self.assertIn('function toggleDesmosCalculator(', html, f"Missing toggleDesmosCalculator in {name}")
            self.assertIn('function resetDesmosCalculator(', html, f"Missing resetDesmosCalculator in {name}")
            self.assertIn('function initDesmosDraggable(', html, f"Missing initDesmosDraggable in {name}")
            self.assertIn('function updateCalculatorButtonStates(', html, f"Missing updateCalculatorButtonStates in {name}")

    def test_math_section_rules_and_draggable_init(self):
        for name, html in [("root", self.root_html), ("public", self.pub_html)]:
            self.assertIn('Calculators are only available in the Math section', html, f"Missing SAT rule tooltip in {name}")
            self.assertIn('initDesmosDraggable()', html, f"Missing initDesmosDraggable call in {name}")


if __name__ == "__main__":
    unittest.main()
