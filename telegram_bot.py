#!/usr/bin/env python3
"""
SATMaster Telegram Bot & Student Registration Hub
=================================================
Ultra-responsive bot for student and teacher classification,
group selection, and instant personalized link delivery.
"""

import sys
import os
import json
import time
import urllib.request
import urllib.parse
import urllib.error
import http.client
import ssl
import threading
from socketserver import ThreadingMixIn
from concurrent.futures import ThreadPoolExecutor
import html
import traceback
import re
from http.server import SimpleHTTPRequestHandler, HTTPServer
from datetime import datetime

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

try:
    from database import db as rdb, _sanitize_student_dict
except ImportError:
    import database
    rdb = database.db
    _sanitize_student_dict = getattr(database, "_sanitize_student_dict", lambda s: s)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(BASE_DIR, "bot_config.json")
DB_FILE = os.path.join(BASE_DIR, "students_db.json")
STATES_FILE = os.path.join(BASE_DIR, "user_states.json")

def load_user_states():
    if os.path.exists(STATES_FILE):
        try:
            with open(STATES_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}

def save_user_states(states):
    try:
        with open(STATES_FILE, "w", encoding="utf-8") as f:
            json.dump(states, f, indent=2)
    except Exception:
        pass

user_states = load_user_states()

def set_user_state(user_id, state_obj):
    user_states[str(user_id)] = state_obj
    save_user_states(user_states)

def clear_user_state(user_id):
    user_states.pop(str(user_id), None)
    save_user_states(user_states)

USER_MESSAGES_FILE = os.path.join(BASE_DIR, "user_messages.json")

def load_user_messages():
    if os.path.exists(USER_MESSAGES_FILE):
        try:
            with open(USER_MESSAGES_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}

def save_user_messages(messages_dict):
    try:
        with open(USER_MESSAGES_FILE, "w", encoding="utf-8") as f:
            json.dump(messages_dict, f, indent=2)
    except Exception:
        pass

user_tracked_messages = load_user_messages()

def record_user_bot_message(user_id, message_id):
    if not user_id or not message_id:
        return
    uid = str(user_id)
    lst = user_tracked_messages.setdefault(uid, [])
    if message_id not in lst:
        lst.append(message_id)
    if len(lst) > 10:
        user_tracked_messages[uid] = lst[-10:]
    save_user_messages(user_tracked_messages)

def clear_user_bot_messages(bot, user_id):
    uid = str(user_id)
    msg_ids = user_tracked_messages.pop(uid, [])
    save_user_messages(user_tracked_messages)
    if not msg_ids:
        return
    if not bot:
        bot = get_bot_client()
    if bot and hasattr(bot, "delete_message"):
        for mid in msg_ids:
            try:
                bot.delete_message(chat_id=int(uid), message_id=mid)
            except Exception:
                pass

def get_bot_client():
    cfg = load_config()
    token = cfg.get("bot_token")
    if token:
        return TelegramBotClient(token)
    return None

def cleanup_student_session_and_messages(bot, student_id_or_tg_id):
    """
    Cleans up in-memory session, user states, legacy db entry,
    and attempts to delete last bot-sent menu/access-link messages via deleteMessage API.
    """
    if not student_id_or_tg_id:
        return
    if not bot:
        bot = get_bot_client()

    raw = str(student_id_or_tg_id).strip()
    tg_id = None
    if raw.isdigit():
        tg_id = int(raw)
    elif raw.upper().startswith("TG") and raw[2:].isdigit():
        tg_id = int(raw[2:])
    else:
        try:
            stu = rdb.get_student(raw)
            if stu and stu.get("telegram_id"):
                tg_id = int(stu["telegram_id"])
        except Exception:
            pass

    if tg_id:
        tg_str = str(tg_id)
        clear_user_state(tg_str)
        db = load_db()
        if tg_str in db.get("students", {}):
            db["students"].pop(tg_str, None)
            save_db(db)
        clear_user_bot_messages(bot, tg_id)

def cleanup_group_students_and_messages(bot, group_identifier):
    """
    Finds all students belonging to this cohort, wipes their sessions,
    and attempts to delete their bot-sent messages via deleteMessage.
    """
    if not group_identifier:
        return
    if not bot:
        bot = get_bot_client()

    try:
        grp = rdb.get_group(group_identifier)
        if grp:
            students = rdb.get_group_students(grp["id"]) or []
            for s in students:
                tg_id = s.get("telegram_id")
                if tg_id:
                    cleanup_student_session_and_messages(bot, tg_id)
    except Exception as e:
        print(f"Cleanup group error: {e}")

    try:
        db = load_db()
        grp_name_lower = str(group_identifier).strip().lower()
        for sid, s in list(db.get("students", {}).items()):
            if s.get("class", "").strip().lower() == grp_name_lower or str(s.get("group_id", "")).lower() == grp_name_lower:
                cleanup_student_session_and_messages(bot, sid)
    except Exception as e:
        print(f"Cleanup legacy db group error: {e}")

DEFAULT_CONFIG = {
    "bot_token": "8645843963:AAE_UtukrhBqPZL1Ksvnu5rlZOQHuPSn6IQ",
    "bot_username": "Ahrorbek_SAT_bot",
    "admin_chat_id": "7957347033",
    "admin_password": "satmaster2026",
    "web_app_url": "https://satmaster-w58j.vercel.app/index.html"
}

def load_config():
    cfg = DEFAULT_CONFIG.copy()
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                loaded = json.load(f)
                cfg.update(loaded)
        except Exception:
            pass
    # Support environment variables override for Render/cloud deployments
    if os.environ.get("BOT_TOKEN"):
        cfg["bot_token"] = os.environ["BOT_TOKEN"]
    elif os.environ.get("TELEGRAM_BOT_TOKEN"):
        cfg["bot_token"] = os.environ["TELEGRAM_BOT_TOKEN"]
    if os.environ.get("ADMIN_CHAT_ID"):
        cfg["admin_chat_id"] = os.environ["ADMIN_CHAT_ID"]
    if os.environ.get("WEB_APP_URL"):
        cfg["web_app_url"] = os.environ["WEB_APP_URL"]
    return cfg

def save_config(cfg):
    try:
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(cfg, f, indent=2)
    except Exception as e:
        print(f"⚠️ Notice: Unable to write config to {CONFIG_FILE}: {e}")

def load_db():
    d = None
    if os.path.exists(DB_FILE):
        try:
            with open(DB_FILE, "r", encoding="utf-8") as f:
                d = json.load(f)
        except Exception:
            pass
    if not d or not isinstance(d, dict):
        d = {
            "admin_chat_id": "7957347033",
            "groups": [],
            "students": {},
            "teachers": {},
            "reports": []
        }
    d.setdefault("admin_chat_id", "7957347033")
    d.setdefault("groups", [])
    d.setdefault("students", {})
    d.setdefault("teachers", {})
    d.setdefault("reports", [])

    # Automatic deduplication: ensure exactly one student per (name, group)
    cleaned_students = {}
    seen = {}
    for uid, s in list(d.get("students", {}).items()):
        name_key = s.get("name", "").strip().lower()
        class_key = s.get("class", "").strip().lower()
        key = (name_key, class_key)
        if key in seen:
            prev_uid = seen[key]
            cleaned_students.pop(prev_uid, None)
        seen[key] = str(uid)
        cleaned_students[str(uid)] = s
    d["students"] = cleaned_students
    return d

def save_db(db):
    with open(DB_FILE, "w", encoding="utf-8") as f:
        json.dump(db, f, indent=2)

def get_live_groups(db):
    """
    Fetch live groups from Supabase PostgreSQL (RelationalDB) and sync with local memory db.
    Ensures that any groups created in the web UI/Supabase appear in the Telegram bot instantly.
    """
    try:
        r_groups = rdb.list_groups()
        if r_groups:
            legacy_groups = db.get("groups", [])
            legacy_by_name = {g.get("name", "").strip().lower(): g for g in legacy_groups}
            synced = []
            for rg in r_groups:
                name = rg.get("name", "").strip()
                match = legacy_by_name.get(name.lower())
                code = match.get("code") if match and match.get("code") else f"GRP-{str(rg.get('id',''))[:6].upper()}"
                synced.append({
                    "id": rg.get("id"),
                    "name": name,
                    "code": code,
                    "schedule": match.get("schedule", "") if match else "",
                    "teacher_name": match.get("teacher_name", "SAT Admin") if match else "SAT Admin",
                    "student_count": rg.get("student_count", 0),
                    "created_at": rg.get("created_at")
                })
            if db.get("groups") != synced:
                db["groups"] = synced
                save_db(db)
            return synced
    except Exception as e:
        print(f"RelationalDB get_live_groups sync error: {e}")
    return db.get("groups", [])

def add_group(db, name, code=None, schedule="", teacher_id=None, teacher_name=None):
    clean_name = name.strip()
    r_grp = None
    try:
        r_grp = rdb.create_group(clean_name)
    except Exception as e:
        print(f"RelationalDB add_group sync error: {e}")

    groups = db.setdefault("groups", [])
    for g in groups:
        if g.get("name", "").strip().lower() == clean_name.lower():
            if r_grp and r_grp.get("id"):
                g["id"] = r_grp["id"]
            return g, False
    if not code:
        code = f"GRP-{len(groups)+1}"
    group_id = r_grp.get("id") if (r_grp and r_grp.get("id")) else f"grp_{int(time.time()*1000)}"
    new_group = {
        "id": group_id,
        "name": clean_name,
        "code": code.upper(),
        "schedule": schedule,
        "teacher_id": teacher_id,
        "teacher_name": teacher_name,
        "created_at": datetime.now().isoformat()
    }
    groups.append(new_group)
    save_db(db)
    return new_group, True

def delete_group(db, identifier):
    clean_id = str(identifier).strip()
    try:
        cleanup_group_students_and_messages(None, clean_id)
    except Exception as e:
        print(f"Cleanup error during delete_group: {e}")

    try:
        rdb.delete_group(clean_id)
    except Exception as e:
        print(f"RelationalDB delete_group sync error: {e}")

    groups = db.get("groups", [])
    removed = []
    kept = []
    for g in groups:
        if str(g.get("id", "")).lower() == clean_id.lower() or g.get("name", "").strip().lower() == clean_id.lower() or str(g.get("code", "")).lower() == clean_id.lower():
            removed.append(g)
        else:
            kept.append(g)
    db["groups"] = kept
    save_db(db)
    return removed

def get_group_students(db, group_name):
    clean_name = group_name.strip().lower()
    return [s for s in db.get("students", {}).values() if s.get("class", "").strip().lower() == clean_name]

def find_student_by_username(db, username):
    if not username:
        return None
    clean = username.strip().lstrip("@").lower()
    for uid, s in db.get("students", {}).items():
        if s.get("username", "").strip().lstrip("@").lower() == clean:
            return s
    return None

def save_and_register_student(db, user_id, name, username, group_name):
    clean_name = name.strip()
    clean_group = group_name.strip()
    clean_user = (username or "").strip().lstrip("@")
    user_id_str = str(user_id)
    student_id = f"TG{user_id_str}"
    students = db.setdefault("students", {})

    student_record = {
        "telegram_id": int(user_id_str),
        "student_id": student_id,
        "name": clean_name,
        "username": clean_user,
        "class": clean_group,
        "registered_at": datetime.now().isoformat(),
        "last_active": datetime.now().isoformat()
    }
    students[user_id_str] = student_record
    save_db(db)

    # Sync to relational database (groups & students tables)
    try:
        grp = rdb.get_group(clean_group)
        if not grp:
            grp = rdb.create_group(name=clean_group)
        if grp:
            rdb.upsert_student(
                telegram_id=int(user_id_str),
                display_name=clean_name,
                group_id=grp["id"],
                telegram_username=clean_user
            )
    except Exception as e:
        print(f"Relational DB sync error: {e}")

    return student_record

