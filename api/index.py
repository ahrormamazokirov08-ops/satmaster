#!/usr/bin/env python3
"""
Vercel Serverless Function: api/index.py
=========================================
Handles all /api/* routes on Vercel backed by Supabase PostgreSQL.
Provides identical REST API endpoints to telegram_bot.py SATMasterHandler.
"""

import os
import sys
import json
import re
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler

PARENT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PARENT_DIR not in sys.path:
    sys.path.insert(0, PARENT_DIR)

from database import db as rdb


def is_admin_request(headers, query_params=None, body=None):
    """
    Checks if the requesting user has admin privileges.
    Role Definition:
    - Admin: Owner / Telegram ID 7957347033 or role === 'admin'
    - Non-admin: role in ('teacher', 'student', 'guest') or non-admin user ID
    """
    if headers is None:
        headers = {}
    if query_params is None:
        query_params = {}
    if body is None:
        body = {}

    role = ""
    for h in ("X-User-Role", "X-Role", "x-user-role", "x-role", "X-Admin-Role", "x-admin-role"):
        val = headers.get(h)
        if val:
            role = str(val).strip().lower()
            break

    if not role:
        q_role = query_params.get("role") or query_params.get("user_role")
        if isinstance(q_role, list) and q_role:
            role = str(q_role[0]).strip().lower()
        elif isinstance(q_role, str):
            role = q_role.strip().lower()

    if not role and isinstance(body, dict):
        b_role = body.get("role") or body.get("user_role")
        if b_role:
            role = str(b_role).strip().lower()

    user_id = ""
    for h in ("X-User-Id", "X-Telegram-Id", "x-user-id", "x-telegram-id"):
        val = headers.get(h)
        if val:
            user_id = str(val).strip()
            break

    if not user_id:
        q_uid = query_params.get("user_id") or query_params.get("uid") or query_params.get("telegram_id")
        if isinstance(q_uid, list) and q_uid:
            user_id = str(q_uid[0]).strip()
        elif isinstance(q_uid, str):
            user_id = q_uid.strip()

    if not user_id and isinstance(body, dict):
        b_uid = body.get("user_id") or body.get("uid") or body.get("telegram_id")
        if b_uid:
            user_id = str(b_uid).strip()

    clean_uid = user_id.upper().replace("TG", "")

    # Admin check: ID 7957347033 or explicit admin role
    if clean_uid == "7957347033" or user_id == "7957347033" or role == "admin":
        return True

    # Explicit non-admin role: teacher, student, guest
    if role in ("teacher", "student", "guest") or (role and role != "admin"):
        return False

    # Explicit non-admin user ID
    if clean_uid and clean_uid != "7957347033":
        return False

    # Default to True for internal callers
    return True


def format_vocab_summary_text(report):
    """Generate the clean, compact primary Telegram message for a student submission."""
    student_name = report.get("studentName", "Student User")
    student_class = report.get("studentClass") or "SAT Prep"
    score_pct = report.get("scorePct", 0)
    time_spent = report.get("timeFormatted") or (
        f"{report.get('durationSeconds', 0) // 60}m {report.get('durationSeconds', 0) % 60}s"
    )

    if report.get("type") == "qbank" or "qbank" in str(report.get("id", "")):
        hw_title = report.get("homeworkTitle") or "Digital SAT Question Bank Drill"
        pass_thresh = 70 if "reading" in hw_title.lower() else 80
        is_passed = score_pct >= pass_thresh
        status_str = "PASSED ✅" if is_passed else "FAILED ❌"
        lines = [
            "🎯 DIGITAL SAT QUESTION BANK REPORT",
            "━━━━━━━━━━━━━━━━━━━━━━",
            f"👤 Student: {student_name}",
            f"🏫 Class: {student_class}",
            f"📝 Task: {hw_title}",
            f"📊 Result: {status_str} ({score_pct}%)",
            f"⏱️ Time Spent: {time_spent}",
            "━━━━━━━━━━━━━━━━━━━━━━"
        ]
        return "\n".join(lines)

    hw_type = report.get("homeworkTitle") or "SAT Vocabulary Test"
    scope_name = report.get("scopeName", "Lesson 1")
    is_passed = score_pct >= 80
    status_str = "PASSED ✅" if is_passed else "FAILED ❌"

    lines = [
        "🎯 SAT VOCABULARY REPORT",
        "━━━━━━━━━━━━━━━━━━━━━━",
        f"👤 Student: {student_name}",
        f"🏫 Class: {student_class}",
        f"📝 Task: {hw_type}",
        f"📚 Lesson: {scope_name}",
        f"📊 Result: {status_str} ({score_pct}%)",
        f"⏱️ Time Spent: {time_spent}",
        "━━━━━━━━━━━━━━━━━━━━━━"
    ]
    return "\n".join(lines)


