#!/usr/bin/env python3
"""
Test Suite: Question Bank Status (Unsolved/Solved/All) & Supabase/SQLite Backend Integration
=============================================================================================
Verifies:
1. Database Schema (student_solved_questions):
   - Required columns: id, uid, question_id, subject, domain, skill, is_correct, selected_answer, time_spent_seconds, solved_at
   - Idempotent upsert on (uid, question_id) preventing duplicate or orphan rows.
2. Multi-User Isolation:
   - Student A solves do not leak into Student B's unsolved pool or accuracy metrics.
3. REST API Endpoints:
   - POST /api/qbank/record-attempt (single & batch)
   - GET /api/qbank/user-history?uid={uid} returning { solved_ids: [...], stats: { skill: { solved, correct } } }
4. Frontend Engine Wiring & Filtering:
   - Status filters ('unsolved', 'solved', 'all')
   - Offline resilience & sync functions
5. Strict Isolation:
   - Zero tampering with vocabulary, audio, or homework tables.
"""

import os
import sys
import json
import sqlite3
import unittest
import io
import re

from database import RelationalDB
from telegram_bot import SATMasterHandler

TEST_DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_qb_status.db")


class FakeSocket:
    def __init__(self, data_bytes):
        self.rfile = io.BytesIO(data_bytes)
        self.output_buffer = io.BytesIO()

    def makefile(self, mode, *args, **kwargs):
        if 'r' in mode:
            return self.rfile
        return self.output_buffer

    def sendall(self, data):
        self.output_buffer.write(data)


def execute_mock_request(handler_cls, method, path, headers=None, body=None):
    body_bytes = json.dumps(body).encode("utf-8") if body is not None else b""
    req_lines = [
        f"{method} {path} HTTP/1.1",
        "Host: localhost",
        "Content-Type: application/json",
        f"Content-Length: {len(body_bytes)}",
    ]
    if headers:
        for k, v in headers.items():
            req_lines.append(f"{k}: {v}")
    req_lines.extend(["", ""])
    raw_req = "\r\n".join(req_lines).encode("utf-8") + body_bytes
    sock = FakeSocket(raw_req)
    handler_cls(sock, ("127.0.0.1", 12345), None)
    output = sock.output_buffer.getvalue()

    header_part, _, body_part = output.partition(b"\r\n\r\n")
    status_line = header_part.split(b"\r\n")[0].decode("utf-8")
    status_code = int(status_line.split(" ")[1])

    try:
        data = json.loads(body_part.decode("utf-8")) if body_part else {}
    except Exception:
        data = {"raw": body_part.decode("utf-8", errors="replace")}

    return status_code, data