class TelegramBotClient:
    def __init__(self, token):
        self.token = token
        self.base_url = f"https://api.telegram.org/bot{token}"
        self._conn = None
        self._conn_lock = threading.Lock()

    def _get_conn(self, timeout=8):
        with self._conn_lock:
            if self._conn is None:
                ctx = ssl.create_default_context()
                self._conn = http.client.HTTPSConnection("api.telegram.org", 443, context=ctx, timeout=timeout)
            return self._conn

    def _close_conn(self):
        with self._conn_lock:
            if self._conn is not None:
                try:
                    self._conn.close()
                except Exception:
                    pass
                self._conn = None

    def request(self, method, payload=None, timeout=6):
        url_path = f"/bot{self.token}/{method}"
        data = json.dumps(payload).encode("utf-8") if payload else None
        headers = {
            "Content-Type": "application/json",
            "Connection": "keep-alive"
        }

        # Fast-path: Reuse persistent HTTPS connection (keep-alive avoids 200-400ms TLS handshake)
        for attempt in range(2):
            try:
                conn = self._get_conn(timeout=timeout)
                conn.request("POST" if data else "GET", url_path, body=data, headers=headers)
                resp = conn.getresponse()
                res_data = resp.read().decode("utf-8")
                parsed = json.loads(res_data)
                return parsed
            except Exception:
                self._close_conn()
                if attempt == 0:
                    continue
                break

        # Reliable fallback: urllib
        url = f"{self.base_url}/{method}"
        req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                res_data = resp.read().decode("utf-8")
                return json.loads(res_data)
        except urllib.error.HTTPError as e:
            err = e.read().decode("utf-8")
            try:
                parsed = json.loads(err)
                print(f"❌ Telegram HTTP Error {e.code}: {parsed.get('description', err)}")
                return parsed
            except Exception:
                print(f"❌ Telegram HTTP Error {e.code}: {err}")
                return {"ok": False, "description": err}
        except Exception as e:
            return {"ok": False, "description": str(e)}

    def get_me(self):
        return self.request("getMe", timeout=6)

    def get_updates(self, offset=None, timeout=15):
        params = {"timeout": timeout}
        if offset is not None:
            params["offset"] = offset
        req_timeout = (timeout + 10) if timeout else 8
        return self.request("getUpdates", params, timeout=req_timeout)

    def send_message(self, chat_id, text, reply_markup=None, parse_mode="HTML"):
        payload = {
            "chat_id": chat_id,
            "text": text
        }
        if parse_mode:
            payload["parse_mode"] = parse_mode
        if reply_markup:
            payload["reply_markup"] = reply_markup
        res = self.request("sendMessage", payload, timeout=10)
        if not res.get("ok") and parse_mode:
            # If HTML parsing failed, retry immediately as plain text!
            payload.pop("parse_mode", None)
            res = self.request("sendMessage", payload, timeout=10)
        if not res.get("ok"):
            print(f"⚠️ Failed to send message to {chat_id}: {res.get('description')}")
        return res

    def answer_callback_query(self, callback_query_id, text=None):
        payload = {"callback_query_id": callback_query_id}
        if text:
            payload["text"] = text
        return self.request("answerCallbackQuery", payload, timeout=4)

    def delete_message(self, chat_id, message_id):
        payload = {
            "chat_id": chat_id,
            "message_id": message_id
        }
        return self.request("deleteMessage", payload, timeout=6)

    def edit_message_text(self, chat_id, message_id, text, reply_markup=None, parse_mode="HTML"):
        payload = {
            "chat_id": chat_id,
            "message_id": message_id,
            "text": text
        }
        if parse_mode:
            payload["parse_mode"] = parse_mode
        if reply_markup:
            payload["reply_markup"] = reply_markup
        res = self.request("editMessageText", payload, timeout=10)
        if not res.get("ok") and parse_mode:
            payload.pop("parse_mode", None)
            res = self.request("editMessageText", payload, timeout=10)
        return res


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
    if report.get("telegramDetailsText"):
        return report.get("telegramDetailsText")
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


def format_homework_submission_summary_text(hw, sub):
    """
    Generate clean, compact primary Telegram message for a student homework submission.
    Pass/fail logic:
      - Math QBank: >= 85% PASSED, < 85% FAILED
      - Reading & Writing QBank: >= 75% PASSED, < 75% FAILED
      - SAT Vocabulary: >= 80% PASSED, < 80% FAILED
    """
    hw_type = hw.get("type", "vocab")
    cfg = hw.get("config") or {}
    if isinstance(cfg, str):
        try: cfg = json.loads(cfg)
        except Exception: cfg = {}

    student_name = sub.get("student_name") or "Student User"
    student_id = sub.get("student_id")
    group_id = hw.get("group_id")
    group_name = hw.get("group_name")
    if not group_name and group_id:
        try:
            g = rdb.get_group(group_id)
            if g: group_name = g.get("name")
        except Exception: pass
    group_name = group_name or str(group_id or "Assigned Group")

    hw_title = hw.get("title") or "Homework Assignment"
    total_q = sub.get("total_questions", 0)
    correct_count = sub.get("correct_count", 0)
    score_pct = sub.get("score_pct", 0)

    # Determine type label & pass threshold
    if hw_type == "qbank":
        subj = str(cfg.get("subject", "rw")).lower()
        if subj == "math":
            type_label = "📐 SAT MATH QUESTION BANK HOMEWORK"
            is_passed = score_pct >= 85
            req_text = "Pass: ≥85%"
        else:
            type_label = "📖 SAT READING & WRITING QUESTION BANK HOMEWORK"
            is_passed = score_pct >= 75
            req_text = "Pass: ≥75%"
        domains = cfg.get("domains") or ["All Themes"]
        scope_or_domains = ", ".join(domains) if isinstance(domains, list) else str(domains)
    else:
        type_label = "🎯 SAT VOCABULARY UNIT TEST HOMEWORK"
        is_passed = score_pct >= 80
        req_text = "Pass: ≥80%"
        lessons = cfg.get("lessons") or ["Lesson 1"]
        scope_or_domains = ", ".join([f"Lesson {l}" if str(l).isdigit() else str(l) for l in lessons]) if isinstance(lessons, list) else str(lessons)

    if "is_passed" in sub and sub["is_passed"] is not None:
        is_passed = bool(sub["is_passed"])

    status_str = "✅ PASSED" if is_passed else "❌ FAILED"
    time_spent = int(sub.get("time_spent_seconds", 0) or 0)
    time_str = f"{time_spent // 60}m {time_spent % 60}s" if time_spent >= 60 else f"{time_spent}s"

    lines = [
        "📊 [HOMEWORK SUBMISSION REPORT]",
        f"{type_label}",
        "━━━━━━━━━━━━━━━━━━━━━━",
        f"👤 Student: {student_name}"
    ]
    if student_id:
        lines.append(f"🆔 Student ID: #{student_id}")
    lines.append(f"🏫 Group: {group_name}")
    lines.append(f"📝 Assignment: {hw_title}")
    lines.append(f"📚 Scope: {scope_or_domains}")
    lines.append(f"❓ Questions: {total_q} Questions Tested")
    if time_spent > 0:
        lines.append(f"⏱️ Time Spent: {time_str}")
    lines.append("")
    lines.append(f"🏆 SCORE: {correct_count}/{total_q} ({score_pct}%) — {status_str} ({req_text})")
    lines.append("━━━━━━━━━━━━━━━━━━━━━━")
    lines.append("Generated by SAT Master Homework System")
    return "\n".join(lines)


def format_homework_submission_details_text(hw, sub):
    """Generate detailed breakdown Telegram message when 'More Information' is tapped for homework."""
    hw_type = hw.get("type", "vocab")
    cfg = hw.get("config") or {}
    if isinstance(cfg, str):
        try: cfg = json.loads(cfg)
        except Exception: cfg = {}

    student_name = sub.get("student_name") or "Student User"
    student_id = sub.get("student_id")
    group_id = hw.get("group_id")
    group_name = hw.get("group_name")
    if not group_name and group_id:
        try:
            g = rdb.get_group(group_id)
            if g: group_name = g.get("name")
        except Exception: pass
    group_name = group_name or str(group_id or "Assigned Group")

    hw_title = hw.get("title") or "Homework Assignment"
    total_q = sub.get("total_questions", 0)
    correct_count = sub.get("correct_count", 0)
    score_pct = sub.get("score_pct", 0)

    if hw_type == "qbank":
        subj = str(cfg.get("subject", "rw")).lower()
        if subj == "math":
            type_label = "📐 SAT MATH QUESTION BANK HOMEWORK"
            is_passed = score_pct >= 85
            req_text = "Pass: ≥85%"
        else:
            type_label = "📖 SAT READING & WRITING QUESTION BANK HOMEWORK"
            is_passed = score_pct >= 75
            req_text = "Pass: ≥75%"
        domains = cfg.get("domains") or ["All Themes"]
        scope_or_domains = ", ".join(domains) if isinstance(domains, list) else str(domains)
    else:
        type_label = "🎯 SAT VOCABULARY UNIT TEST HOMEWORK"
        is_passed = score_pct >= 80
        req_text = "Pass: ≥80%"
        lessons = cfg.get("lessons") or ["Lesson 1"]
        scope_or_domains = ", ".join([f"Lesson {l}" if str(l).isdigit() else str(l) for l in lessons]) if isinstance(lessons, list) else str(lessons)

    if "is_passed" in sub and sub["is_passed"] is not None:
        is_passed = bool(sub["is_passed"])

    status_str = "✅ PASSED" if is_passed else "❌ FAILED"
    time_spent = int(sub.get("time_spent_seconds", 0) or 0)
    time_str = f"{time_spent // 60}m {time_spent % 60}s" if time_spent >= 60 else f"{time_spent}s"
    deadline = hw.get("deadline") or "No deadline"
    submitted_at = sub.get("submitted_at") or "Recently"

    lines = [
        "📊 [DETAILED HOMEWORK SUBMISSION REPORT]",
        f"{type_label}",
        "━━━━━━━━━━━━━━━━━━━━━━",
        f"👤 Student: {student_name}"
    ]
    if student_id:
        lines.append(f"🆔 Student ID: #{student_id}")
    lines.append(f"🏫 Group: {group_name}")
    lines.append(f"📝 Assignment: {hw_title}")
    lines.append(f"📚 Scope: {scope_or_domains}")
    lines.append(f"❓ Questions: {total_q} Questions Tested")
    lines.append(f"⏱️ Time Spent: {time_str}")
    lines.append(f"📅 Submitted: {submitted_at}")
    lines.append(f"⏰ Deadline: {deadline}")
    lines.append("")
    lines.append(f"🏆 FINAL RESULT: {correct_count}/{total_q} ({score_pct}%) — {status_str} ({req_text})")

    details = sub.get("details") or {}
    if isinstance(details, str):
        try: details = json.loads(details)
        except Exception: details = {}

    missed_items = details.get("missedWords") or details.get("missedQuestions") or []
    if missed_items:
        lines.append("")
        lines.append(f"❌ MISSED ITEMS ({len(missed_items)}):")
        names = []
        for m in missed_items:
            if isinstance(m, dict):
                names.append(m.get("word") or m.get("question_id") or str(m))
            else:
                names.append(str(m))
        lines.append(", ".join(filter(None, names)))
    else:
        lines.append("")
        lines.append("🎯 Accuracy: Clean attempt recorded.")

    lines.append("━━━━━━━━━━━━━━━━━━━━━━")
    lines.append("Generated by SAT Master Homework System")
    return "\n".join(lines)


def make_url_button(label, url):
    """Return standard browser URL inline button."""
    return {"text": label, "url": url}

def generate_student_link(web_base_url, student_id, name, class_name):
    if "localhost" in web_base_url:
        web_base_url = web_base_url.replace("localhost", "127.0.0.1")
    query = urllib.parse.urlencode({
        "role": "student",
        "uid": student_id,
        "name": name,
        "class": class_name
    })
    sep = "&" if "?" in web_base_url else "?"
    return f"{web_base_url}{sep}{query}"

def generate_teacher_link(web_base_url, name="Teacher"):
    if "localhost" in web_base_url:
        web_base_url = web_base_url.replace("localhost", "127.0.0.1")
    query = urllib.parse.urlencode({
        "role": "teacher",
        "name": name
    })
    sep = "&" if "?" in web_base_url else "?"
    return f"{web_base_url}{sep}{query}"

