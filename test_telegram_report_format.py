#!/usr/bin/env python3
"""
Test Suite: Telegram Test Report Redesign & Interactive "More Information" Flow
================================================================================
"""
import os
import sys
import json
import unittest
import io

from telegram_bot import (
    TelegramBotClient,
    format_vocab_summary_text,
    format_vocab_details_text,
    handle_update,
    SATMasterHandler
)
import telegram_bot
from database import RelationalDB

class MockTelegramBot:
    def __init__(self):
        self.sent_messages = []
        self.edited_messages = []
        self.answered_callbacks = []

    def send_message(self, chat_id, text, reply_markup=None, parse_mode="HTML"):
        self.sent_messages.append({
            "chat_id": chat_id,
            "text": text,
            "reply_markup": reply_markup,
            "parse_mode": parse_mode
        })
        return {"ok": True, "result": {"message_id": 9999, "chat": {"id": chat_id}}}

    def edit_message_text(self, chat_id, message_id, text, reply_markup=None, parse_mode="HTML"):
        self.edited_messages.append({
            "chat_id": chat_id,
            "message_id": message_id,
            "text": text,
            "reply_markup": reply_markup,
            "parse_mode": parse_mode
        })
        return {"ok": True, "result": {"message_id": message_id, "chat": {"id": chat_id}}}

    def answer_callback_query(self, callback_query_id, text=None):
        self.answered_callbacks.append({
            "callback_query_id": callback_query_id,
            "text": text
        })
        return {"ok": True}


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
    crlf = chr(13) + chr(10)
    raw_req = crlf.join(req_lines).encode("utf-8") + body_bytes
    sock = FakeSocket(raw_req)
    handler_cls(sock, ("127.0.0.1", 12345), None)
    output = sock.output_buffer.getvalue()

    sep = crlf.encode("utf-8") + crlf.encode("utf-8")
    header_part, _, body_part = output.partition(sep)
    status_line = header_part.split(crlf.encode("utf-8"))[0].decode("utf-8")
    status_code = int(status_line.split(" ")[1])

    try:
        data = json.loads(body_part.decode("utf-8")) if body_part else {}
    except Exception:
        data = {"raw": body_part.decode("utf-8", errors="replace")}

    return status_code, data
