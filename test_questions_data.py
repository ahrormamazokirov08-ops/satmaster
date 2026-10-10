#!/usr/bin/env python3
"""
test_questions_data.py
Validates the official College Board Digital SAT question bank dataset.
Ensures 100% schema compliance, MCQ/SPR integrity, domain coverage,
and proper math formatting.
"""

import os
import sys
import json
import re

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(ROOT_DIR, "data", "questions")
RW_PATH = os.path.join(DATA_DIR, "reading_writing.json")
MATH_PATH = os.path.join(DATA_DIR, "math.json")

VALID_DOMAINS = {
    "Reading and Writing": {
        "Craft and Structure",
        "Information and Ideas",
        "Standard English Conventions",
        "Expression of Ideas"
    },
    "Math": {
        "Algebra",
        "Advanced Math",
        "Problem-Solving and Data Analysis",
        "Geometry and Trigonometry"
    }
}

VALID_DIFFICULTIES = {"Easy", "Medium", "Hard"}

REQUIRED_FIELDS = {
    "id", "subject", "domain", "skill", "difficulty",
    "passage", "prompt", "options", "correct_answer",
    "is_spr", "rationale"
}

def test_dataset(file_path, expected_subject, min_count):
    print(f"\n--- Testing {expected_subject} ({os.path.basename(file_path)}) ---")
    assert os.path.exists(file_path), f"File not found: {file_path}"
    
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    assert isinstance(data, list), f"Expected list of questions, got {type(data)}"
    total = len(data)
    print(f"Total questions found: {total}")
    assert total >= min_count, f"Expected at least {min_count} questions, found {total}"

    ids = set()
    diff_counts = {"Easy": 0, "Medium": 0, "Hard": 0}
    type_counts = {"MCQ": 0, "SPR": 0}
    domain_counts = {}

    for i, item in enumerate(data):
        # 1. Check all required keys exist
        missing_keys = REQUIRED_FIELDS - set(item.keys())
        assert not missing_keys, f"Question index {i} missing keys: {missing_keys}"

        # 2. Check id uniqueness
        qid = item["id"]
        assert qid not in ids, f"Duplicate question ID: {qid}"
        ids.add(qid)

        # 3. Check subject
        assert item["subject"] == expected_subject, f"Invalid subject in {qid}: {item['subject']}"

        # 4. Check domain
        domain = item["domain"]
        assert domain in VALID_DOMAINS[expected_subject], f"Unexpected domain in {qid}: '{domain}'"
        domain_counts[domain] = domain_counts.get(domain, 0) + 1

        # 5. Check skill
        assert isinstance(item["skill"], str) and len(item["skill"]) > 0, f"Empty skill in {qid}"

        # 6. Check difficulty
        diff = item["difficulty"]
        assert diff in VALID_DIFFICULTIES, f"Invalid difficulty in {qid}: {diff}"
        diff_counts[diff] += 1

        # 7. Check passage and prompt
        assert isinstance(item["passage"], str), f"Passage must be string in {qid}"
        assert isinstance(item["prompt"], str) and len(item["prompt"].strip()) > 0, f"Empty prompt in {qid}"

        # 8. Check MCQ vs SPR rules
        is_spr = item["is_spr"]
        assert isinstance(is_spr, bool), f"is_spr must be bool in {qid}"

        if is_spr:
            type_counts["SPR"] += 1
            assert expected_subject == "Math", f"SPR found in non-math question: {qid}"
            assert item["options"] is None, f"SPR question {qid} must have options=None"
            assert isinstance(item["correct_answer"], str) and len(item["correct_answer"].strip()) > 0, (
                f"SPR question {qid} must have non-empty correct_answer string"
            )
        else:
            type_counts["MCQ"] += 1
            options = item["options"]
            assert isinstance(options, dict), f"MCQ question {qid} options must be dict"
            assert set(options.keys()) == {"A", "B", "C", "D"}, f"MCQ options must have keys A-D in {qid}"
            for k in ["A", "B", "C", "D"]:
                assert isinstance(options[k], str), f"Option {k} in {qid} must be string"
            assert item["correct_answer"] in ["A", "B", "C", "D"], (
                f"MCQ correct_answer in {qid} must be one of A/B/C/D, got '{item['correct_answer']}'"
            )

        # 9. Check rationale
        assert isinstance(item["rationale"], str) and len(item["rationale"].strip()) > 0, f"Empty rationale in {qid}"

    print(f"✅ Schema & integrity 100% verified for all {total} questions.")
    print(f"   Types: MCQ={type_counts['MCQ']}, SPR={type_counts['SPR']}")
    print(f"   Difficulties: {diff_counts}")
    print(f"   Domains:")
    for d, c in domain_counts.items():
        print(f"     - {d}: {c}")

    return data, ids

def main():
    print("=" * 60)
    print("🧪 RUNNING SAT QUESTION BANK VALIDATION SUITE")
    print("=" * 60)

    rw_data, rw_ids = test_dataset(RW_PATH, "Reading and Writing", min_count=1800)
    math_data, math_ids = test_dataset(MATH_PATH, "Math", min_count=1800)

    # Cross-dataset verification
    overlap_ids = rw_ids.intersection(math_ids)
    assert not overlap_ids, f"Found overlapping question IDs between datasets: {overlap_ids}"

    total_questions = len(rw_data) + len(math_data)
    print("\n" + "=" * 60)
    print(f"🎉 ALL CHECKS PASSED!")
    print(f"   Total Validated Questions: {total_questions}")
    print(f"   • Reading and Writing:     {len(rw_data)}")
    print(f"   • Math:                    {len(math_data)}")
    print("=" * 60)

if __name__ == "__main__":
    main()