def send_role_selection(bot, chat_id, custom_text=None):
    keyboard = {
        "inline_keyboard": [
            [
                {"text": "🎓 I am a Student", "callback_data": "role_student"},
                {"text": "👨‍🏫 I am a Teacher", "callback_data": "role_teacher"}
            ]
        ]
    }
    msg = custom_text or (
        "🎓 <b>Welcome to SATMaster!</b>\n\n"
        "Please select your role to get your access link:"
    )
    res = bot.send_message(chat_id, msg, reply_markup=keyboard)
    if res and isinstance(res, dict) and res.get("ok"):
        result_obj = res.get("result", {})
        if isinstance(result_obj, dict) and result_obj.get("message_id"):
            record_user_bot_message(chat_id, result_obj["message_id"])
    return res

def prompt_student_registration(bot, chat_id, is_reset=False):
    """
    Renders live cohorts from satmaster.db (RelationalDB).
    If no groups exist:
        Replies with "There is no available group right now. Please talk with your teacher to create your class group first." and halts.
    If groups exist:
        Renders dynamic inline keyboard buttons showing each group's name with callback_data="join_group:<group_id>".
    """
    groups = rdb.list_groups()
    if not groups:
        bot.send_message(
            chat_id,
            "There is no available group right now. Please talk with your teacher to create your class group first."
        )
        return False

    buttons = []
    for g in groups:
        buttons.append([{"text": f"🏫 {g['name']}", "callback_data": f"join_group:{g['id']}"}])

    keyboard = {"inline_keyboard": buttons}
    if is_reset:
        msg = (
            "⚠️ <b>Registration Required</b>\n\n"
            "Your student record is not active in the database.\n\n"
            "👉 <b>Please select an active group below to register:</b>"
        )
    else:
        msg = (
            "👋 <b>Welcome to SATMaster!</b>\n\n"
            "👉 <b>Please select your class group below to get your SAT portal access link:</b>"
        )
    res = bot.send_message(chat_id, msg, reply_markup=keyboard)
    if res and isinstance(res, dict) and res.get("ok"):
        result_obj = res.get("result", {})
        if isinstance(result_obj, dict) and result_obj.get("message_id"):
            record_user_bot_message(chat_id, result_obj["message_id"])
    return True

def ask_student_group_buttons(bot, chat_id, name, db, username=None):
    return prompt_student_registration(bot, chat_id, is_reset=False)

def send_student_hub(bot, chat_id, student_record, config, is_welcome_back=False):
    base_url = config.get("web_app_url", "https://satmaster-w58j.vercel.app/index.html")
    rec = _sanitize_student_dict(student_record) if student_record else {}
    name = rec.get("display_name") or rec.get("name") or "Student"
    student_id = rec.get("id") or rec.get("student_id") or f"TG{chat_id}"
    class_name = rec.get("group_name") or rec.get("class") or ""
    username = rec.get("telegram_username") or rec.get("username") or ""

    student_link = generate_student_link(base_url, student_id, name, class_name)

    safe_name = html.escape(name)
    safe_class = html.escape(class_name)
    greeting = f"👋 <b>Welcome back, {safe_name}!</b>" if is_welcome_back else f"🎉 <b>Registration Complete, {safe_name}!</b>"
    user_str = f"👤 <b>Telegram:</b> @{username}\n" if username else ""

    msg = (
        f"{greeting}\n\n"
        f"🏫 <b>Class Group:</b> <b>{safe_class}</b>\n"
        f"{user_str}"
        f"🆔 <b>Student ID:</b> <code>#{student_id}</code>\n\n"
        "✅ You are enrolled in your official SAT homework and practice cohort.\n\n"
        f"🔗 <b>Your Personal Portal Link:</b>\n{student_link}\n\n"
        "👉 Tap a button below to open your tests and practice on any phone or computer:"
    )

    buttons = [
        [{"text": "🚀 Open Web App (Safari / Chrome)", "url": student_link}],
        [
            {"text": "✏️ Update Name", "callback_data": "reset_role"},
            {"text": "🔄 Refresh Link", "callback_data": "relink_student"}
        ]
    ]

    keyboard = {"inline_keyboard": buttons}
    res = bot.send_message(chat_id, msg, reply_markup=keyboard)
    if res and isinstance(res, dict) and res.get("ok"):
        result_obj = res.get("result", {})
        if isinstance(result_obj, dict) and result_obj.get("message_id"):
            record_user_bot_message(chat_id, result_obj["message_id"])
    return res


def send_admin_hub(bot, chat_id, config, db):
    admin_link = generate_teacher_link(
        config.get("web_app_url", "https://satmaster-w58j.vercel.app/index.html"),
        "SAT Admin (Owner)"
    ) + "&admin=true"
    groups = get_live_groups(db)
    students = db.get("students", {})
    teachers = db.get("teachers", {})
    reports = db.get("reports", [])

    groups_summary = ""
    if groups:
        groups_summary = "\n".join([f"• <b>{g['name']}</b> ({g.get('code','')}): {sum(1 for s in students.values() if s.get('class','').strip().lower() == g.get('name','').strip().lower())} students" for g in groups[:5]])
        if len(groups) > 5:
            groups_summary += f"\n<i>...and {len(groups)-5} more</i>"
    else:
        groups_summary = "<i>No groups created yet. Use /newgroup &lt;name&gt; or website.</i>"

    msg = (
        "👑 <b>SATMaster Super-Admin Control Panel</b>\n\n"
        f"🏫 <b>Active Groups ({len(groups)}):</b>\n{groups_summary}\n\n"
        f"👥 <b>Total Students:</b> {len(students)}\n"
        f"👨‍🏫 <b>Teachers:</b> {len(teachers)}\n"
        f"📊 <b>Reports Logged:</b> {len(reports)}\n\n"
        "⚡ <b>Admin Quick Commands:</b>\n"
        "• <b>/groups</b> - View all groups & PIN codes\n"
        "• <b>/newgroup &lt;name&gt;</b> - Create a new group\n"
        "• <b>/delgroup &lt;name&gt;</b> - Delete a group\n"
        "• <b>/students</b> - View students grouped by class\n"
        "• <b>/teachers</b> - View teacher roster\n"
        "• <b>/broadcast &lt;msg&gt;</b> - Send announcement\n\n"
        f"🔗 <b>Admin Platform Portal:</b>\n{admin_link}"
    )

    admin_buttons = [
        [{"text": "👑 Open Admin Portal (Safari / Chrome)", "url": admin_link}]
    ]
    admin_buttons.extend([
        [
            {"text": "🏫 View Groups", "callback_data": "cmd_groups"},
            {"text": "➕ Create Group", "callback_data": "cmd_newgroup"}
        ],
        [
            {"text": "👥 View Students", "callback_data": "cmd_students"},
            {"text": "👨‍🏫 View Teachers", "callback_data": "cmd_teachers"}
        ],
        [
            {"text": "📊 Stats", "callback_data": "cmd_stats"},
            {"text": "🗑️ Delete Group", "callback_data": "cmd_delgroup"}
        ]
    ])

    keyboard = {"inline_keyboard": admin_buttons}
    bot.send_message(chat_id, msg, reply_markup=keyboard)

def send_teacher_hub(bot, chat_id, teacher_record, config, db):
    teacher_name = teacher_record.get("name", "SAT Instructor")
    assigned_group = teacher_record.get("group")
    teacher_link = generate_teacher_link(
        config.get("web_app_url", "https://satmaster-w58j.vercel.app/index.html"),
        teacher_name
    )
    all_students = db.get("students", {})
    if assigned_group:
        my_students = [s for s in all_students.values() if s.get("class", "").strip().lower() == assigned_group.strip().lower()]
        group_info = f"• Assigned Group: <b>{assigned_group}</b>\n• Group Students: <b>{len(my_students)}</b>\n"
    else:
        group_info = "• Assigned Group: <b>All Groups</b>\n• Total Students: <b>" + str(len(all_students)) + "</b>\n"

    msg = (
        f"👨‍🏫 <b>Teacher Portal: {teacher_name}</b>\n\n"
        f"{group_info}"
        f"• Group Reports: <b>Active (Delivering here)</b>\n\n"
        "Test reports for your group students are automatically delivered to this chat.\n\n"
        f"🔗 <b>Teacher Workspace:</b>\n{teacher_link}"
    )

    t_buttons = [
        [{"text": "👨‍🏫 Open Teacher Portal (Safari / Chrome)", "url": teacher_link}],
        [
            {"text": "👥 My Students", "callback_data": "cmd_students"},
            {"text": "📊 My Group Stats", "callback_data": "cmd_stats"}
        ]
    ]

    keyboard = {"inline_keyboard": t_buttons}
    bot.send_message(chat_id, msg, reply_markup=keyboard)