class TestTelegramReportFormat(unittest.TestCase):
    def setUp(self):
        self.sample_report_failed = {
            "id": "vrep_test_001",
            "studentId": "215802f4-66c9-4508-a973-31c6b3092f48",
            "studentName": "Go bro",
            "studentClass": "SAT_Alpha_1",
            "date": "Oct 12, 2026, 01:10 PM",
            "scopeName": "Lessons 1 – 2 (First 40 Words)",
            "timeFormatted": "0m 10s",
            "durationSeconds": 10,
            "attemptNumber": 1,
            "totalQuestions": 10,
            "correctCount": 2,
            "scorePct": 20,
            "lessonBreakdown": [
                {"lessonNumber": 1, "lessonLabel": "Lesson 1", "correct": 2, "total": 6, "pct": 33},
                {"lessonNumber": 2, "lessonLabel": "Lesson 2", "correct": 0, "total": 4, "pct": 0}
            ],
            "learnedWords": [
                {"id": 1, "word": "Precursor"},
                {"id": 2, "word": "Apprehensive"}
            ],
            "missedWords": [
                {"word": {"id": 3, "word": "Repression"}},
                {"word": {"id": 4, "word": "Accentuate"}},
                {"word": {"id": 5, "word": "Anecdote"}},
                {"word": {"id": 6, "word": "Dispute"}},
                {"word": {"id": 7, "word": "Provoke"}},
                {"word": {"id": 8, "word": "Pervasive"}},
                {"word": {"id": 9, "word": "Speculate"}},
                {"word": {"id": 10, "word": "Bias"}}
            ]
        }

        self.sample_report_passed = {
            "id": "vrep_test_002",
            "studentId": "stu_pass_99",
            "studentName": "Alice Wonder",
            "studentClass": "SAT_Elite_2026",
            "date": "Oct 13, 2026, 02:00 PM",
            "scopeName": "Lessons 1 – 3 (First 60 Words)",
            "timeFormatted": "1m 45s",
            "durationSeconds": 105,
            "attemptNumber": 2,
            "totalQuestions": 20,
            "correctCount": 18,
            "scorePct": 90,
            "lessonBreakdown": [
                {"lessonNumber": 1, "lessonLabel": "Lesson 1", "correct": 6, "total": 6, "pct": 100},
                {"lessonNumber": 2, "lessonLabel": "Lesson 2", "correct": 6, "total": 7, "pct": 86},
                {"lessonNumber": 3, "lessonLabel": "Lesson 3", "correct": 6, "total": 7, "pct": 86}
            ],
            "learnedWords": [{"id": i, "word": f"Word_{i}"} for i in range(1, 19)],
            "missedWords": [{"word": {"id": 19, "word": "Word_19"}}, {"word": {"id": 20, "word": "Word_20"}}]
        }

    def tearDown(self):
        try:
            db = telegram_bot.load_db()
            db["reports"] = [r for r in db.get("reports", []) if not str(r.get("id")).startswith("vrep_test_")]
            telegram_bot.save_db(db)
        except Exception:
            pass

    def test_01_summary_text_failed_status(self):
        """Summary text for <80% score must show ❌ FAILED and NOT ⚠️ NEEDS REVIEW."""
        text = format_vocab_summary_text(self.sample_report_failed)

        self.assertIn("Go bro", text)
        self.assertIn("SAT_Alpha_1", text)
        self.assertIn("Lessons 1 – 2 (First 40 Words)", text)
        self.assertIn("10 Questions Tested", text)
        self.assertIn("SCORE: 2/10 (20%) — ❌ FAILED", text)
        self.assertNotIn("NEEDS REVIEW", text)

        # Ensure bloated fields are NOT in the clean summary
        self.assertNotIn("CATEGORIZED LESSON BREAKDOWN", text)
        self.assertNotIn("WORDS LEARNED", text)
        self.assertNotIn("WORDS NEEDING REVIEW", text)
        self.assertNotIn("Time Taken:", text)

    def test_02_summary_text_passed_status(self):
        """Summary text for >=80% score must show ✅ PASSED."""
        text = format_vocab_summary_text(self.sample_report_passed)

        self.assertIn("Alice Wonder", text)
        self.assertIn("SAT_Elite_2026", text)
        self.assertIn("20 Questions Tested", text)
        self.assertIn("SCORE: 18/20 (90%) — ✅ PASSED", text)
        self.assertNotIn("FAILED", text)

    def test_03_details_text_comprehensive_breakdown(self):
        """Details text must include timing, lesson breakdown, words learned, and words missed."""
        text = format_vocab_details_text(self.sample_report_failed)

        self.assertIn("Go bro", text)
        self.assertIn("10 Questions Tested", text)
        self.assertIn("SCORE: 2/10 (20%) — ❌ FAILED", text)

        # Timing & Attempts
        self.assertIn("⏱️ Time Taken: 0m 10s", text)
        self.assertIn("📅 Date: Oct 12, 2026, 01:10 PM", text)
        self.assertIn("🎖️ Attempt: 1 of 3 today", text)

        # Categorized breakdown
        self.assertIn("📊 CATEGORIZED LESSON BREAKDOWN:", text)
        self.assertIn("Lesson 1: 2/6 (33%) ❌", text)
        self.assertIn("Lesson 2: 0/4 (0%) ❌", text)

        # Word lists
        self.assertIn("✅ WORDS LEARNED (2):", text)
        self.assertIn("Precursor", text)
        self.assertIn("Apprehensive", text)

        self.assertIn("❌ WORDS NEEDING REVIEW (8):", text)
        self.assertIn("Repression", text)
        self.assertIn("Bias", text)

    def test_04_telegram_bot_client_edit_message(self):
        """TelegramBotClient must have edit_message_text method."""
        client = TelegramBotClient("dummy_token")
        self.assertTrue(hasattr(client, "edit_message_text"))

    def test_05_callback_expand_and_collapse(self):
        """Simulate tapping 'ℹ️ More Information' (vrep_more) and '🔼 Hide Information' (vrep_less)."""
        mock_bot = MockTelegramBot()
        cfg = {"admin_chat_id": "7957347033"}
        db = {
            "reports": [self.sample_report_failed]
        }

        # 1. Tap 'More Information'
        update_more = {
            "callback_query": {
                "id": "cb_001",
                "from": {"id": "7957347033"},
                "message": {
                    "message_id": 4321,
                    "chat": {"id": 7957347033}
                },
                "data": "vrep_more:vrep_test_001"
            }
        }
        handle_update(mock_bot, update_more, cfg, db)

        # Assert message was edited with detailed text and collapse button
        self.assertEqual(len(mock_bot.edited_messages), 1)
        edited_msg = mock_bot.edited_messages[0]
        self.assertEqual(edited_msg["message_id"], 4321)
        self.assertIn("⏱️ Time Taken: 0m 10s", edited_msg["text"])
        self.assertIn("WORDS LEARNED (2)", edited_msg["text"])
        self.assertEqual(
            edited_msg["reply_markup"]["inline_keyboard"][0][0]["callback_data"],
            "vrep_less:vrep_test_001"
        )
        self.assertEqual(
            edited_msg["reply_markup"]["inline_keyboard"][0][0]["text"],
            "🔼 Hide Information"
        )

        # 2. Tap 'Hide Information'
        update_less = {
            "callback_query": {
                "id": "cb_002",
                "from": {"id": "7957347033"},
                "message": {
                    "message_id": 4321,
                    "chat": {"id": 7957347033}
                },
                "data": "vrep_less:vrep_test_001"
            }
        }
        handle_update(mock_bot, update_less, cfg, db)

        # Assert message was edited back to summary text and expand button
        self.assertEqual(len(mock_bot.edited_messages), 2)
        collapsed_msg = mock_bot.edited_messages[1]
        self.assertEqual(collapsed_msg["message_id"], 4321)
        self.assertNotIn("WORDS LEARNED", collapsed_msg["text"])
        self.assertNotIn("Time Taken:", collapsed_msg["text"])
        self.assertIn("10 Questions Tested", collapsed_msg["text"])
        self.assertEqual(
            collapsed_msg["reply_markup"]["inline_keyboard"][0][0]["callback_data"],
            "vrep_more:vrep_test_001"
        )
        self.assertEqual(
            collapsed_msg["reply_markup"]["inline_keyboard"][0][0]["text"],
            "ℹ️ More Information"
        )

    def test_06_rest_api_report_dispatch(self):
        """Test POST /api/report endpoint processes submission without error."""
        code, data = execute_mock_request(SATMasterHandler, "POST", "/api/report", body=self.sample_report_failed)
        self.assertEqual(code, 200)
        self.assertTrue(data.get("ok"))

    def test_07_frontend_files_contain_new_helpers(self):
        """Ensure both index.html and public/index.html contain new format functions."""
        paths = [
            os.path.join(os.path.dirname(__file__), "index.html"),
            os.path.join(os.path.dirname(__file__), "public", "index.html")
        ]
        tokens = [
            "generateTelegramSummaryText",
            "generateTelegramDetailedText",
            "vrep_more:",
            "Status: Failed ❌"
        ]
        for p in paths:
            self.assertTrue(os.path.exists(p))
            with open(p, "r", encoding="utf-8") as f:
                content = f.read()
            for t in tokens:
                self.assertIn(t, content, f"Token '{t}' missing from {p}")

    def test_08_strict_isolation_vocab_audio_homework(self):
        """Strict isolation: Vocab array (434 words), audio engine, homework tables untouched."""
        with open("index.html", "r", encoding="utf-8") as f:
            html = f.read()
        self.assertIn("window.satAudio", html)
        self.assertIn("speakWord", html)
        self.assertIn("const satWords =", html)
        self.assertIn("434 Words", html)


if __name__ == "__main__":
    unittest.main()
