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
from http.server import BaseHTTPRequestHandler

PARENT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PARENT_DIR not in sys.path:
    sys.path.insert(0, PARENT_DIR)

from database import db as rdb


class handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

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

        # 0. GET /api/auth/verify - Verify student exists and belongs to active group
        if clean_path == "/api/auth/verify":
            qs = urllib.parse.parse_qs(parsed_path.query)
            ident = qs.get("uid", [None])[0] or qs.get("telegram_id", [None])[0] or qs.get("id", [None])[0] or qs.get("student_id", [None])[0]
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
            ident = body.get("uid") or body.get("telegram_id") or body.get("id") or body.get("student_id")
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
                    report_text = body.get("telegramText") or (
                        f"📊 [TEST REPORT - {body.get('studentName')}]\n"
                        f"🏫 Group: {body.get('studentClass')}\n"
                        f"Score: {body.get('scorePct')}% ({body.get('correctCount')}/{body.get('totalQuestions')})"
                    )
                    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
                    import urllib.request
                    req = urllib.request.Request(
                        url,
                        data=json.dumps({"chat_id": int(admin_chat_id), "text": report_text}).encode("utf-8"),
                        headers={"Content-Type": "application/json"}
                    )
                    urllib.request.urlopen(req, timeout=5)
                except Exception:
                    pass

            return self.send_json(200, {"ok": True, "message": "Report processed"})

        return self.send_json(404, {"ok": False, "error": "Endpoint not found"})

    def do_DELETE(self):
        clean_path, _ = self._get_clean_path()

        # 1. DELETE /api/groups/:id - Delete group (cascades to students & test results)
        m_del_group = re.match(r"^/api/groups/([^/]+)$", clean_path)
        if m_del_group:
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

        return self.send_json(404, {"ok": False, "error": "Endpoint not found"})