def handle_update(bot, update, config, db=None):
    if db is None:
        db = load_db()
    callback = update.get("callback_query")
    admin_chat_id = str(config.get("admin_chat_id") or db.get("admin_chat_id") or "7957347033")

    if callback:
        cq_id = callback.get("id")
        from_user = callback.get("from", {})
        user_id = str(from_user.get("id"))
        chat_id = callback.get("message", {}).get("chat", {}).get("id", int(user_id))
        data = callback.get("data", "")
        is_admin = (str(user_id) == admin_chat_id or str(chat_id) == admin_chat_id)
        is_teacher = user_id in db.get("teachers", {})

        bot.answer_callback_query(cq_id)

        # 0. Vocabulary test report interactive inline expand/collapse
        if data.startswith("vrep_more:") or data.startswith("vrep_less:"):
            is_expand = data.startswith("vrep_more:")
            rep_id = data.split(":", 1)[1].strip()
            rep = None
            candidates = []
            if isinstance(db, dict) and db.get("reports"):
                candidates.extend(db.get("reports", []))
            try:
                candidates.extend(load_db().get("reports", []))
            except Exception:
                pass

            for r in reversed(candidates):
                if str(r.get("id")) == str(rep_id):
                    rep = r
                    break

            message_id = callback.get("message", {}).get("message_id")
            if rep:
                if is_expand:
                    new_text = format_vocab_details_text(rep)
                    new_markup = {
                        "inline_keyboard": [
                            [{"text": "🔼 Hide Information", "callback_data": f"vrep_less:{rep_id}"}]
                        ]
                    }
                else:
                    new_text = format_vocab_summary_text(rep)
                    new_markup = {
                        "inline_keyboard": [
                            [{"text": "ℹ️ More Information", "callback_data": f"vrep_more:{rep_id}"}]
                        ]
                    }

                edit_res = None
                if message_id and hasattr(bot, "edit_message_text"):
                    edit_res = bot.edit_message_text(chat_id, message_id, new_text, reply_markup=new_markup)
                if not edit_res or not edit_res.get("ok"):
                    if is_expand and hasattr(bot, "send_message"):
                        bot.send_message(chat_id, new_text, reply_markup=new_markup)
            else:
                if hasattr(bot, "answer_callback_query"):
                    try:
                        bot.answer_callback_query(cq_id, text="⚠️ Detailed report data is no longer available.")
                    except Exception:
                        pass
            return

        # 0b. Homework submission interactive inline expand/collapse
        if data.startswith("hwsub_more:") or data.startswith("hwsub_less:"):
            is_expand = data.startswith("hwsub_more:")
            sub_id = data.split(":", 1)[1].strip()
            sub = rdb.get_homework_submission(sub_id)
            message_id = callback.get("message", {}).get("message_id")
            if sub:
                hw = rdb.get_homework_assignment(sub.get("homework_id")) or {}
                if is_expand:
                    new_text = format_homework_submission_details_text(hw, sub)
                    new_markup = {
                        "inline_keyboard": [
                            [{"text": "🔼 Hide Information", "callback_data": f"hwsub_less:{sub_id}"}]
                        ]
                    }
                else:
                    new_text = format_homework_submission_summary_text(hw, sub)
                    new_markup = {
                        "inline_keyboard": [
                            [{"text": "ℹ️ More Information", "callback_data": f"hwsub_more:{sub_id}"}]
                        ]
                    }

                edit_res = None
                if message_id and hasattr(bot, "edit_message_text"):
                    edit_res = bot.edit_message_text(chat_id, message_id, new_text, reply_markup=new_markup)
                if not edit_res or not edit_res.get("ok"):
                    if is_expand and hasattr(bot, "send_message"):
                        bot.send_message(chat_id, new_text, reply_markup=new_markup)
            else:
                if hasattr(bot, "answer_callback_query"):
                    try:
                        bot.answer_callback_query(cq_id, text="⚠️ Homework submission details not found.")
                    except Exception:
                        pass
            return

        # 0. Fresh registration trigger from stale prompt button
        if data == "cmd_start":
            clear_user_state(user_id)
            if user_id in db.get("students", {}):
                db["students"].pop(user_id, None)
                save_db(db)
            student = rdb.get_student(user_id)
            if student:
                send_student_hub(bot, chat_id, student, config, is_welcome_back=True)
            else:
                send_role_selection(bot, chat_id)
            return

        if data.startswith("join_group:") or data.startswith("grp_"):
            if data.startswith("join_group:"):
                target_id = data.split(":", 1)[1].strip()
            else:
                target_id = data[4:].strip()

            grp = rdb.get_group(target_id)
            if not grp:
                bot.send_message(
                    chat_id,
                    "❌ That class group is no longer available. Please select an active group:"
                )
                prompt_student_registration(bot, chat_id, is_reset=True)
                return

            set_user_state(user_id, {
                "role": "student",
                "step": "STUDENT_WAITING_NAME",
                "data": {
                    "group_id": grp["id"],
                    "group_name": grp["name"]
                }
            })
            msg = (
                f"🏫 You selected: <b>{html.escape(grp['name'])}</b>\n\n"
                "👉 <b>Please enter your Full Name:</b>\n"
                "<i>(e.g., Cristiano Ronaldo, Alex Chen)</i>"
            )
            bot.send_message(chat_id, msg)
            return

        if data == "role_student":
            student = rdb.get_student(user_id)
            if student:
                bot.send_message(
                    chat_id,
                    f"🎓 You are already registered as <b>{html.escape(student.get('display_name') or student.get('name', ''))}</b>."
                )
                send_student_hub(bot, chat_id, student, config, is_welcome_back=True)
                return
            clear_user_state(user_id)
            if user_id in db.get("students", {}):
                db["students"].pop(user_id, None)
                save_db(db)
            prompt_student_registration(bot, chat_id, is_reset=False)
            return

        if data == "role_teacher":
            clear_user_state(user_id)
            web_url = config.get("web_app_url", "https://satmaster-w58j.vercel.app/index.html")
            teacher_link = generate_teacher_link(web_url, "Teacher")
            msg = (
                "👨‍🏫 <b>Teacher & Administrator Access</b>\n\n"
                "Welcome, Instructor! As a teacher, you can create and manage class cohorts, view enrolled students, and inspect live test submissions on the web dashboard.\n\n"
                "🔑 <b>Teacher Access Password:</b> <code>satmaster2026</code>\n\n"
                f"🔗 <b>Teacher Dashboard URL:</b>\n{teacher_link}\n\n"
                "👉 <i>To authenticate directly in this Telegram bot, send:</i>\n"
                "<code>/admin satmaster2026</code>"
            )
            buttons = [
                [{"text": "🌐 Open Teacher Dashboard (Safari / Chrome)", "url": teacher_link}]
            ]
            bot.send_message(chat_id, msg, reply_markup={"inline_keyboard": buttons})
            return

        # STALE INTERACTION INTERCEPTOR FOR STUDENTS:
        # If user is neither admin nor teacher, verify active enrollment in database.py
        if not is_admin and not is_teacher:
            student = rdb.get_student(user_id)
            if not student:
                clear_user_state(user_id)
                if user_id in db.get("students", {}):
                    db["students"].pop(user_id, None)
                    save_db(db)

                # Attempt to delete the stale interactive message so stale buttons disappear
                msg_id = callback.get("message", {}).get("message_id")
                if msg_id and hasattr(bot, "delete_message"):
                    try:
                        bot.delete_message(chat_id, msg_id)
                    except Exception:
                        pass

                keyboard = {
                    "inline_keyboard": [
                        [{"text": "🚀 Register via /start", "callback_data": "cmd_start"}]
                    ]
                }
                bot.send_message(
                    chat_id,
                    "⚠️ You are not currently enrolled in an active class cohort. Please send /start to register.",
                    reply_markup=keyboard
                )
                return

        if data == "relink_student":
            student = rdb.get_student(user_id)
            if student:
                send_student_hub(bot, chat_id, student, config, is_welcome_back=True)
            else:
                clear_user_state(user_id)
                prompt_student_registration(bot, chat_id, is_reset=True)
            return

        if data == "reset_role":
            student = rdb.get_student(user_id)
            if student:
                set_user_state(user_id, {"role": "student", "step": "STUDENT_UPDATING_NAME", "data": {}})
                bot.send_message(
                    chat_id,
                    "✏️ <b>Update Display Name</b>\n\n"
                    f"Current Name: <b>{html.escape(student.get('display_name') or student.get('name', ''))}</b>\n\n"
                    "👉 Please enter your updated Full Name:"
                )
            else:
                clear_user_state(user_id)
                prompt_student_registration(bot, chat_id, is_reset=True)
            return

        # ADMIN & TEACHER CALLBACKS
        if data == "cmd_groups":
            groups = get_live_groups(db)
            if not groups:
                msg = "🏫 <i>No class groups created yet.</i>\n\nUse <code>/newgroup &lt;name&gt;</code> to create one, or create it on the platform."
            else:
                msg = f"🏫 <b>Active Class Groups ({len(groups)}):</b>\n\n"
                students = db.get("students", {})
                for g in groups:
                    count = sum(1 for s in students.values() if s.get("class", "").strip().lower() == g.get("name", "").strip().lower())
                    teacher = g.get("teacher_name") or "Unassigned"
                    msg += f"• <b>{g['name']}</b>\n  PIN: <code>{g.get('code','N/A')}</code> | Teacher: {teacher} | Students: <b>{count}</b>\n\n"
            bot.send_message(chat_id, msg)
            return

        if data == "cmd_newgroup":
            if not is_admin:
                bot.send_message(chat_id, "🔒 Only the SAT Admin can create new groups.")
                return
            user_states[user_id] = {"role": "admin", "step": "ADMIN_WAITING_GROUP_NAME"}
            bot.send_message(chat_id, "➕ <b>Create New Group</b>\n\n👉 Please enter the name for the new group (e.g. <i>SAT Morning Cohort</i>):")
            return

        if data == "cmd_delgroup":
            if not is_admin:
                bot.send_message(chat_id, "🔒 Only the SAT Admin can delete groups.")
                return
            groups = get_live_groups(db)
            if not groups:
                bot.send_message(chat_id, "ℹ️ No groups to delete.")
                return
            del_buttons = [[{"text": f"🗑️ Delete {g['name']}", "callback_data": f"delgrp_{g['id']}"}] for g in groups]
            del_buttons.append([{"text": "Cancel", "callback_data": "cmd_groups"}])
            bot.send_message(chat_id, "⚠️ <b>Select a group to delete:</b>", reply_markup={"inline_keyboard": del_buttons})
            return

        if data.startswith("delgrp_"):
            if not is_admin:
                bot.send_message(chat_id, "🔒 Only the SAT Admin can delete groups.")
                return
            del_id = data[7:].strip()
            removed = delete_group(db, del_id)
            if removed:
                bot.send_message(chat_id, f"✅ Group <b>{removed[0]['name']}</b> deleted successfully from website and Telegram.")
            else:
                bot.send_message(chat_id, "❌ Group not found.")
            return

        if data == "cmd_teachers":
            teachers = db.get("teachers", {})
            if not teachers:
                bot.send_message(chat_id, "👨‍🏫 <i>No teachers registered yet.</i>")
                return
            msg = f"👨‍🏫 <b>Registered Teachers ({len(teachers)}):</b>\n\n"
            for tid, t in teachers.items():
                grp = t.get("group") or "All Groups"
                msg += f"• <b>{t.get('name', 'Teacher')}</b> (ID: <code>{tid}</code>) — Group: {grp}\n"
            bot.send_message(chat_id, msg)
            return

        if data == "cmd_students":
            students = db.get("students", {})
            if not students:
                bot.send_message(chat_id, "📋 <i>No students registered yet.</i>")
                return

            teacher_record = db.get("teachers", {}).get(user_id)
            if not is_admin and teacher_record and teacher_record.get("group"):
                t_grp = teacher_record.get("group", "").strip().lower()
                filtered = [s for s in students.values() if s.get("class", "").strip().lower() == t_grp]
                if not filtered:
                    bot.send_message(chat_id, f"📋 <i>No students registered in your group ({teacher_record['group']}) yet.</i>")
                    return
                msg = f"👥 <b>Students in {teacher_record['group']} ({len(filtered)}):</b>\n\n"
                for s in sorted(filtered, key=lambda x: x.get('name', '')):
                    uname = f" (@{s['username']})" if s.get('username') else ""
                    msg += f"• <b>{s['name']}</b>{uname} — ID: <code>#{s.get('student_id')}</code>\n"
                bot.send_message(chat_id, msg)
                return

            # Grouped by class
            by_group = {}
            for s in students.values():
                cls = s.get("class", "Unassigned")
                by_group.setdefault(cls, []).append(s)

            msg = f"👥 <b>Registered Students ({len(students)}):</b>\n\n"
            for grp, s_list in sorted(by_group.items()):
                msg += f"🏫 <b>{grp} ({len(s_list)}):</b>\n"
                for s in sorted(s_list, key=lambda x: x.get('name', '')):
                    uname = f" (@{s['username']})" if s.get('username') else ""
                    msg += f"  • {s['name']}{uname} (ID: <code>#{s.get('student_id')}</code>)\n"
                msg += "\n"
            bot.send_message(chat_id, msg)
            return

        if data == "cmd_stats":
            students = db.get("students", {})
            groups = get_live_groups(db)
            reports = db.get("reports", [])
            msg = (
                "📊 <b>SATMaster Suite Statistics:</b>\n\n"
                f"• Active Groups: <b>{len(groups)}</b>\n"
                f"• Registered Students: <b>{len(students)}</b>\n"
                f"• Reports Received: <b>{len(reports)}</b>\n"
                f"• Web Base URL: <code>{config.get('web_app_url')}</code>"
            )
            bot.send_message(chat_id, msg)
            return

    message = update.get("message")
    if not message:
        return

    chat_id = message.get("chat", {}).get("id")
    user_id = str(message.get("from", {}).get("id", chat_id))
    text = message.get("text", "").strip()
    is_admin = (str(chat_id) == admin_chat_id or str(user_id) == admin_chat_id)

    # 1. Quick admin password login
    if text.startswith("/admin"):
        parts = text.split(maxsplit=1)
        pwd = parts[1].strip() if len(parts) > 1 else ""
        if pwd == config.get("admin_password", "satmaster2026"):
            config["admin_chat_id"] = str(chat_id)
            db["admin_chat_id"] = str(chat_id)
            teacher_record = db.get("teachers", {}).get(user_id, {
                "name": "Teacher Admin",
                "organization": "SAT Prep"
            })
            db.setdefault("teachers", {})[user_id] = teacher_record
            save_config(config)
            save_db(db)
            send_admin_hub(bot, chat_id, config, db)
            return
        else:
            bot.send_message(chat_id, "❌ Incorrect password. Usage: <code>/admin &lt;password&gt;</code>")
            return

    # 2. Start command - Role differentiated!
    if text == "/start" or text.startswith("/start"):
        clear_user_state(user_id)
        if is_admin:
            send_admin_hub(bot, chat_id, config, db)
            return
        elif user_id in db.get("teachers", {}):
            send_teacher_hub(bot, chat_id, db["teachers"][user_id], config, db)
            return

        student = rdb.get_student(user_id)
        if student:
            send_student_hub(bot, chat_id, student, config, is_welcome_back=True)
            return
        else:
            if user_id in db.get("students", {}):
                db["students"].pop(user_id, None)
                save_db(db)
            send_role_selection(bot, chat_id)
            return

    # 3. Admin-Exclusive Text Commands
    if is_admin:
        if text == "/groups":
            groups = get_live_groups(db)
            if not groups:
                bot.send_message(chat_id, "🏫 <i>No class groups created yet.</i>\n\nUse <code>/newgroup &lt;name&gt;</code> to create one, or create it on the platform.")
                return
            students = db.get("students", {})
            msg = f"🏫 <b>Active Class Groups ({len(groups)}):</b>\n\n"
            for g in groups:
                count = sum(1 for s in students.values() if s.get("class", "").strip().lower() == g.get("name", "").strip().lower())
                teacher = g.get("teacher_name") or "Unassigned"
                msg += f"• <b>{g['name']}</b>\n  PIN: <code>{g.get('code','N/A')}</code> | Teacher: {teacher} | Students: <b>{count}</b>\n\n"
            bot.send_message(chat_id, msg)
            return

        if text.startswith("/newgroup"):
            parts = text.split(maxsplit=1)
            if len(parts) < 2 or not parts[1].strip():
                bot.send_message(chat_id, "Usage: <code>/newgroup &lt;group name&gt;</code>\nExample: <code>/newgroup SAT Morning Cohort</code>")
                return
            g_name = parts[1].strip()
            new_g, created = add_group(db, g_name)
            if created:
                bot.send_message(
                    chat_id,
                    f"✅ <b>Group Created:</b> {g_name}\n"
                    f"PIN: <code>{new_g['code']}</code>\n\n"
                    "It is now live on the platform and students can select it on Telegram!"
                )
            else:
                bot.send_message(chat_id, f"ℹ️ Group <b>{g_name}</b> already exists.")
            return

        if text.startswith("/delgroup"):
            parts = text.split(maxsplit=1)
            if len(parts) < 2 or not parts[1].strip():
                bot.send_message(chat_id, "Usage: <code>/delgroup &lt;group name or code&gt;</code>")
                return
            target = parts[1].strip()
            removed = delete_group(db, target)
            if removed:
                bot.send_message(chat_id, f"✅ Group <b>{removed[0]['name']}</b> deleted successfully from website and Telegram.")
            else:
                bot.send_message(chat_id, f"❌ Group '{target}' not found.")
            return

        if text == "/teachers":
            teachers = db.get("teachers", {})
            if not teachers:
                bot.send_message(chat_id, "👨‍🏫 <i>No teachers registered yet.</i>")
                return
            msg = f"👨‍🏫 <b>Registered Teachers ({len(teachers)}):</b>\n\n"
            for tid, t in teachers.items():
                grp = t.get("group") or "All Groups"
                msg += f"• <b>{t.get('name', 'Teacher')}</b> (ID: <code>{tid}</code>) — Group: {grp}\n"
            bot.send_message(chat_id, msg)
            return

    # 4. Teacher / Admin Student & Stat Commands
    teacher_record = db.get("teachers", {}).get(user_id)
    if is_admin or teacher_record:
        if text == "/students":
            students = db.get("students", {})
            if not students:
                bot.send_message(chat_id, "📋 <i>No students registered yet.</i>")
                return

            if not is_admin and teacher_record and teacher_record.get("group"):
                t_grp = teacher_record.get("group", "").strip().lower()
                filtered = [s for s in students.values() if s.get("class", "").strip().lower() == t_grp]
                if not filtered:
                    bot.send_message(chat_id, f"📋 <i>No students registered in your group ({teacher_record['group']}) yet.</i>")
                    return
                msg = f"👥 <b>Students in {teacher_record['group']} ({len(filtered)}):</b>\n\n"
                for s in sorted(filtered, key=lambda x: x.get('name', '')):
                    uname = f" (@{s['username']})" if s.get('username') else ""
                    msg += f"• <b>{s['name']}</b>{uname} — ID: <code>#{s.get('student_id')}</code>\n"
                bot.send_message(chat_id, msg)
                return

            # Grouped by class
            by_group = {}
            for s in students.values():
                cls = s.get("class", "Unassigned")
                by_group.setdefault(cls, []).append(s)

            msg = f"👥 <b>Registered Students ({len(students)}):</b>\n\n"
            for grp, s_list in sorted(by_group.items()):
                msg += f"🏫 <b>{grp} ({len(s_list)}):</b>\n"
                for s in sorted(s_list, key=lambda x: x.get('name', '')):
                    uname = f" (@{s['username']})" if s.get('username') else ""
                    msg += f"  • {s['name']}{uname} (ID: <code>#{s.get('student_id')}</code>)\n"
                msg += "\n"
            bot.send_message(chat_id, msg)
            return

        if text == "/stats":
            students = db.get("students", {})
            groups = get_live_groups(db)
            reports = db.get("reports", [])
            msg = (
                "📊 <b>SATMaster Suite Statistics:</b>\n\n"
                f"• Active Groups: <b>{len(groups)}</b>\n"
                f"• Registered Students: <b>{len(students)}</b>\n"
                f"• Reports Received: <b>{len(reports)}</b>\n"
                f"• Web Base URL: <code>{config.get('web_app_url')}</code>"
            )
            bot.send_message(chat_id, msg)
            return

        if text.startswith("/broadcast"):
            msg_content = text.replace("/broadcast", "", 1).strip()
            if not msg_content:
                bot.send_message(chat_id, "Usage: <code>/broadcast &lt;message&gt;</code>")
                return
            count = 0
            for sid in db.get("students", {}):
                try:
                    bot.send_message(int(sid), f"📢 <b>Teacher Announcement:</b>\n\n{msg_content}")
                    count += 1
                except Exception:
                    pass
            bot.send_message(chat_id, f"✅ Broadcast sent to {count} student(s).")
            return

    # Check if student is actively in mid-registration onboarding flow
    state = user_states.get(user_id)
    in_student_registration = (
        state and state.get("role") == "student" and state.get("step") in ["STUDENT_WAITING_NAME", "STUDENT_WAITING_GROUP"]
    )

    # STALE INTERACTION INTERCEPTOR FOR STUDENTS:
    # If not admin, not teacher, and not in mid-registration flow, require active enrollment in database.py
    if not is_admin and user_id not in db.get("teachers", {}) and not in_student_registration:
        student = rdb.get_student(user_id)
        if not student:
            clear_user_state(user_id)
            if user_id in db.get("students", {}):
                db["students"].pop(user_id, None)
                save_db(db)
            keyboard = {
                "inline_keyboard": [
                    [{"text": "🚀 Register via /start", "callback_data": "cmd_start"}]
                ]
            }
            bot.send_message(
                chat_id,
                "⚠️ You are not currently enrolled in an active class cohort. Please send /start to register.",
                reply_markup=keyboard
            )
            return

    if text.startswith("/name"):
        parts = text.split(maxsplit=1)
        student = rdb.get_student(user_id)
        if not student:
            clear_user_state(user_id)
            prompt_student_registration(bot, chat_id, is_reset=True)
            return

        if len(parts) < 2 or not parts[1].strip():
            set_user_state(user_id, {
                "role": "student",
                "step": "STUDENT_UPDATING_NAME",
                "data": {}
            })
            bot.send_message(
                chat_id,
                f"Current Name: <b>{html.escape(student.get('display_name') or student.get('name', ''))}</b>\n\n"
                "👉 Please enter your updated Full Name:"
            )
            return

        new_name = parts[1].strip()
        tg_username = (message.get("from") or {}).get("username")

        updated_student = rdb.update_student_name(int(user_id), new_name)
        if tg_username and tg_username != updated_student.get("telegram_username"):
            rdb.upsert_student(
                telegram_id=int(user_id),
                display_name=new_name,
                group_id=updated_student["group_id"],
                telegram_username=tg_username
            )
            updated_student = rdb.get_student(user_id)

        # Sync legacy JSON
        if user_id in db.get("students", {}):
            db["students"][user_id]["name"] = new_name
            if tg_username:
                db["students"][user_id]["username"] = tg_username
            save_db(db)

        clear_user_state(user_id)
        bot.send_message(
            chat_id,
            f"✅ <b>Name updated to:</b> <b>{html.escape(new_name)}</b> across the dashboard."
        )
        send_student_hub(bot, chat_id, updated_student, config, is_welcome_back=True)
        return

    if text in ["/register", "/role", "/update"]:
        clear_user_state(user_id)
        send_role_selection(bot, chat_id)
        return

    if text == "/myinfo":
        if is_admin:
            send_admin_hub(bot, chat_id, config, db)
            return
        elif user_id in db.get("teachers", {}):
            send_teacher_hub(bot, chat_id, db["teachers"][user_id], config, db)
            return
        student = rdb.get_student(user_id)
        if student:
            send_student_hub(bot, chat_id, student, config, is_welcome_back=True)
            return
        else:
            clear_user_state(user_id)
            prompt_student_registration(bot, chat_id, is_reset=True)
            return

    if text == "/help":
        help_msg = (
            "📖 <b>SATMaster Telegram Bot Help</b>\n\n"
            "• <b>/start</b> - Open your personal dashboard & link\n"
            "• <b>/register</b> - Change your group or update name\n"
            "• <b>/myinfo</b> - View your profile and access link\n"
        )
        if is_admin:
            help_msg += (
                "\n<b>Admin Commands:</b>\n"
                "• <b>/groups</b> - View all groups & PIN codes\n"
                "• <b>/newgroup &lt;name&gt;</b> - Create a new group\n"
                "• <b>/delgroup &lt;name&gt;</b> - Delete a group\n"
                "• <b>/students</b> - View students grouped by class\n"
                "• <b>/teachers</b> - View teacher roster\n"
                "• <b>/broadcast &lt;msg&gt;</b> - Send announcement\n"
            )
        elif teacher_record:
            help_msg += (
                "\n<b>Teacher Commands:</b>\n"
                "• <b>/students</b> - View your group students\n"
                "• <b>/stats</b> - View group test statistics\n"
                "• <b>/broadcast &lt;msg&gt;</b> - Send announcement\n"
            )
        bot.send_message(chat_id, help_msg)
        return

    # 5. Active Interactive State Machine
    state = user_states.get(user_id)

    # Admin state
    if state and state.get("role") == "admin":
        step = state.get("step")
        if step == "ADMIN_WAITING_GROUP_NAME":
            group_name = text.strip()
            user_states.pop(user_id, None)
            new_g, created = add_group(db, group_name)
            if created:
                bot.send_message(
                    chat_id,
                    f"✅ <b>Group Created:</b> {group_name}\n"
                    f"PIN: <code>{new_g['code']}</code>\n\n"
                    "It is now live on the platform and students can select it on Telegram!"
                )
            else:
                bot.send_message(chat_id, f"ℹ️ Group <b>{group_name}</b> already exists.")
            return

    # Student question flow
    if state and state.get("role") == "student":
        step = state.get("step")

        if step == "STUDENT_WAITING_NAME":
            entered_name = text.strip()
            if len(entered_name) < 2 or entered_name.startswith("/"):
                bot.send_message(chat_id, "⚠️ Please enter your valid Full Name (at least 2 letters):")
                return

            group_id = state.get("data", {}).get("group_id")
            grp = rdb.get_group(group_id) if group_id else None
            if not grp:
                clear_user_state(user_id)
                bot.send_message(chat_id, "❌ That class group is no longer available.")
                prompt_student_registration(bot, chat_id, is_reset=True)
                return

            tg_username = (message.get("from") or {}).get("username") or ""

            # Save student to relational database
            student = rdb.upsert_student(
                telegram_id=int(user_id),
                display_name=entered_name,
                group_id=grp["id"],
                telegram_username=tg_username
            )

            # Sync with legacy db
            save_and_register_student(db, user_id, entered_name, tg_username, grp["name"])
            clear_user_state(user_id)

            # Reply with confirmation and their unique web link to take tests
            send_student_hub(bot, chat_id, student, config, is_welcome_back=False)

            teacher_chat_id = str(grp.get("teacher_id") or "")
            admin_msg = (
                "🔔 <b>New Student Registered:</b>\n"
                f"• Name: <b>{html.escape(entered_name)}</b>\n"
                f"• Username: @{tg_username}\n"
                f"• Group: <b>{html.escape(grp['name'])}</b>\n"
                f"• ID: <code>#{student['id']}</code>"
            )
            if admin_chat_id and admin_chat_id != str(chat_id):
                try:
                    bot.send_message(int(admin_chat_id), admin_msg)
                except Exception:
                    pass
            if teacher_chat_id and teacher_chat_id != admin_chat_id and teacher_chat_id != str(chat_id):
                try:
                    bot.send_message(int(teacher_chat_id), f"🎓 <b>New Student in your group ({html.escape(grp['name'])}):</b>\n• {html.escape(entered_name)} (@{tg_username}) — ID: #{student['id']}")
                except Exception:
                    pass
            return

        if step == "STUDENT_UPDATING_NAME":
            new_name = text.strip()
            if len(new_name) < 2 or new_name.startswith("/"):
                bot.send_message(chat_id, "⚠️ Please enter your valid Full Name (at least 2 letters):")
                return

            student = rdb.get_student(user_id)
            if not student:
                clear_user_state(user_id)
                prompt_student_registration(bot, chat_id, is_reset=True)
                return

            updated_student = rdb.update_student_name(int(user_id), new_name)
            tg_username = (message.get("from") or {}).get("username")
            if tg_username and tg_username != updated_student.get("telegram_username"):
                rdb.upsert_student(
                    telegram_id=int(user_id),
                    display_name=new_name,
                    group_id=updated_student["group_id"],
                    telegram_username=tg_username
                )
                updated_student = rdb.get_student(user_id)

            if user_id in db.get("students", {}):
                db["students"][user_id]["name"] = new_name
                if tg_username:
                    db["students"][user_id]["username"] = tg_username
                save_db(db)

            clear_user_state(user_id)
            bot.send_message(
                chat_id,
                f"✅ <b>Name updated to:</b> <b>{html.escape(new_name)}</b> across the dashboard."
            )
            send_student_hub(bot, chat_id, updated_student, config, is_welcome_back=True)
            return

        if step == "STUDENT_WAITING_GROUP":
            entered_group = text.strip()
            groups = rdb.list_groups()
            matched = next((g for g in groups if g.get("name", "").strip().lower() == entered_group.lower() or str(g.get("id")) == entered_group), None)
            if not matched and len(groups) == 1:
                matched = groups[0]

            if not matched:
                bot.send_message(
                    chat_id,
                    f"❌ <b>'{html.escape(entered_group)}' is not an available class group.</b>\n\n"
                    "👉 Please choose one of the available groups below:"
                )
                prompt_student_registration(bot, chat_id, is_reset=False)
                return

            name = state["data"].get("name", "Student")
            username = state["data"].get("username", "") or (message.get("from") or {}).get("username", "")

            student = rdb.upsert_student(
                telegram_id=int(user_id),
                display_name=name,
                group_id=matched["id"],
                telegram_username=username
            )
            save_and_register_student(db, user_id, name, username, matched["name"])
            clear_user_state(user_id)

            send_student_hub(bot, chat_id, student, config, is_welcome_back=False)
            return

    # Teacher question flow
    if state and state.get("role") == "teacher":
        step = state.get("step")

        if step == "TEACHER_WAITING_NAME":
            state["data"]["name"] = text
            state["step"] = "TEACHER_WAITING_PASSWORD"
            msg = (
                f"Welcome, <b>{text}</b>! 👨‍🏫\n\n"
                "👉 <b>Please enter your Teacher Access Password:</b>\n"
                "<i>(Default security password: <code>satmaster2026</code>)</i>"
            )
            bot.send_message(chat_id, msg)
            return

        if step == "TEACHER_WAITING_PASSWORD":
            if text == config.get("admin_password", "satmaster2026"):
                teacher_name = state["data"].get("name", "SAT Instructor")
                teacher_record = {
                    "telegram_id": int(user_id),
                    "name": teacher_name,
                    "organization": "SAT Prep",
                    "registered_at": datetime.now().isoformat(),
                    "last_active": datetime.now().isoformat()
                }
                db.setdefault("teachers", {})[user_id] = teacher_record
                save_db(db)
                user_states.pop(user_id, None)

                # Differentiate Admin vs Teacher
                if str(user_id) == admin_chat_id:
                    send_admin_hub(bot, chat_id, config, db)
                else:
                    send_teacher_hub(bot, chat_id, teacher_record, config, db)
            else:
                keyboard = {
                    "inline_keyboard": [
                        [{"text": "🎓 Switch to Student Registration", "callback_data": "role_student"}]
                    ]
                }
                bot.send_message(
                    chat_id,
                    "❌ Incorrect teacher password. Please try entering the password again (default: <code>satmaster2026</code>), or switch to student registration below:",
                    reply_markup=keyboard
                )
            return

    # 6. Smart Fallback for unregistered users & general messages
    if is_admin:
        send_admin_hub(bot, chat_id, config, db)
    elif user_id in db.get("teachers", {}):
        send_teacher_hub(bot, chat_id, db["teachers"][user_id], config, db)
    else:
        student = rdb.get_student(user_id)
        if student:
            send_student_hub(bot, chat_id, student, config, is_welcome_back=True)
        else:
            clear_user_state(user_id)
            if user_id in db.get("students", {}):
                db["students"].pop(user_id, None)
                save_db(db)
            send_role_selection(bot, chat_id)