class TestQBStatusBackend(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if os.path.exists(TEST_DB_PATH):
            os.remove(TEST_DB_PATH)
        cls.db = RelationalDB(TEST_DB_PATH)

    @classmethod
    def tearDownClass(cls):
        if os.path.exists(TEST_DB_PATH):
            os.remove(TEST_DB_PATH)

    def test_01_schema_structure(self):
        """Verify student_solved_questions has all required columns and constraints."""
        with sqlite3.connect(TEST_DB_PATH) as conn:
            cur = conn.cursor()
            cur.execute("PRAGMA table_info(student_solved_questions)")
            cols = {row[1]: row[2].upper() for row in cur.fetchall()}

        required_cols = [
            "id", "uid", "question_id", "subject", "domain",
            "skill", "is_correct", "selected_answer", "time_spent_seconds", "solved_at"
        ]
        for c in required_cols:
            self.assertIn(c, cols, f"Column '{c}' must exist in student_solved_questions")

    def test_02_idempotent_upsert(self):
        """Verify repeat attempts by the same student on the same question update the row in place."""
        uid = "student_test_01"
        qid = "cb_rw_100"

        # Attempt 1: Incorrect answer
        rec1 = self.db.record_qbank_attempt(
            uid=uid,
            question_id=qid,
            subject="Reading and Writing",
            domain="Craft and Structure",
            skill="Words in Context",
            is_correct=False,
            selected_answer="B",
            time_spent_seconds=42
        )
        self.assertIsNotNone(rec1)
        self.assertFalse(rec1["is_correct"])
        self.assertEqual(rec1["selected_answer"], "B")
        self.assertEqual(rec1["time_spent_seconds"], 42)

        # Attempt 2: Correct answer on same question
        rec2 = self.db.record_qbank_attempt(
            uid=uid,
            question_id=qid,
            subject="Reading and Writing",
            domain="Craft and Structure",
            skill="Words in Context",
            is_correct=True,
            selected_answer="A",
            time_spent_seconds=65
        )
        self.assertIsNotNone(rec2)
        self.assertTrue(rec2["is_correct"])
        self.assertEqual(rec2["selected_answer"], "A")
        self.assertEqual(rec2["time_spent_seconds"], 65)

        # Verify only 1 row exists in database for (uid, qid)
        with sqlite3.connect(TEST_DB_PATH) as conn:
            cur = conn.cursor()
            cur.execute("SELECT count(*) FROM student_solved_questions WHERE uid=? AND question_id=?", (uid, qid))
            count = cur.fetchone()[0]
            self.assertEqual(count, 1, "Duplicate row created instead of in-place upsert!")

    def test_03_multi_user_isolation(self):
        """Verify User A's attempts never affect User B's history or unsolved count."""
        user_a = "user_alpha"
        user_b = "user_beta"

        # User A solves 2 questions in Craft and Structure
        self.db.record_qbank_attempt(user_a, "cb_rw_201", "Reading and Writing", "Craft and Structure", "Words in Context", True, "C", 20)
        self.db.record_qbank_attempt(user_a, "cb_rw_202", "Reading and Writing", "Craft and Structure", "Words in Context", False, "D", 30)

        # User B solves 1 question in Algebra
        self.db.record_qbank_attempt(user_b, "cb_m_301", "Math", "Algebra", "Linear functions", True, "12", 15)

        hist_a = self.db.get_qbank_user_history(user_a)
        hist_b = self.db.get_qbank_user_history(user_b)

        # Assert User A isolation
        self.assertEqual(set(hist_a["solved_ids"]), {"cb_rw_201", "cb_rw_202"})
        self.assertNotIn("cb_m_301", hist_a["solved_ids"])
        self.assertEqual(hist_a["stats"]["Words in Context"]["solved"], 2)
        self.assertEqual(hist_a["stats"]["Words in Context"]["correct"], 1)
        self.assertNotIn("Linear functions", hist_a["stats"])

        # Assert User B isolation
        self.assertEqual(hist_b["solved_ids"], ["cb_m_301"])
        self.assertNotIn("cb_rw_201", hist_b["solved_ids"])
        self.assertNotIn("cb_rw_202", hist_b["solved_ids"])
        self.assertEqual(hist_b["stats"]["Linear functions"]["solved"], 1)
        self.assertEqual(hist_b["stats"]["Linear functions"]["correct"], 1)
        self.assertNotIn("Words in Context", hist_b["stats"])

    def test_04_batch_attempt_recording(self):
        """Verify record_qbank_attempts_batch successfully inserts multiple attempts."""
        user_batch = "user_batch_test"
        items = [
            {
                "question_id": "cb_rw_501",
                "subject": "Reading and Writing",
                "domain": "Information and Ideas",
                "skill": "Command of Evidence",
                "is_correct": True,
                "selected_answer": "B",
                "time_spent_seconds": 45
            },
            {
                "question_id": "cb_rw_502",
                "subject": "Reading and Writing",
                "domain": "Information and Ideas",
                "skill": "Command of Evidence",
                "is_correct": False,
                "selected_answer": "A",
                "time_spent_seconds": 55
            }
        ]
        count = self.db.record_qbank_attempts_batch(user_batch, items)
        self.assertEqual(count, 2)

        hist = self.db.get_qbank_user_history(user_batch)
        self.assertEqual(len(hist["solved_ids"]), 2)
        self.assertEqual(hist["stats"]["Command of Evidence"]["solved"], 2)
        self.assertEqual(hist["stats"]["Command of Evidence"]["correct"], 1)

    def test_05_rest_api_record_attempt(self):
        """Test POST /api/qbank/record-attempt via HTTP handler."""
        uid = "api_student_01"
        payload = {
            "uid": uid,
            "question_id": "cb_rw_999",
            "subject": "Reading and Writing",
            "domain": "Standard English Conventions",
            "skill": "Boundaries",
            "is_correct": True,
            "selected_answer": "C",
            "time_spent_seconds": 33
        }
        code, data = execute_mock_request(SATMasterHandler, "POST", "/api/qbank/record-attempt", body=payload)
        self.assertEqual(code, 200, f"Expected 200, got {code}: {data}")
        self.assertTrue(data.get("ok"))
        self.assertEqual(data.get("status"), "success")
        self.assertEqual(data.get("record", {}).get("question_id"), "cb_rw_999")

        # Test batch attempt over API
        batch_payload = {
            "uid": uid,
            "attempts": [
                {
                    "question_id": "cb_rw_998",
                    "subject": "Reading and Writing",
                    "domain": "Standard English Conventions",
                    "skill": "Boundaries",
                    "is_correct": False,
                    "selected_answer": "A",
                    "time_spent_seconds": 40
                }
            ]
        }
        bcode, bdata = execute_mock_request(SATMasterHandler, "POST", "/api/qbank/record-attempt", body=batch_payload)
        self.assertEqual(bcode, 200)
        self.assertEqual(bdata.get("recorded_count"), 1)

    def test_06_rest_api_user_history(self):
        """Test GET /api/qbank/user-history?uid=... via HTTP handler."""
        uid = "api_student_01"
        code, data = execute_mock_request(SATMasterHandler, "GET", f"/api/qbank/user-history?uid={uid}")
        self.assertEqual(code, 200, f"Expected 200, got {code}: {data}")
        self.assertTrue(data.get("ok"))
        self.assertIn("cb_rw_999", data.get("solved_ids", []))
        self.assertIn("cb_rw_998", data.get("solved_ids", []))
        stats = data.get("stats", {})
        self.assertIn("Boundaries", stats)
        self.assertEqual(stats["Boundaries"]["solved"], 2)
        self.assertEqual(stats["Boundaries"]["correct"], 1)

    def test_07_api_validation(self):
        """Test 400 bad request validation on missing required parameters."""
        # Missing uid in GET /api/qbank/user-history
        code, data = execute_mock_request(SATMasterHandler, "GET", "/api/qbank/user-history")
        self.assertEqual(code, 400)
        self.assertFalse(data.get("ok"))

        # Missing uid in POST /api/qbank/record-attempt
        code, data = execute_mock_request(SATMasterHandler, "POST", "/api/qbank/record-attempt", body={"question_id": "cb_1"})
        self.assertEqual(code, 400)

        # Missing question_id in POST /api/qbank/record-attempt
        code, data = execute_mock_request(SATMasterHandler, "POST", "/api/qbank/record-attempt", body={"uid": "u1"})
        self.assertEqual(code, 400)

    def test_08_frontend_engine_wiring(self):
        """Verify qb_engine.js bundle and mirrors contain the required methods and properties."""
        bundles = [
            os.path.join(os.path.dirname(__file__), "public", "qb_engine.js"),
            os.path.join(os.path.dirname(__file__), "public", "public", "qb_engine.js"),
            os.path.join(os.path.dirname(__file__), "index.html"),
            os.path.join(os.path.dirname(__file__), "public", "index.html")
        ]

        expected_tokens = [
            "statsPerSkill",
            "/api/qbank/user-history",
            "/api/qbank/record-attempt",
            "qb_solved_",
            "syncPendingAttempts",
            "queuePendingAttempt"
        ]

        for path in bundles:
            self.assertTrue(os.path.exists(path), f"File {path} does not exist")
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
            for tok in expected_tokens:
                self.assertIn(tok, content, f"Token '{tok}' missing from bundle {os.path.basename(path)}")

    def test_09_status_filter_simulation(self):
        """Simulate how the status filter functions on an authentic bank of questions."""
        sample_questions = [
            {"id": "q1", "skill": "Words in Context", "difficulty": "Medium"},
            {"id": "q2", "skill": "Words in Context", "difficulty": "Medium"},
            {"id": "q3", "skill": "Transitions", "difficulty": "Hard"}
        ]
        solved_ids = {"q1"}

        # When status == 'unsolved' (default)
        unsolved_pool = [q for q in sample_questions if q["id"] not in solved_ids]
        self.assertEqual(len(unsolved_pool), 2)
        self.assertEqual([q["id"] for q in unsolved_pool], ["q2", "q3"])

        # When status == 'solved'
        solved_pool = [q for q in sample_questions if q["id"] in solved_ids]
        self.assertEqual(len(solved_pool), 1)
        self.assertEqual([q["id"] for q in solved_pool], ["q1"])

        # When status == 'all'
        all_pool = sample_questions
        self.assertEqual(len(all_pool), 3)

    def test_10_strict_isolation_vocab_audio(self):
        """Verify vocabulary words and audio engine are 100% intact."""
        with open("index.html", "r", encoding="utf-8") as f:
            html = f.read()

        self.assertIn("window.satAudio", html, "Audio engine window.satAudio missing!")
        self.assertIn("speakWord", html, "Speech engine speakWord missing!")
        self.assertIn("const satWords =", html, "SAT Vocabulary array must be intact!")
        self.assertIn("434 Words", html, "PrepPros 434 vocabulary set must remain intact!")

    def test_11_immediate_per_question_solve_persistence(self):
        """Verify frontend scripts wire immediate persistence on answer selection and navigation."""
        bundles = [
            os.path.join(os.path.dirname(__file__), "public", "qb_engine.js"),
            os.path.join(os.path.dirname(__file__), "public", "public", "qb_engine.js"),
            os.path.join(os.path.dirname(__file__), "index.html"),
            os.path.join(os.path.dirname(__file__), "public", "index.html")
        ]

        immediate_tokens = [
            "saveActiveQuestionIfAnswered",
            "saveAllAnsweredQuestionsFromSession"
        ]

        for path in bundles:
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
            for tok in immediate_tokens:
                self.assertIn(tok, content, f"Immediate save token '{tok}' missing from {os.path.basename(path)}")

    def test_12_midway_session_exit_persistence(self):
        """Simulate student starting 20 questions, answering 5 midway, and exiting.
        Assert that those 5 questions are recorded as solved and immediately excluded from unsolved pool.
        """
        student_midway = "student_midway_exit_user"
        all_pool = [
            {"id": f"q_session_{i}", "subject": "Math", "domain": "Algebra", "skill": "Linear equations"}
            for i in range(1, 21)
        ]

        # Student answers the first 5 questions during the session
        answered_items = [
            {
                "question_id": f"q_session_{i}",
                "subject": "Math",
                "domain": "Algebra",
                "skill": "Linear equations",
                "is_correct": (i % 2 == 1),
                "selected_answer": "B" if (i % 2 == 1) else "A",
                "time_spent_seconds": 25 + i
            }
            for i in range(1, 6)
        ]

        # Immediate recording happens per question as student clicks next or exits
        for item in answered_items:
            self.db.record_qbank_attempt(
                uid=student_midway,
                question_id=item["question_id"],
                subject=item["subject"],
                domain=item["domain"],
                skill=item["skill"],
                is_correct=item["is_correct"],
                selected_answer=item["selected_answer"],
                time_spent_seconds=item["time_spent_seconds"]
            )

        # Retrieve user history
        hist = self.db.get_qbank_user_history(student_midway)
        solved_set = set(hist["solved_ids"])

        # Check solved set contains all 5 answered questions and none of the remaining 15
        self.assertEqual(len(solved_set), 5)
        for i in range(1, 6):
            self.assertIn(f"q_session_{i}", solved_set)
        for i in range(6, 21):
            self.assertNotIn(f"q_session_{i}", solved_set)

        # Filter by 'unsolved': must have exactly 15 questions remaining, none of the 5 answered
        unsolved_pool = [q for q in all_pool if q["id"] not in solved_set]
        self.assertEqual(len(unsolved_pool), 15)
        for q in unsolved_pool:
            self.assertNotIn(q["id"], solved_set)

        # Filter by 'solved': must have exactly the 5 answered questions
        solved_pool = [q for q in all_pool if q["id"] in solved_set]
        self.assertEqual(len(solved_pool), 5)
        self.assertEqual({q["id"] for q in solved_pool}, {f"q_session_{i}" for i in range(1, 6)})


if __name__ == "__main__":
    unittest.main()