def format_vocab_details_text(report):
    """Generate the full detailed breakdown Telegram message when 'More Information' is tapped."""
    student_name = report.get("studentName", "Student User")
    student_id = report.get("studentId")
    student_class = report.get("studentClass")
    scope_name = report.get("scopeName", "Vocabulary Unit")
    total_q = report.get("totalQuestions", 0)
    correct_count = report.get("correctCount", 0)
    score_pct = report.get("scorePct", 0)
    is_passed = score_pct >= 80
    status_str = "✅ PASSED" if is_passed else "❌ FAILED"
    time_taken = report.get("timeFormatted") or f"{report.get('durationSeconds', 0)}s"
    date_str = report.get("date", "Recent")
    attempt_num = report.get("attemptNumber")

    lines = [
        "📊 [TEACHER REPORT - STUDENT SUBMISSION]",
        "🎯 SAT VOCABULARY UNIT TEST REPORT",
        "━━━━━━━━━━━━━━━━━━━━━━",
        f"👤 Student: {student_name}"
    ]
    if student_id:
        lines.append(f"🆔 ID: #{student_id}")
    if student_class:
        lines.append(f"🏫 Class: {student_class}")
    lines.append(f"📚 Scope: {scope_name}")
    lines.append(f"❓ Questions: {total_q} Questions Tested")
    lines.append("")
    lines.append(f"🏆 SCORE: {correct_count}/{total_q} ({score_pct}%) — {status_str}")
    lines.append("")
    lines.append(f"⏱️ Time Taken: {time_taken}")
    lines.append(f"📅 Date: {date_str}")
    if attempt_num:
        lines.append(f"🎖️ Attempt: {attempt_num} of 3 today")

    lesson_breakdown = report.get("lessonBreakdown") or []
    if lesson_breakdown:
        lines.append("")
        lines.append("📊 CATEGORIZED LESSON BREAKDOWN:")
        for lb in lesson_breakdown:
            check = "✅" if lb.get("pct", 0) >= 80 else "❌"
            label = lb.get("lessonLabel", "Lesson")
            corr = lb.get("correct", 0)
            tot = lb.get("total", 0)
            pct = lb.get("pct", 0)
            lines.append(f"  • {label}: {corr}/{tot} ({pct}%) {check}")

    learned_words = report.get("learnedWords") or []
    lines.append("")
    lines.append(f"✅ WORDS LEARNED ({len(learned_words)}):")
    if learned_words:
        learned_names = []
        for w in learned_words:
            if isinstance(w, dict):
                learned_names.append(w.get("word", ""))
            else:
                learned_names.append(str(w))
        lines.append(", ".join(filter(None, learned_names)))
    else:
        lines.append("None yet.")

    missed_words = report.get("missedWords") or []
    lines.append("")
    lines.append(f"❌ WORDS NEEDING REVIEW ({len(missed_words)}):")
    if missed_words:
        missed_names = []
        for m in missed_words:
            if isinstance(m, dict):
                w = m.get("word")
                if isinstance(w, dict):
                    missed_names.append(w.get("word", ""))
                else:
                    missed_names.append(str(w or ""))
            else:
                missed_names.append(str(m))
        lines.append(", ".join(filter(None, missed_names)))
    else:
        lines.append("Zero missed! Flawless mastery! 💯")

    lines.append("━━━━━━━━━━━━━━━━━━━━━━")
    lines.append("Generated by SAT Master Suite")
    return "\n".join(lines)


class handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-User-Role, X-User-Id, X-Role, X-Admin-Role")

    def send_json(self, status_code, data):
        payload = json.dumps(data).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_cors_headers()
        self.end_headers()
        self.wfile.write(payload)

    def _get_clean_path(self):
        # Prefer original client path if forwarded via x-matched-path or x-forwarded-uri
        raw = (
            self.headers.get("x-matched-path")
            or self.headers.get("x-invoke-path")
            or self.headers.get("x-vercel-original-url")
            or self.headers.get("x-forwarded-uri")
            or self.path
        )
        parsed = urllib.parse.urlparse(raw)
        clean = parsed.path.rstrip("/")
        if not clean or clean.endswith("/index.py"):
            parsed_orig = urllib.parse.urlparse(self.path)
            clean_orig = parsed_orig.path.rstrip("/")
            if clean_orig and not clean_orig.endswith("/index.py"):
                clean = clean_orig
        return clean or "/", parsed

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()

    def do_GET(self):
        clean_path, parsed_path = self._get_clean_path()

        # GET /api/tts - Backend audio proxy for open audio streaming without client CORS / WebView blocks
        if clean_path == "/api/tts":
            qs = urllib.parse.parse_qs(parsed_path.query)
            word = qs.get("word", [""])[0].strip()
            lang = qs.get("lang", ["en-US"])[0].strip()
            if not word:
                return self.send_json(400, {"ok": False, "error": "Missing word parameter"})
            try:
                enc_word = urllib.parse.quote(word)
                type_val = "1" if ("gb" in lang.lower() or "uk" in lang.lower()) else "2"
                tts_url = f"https://dict.youdao.com/dictvoice?audio={enc_word}&type={type_val}"
                req = urllib.request.Request(
                    tts_url,
                    headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
                )
                with urllib.request.urlopen(req, timeout=5) as resp:
                    audio_bytes = resp.read()
                self.send_response(200)
                self.send_header("Content-Type", "audio/mpeg")
                self.send_header("Content-Length", str(len(audio_bytes)))
                self.send_header("Cache-Control", "public, max-age=86400")
                self.send_cors_headers()
                self.end_headers()
                self.wfile.write(audio_bytes)
                return
            except Exception as e:
                return self.send_json(502, {"ok": False, "error": f"TTS proxy failed: {str(e)}"})

        # 0. GET /api/auth/verify - Verify student exists and belongs to active group
        if clean_path == "/api/auth/verify":
            qs = urllib.parse.parse_qs(parsed_path.query)
            ident = qs.get("uid", [None])[0] or qs.get("telegram_id", [None])[0] or qs.get("id", [None])[0] or qs.get("student_id", [None])[0] or self.headers.get("X-User-Id") or self.headers.get("X-Telegram-Id") or self.headers.get("x-user-id") or self.headers.get("x-telegram-id")
            if not ident:
                return self.send_json(400, {"valid": False, "reason": "missing_identifier", "error": "Student identifier required (uid or telegram_id)"})
            try:
                stu = rdb.get_student(ident)
                if stu and stu.get("group_id") and stu.get("group_name"):
                    return self.send_json(200, {"valid": True, "student": stu})
                return self.send_json(200, {"valid": False, "reason": "not_found_or_deleted"})
            except Exception as e:
                return self.send_json(500, {"valid": False, "error": str(e)})

        # 1. GET /api/groups - List all groups with student count
        if clean_path == "/api/groups":
            try:
                groups = rdb.list_groups()
                return self.send_json(200, {"ok": True, "groups": groups, "count": len(groups)})
            except Exception as e:
                return self.send_json(500, {"ok": False, "error": str(e)})

        # 2. GET /api/groups/:id/students - Return all students isolated to this specific group
        m_grp_students = re.match(r"^/api/groups/([^/]+)/students$", clean_path)
        if m_grp_students:
            group_id = m_grp_students.group(1)
            try:
                students = rdb.get_group_students(group_id)
                if students is None:
                    return self.send_json(404, {"ok": False, "error": f"Group '{group_id}' not found"})
                return self.send_json(200, {"ok": True, "group_id": group_id, "students": students, "count": len(students)})
            except Exception as e:
                return self.send_json(500, {"ok": False, "error": str(e)})

        # 3. GET /api/students/:id/history - Return student's test history
        m_stu_history = re.match(r"^/api/students/([^/]+)/history$", clean_path)
        if m_stu_history:
            student_id = m_stu_history.group(1)
            try:
                history = rdb.get_student_history(student_id)
                if history is None:
                    return self.send_json(404, {"ok": False, "error": f"Student '{student_id}' not found"})
                return self.send_json(200, {"ok": True, "student_id": student_id, "history": history, "test_results": history, "count": len(history)})
            except Exception as e:
                return self.send_json(500, {"ok": False, "error": str(e)})

        # 3b. GET /api/students/:id/solved-questions - Return student's solved question IDs
        m_stu_solved = re.match(r"^/api/students/([^/]+)/solved-questions$", clean_path)
        if m_stu_solved:
            student_id = m_stu_solved.group(1)
            try:
                solved_ids = rdb.get_solved_question_ids(student_id)
                return self.send_json(200, {
                    "ok": True,
                    "student_id": student_id,
                    "solved_question_ids": solved_ids,
                    "count": len(solved_ids)
                })
            except Exception as e:
                return self.send_json(500, {"ok": False, "error": str(e)})

        # 3c. GET /api/qbank/user-history - Return student's practice history and skill stats
        if clean_path == "/api/qbank/user-history":
            qs = urllib.parse.parse_qs(parsed_path.query)
            uid = qs.get("uid", [None])[0] or qs.get("student_id", [None])[0] or qs.get("id", [None])[0]
            if not uid:
                return self.send_json(400, {"ok": False, "error": "uid parameter is required", "solved_ids": [], "stats": {}})
            try:
                res = rdb.get_qbank_user_history(uid)
                return self.send_json(200, {
                    "ok": True,
                    "uid": uid,
                    "solved_ids": res.get("solved_ids", []),
                    "stats": res.get("stats", {}),
                    "count": len(res.get("solved_ids", []))
                })
            except Exception as e:
                return self.send_json(500, {"ok": False, "error": str(e)})

        # 4. GET /api/students?group=...
        if clean_path == "/api/students":
            qs = urllib.parse.parse_qs(parsed_path.query)
            group_filter = qs.get("group", [None])[0]
            try:
                if group_filter:
                    students = rdb.get_group_students(group_filter) or []
                else:
                    groups = rdb.list_groups()
                    students = []
                    for g in groups:
                        s_list = rdb.get_group_students(g["id"]) or []
                        students.extend(s_list)
                return self.send_json(200, {"ok": True, "students": students})
            except Exception as e:
                return self.send_json(500, {"ok": False, "error": str(e)})

        # 5. GET /api/homework or /api/assignments - List assignments with optional group_id and student_id filtering
        if clean_path in ("/api/homework", "/api/assignments"):
            qs = urllib.parse.parse_qs(parsed_path.query)
            grp_id = qs.get("group_id", [None])[0] or qs.get("group", [None])[0]
            stu_id = qs.get("student_id", [None])[0] or qs.get("uid", [None])[0] or qs.get("id", [None])[0] or self.headers.get("X-User-Id") or self.headers.get("X-Telegram-Id") or self.headers.get("x-user-id") or self.headers.get("x-telegram-id")
            try:
                assignments = rdb.get_homework_assignments(group_id=grp_id, student_id=stu_id)
                return self.send_json(200, {"ok": True, "assignments": assignments, "count": len(assignments)})
            except Exception as e:
                return self.send_json(500, {"ok": False, "error": str(e)})

        return self.send_json(404, {"ok": False, "error": f"Endpoint not found: {clean_path}"})

    def do_POST(self):
        clean_path, parsed_path = self._get_clean_path()
        content_length = int(self.headers.get("Content-Length", 0))
        post_data = self.rfile.read(content_length) if content_length > 0 else b""
        try:
            body = json.loads(post_data.decode("utf-8")) if post_data else {}
        except Exception:
            body = {}

        # 0. POST /api/auth/verify - Verify student exists and belongs to active group
        if clean_path == "/api/auth/verify":
            ident = body.get("uid") or body.get("telegram_id") or body.get("id") or body.get("student_id") or self.headers.get("X-User-Id") or self.headers.get("X-Telegram-Id") or self.headers.get("x-user-id") or self.headers.get("x-telegram-id")
            if not ident:
                return self.send_json(400, {"valid": False, "reason": "missing_identifier", "error": "Student identifier required (uid or telegram_id)"})
            try:
                stu = rdb.get_student(ident)
                if stu and stu.get("group_id") and stu.get("group_name"):
                    return self.send_json(200, {"valid": True, "student": stu})
                return self.send_json(200, {"valid": False, "reason": "not_found_or_deleted"})
            except Exception as e:
                return self.send_json(500, {"valid": False, "error": str(e)})

        # 1. POST /api/groups - Create a new group (accepts { name })
        if clean_path == "/api/groups":
            qs = urllib.parse.parse_qs(parsed_path.query)
            if not is_admin_request(self.headers, qs, body):
                return self.send_json(403, {"ok": False, "error": "Admin privileges required"})

            action = body.get("action", "create")
            if action == "delete":
                group_id = body.get("id") or body.get("name")
                try:
                    from telegram_bot import cleanup_group_students_and_messages
                    cleanup_group_students_and_messages(None, group_id)
                except Exception:
                    pass
                deleted = rdb.delete_group(group_id)
                if deleted:
                    return self.send_json(200, {"ok": True, "message": "Group deleted", "deleted": deleted})
                return self.send_json(404, {"ok": False, "error": "Group not found"})

            name = body.get("name", "").strip()
            if not name:
                return self.send_json(400, {"ok": False, "error": "Group name is required"})

            try:
                new_grp = rdb.create_group(name)
                return self.send_json(201, {"ok": True, "group": new_grp, "id": new_grp["id"], "name": new_grp["name"]})
            except Exception as e:
                return self.send_json(500, {"ok": False, "error": str(e)})

        # 2. POST /api/students - Register or add student
        if clean_path == "/api/students":
            telegram_id = body.get("telegram_id")
            display_name = body.get("display_name") or body.get("name")
            group_id = body.get("group_id") or body.get("class")
            username = body.get("telegram_username") or body.get("username")

            if not telegram_id or not display_name or not group_id:
                return self.send_json(400, {"ok": False, "error": "telegram_id, display_name, and group_id are required"})

            try:
                student = rdb.upsert_student(
                    telegram_id=int(telegram_id),
                    display_name=display_name,
                    group_id=group_id,
                    telegram_username=username
                )
                return self.send_json(201, {"ok": True, "student": student, "id": student["id"]})
            except Exception as e:
                return self.send_json(500, {"ok": False, "error": str(e)})

        # 3. POST /api/students/:id/test-results - Submit test results
        m_score = re.match(r"^/api/students/([^/]+)/test-results$", clean_path)
        if m_score:
            student_id = m_score.group(1)
            total_score = body.get("total_score")
            rw_score = body.get("rw_score", 0)
            math_score = body.get("math_score", 0)

            if total_score is None:
                return self.send_json(400, {"ok": False, "error": "total_score is required"})

            try:
                stu = rdb.get_student(student_id)
                if not stu:
                    return self.send_json(404, {"ok": False, "error": f"Student '{student_id}' not found"})

                result = rdb.record_test_result(
                    student_id=stu["id"],
                    group_id=stu["group_id"],
                    total_score=int(total_score),
                    rw_score=int(rw_score),
                    math_score=int(math_score)
                )
                return self.send_json(201, {"ok": True, "result": result})
            except Exception as e:
                return self.send_json(500, {"ok": False, "error": str(e)})

        # 3b. POST /api/students/:id/solved-questions - Record solved questions
        m_post_solved = re.match(r"^/api/students/([^/]+)/solved-questions$", clean_path)
        if m_post_solved:
            student_id = m_post_solved.group(1)
            try:
                if "questions" in body and isinstance(body["questions"], list):
                    count = rdb.record_solved_questions_batch(student_id, body["questions"])
                    return self.send_json(200, {"ok": True, "recorded_count": count})
                else:
                    qid = body.get("question_id")
                    if not qid:
                        return self.send_json(400, {"ok": False, "error": "question_id is required"})
                    is_corr = bool(body.get("is_correct", False))
                    ans = body.get("selected_answer")
                    rec = rdb.record_solved_question(student_id, qid, is_corr, ans)
                    return self.send_json(200, {"ok": True, "recorded": rec})
            except Exception as e:
                return self.send_json(500, {"ok": False, "error": str(e)})

        # 3c. POST /api/qbank/record-attempt - Record practice attempt
        if clean_path == "/api/qbank/record-attempt":
            try:
                uid = body.get("uid") or body.get("student_id") or body.get("id")
                if not uid:
                    return self.send_json(400, {"ok": False, "error": "uid is required"})

                if "attempts" in body and isinstance(body["attempts"], list):
                    count = rdb.record_qbank_attempts_batch(uid, body["attempts"])
                    return self.send_json(200, {"ok": True, "status": "success", "recorded_count": count})
                elif "questions" in body and isinstance(body["questions"], list):
                    count = rdb.record_qbank_attempts_batch(uid, body["questions"])
                    return self.send_json(200, {"ok": True, "status": "success", "recorded_count": count})
                else:
                    qid = body.get("question_id")
                    if not qid:
                        return self.send_json(400, {"ok": False, "error": "question_id is required"})
                    subject = body.get("subject")
                    domain = body.get("domain")
                    skill = body.get("skill")
                    is_corr = bool(body.get("is_correct", False))
                    ans = body.get("selected_answer")
                    spent = int(body.get("time_spent_seconds", 0) or 0)
                    rec = rdb.record_qbank_attempt(
                        uid=uid,
                        question_id=qid,
                        subject=subject,
                        domain=domain,
                        skill=skill,
                        is_correct=is_corr,
                        selected_answer=ans,
                        time_spent_seconds=spent
                    )
                    return self.send_json(200, {"ok": True, "status": "success", "record": rec})
            except Exception as e:
                return self.send_json(500, {"ok": False, "error": str(e)})

        # 4. POST /api/report - Submit report and optionally forward to Telegram
        if clean_path == "/api/report":
            try:
                student_name = body.get("studentName", "").strip()
                student_group = body.get("studentClass", "").strip()
                grp = rdb.get_group(student_group)
                if grp:
                    students = rdb.get_group_students(grp["id"]) or []
                    matching = [s for s in students if s["display_name"].lower() == student_name.lower()]
                    if matching:
                        target_student = matching[0]
                        pct = float(body.get("scorePct", 0))
                        est_total = int(400 + (pct / 100.0) * 1200)
                        est_rw = int(200 + (pct / 100.0) * 600)
                        est_math = int(200 + (pct / 100.0) * 600)
                        rdb.record_test_result(
                            student_id=target_student["id"],
                            group_id=grp["id"],
                            total_score=est_total,
                            rw_score=est_rw,
                            math_score=est_math
                        )
            except Exception as sync_err:
                print(f"Report sync error: {sync_err}")

            # Send Telegram notification if configured
            bot_token = os.environ.get("TELEGRAM_BOT_TOKEN") or "8645843963:AAE_UtukrhBqPZL1Ksvnu5rlZOQHuPSn6IQ"
            admin_chat_id = os.environ.get("ADMIN_CHAT_ID") or "7957347033"
            if bot_token and admin_chat_id:
                try:
                    rep_id = body.get("id") or f"vrep_{int(time.time() * 1000)}"
                    body["id"] = rep_id
                    report_text = body.get("telegramSummaryText") or format_vocab_summary_text(body)
                    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
                    import urllib.request
                    req = urllib.request.Request(
                        url,
                        data=json.dumps({
                            "chat_id": int(admin_chat_id),
                            "text": report_text,
                            "reply_markup": {
                                "inline_keyboard": [
                                    [{"text": "ℹ️ More Information", "callback_data": f"vrep_more:{rep_id}"}]
                                ]
                            }
                        }).encode("utf-8"),
                        headers={"Content-Type": "application/json"}
                    )
                    urllib.request.urlopen(req, timeout=5)
                except Exception:
                    pass

            return self.send_json(200, {"ok": True, "message": "Report processed"})

        # 6. POST /api/homework or /api/assignments - Create a new homework assignment
        if clean_path in ("/api/homework", "/api/assignments"):
            title = body.get("title") or "Digital SAT Homework"
            hw_type = body.get("type") or "vocab"
            group_id = body.get("group_id") or body.get("className") or "All Students"
            student_id = body.get("student_id")
            deadline = body.get("deadline")
            created_by = body.get("created_by") or "teacher"
            cfg = body.get("config") if isinstance(body.get("config"), dict) else {}
            if "id" in body and "id" not in cfg: cfg["id"] = body["id"]
            if "code" in body and "code" not in cfg: cfg["code"] = body["code"]
            if "className" in body and "className" not in cfg: cfg["className"] = body["className"]
            if "timeLimitMinutes" in body and "timeLimitMinutes" not in cfg: cfg["timeLimitMinutes"] = body["timeLimitMinutes"]
            if "questionIds" in body and "questionIds" not in cfg: cfg["questionIds"] = body["questionIds"]

            try:
                assignment = rdb.create_homework_assignment(
                    title=title,
                    hw_type=hw_type,
                    group_id=group_id,
                    student_id=student_id,
                    config=cfg,
                    deadline=deadline,
                    created_by=created_by
                )
                return self.send_json(201, {"ok": True, "assignment": assignment})
            except Exception as e:
                return self.send_json(500, {"ok": False, "error": str(e)})

        # 7. POST /api/homework/submit - Record student homework completion
        if clean_path == "/api/homework/submit":
            hw_id = body.get("homework_id")
            stu_id = body.get("student_id")
            stu_name = body.get("student_name") or "Student User"
            score_pct = body.get("score_pct", 0)
            corr_count = body.get("correct_count", 0)
            total_q = body.get("total_questions", 0)
            time_spent = body.get("time_spent_seconds", 0)
            if not hw_id or not stu_id:
                return self.send_json(400, {"ok": False, "error": "homework_id and student_id required"})
            try:
                sub = rdb.record_homework_submission(
                    homework_id=hw_id,
                    student_id=stu_id,
                    student_name=stu_name,
                    score_pct=score_pct,
                    correct_count=corr_count,
                    total_questions=total_q,
                    is_passed=(int(score_pct) >= 80),
                    time_spent_seconds=time_spent
                )
                return self.send_json(200, {"ok": True, "submission": sub})
            except Exception as e:
                return self.send_json(500, {"ok": False, "error": str(e)})

        return self.send_json(404, {"ok": False, "error": "Endpoint not found"})

    def do_DELETE(self):
        clean_path, parsed_path = self._get_clean_path()

        # 1. DELETE /api/groups/:id - Delete group (cascades to students & test results)
        m_del_group = re.match(r"^/api/groups/([^/]+)$", clean_path)
        if m_del_group:
            qs = urllib.parse.parse_qs(parsed_path.query)
            if not is_admin_request(self.headers, qs):
                return self.send_json(403, {"ok": False, "error": "Admin privileges required"})

            group_id = m_del_group.group(1)
            try:
                try:
                    from telegram_bot import cleanup_group_students_and_messages
                    cleanup_group_students_and_messages(None, group_id)
                except Exception:
                    pass
                deleted = rdb.delete_group(group_id)
                if not deleted:
                    return self.send_json(404, {"ok": False, "error": f"Group '{group_id}' not found"})
                return self.send_json(200, {
                    "ok": True,
                    "message": "Group and all associated students and test records deleted successfully via CASCADE",
                    "deleted": deleted
                })
            except Exception as e:
                return self.send_json(500, {"ok": False, "error": str(e)})

        # 2. DELETE /api/students/:id - Hard-delete student (cascades to test results)
        m_del_student = re.match(r"^/api/students/([^/]+)$", clean_path)
        if m_del_student:
            student_id = m_del_student.group(1)
            try:
                try:
                    from telegram_bot import cleanup_student_session_and_messages
                    cleanup_student_session_and_messages(None, student_id)
                except Exception:
                    pass
                deleted = rdb.delete_student(student_id)
                if not deleted:
                    return self.send_json(404, {"ok": False, "error": f"Student '{student_id}' not found"})
                return self.send_json(200, {
                    "ok": True,
                    "message": "Student and test history hard-deleted successfully via CASCADE",
                    "deleted": deleted
                })
            except Exception as e:
                return self.send_json(500, {"ok": False, "error": str(e)})

        # 3. DELETE /api/homework/:id or /api/assignments/:id - Delete homework assignment
        m_del_hw = re.match(r"^/api/(?:homework|assignments)/([^/]+)$", clean_path)
        if m_del_hw:
            hw_id = m_del_hw.group(1)
            try:
                deleted = rdb.delete_homework_assignment(hw_id)
                return self.send_json(200, {
                    "ok": True,
                    "message": f"Homework assignment '{hw_id}' deleted successfully",
                    "deleted": deleted
                })
            except Exception as e:
                return self.send_json(500, {"ok": False, "error": str(e)})

        return self.send_json(404, {"ok": False, "error": "Endpoint not found"})