WEB_DIR = BASE_DIR

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

class SATMasterHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=WEB_DIR, **kwargs)

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

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()

    def do_GET(self):
        parsed_path = urllib.parse.urlparse(self.path)
        clean_path = parsed_path.path.rstrip("/")
        if not clean_path:
            clean_path = "/"

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

        # 4. GET /api/groups/:id/students - Return all students isolated to this specific group
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

        # 5. GET /api/students/:id/history - Return all past test attempts and unit scores for student
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

        # 5b. GET /api/students/:id/solved-questions - Return student's solved question IDs
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

        # 5c. GET /api/qbank/user-history - Return student's practice history and skill stats
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

        # Legacy support: GET /api/students?group=...
        if clean_path == "/api/students":
            qs = urllib.parse.parse_qs(parsed_path.query)
            group_filter = qs.get("group", [None])[0]
            if group_filter:
                students = rdb.get_group_students(group_filter)
                if students is None:
                    # Fallback to legacy db
                    db = load_db()
                    all_s = list(db.get("students", {}).values())
                    students = [s for s in all_s if s.get("class", "").strip().lower() == group_filter.strip().lower()]
            else:
                db = load_db()
                students = list(db.get("students", {}).values())
            return self.send_json(200, {"ok": True, "students": students or []})

        # GET /api/homework - List assignments with optional group_id and student_id filtering
        if clean_path == "/api/homework":
            qs = urllib.parse.parse_qs(parsed_path.query)
            grp_id = qs.get("group_id", [None])[0] or qs.get("group", [None])[0]
            stu_id = qs.get("student_id", [None])[0] or qs.get("uid", [None])[0] or qs.get("id", [None])[0] or self.headers.get("X-User-Id") or self.headers.get("X-Telegram-Id") or self.headers.get("x-user-id") or self.headers.get("x-telegram-id")
            try:
                assignments = rdb.get_homework_assignments(group_id=grp_id, student_id=stu_id)
                return self.send_json(200, {"ok": True, "assignments": assignments, "count": len(assignments)})
            except Exception as e:
                return self.send_json(500, {"ok": False, "error": str(e)})

        # SPA Routes: /groups and /groups/:id
        if clean_path == "/groups" or re.match(r"^/groups(/[a-zA-Z0-9_\-]+)?$", clean_path):
            self.path = "/index.html"
            return super().do_GET()

        super().do_GET()

    def do_POST(self):
        parsed_path = urllib.parse.urlparse(self.path)
        clean_path = parsed_path.path.rstrip("/")
        content_length = int(self.headers.get("Content-Length", 0))
        post_data = self.rfile.read(content_length)
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

        # 2. POST /api/groups - Create a new group (accepts { name })
        if clean_path == "/api/groups":
            qs = urllib.parse.parse_qs(parsed_path.query)
            if not is_admin_request(self.headers, qs, body):
                return self.send_json(403, {"ok": False, "error": "Admin privileges required"})

            action = body.get("action", "create")
            if action == "delete":
                group_id = body.get("id") or body.get("name")
                deleted = rdb.delete_group(group_id)
                legacy_db = load_db()
                delete_group(legacy_db, group_id)
                if deleted:
                    return self.send_json(200, {"ok": True, "message": "Group deleted", "deleted": deleted})
                return self.send_json(404, {"ok": False, "error": "Group not found"})

            name = body.get("name", "").strip()
            if not name:
                return self.send_json(400, {"ok": False, "error": "Group name is required"})

            try:
                new_grp = rdb.create_group(name)
                # Sync with legacy db
                legacy_db = load_db()
                code = body.get("code", "").strip()
                schedule = body.get("schedule", "").strip()
                teacher_id = body.get("teacher_id") or legacy_db.get("admin_chat_id")
                teacher_name = body.get("teacher_name") or "SAT Admin"
                add_group(legacy_db, name, code, schedule, teacher_id, teacher_name)
                return self.send_json(201, {"ok": True, "group": new_grp, "id": new_grp["id"], "name": new_grp["name"]})
            except Exception as e:
                return self.send_json(500, {"ok": False, "error": str(e)})

        # POST /api/students - Register or add student
        if clean_path == "/api/students":
            telegram_id = body.get("telegram_id")
            display_name = body.get("display_name") or body.get("name")
            group_id = body.get("group_id") or body.get("class")
            username = body.get("telegram_username") or body.get("username")

            if not telegram_id or not display_name or not group_id:
                return self.send_json(400, {"ok": False, "error": "telegram_id, display_name, and group_id are required"})

            try:
                # Check group existence
                grp = rdb.get_group(group_id)
                if not grp:
                    return self.send_json(404, {"ok": False, "error": f"Group '{group_id}' not found"})
                student = rdb.upsert_student(
                    telegram_id=int(telegram_id),
                    display_name=display_name,
                    group_id=grp["id"],
                    telegram_username=username
                )
                # Sync to legacy db
                legacy_db = load_db()
                save_and_register_student(legacy_db, telegram_id, display_name, username, grp["name"])
                return self.send_json(201, {"ok": True, "student": student})
            except Exception as e:
                return self.send_json(500, {"ok": False, "error": str(e)})

        # POST /api/students/:id/test-results - Record test result
        m_stu_test = re.match(r"^/api/students/([^/]+)/test-results$", clean_path)
        if m_stu_test:
            student_id = m_stu_test.group(1)
            student = rdb.get_student(student_id)
            if not student:
                return self.send_json(404, {"ok": False, "error": f"Student '{student_id}' not found"})

            group_id = body.get("group_id") or student["group_id"]
            total_score = body.get("total_score")
            rw_score = body.get("rw_score", 0)
            math_score = body.get("math_score", 0)

            if total_score is None:
                return self.send_json(400, {"ok": False, "error": "total_score is required"})

            try:
                res = rdb.record_test_result(
                    student_id=student["id"],
                    group_id=group_id,
                    total_score=int(total_score),
                    rw_score=int(rw_score),
                    math_score=int(math_score)
                )
                return self.send_json(201, {"ok": True, "test_result": res})
            except Exception as e:
                return self.send_json(500, {"ok": False, "error": str(e)})

        # POST /api/students/:id/solved-questions - Record solved questions
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

        # POST /api/qbank/record-attempt - Record practice attempt
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

        # Existing POST /api/report
        if clean_path == "/api/report":
            report = body
            db = load_db()
            cfg = load_config()
            db.setdefault("reports", []).append(report)
            save_db(db)

            # Record into relational test_results if student matches
            try:
                student_name = report.get("studentName", "").strip()
                student_group = report.get("studentClass", "").strip()
                grp = rdb.get_group(student_group)
                if grp:
                    students = rdb.get_group_students(grp["id"]) or []
                    matching = [s for s in students if s["display_name"].lower() == student_name.lower()]
                    if matching:
                        target_student = matching[0]
                        pct = float(report.get("scorePct", 0))
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
            except Exception as err:
                print(f"Report relational sync note: {err}")

            # Group report routing & Telegram notification
            student_group_name = report.get("studentClass", "").strip().lower()
            target_teacher_chat = None
            for g in db.get("groups", []):
                if g.get("name", "").strip().lower() == student_group_name:
                    target_teacher_chat = g.get("teacher_id")
                    break

            admin_chat_id = str(cfg.get("admin_chat_id") or db.get("admin_chat_id") or "7957347033")
            token = cfg.get("bot_token")
            bot_client = TelegramBotClient(token) if token else None

            if bot_client:
                rep_id = report.get("id") or f"vrep_{int(time.time() * 1000)}"
                report["id"] = rep_id
                summary_text = report.get("telegramSummaryText") or format_vocab_summary_text(report)
                reply_markup = {
                    "inline_keyboard": [
                        [{"text": "ℹ️ More Information", "callback_data": f"vrep_more:{rep_id}"}]
                    ]
                }
                # Deliver to group teacher
                if target_teacher_chat and str(target_teacher_chat) != admin_chat_id:
                    try:
                        bot_client.send_message(int(target_teacher_chat), summary_text, reply_markup=reply_markup)
                    except Exception:
                        pass
                # Deliver to Admin
                if admin_chat_id:
                    try:
                        bot_client.send_message(int(admin_chat_id), summary_text, reply_markup=reply_markup)
                    except Exception:
                        pass

            return self.send_json(200, {"ok": True})
        # --- New Homework API endpoints ---
        if clean_path == "/api/homework":
            # Create a new homework assignment
            required = ["title", "type", "created_by"]
            missing = [k for k in required if not body.get(k)]
            if missing:
                return self.send_json(400, {"ok": False, "error": f"Missing fields: {', '.join(missing)}"})
            title = body["title"]
            hw_type = body["type"]
            group_id = body.get("group_id")
            group_name = body.get("group_name") or body.get("className")
            student_id = body.get("student_id")
            cfg = body.get("config") if isinstance(body.get("config"), dict) else {}
            deadline = body.get("deadline")
            created_by = body["created_by"]
            try:
                assignment = rdb.create_homework_assignment(
                    title=title,
                    hw_type=hw_type,
                    group_id=group_id or group_name or "All Students",
                    student_id=student_id,
                    config=cfg,
                    deadline=deadline,
                    created_by=created_by,
                )

                # Send Telegram notification to target students through the bot
                bot_token = os.environ.get("TELEGRAM_BOT_TOKEN") or "8645843963:AAE_UtukrhBqPZL1Ksvnu5rlZOQHuPSn6IQ"

                if bot_token:
                    try:
                        # Strictly retrieve target students: single student, specific group cohort, or all
                        if student_id:
                            single_stu = rdb.get_student(student_id)
                            students = [single_stu] if single_stu else []
                        else:
                            students = rdb.get_students_by_group_or_all(group_id=group_id, group_name=group_name)

                        type_label = (
                            "📚 SAT Vocabulary Practice" if hw_type == "vocab"
                            else ("📖 Digital SAT Question Bank" if hw_type == "qbank" else "📝 Digital SAT Practice Drill")
                        )

                        # Question count
                        raw_count = (
                            cfg.get("question_count")
                            or cfg.get("qCount")
                            or body.get("question_count")
                            or (len(cfg.get("questionIds", [])) if cfg.get("questionIds") else None)
                            or (len(body.get("questionIds", [])) if body.get("questionIds") else None)
                            or (20 if hw_type == "vocab" else (cfg.get("count") or 10))
                        )
                        q_count_text = f"{raw_count} questions" if raw_count else "10 questions"

                        # Time limit
                        timer_val = cfg.get("timer") or cfg.get("timeLimitMinutes") or body.get("timeLimitMinutes")
                        timer_text = f"{timer_val} mins" if timer_val else "Flexible / No limit"

                        # Deadline
                        dl_text = "Flexible / No deadline"
                        if deadline:
                            dl_str = str(deadline)
                            if "T" in dl_str:
                                try:
                                    d_obj = datetime.fromisoformat(dl_str.replace("Z", "+00:00"))
                                    dl_text = d_obj.strftime("%b %d, %Y %I:%M %p")
                                except Exception:
                                    dl_text = dl_str
                            else:
                                dl_text = dl_str

                        group_label = group_name or body.get("className") or str(group_id or "Assigned Class")
                        if str(group_label).strip().lower() in ("all", "all students", "everyone", "all classes"):
                            group_label = "All Students"

                        notify_text = (
                            "🔔 <b>NEW HOMEWORK ON THE WEBSITE!</b>\n"
                            "━━━━━━━━━━━━━━━━━━━━━━\n"
                            "You have new homework on the website. Please move on to it and solve it!\n\n"
                            f"📝 <b>Task:</b> {title}\n"
                            f"📚 <b>Type:</b> {type_label}\n"
                            f"🏫 <b>Class:</b> {group_label}\n"
                            f"🔢 <b>Questions:</b> {q_count_text}\n"
                            f"⏳ <b>Time Limit:</b> {timer_text}\n"
                            f"📅 <b>Deadline:</b> {dl_text}\n"
                            "━━━━━━━━━━━━━━━━━━━━━━\n"
                            "🔗 <b>Direct Link:</b> https://satmaster-w58j.vercel.app\n"
                            "<i>Tap the button below to launch your homework on the website:</i>"
                        )

                        target_chat_ids = set()
                        student_map = {}
                        for stu in (students or []):
                            tg_id = stu.get("telegram_id")
                            if tg_id:
                                try:
                                    student_map[int(tg_id)] = stu
                                except Exception:
                                    pass

                        print(f"[Telegram Notify] Sending new homework alert to {len(student_map)} student(s): {list(student_map.keys())}")

                        for cid, s_info in student_map.items():
                            try:
                                s_id = s_info.get("id") or f"TG{cid}"
                                s_name = s_info.get("display_name") or s_info.get("name") or "Student"
                                s_group = s_info.get("group_name") or group_name or "SAT Masters 2026"
                                query = urllib.parse.urlencode({
                                    "role": "student",
                                    "uid": s_id,
                                    "name": s_name,
                                    "class": s_group
                                })
                                student_link = f"https://satmaster-w58j.vercel.app/index.html?{query}"

                                send_url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
                                payload = {
                                    "chat_id": cid,
                                    "text": notify_text,
                                    "parse_mode": "HTML",
                                    "reply_markup": {
                                        "inline_keyboard": [
                                            [{"text": "🚀 Open Homework on Website", "url": student_link}]
                                        ]
                                    }
                                }
                                req = urllib.request.Request(
                                    send_url,
                                    data=json.dumps(payload).encode("utf-8"),
                                    headers={"Content-Type": "application/json"}
                                )
                                with urllib.request.urlopen(req, timeout=5) as t_resp:
                                    res_raw = t_resp.read().decode("utf-8")
                                    print(f"[Telegram Notify Success for {cid}]: {res_raw[:100]}")
                            except urllib.error.HTTPError as h_err:
                                err_details = h_err.read().decode("utf-8") if hasattr(h_err, "read") else str(h_err)
                                print(f"[Telegram Notify HTTPError {h_err.code} for {cid}]: {err_details}")
                            except Exception as send_err:
                                print(f"[Telegram Notify Error for {cid}]: {send_err}")
                    except Exception as notify_err:
                        print(f"[Telegram Batch Notify Error]: {notify_err}")

                return self.send_json(201, {"ok": True, "assignment": assignment})
            except Exception as e:
                return self.send_json(500, {"ok": False, "error": str(e)})

        if clean_path == "/api/homework/submit":
            # Record a homework submission
            required = ["homework_id", "student_id", "student_name", "score_pct", "correct_count", "total_questions"]
            missing = [k for k in required if body.get(k) is None]
            if missing:
                return self.send_json(400, {"ok": False, "error": f"Missing fields: {', '.join(missing)}"})
            hw_id = body["homework_id"]
            student_id = body["student_id"]
            student_name = body["student_name"]
            score_pct = body["score_pct"]
            correct_count = body["correct_count"]
            total_questions = body["total_questions"]
            time_spent = body.get("time_spent_seconds", 0)
            details = body.get("details", {})
            try:
                submission = rdb.record_homework_submission(
                    homework_id=hw_id,
                    student_id=student_id,
                    student_name=student_name,
                    score_pct=score_pct,
                    correct_count=correct_count,
                    total_questions=total_questions,
                    is_passed=None,  # DB will compute pass based on thresholds
                    time_spent_seconds=time_spent,
                )
                # Generate Telegram report
                assignment = rdb.get_homework_assignment(hw_id)
                if assignment:
                    summary = format_homework_submission_summary_text(assignment, submission)
                    cfg = load_config()
                    admin_chat_id = str(cfg.get("admin_chat_id") or db.get("admin_chat_id") or "7957347033")
                    token = cfg.get("bot_token")
                    bot_client = TelegramBotClient(token) if token else None
                    if bot_client:
                        reply_markup = {
                            "inline_keyboard": [
                                [{"text": "ℹ️ More Information", "callback_data": f"hwsub_more:{submission['id']}"}]
                            ]
                        }
                        target_teacher = assignment.get("created_by")
                        if target_teacher and str(target_teacher) != admin_chat_id:
                            try:
                                bot_client.send_message(int(target_teacher), summary, reply_markup=reply_markup)
                            except Exception:
                                pass
                        try:
                            bot_client.send_message(int(admin_chat_id), summary, reply_markup=reply_markup)
                        except Exception:
                            pass
                return self.send_json(200, {"ok": True, "submission_id": submission["id"]})
            except Exception as e:
                return self.send_json(500, {"ok": False, "error": str(e)})
        # Fallback for unknown POST endpoints
        return self.send_json(404, {"ok": False, "error": "Endpoint not found"})

        return self.send_json(404, {"ok": False, "error": "Endpoint not found"})

    def do_DELETE(self):
        parsed_path = urllib.parse.urlparse(self.path)
        clean_path = parsed_path.path.rstrip("/")

        # 3. DELETE /api/groups/:id - Delete a group (triggers CASCADE delete for all students and test records)
        m_del_group = re.match(r"^/api/groups/([^/]+)$", clean_path)
        if m_del_group:
            qs = urllib.parse.parse_qs(parsed_path.query)
            if not is_admin_request(self.headers, qs):
                return self.send_json(403, {"ok": False, "error": "Admin privileges required"})

            group_id = m_del_group.group(1)
            try:
                cleanup_group_students_and_messages(None, group_id)
                deleted = rdb.delete_group(group_id)
                if not deleted:
                    return self.send_json(404, {"ok": False, "error": f"Group '{group_id}' not found"})
                # Sync delete to legacy JSON db
                legacy_db = load_db()
                delete_group(legacy_db, group_id)
                return self.send_json(200, {
                    "ok": True,
                    "message": "Group and all associated students and test records deleted successfully via CASCADE",
                    "deleted": deleted
                })
            except Exception as e:
                return self.send_json(500, {"ok": False, "error": str(e)})

        # 6. DELETE /api/students/:id - Hard-delete a student and all their test history
        m_del_student = re.match(r"^/api/students/([^/]+)$", clean_path)
        if m_del_student:
            student_id = m_del_student.group(1)
            try:
                cleanup_student_session_and_messages(None, student_id)
                deleted = rdb.delete_student(student_id)
                if not deleted:
                    return self.send_json(404, {"ok": False, "error": f"Student '{student_id}' not found"})
                # Sync delete to legacy JSON db
                legacy_db = load_db()
                students = legacy_db.get("students", {})
                for uid in list(students.keys()):
                    if uid == student_id or students[uid].get("student_id") == student_id or str(students[uid].get("telegram_id")) == str(deleted.get("telegram_id")):
                        del students[uid]
                save_db(legacy_db)
                return self.send_json(200, {
                    "ok": True,
                    "message": "Student and test history hard-deleted successfully via CASCADE",
                    "deleted": deleted
                })
            except Exception as e:
                return self.send_json(500, {"ok": False, "error": str(e)})

        # 7. DELETE /api/homework/:id or /api/assignments/:id - Delete homework assignment
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

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True
    allow_reuse_address = True

def run_local_web_server(port=None):
    """
    Run internal threaded HTTP server bound to 0.0.0.0 on the port from $PORT (default 8080).
    Ensures compatibility with Render cloud hosting dynamic port assignment.
    """
    if port is None:
        try:
            port = int(os.environ.get("PORT", 8080))
        except (ValueError, TypeError):
            port = 8080
    else:
        try:
            port = int(port)
        except (ValueError, TypeError):
            port = 8080

    host = "0.0.0.0"
    print(f"🌐 Threaded HTTP Server starting on http://{host}:{port} (PORT={port})...")
    try:
        server = ThreadedHTTPServer((host, port), SATMasterHandler)
        print(f"✅ Threaded HTTP Server successfully listening on http://{host}:{port}")
        server.serve_forever()
    except Exception as e:
        print(f"⚠️ Threaded HTTP Server on {host}:{port} encountered an error: {e}")

def main():
    if "--test" in sys.argv:
        print("Running SATMaster Telegram Bot self-tests...")
        cfg = load_config()
        db = load_db()
        test_link = generate_student_link("http://localhost:8000/index.html", "TG12345", "Test Student", "SAT Math 2026")
        assert "role=student" in test_link
        assert "uid=TG12345" in test_link
        assert "name=Test+Student" in test_link
        teacher_link = generate_teacher_link("http://localhost:8000/index.html")
        assert "role=teacher" in teacher_link

        # Test state persistence
        set_user_state("TEST_USER_999", {"role": "student", "step": "STUDENT_WAITING_GROUP", "data": {"name": "Test Runner"}})
        states_disk = load_user_states()
        assert "TEST_USER_999" in states_disk
        assert states_disk["TEST_USER_999"]["data"]["name"] == "Test Runner"
        clear_user_state("TEST_USER_999")
        states_cleared = load_user_states()
        assert "TEST_USER_999" not in states_cleared

        # Test simulated message handling
        class MockBot:
            def __init__(self):
                self.sent_messages = []
                self.deleted_messages = []
            def send_message(self, chat_id, text, reply_markup=None, parse_mode="HTML"):
                msg = {"chat_id": chat_id, "text": text, "reply_markup": reply_markup}
                self.sent_messages.append(msg)
                return {"ok": True, "result": {"message_id": 1000 + len(self.sent_messages)}}
            def answer_callback_query(self, cq_id):
                return {"ok": True}
            def delete_message(self, chat_id, message_id):
                self.deleted_messages.append({"chat_id": chat_id, "message_id": message_id})
                return {"ok": True}

        # Clean test user before testing
        db["students"].pop("999888", None)
        save_db(db)
        clear_user_state("999888")

        mock_bot = MockBot()
        try:
            # Test Part 3 live database registration & sync flow
            test_grp = rdb.get_group("Test Cohort Bot")
            if not test_grp:
                test_grp = rdb.create_group("Test Cohort Bot")

            # 1. Unregistered student sends /start -> gets mandatory role selection buttons
            update_start = {
                "update_id": 1001,
                "message": {
                    "chat": {"id": 999888},
                    "from": {"id": 999888, "username": "test_tg_user"},
                    "text": "/start"
                }
            }
            handle_update(mock_bot, update_start, cfg, db)
            assert len(mock_bot.sent_messages) > 0
            last_msg = mock_bot.sent_messages[-1]
            assert last_msg["reply_markup"] is not None
            role_cbs = [btn["callback_data"] for row in last_msg["reply_markup"]["inline_keyboard"] for btn in row]
            assert "role_student" in role_cbs
            assert "role_teacher" in role_cbs

            # 2. User selects Student role -> gets active group buttons
            update_role = {
                "update_id": 1002,
                "callback_query": {
                    "id": "cq_role",
                    "from": {"id": 999888, "username": "test_tg_user"},
                    "message": {"chat": {"id": 999888}},
                    "data": "role_student"
                }
            }
            handle_update(mock_bot, update_role, cfg, db)
            last_msg = mock_bot.sent_messages[-1]
            assert last_msg["reply_markup"] is not None
            grp_cbs = [btn["callback_data"] for row in last_msg["reply_markup"]["inline_keyboard"] for btn in row]
            assert f"join_group:{test_grp['id']}" in grp_cbs

            # 3. Student taps group button (join_group:<group_id>)
            update_cb = {
                "update_id": 1003,
                "callback_query": {
                    "id": "cq_123",
                    "from": {"id": 999888, "username": "test_tg_user"},
                    "message": {"chat": {"id": 999888}},
                    "data": f"join_group:{test_grp['id']}"
                }
            }
            handle_update(mock_bot, update_cb, cfg, db)
            assert "999888" in user_states
            assert user_states["999888"]["step"] == "STUDENT_WAITING_NAME"

            # 4. Student enters their Full Name -> saved to satmaster.db
            update_name = {
                "update_id": 1004,
                "message": {
                    "chat": {"id": 999888},
                    "from": {"id": 999888, "username": "test_tg_user"},
                    "text": "Nodirbek Aliyev"
                }
            }
            handle_update(mock_bot, update_name, cfg, db)
            reg_student = rdb.get_student(999888)
            assert reg_student is not None
            assert reg_student["display_name"] == "Nodirbek Aliyev"
            assert reg_student["group_id"] == test_grp["id"]
            assert "999888" not in user_states

            # 5. Student updates their name via /name
            update_rename = {
                "update_id": 1005,
                "message": {
                    "chat": {"id": 999888},
                    "from": {"id": 999888, "username": "test_tg_user"},
                    "text": "/name Nodirbek A. Aliyev"
                }
            }
            handle_update(mock_bot, update_rename, cfg, db)
            updated = rdb.get_student(999888)
            assert updated["display_name"] == "Nodirbek A. Aliyev"
            assert updated["telegram_username"] == "test_tg_user"

            # 6. Admin deletes the group -> CASCADE deletes student
            delete_group(db, test_grp["id"])
            assert rdb.get_student(999888) is None, "Student must be deleted via cascade"

            # 7. Deleted student taps stale callback button (e.g. relink_student)
            update_stale_cb = {
                "update_id": 1006,
                "callback_query": {
                    "id": "cq_stale",
                    "from": {"id": 999888, "username": "test_tg_user"},
                    "message": {"chat": {"id": 999888}, "message_id": 555},
                    "data": "relink_student"
                }
            }
            handle_update(mock_bot, update_stale_cb, cfg, db)
            last_msg = mock_bot.sent_messages[-1]
            assert "You are not currently enrolled in an active class cohort" in last_msg["text"]
            assert last_msg["reply_markup"] is not None
            cbs = [btn["callback_data"] for row in last_msg["reply_markup"]["inline_keyboard"] for btn in row]
            assert "cmd_start" in cbs
            assert any(d["message_id"] == 555 for d in mock_bot.deleted_messages), "Stale message must be deleted"

            # 8. Deleted student sends command or message -> rejected with enrollment warning
            update_stale_cmd = {
                "update_id": 1007,
                "message": {
                    "chat": {"id": 999888},
                    "from": {"id": 999888, "username": "test_tg_user"},
                    "text": "/myinfo"
                }
            }
            handle_update(mock_bot, update_stale_cmd, cfg, db)
            last_msg = mock_bot.sent_messages[-1]
            assert "You are not currently enrolled in an active class cohort" in last_msg["text"]

            # 9. Deleted student sends /start or taps cmd_start -> runs clean onboarding greeting
            update_clean_start = {
                "update_id": 1008,
                "message": {
                    "chat": {"id": 999888},
                    "from": {"id": 999888, "username": "test_tg_user"},
                    "text": "/start"
                }
            }
            handle_update(mock_bot, update_clean_start, cfg, db)
            last_msg = mock_bot.sent_messages[-1]
            assert "Welcome to SATMaster" in last_msg["text"]
            assert "Already Registered" not in last_msg["text"]
            role_cbs = [btn["callback_data"] for row in last_msg["reply_markup"]["inline_keyboard"] for btn in row]
            assert "role_student" in role_cbs
        finally:
            clear_user_state("999888")
            rdb.delete_student(999888)
            if test_grp:
                rdb.delete_group(test_grp["id"])
            fresh_db = load_db()
            fresh_db["students"].pop("999888", None)
            save_db(fresh_db)

        print("✅ Self-test passed: Link generation, states persistence, dynamic group selection, relational DB upsert, and /name sync all verified!")
        return

    config = load_config()
    db = load_db()

    # Dynamic port resolution for Render cloud hosting (default 8080 or PORT env)
    try:
        http_port = int(os.environ.get("PORT", 8080))
    except (ValueError, TypeError):
        http_port = 8080

    if "--port" in sys.argv:
        try:
            p_idx = sys.argv.index("--port")
            if p_idx + 1 < len(sys.argv):
                http_port = int(sys.argv[p_idx + 1])
        except (ValueError, IndexError):
            pass

    # Start the threaded internal HTTP server concurrently in the background.
    # This ensures Render's dynamic PORT health checks pass immediately on 0.0.0.0
    # and prevents the HTTP server loop from blocking the bot polling loop.
    server_thread = threading.Thread(
        target=run_local_web_server,
        args=(http_port,),
        daemon=True,
        name="SATMaster-HTTP-Server"
    )
    server_thread.start()
    print(f"🌐 Concurrent HTTP Server started in background on http://0.0.0.0:{http_port}")

    token = os.environ.get("BOT_TOKEN") or os.environ.get("TELEGRAM_BOT_TOKEN") or config.get("bot_token")
    if not token and len(sys.argv) > 1 and not sys.argv[1].startswith("--"):
        token = sys.argv[1]
        config["bot_token"] = token
        save_config(config)

    if not token:
        print("Error: No bot token provided in bot_config.json or environment")
        sys.exit(1)

    bot = TelegramBotClient(token)
    me = bot.get_me()
    if not me.get("ok"):
        print(f"⚠️ Telegram connect attempt 1 returned: {me.get('description', 'Error')}. Retrying...")
        for attempt in range(2, 6):
            time.sleep(2)
            me = bot.get_me()
            if me.get("ok"):
                break

    if not me.get("ok"):
        print(f"❌ Failed to connect to Telegram after retries: {me.get('description')}")
        print("Please check your Bot Token or internet connection.")
        if os.environ.get("PORT"):
            print("⚠️ Keeping process alive for Render HTTP server health checks...")
            while True:
                time.sleep(60)
        sys.exit(1)

    bot_info = me.get("result", {})
    bot_username = bot_info.get("username", "UnknownBot")
    config["bot_username"] = bot_username
    save_config(config)

    print(f"✅ Connected to Telegram Bot: @{bot_username} ({bot_info.get('first_name')})")
    print(f"🤖 Bot is now live and waiting for student registrations!")
    print(f"👉 Students: Open @{bot_username} and send /start")
    print(f"👉 Teacher: Select 'I am a Teacher' or send /admin {config.get('admin_password', 'satmaster2026')}")
    print("=" * 60)

    last_offset = None
    executor = ThreadPoolExecutor(max_workers=8, thread_name_prefix="tg_worker")
    print("🚀 Bot is live with sub-second instant response!")
    while True:
        try:
            updates_res = bot.get_updates(offset=last_offset, timeout=15)
            if updates_res.get("ok"):
                results = updates_res.get("result", [])
                for upd in results:
                    last_offset = upd["update_id"] + 1
                    def _safe_handle(u=upd):
                        try:
                            handle_update(bot, u, config, db)
                        except Exception as err:
                            import traceback
                            print(f"❌ Error handling update {u.get('update_id')}: {err}")
                            traceback.print_exc()
                    executor.submit(_safe_handle)
            else:
                desc = updates_res.get("description", "")
                if "Conflict" in desc:
                    print("⚠️ Another bot instance is polling Telegram! Waiting 5s...")
                    time.sleep(5)
                else:
                    time.sleep(1)
        except KeyboardInterrupt:
            print("\nShutting down bot.")
            break
        except Exception as e:
            print(f"Loop notice: {e}")
            time.sleep(1)

if __name__ == "__main__":
    main()
