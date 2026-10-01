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
import threading
from http.server import SimpleHTTPRequestHandler, HTTPServer
from datetime import datetime

CONFIG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "bot_config.json")
DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "students_db.json")

# In case it is run from another working directory
if not os.path.exists(CONFIG_FILE):
    CONFIG_FILE = os.path.join("/Users/macpro/Documents/new project", "bot_config.json")
if not os.path.exists(DB_FILE):
    DB_FILE = os.path.join("/Users/macpro/Documents/new project", "students_db.json")

DEFAULT_CONFIG = {
    "bot_token": "8645843963:AAE_UtukrhBqPZL1Ksvnu5rlZOQHuPSn6IQ",
    "bot_username": "Ahrorbek_SAT_bot",
    "admin_chat_id": "7957347033",
    "admin_password": "satmaster2026",
    "web_app_url": "http://127.0.0.1:8000/index.html"
}

def load_config():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                cfg = json.load(f)
                return {**DEFAULT_CONFIG, **cfg}
        except Exception:
            pass
    return DEFAULT_CONFIG.copy()

def save_config(cfg):
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2)

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

def add_group(db, name, code=None, schedule="", teacher_id=None, teacher_name=None):
    clean_name = name.strip()
    groups = db.setdefault("groups", [])
    for g in groups:
        if g.get("name", "").strip().lower() == clean_name.lower():
            return g, False
    if not code:
        code = f"GRP-{len(groups)+1}"
    group_id = f"grp_{int(time.time()*1000)}"
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
    clean_id = str(identifier).strip().lower()
    groups = db.get("groups", [])
    removed = []
    kept = []
    for g in groups:
        if g.get("id", "").lower() == clean_id or g.get("name", "").strip().lower() == clean_id or g.get("code", "").lower() == clean_id:
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
    return student_record

class TelegramBotClient:
    def __init__(self, token):
        self.token = token
        self.base_url = f"https://api.telegram.org/bot{token}"

    def request(self, method, payload=None, timeout=6):
        url = f"{self.base_url}/{method}"
        headers = {"Content-Type": "application/json"}
        data = json.dumps(payload).encode("utf-8") if payload else None
        req = urllib.request.Request(url, data=data, headers=headers)
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

    def get_updates(self, offset=None, timeout=0):
        params = {"timeout": timeout}
        if offset is not None:
            params["offset"] = offset
        return self.request("getUpdates", params, timeout=6)

    def send_message(self, chat_id, text, reply_markup=None, parse_mode="HTML"):
        payload = {
            "chat_id": chat_id,
            "text": text
        }
        if parse_mode:
            payload["parse_mode"] = parse_mode
        if reply_markup:
            payload["reply_markup"] = reply_markup
        res = self.request("sendMessage", payload, timeout=6)
        if not res.get("ok") and parse_mode:
            # If HTML parsing failed, retry immediately as plain text!
            payload.pop("parse_mode", None)
            res = self.request("sendMessage", payload, timeout=6)
        if not res.get("ok"):
            print(f"⚠️ Failed to send message to {chat_id}: {res.get('description')}")
        return res

    def answer_callback_query(self, callback_query_id, text=None):
        payload = {"callback_query_id": callback_query_id}
        if text:
            payload["text"] = text
        return self.request("answerCallbackQuery", payload, timeout=5)

user_states = {}

def make_url_button(label, url):
    """Telegram inline buttons strictly require https for web_app. For http, use url."""
    if url.startswith("https://"):
        return {"text": label, "web_app": {"url": url}}
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
                {"text": "👨‍🏫 I am a Teacher (Admin)", "callback_data": "role_teacher"}
            ]
        ]
    }
    msg = custom_text or (
        "🎓 <b>Welcome to SATMaster!</b>\n\n"
        "Please select your role to get your access link:"
    )
    bot.send_message(chat_id, msg, reply_markup=keyboard)

def ask_student_group_buttons(bot, chat_id, name, db, username=None):
    groups = db.get("groups", [])
    if not groups:
        msg = (
            f"👤 Student: <b>{name}</b>\n\n"
            "⚠️ <b>No Active Groups Available Yet</b>\n\n"
            "The SAT Administrator has not created any class groups on the platform yet.\n\n"
            "👉 Please contact your SAT teacher or admin to create your group on the website first, then send /start again."
        )
        keyboard = {
            "inline_keyboard": [
                [{"text": "🔄 Check Again", "callback_data": "role_student"}]
            ]
        }
        bot.send_message(chat_id, msg, reply_markup=keyboard)
        return False

    buttons = []
    row = []
    for g in groups:
        btn_text = f"🏫 {g['name']}"
        row.append({"text": btn_text, "callback_data": f"grp_{g['id']}"})
        if len(row) == 2:
            buttons.append(row)
            row = []
    if row:
        buttons.append(row)

    keyboard = {"inline_keyboard": buttons}
    user_info = f" (@{username})" if username else ""
    msg = (
        "🎓 <b>Student Registration (Step 3 of 3)</b>\n\n"
        f"👤 Student: <b>{name}</b>{user_info}\n\n"
        "👉 <b>What is your group?</b>\n"
        "Please select your class group below:\n"
        "<i>(Only official groups created by the teacher/admin on the platform are allowed)</i>"
    )
    bot.send_message(chat_id, msg, reply_markup=keyboard)
    return True

def send_student_hub(bot, chat_id, student_record, config, is_welcome_back=False):
    base_url = config.get("web_app_url", "http://127.0.0.1:8000/index.html")
    name = student_record.get("name", "Student")
    student_id = student_record.get("student_id", f"TG{chat_id}")
    class_name = student_record.get("class", "Group A")
    username = student_record.get("username", "")

    student_link = generate_student_link(base_url, student_id, name, class_name)

    greeting = f"👋 <b>Welcome back, {name}!</b>" if is_welcome_back else f"🎉 <b>Registration Complete, {name}!</b>"
    user_str = f"👤 <b>Telegram:</b> @{username}\n" if username else ""

    msg = (
        f"{greeting}\n\n"
        f"🏫 <b>Class Group:</b> <b>{class_name}</b>\n"
        f"{user_str}"
        f"🆔 <b>Student ID:</b> <code>#{student_id}</code>\n\n"
        "✅ You are enrolled in your official SAT homework and practice cohort.\n\n"
        "👉 Click below to access your tests and assignments directly:"
    )

    keyboard = {
        "inline_keyboard": [
            [make_url_button("🚀 Open SAT Student Portal →", student_link)],
            [{"text": "🔄 Refresh Portal Link", "callback_data": "relink_student"}]
        ]
    }
    bot.send_message(chat_id, msg, reply_markup=keyboard)


def send_admin_hub(bot, chat_id, config, db):
    admin_link = generate_teacher_link(
        config.get("web_app_url", "http://127.0.0.1:8000/index.html"),
        "SAT Admin (Owner)"
    ) + "&admin=true"
    groups = db.get("groups", [])
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
    keyboard = {
        "inline_keyboard": [
            [make_url_button("👑 Open Admin Platform Portal →", admin_link)],
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
        ]
    }
    bot.send_message(chat_id, msg, reply_markup=keyboard)

def send_teacher_hub(bot, chat_id, teacher_record, config, db):
    teacher_name = teacher_record.get("name", "SAT Instructor")
    assigned_group = teacher_record.get("group")
    teacher_link = generate_teacher_link(
        config.get("web_app_url", "http://127.0.0.1:8000/index.html"),
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
    keyboard = {
        "inline_keyboard": [
            [make_url_button("👨‍🏫 Open Teacher Workspace →", teacher_link)],
            [
                {"text": "👥 My Students", "callback_data": "cmd_students"},
                {"text": "📊 My Group Stats", "callback_data": "cmd_stats"}
            ]
        ]
    }
    bot.send_message(chat_id, msg, reply_markup=keyboard)

def handle_update(bot, update, config, db):
    callback = update.get("callback_query")
    admin_chat_id = str(config.get("admin_chat_id") or db.get("admin_chat_id") or "7957347033")

    if callback:
        cq_id = callback.get("id")
        from_user = callback.get("from", {})
        user_id = str(from_user.get("id"))
        chat_id = callback.get("message", {}).get("chat", {}).get("id", int(user_id))
        data = callback.get("data", "")
        is_admin = (str(user_id) == admin_chat_id or str(chat_id) == admin_chat_id)

        bot.answer_callback_query(cq_id)

        if data == "role_student":
            if user_id in db.get("students", {}):
                student_record = db["students"][user_id]
                bot.send_message(
                    chat_id,
                    f"🎓 You are already registered as <b>{student_record['name']}</b>"
                    + (f" (@{student_record['username']})" if student_record.get('username') else "")
                    + f" in <b>{student_record.get('class', 'Unassigned')}</b>.\n"
                    "Each Telegram account can only register once with one name."
                )
                send_student_hub(bot, chat_id, student_record, config, is_welcome_back=True)
                return

            # Check if groups exist before asking for name
            groups = db.get("groups", [])
            if not groups:
                msg = (
                    "⚠️ <b>No Active Groups Available Yet</b>\n\n"
                    "The SAT Administrator has not created any class groups on the platform yet.\n\n"
                    "👉 Please ask your SAT teacher or admin to create your class group on the website first, then send /start again."
                )
                keyboard = {
                    "inline_keyboard": [
                        [{"text": "🔄 Check Again", "callback_data": "role_student"}]
                    ]
                }
                bot.send_message(chat_id, msg, reply_markup=keyboard)
                return

            user_states[user_id] = {"role": "student", "step": "STUDENT_WAITING_NAME", "data": {}}
            msg = (
                "🎓 <b>Student Registration (Step 1 of 3)</b>\n\n"
                "👉 <b>Please enter your Full Name:</b>\n"
                "<i>(e.g., Cristiano Ronaldo, Alex Chen)</i>"
            )
            bot.send_message(chat_id, msg)
            return

        if data.startswith("grp_"):
            target_id = data[4:].strip()
            groups = db.get("groups", [])
            matched = next((g for g in groups if g.get("id") == target_id or g.get("name") == target_id), None)
            group_name = matched.get("name") if matched else target_id

            if user_id in db.get("students", {}):
                student_record = db["students"][user_id]
                bot.send_message(
                    chat_id,
                    f"🎓 You are already registered as <b>{student_record['name']}</b> in <b>{student_record.get('class', 'Unassigned')}</b>."
                )
                send_student_hub(bot, chat_id, student_record, config, is_welcome_back=True)
                return

            state = user_states.get(user_id, {})
            name = state.get("data", {}).get("name")
            username = state.get("data", {}).get("username", "")

            if not name:
                bot.send_message(chat_id, "⚠️ Please start your registration by sending your Full Name:")
                user_states[user_id] = {"role": "student", "step": "STUDENT_WAITING_NAME", "data": {}}
                return

            student_record = save_and_register_student(db, user_id, name, username, group_name)
            user_states.pop(user_id, None)

            # Send student link immediately!
            send_student_hub(bot, chat_id, student_record, config, is_welcome_back=False)

            # Notify Admin & Group Teacher
            teacher_chat_id = str(matched.get("teacher_id") or "") if matched else ""

            admin_msg = (
                "🔔 <b>New Student Registered:</b>\n"
                f"• Name: <b>{name}</b>\n"
                f"• Username: @{username}\n"
                f"• Group: <b>{group_name}</b>\n"
                f"• ID: <code>#{student_record['student_id']}</code>"
            )

            if admin_chat_id and admin_chat_id != str(chat_id):
                try:
                    bot.send_message(int(admin_chat_id), admin_msg)
                except Exception:
                    pass

            if teacher_chat_id and teacher_chat_id != admin_chat_id and teacher_chat_id != str(chat_id):
                try:
                    bot.send_message(int(teacher_chat_id), f"🎓 <b>New Student in your group ({group_name}):</b>\n• {name} (@{username}) — ID: #{student_record['student_id']}")
                except Exception:
                    pass
            return

        if data == "relink_student":
            if user_id in db.get("students", {}):
                send_student_hub(bot, chat_id, db["students"][user_id], config, is_welcome_back=True)
            else:
                send_role_selection(bot, chat_id)
            return

        if data == "role_teacher":
            user_states[user_id] = {"role": "teacher", "step": "TEACHER_WAITING_NAME", "data": {}}
            msg = (
                "👨‍🏫 <b>Teacher Registration</b>\n\n"
                "👉 <b>Please enter your Full Name & Title:</b>\n"
                "<i>(e.g., Mr. Ahrorbek, Ms. Davis)</i>"
            )
            bot.send_message(chat_id, msg)
            return

        if data == "reset_role":
            user_states[user_id] = {"role": "student", "step": "STUDENT_WAITING_NAME", "data": {}}
            bot.send_message(
                chat_id,
                "🔄 <b>Update Student Profile</b>\n\n"
                "👉 Please enter your updated Full Name (or send your existing name):"
            )
            return

        # ADMIN & TEACHER CALLBACKS
        if data == "cmd_groups":
            groups = db.get("groups", [])
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
            groups = db.get("groups", [])
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
            groups = db.get("groups", [])
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
        user_states.pop(user_id, None)
        if is_admin:
            send_admin_hub(bot, chat_id, config, db)
            return
        elif user_id in db.get("teachers", {}):
            send_teacher_hub(bot, chat_id, db["teachers"][user_id], config, db)
            return
        elif user_id in db.get("students", {}):
            send_student_hub(bot, chat_id, db["students"][user_id], config, is_welcome_back=True)
            return
        else:
            send_role_selection(bot, chat_id)
            return

    # 3. Admin-Exclusive Text Commands
    if is_admin:
        if text == "/groups":
            groups = db.get("groups", [])
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
            groups = db.get("groups", [])
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

    if text in ["/register", "/role", "/update"]:
        user_states[user_id] = {"role": "student", "step": "STUDENT_WAITING_NAME", "data": {}}
        bot.send_message(
            chat_id,
            "🔄 <b>Student Registration / Update</b>\n\n"
            "👉 Please enter your Full Name:"
        )
        return

    if text == "/myinfo":
        if is_admin:
            send_admin_hub(bot, chat_id, config, db)
            return
        elif user_id in db.get("students", {}):
            send_student_hub(bot, chat_id, db["students"][user_id], config, is_welcome_back=True)
            return
        elif user_id in db.get("teachers", {}):
            send_teacher_hub(bot, chat_id, db["teachers"][user_id], config, db)
            return
        else:
            bot.send_message(chat_id, "ℹ️ You are not registered yet. Please select your role:")
            send_role_selection(bot, chat_id)
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
            if len(entered_name) < 2:
                bot.send_message(chat_id, "⚠️ Please enter your valid Full Name (at least 2 letters):")
                return

            if user_id in db.get("students", {}):
                existing = db["students"][user_id]
                bot.send_message(
                    chat_id,
                    f"⚠️ <b>This Telegram account is already registered!</b>\n\n"
                    f"You are already registered as <b>{existing['name']}</b>"
                    + (f" (@{existing['username']})" if existing.get('username') else "")
                    + f" in <b>{existing.get('class', 'a group')}</b>.\n\n"
                    "Each Telegram account can only register once. You cannot register with another name."
                )
                send_student_hub(bot, chat_id, existing, config, is_welcome_back=True)
                user_states.pop(user_id, None)
                return

            state["data"]["name"] = entered_name
            state["step"] = "STUDENT_WAITING_USERNAME"

            tg_username = message.get("from", {}).get("username")
            prompt = (
                "🎓 <b>Student Registration (Step 2 of 3)</b>\n\n"
                f"👤 Name: <b>{entered_name}</b>\n\n"
                "👉 <b>Please enter your Telegram @username:</b>\n"
            )
            if tg_username:
                prompt += f"<i>(Detected from your profile: @{tg_username} — you can send this or type your username)</i>"
            else:
                prompt += "<i>(e.g., @cristiano, @alexchen)</i>"
            bot.send_message(chat_id, prompt)
            return

        if step == "STUDENT_WAITING_USERNAME":
            clean_user = text.strip().lstrip("@").lower()
            if len(clean_user) < 2:
                bot.send_message(chat_id, "⚠️ Please enter a valid Telegram username (e.g. <code>@username</code>):")
                return

            # Anti-duplicate: check if this username is already registered to another student!
            for s_uid, s in db.get("students", {}).items():
                s_uname = s.get("username", "").strip().lstrip("@").lower()
                if s_uname == clean_user and str(s_uid) != str(user_id):
                    bot.send_message(
                        chat_id,
                        f"⚠️ <b>This username is already taken!</b>\n\n"
                        f"The Telegram username <code>@{clean_user}</code> is already registered to <b>{s.get('name')}</b> in <b>{s.get('class')}</b>.\n\n"
                        "You cannot register with an already registered username under another name. Please enter your own unique Telegram @username:"
                    )
                    return

            state["data"]["username"] = clean_user
            state["step"] = "STUDENT_WAITING_GROUP"
            ask_student_group_buttons(bot, chat_id, state["data"]["name"], db, clean_user)
            return

        if step == "STUDENT_WAITING_GROUP":
            entered_group = text.strip()
            groups = db.get("groups", [])
            matched = next((g for g in groups if g.get("name", "").strip().lower() == entered_group.lower() or g.get("code", "").strip().lower() == entered_group.lower()), None)
            if not matched:
                bot.send_message(
                    chat_id,
                    f"❌ <b>'{entered_group}' is not an available class group.</b>\n\n"
                    "If you do not tell which official group you are in, you cannot enter.\n\n"
                    "👉 Please choose one of the available groups below:"
                )
                ask_student_group_buttons(bot, chat_id, state["data"].get("name", "Student"), db, state["data"].get("username"))
                return

            group_name = matched["name"]
            name = state["data"].get("name", "Student")
            username = state["data"].get("username", "")

            student_record = save_and_register_student(db, user_id, name, username, group_name)
            user_states.pop(user_id, None)

            send_student_hub(bot, chat_id, student_record, config, is_welcome_back=False)

            teacher_chat_id = str(matched.get("teacher_id") or "")
            admin_msg = (
                "🔔 <b>New Student Registered:</b>\n"
                f"• Name: <b>{name}</b>\n"
                f"• Username: @{username}\n"
                f"• Group: <b>{group_name}</b>\n"
                f"• ID: <code>#{student_record['student_id']}</code>"
            )
            if admin_chat_id and admin_chat_id != str(chat_id):
                try:
                    bot.send_message(int(admin_chat_id), admin_msg)
                except Exception:
                    pass
            if teacher_chat_id and teacher_chat_id != admin_chat_id and teacher_chat_id != str(chat_id):
                try:
                    bot.send_message(int(teacher_chat_id), f"🎓 <b>New Student in your group ({group_name}):</b>\n• {name} (@{username}) — ID: #{student_record['student_id']}")
                except Exception:
                    pass
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

    # 6. Fallback
    if is_admin:
        send_admin_hub(bot, chat_id, config, db)
    elif user_id in db.get("students", {}):
        send_student_hub(bot, chat_id, db["students"][user_id], config, is_welcome_back=True)
    elif user_id in db.get("teachers", {}):
        send_teacher_hub(bot, chat_id, db["teachers"][user_id], config, db)
    else:
        send_role_selection(bot, chat_id)

def run_local_web_server(port=8000):
    directory = os.path.dirname(os.path.abspath(__file__))

    class SATMasterHandler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=directory, **kwargs)

        def log_message(self, format, *args):
            pass

        def send_cors_headers(self):
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

        def do_OPTIONS(self):
            self.send_response(200)
            self.send_cors_headers()
            self.end_headers()

        def do_GET(self):
            parsed_path = urllib.parse.urlparse(self.path)
            if parsed_path.path == "/api/groups":
                db = load_db()
                groups = db.get("groups", [])
                students = db.get("students", {})
                for g in groups:
                    g_name = g.get("name", "").strip().lower()
                    g["student_count"] = sum(1 for s in students.values() if s.get("class", "").strip().lower() == g_name)
                payload = json.dumps({"ok": True, "groups": groups}).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_cors_headers()
                self.end_headers()
                self.wfile.write(payload)
                return

            if parsed_path.path == "/api/students":
                db = load_db()
                students = list(db.get("students", {}).values())
                qs = urllib.parse.parse_qs(parsed_path.query)
                group_filter = qs.get("group", [None])[0]
                if group_filter:
                    students = [s for s in students if s.get("class", "").strip().lower() == group_filter.strip().lower()]
                payload = json.dumps({"ok": True, "students": students}).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_cors_headers()
                self.end_headers()
                self.wfile.write(payload)
                return

            super().do_GET()

        def do_POST(self):
            parsed_path = urllib.parse.urlparse(self.path)
            content_length = int(self.headers.get("Content-Length", 0))
            post_data = self.rfile.read(content_length)
            try:
                body = json.loads(post_data.decode("utf-8")) if post_data else {}
            except Exception:
                body = {}

            if parsed_path.path == "/api/groups":
                action = body.get("action", "create")
                db = load_db()
                if action == "create":
                    name = body.get("name", "").strip()
                    code = body.get("code", "").strip()
                    schedule = body.get("schedule", "").strip()
                    desc = body.get("description", "").strip()
                    teacher_id = body.get("teacher_id") or db.get("admin_chat_id")
                    teacher_name = body.get("teacher_name") or "SAT Admin"
                    if name:
                        new_grp, created = add_group(db, name, code, schedule, teacher_id, teacher_name)
                        res = {"ok": True, "group": new_grp, "created": created}
                    else:
                        res = {"ok": False, "error": "Name required"}
                elif action == "delete":
                    group_id = body.get("id") or body.get("name")
                    removed = delete_group(db, group_id)
                    res = {"ok": True, "removed": len(removed)}
                else:
                    res = {"ok": False, "error": "Unknown action"}

                payload = json.dumps(res).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_cors_headers()
                self.end_headers()
                self.wfile.write(payload)
                return

            if parsed_path.path == "/api/report":
                report = body
                db = load_db()
                cfg = load_config()
                db.setdefault("reports", []).append(report)
                save_db(db)

                # Group report routing
                student_group = report.get("studentClass", "").strip().lower()
                target_teacher_chat = None
                for g in db.get("groups", []):
                    if g.get("name", "").strip().lower() == student_group:
                        target_teacher_chat = g.get("teacher_id")
                        break

                admin_chat_id = str(cfg.get("admin_chat_id") or db.get("admin_chat_id") or "7957347033")
                token = cfg.get("bot_token")
                bot_client = TelegramBotClient(token) if token else None

                if bot_client:
                    report_text = report.get("telegramText") or (
                        f"📊 [TEST REPORT - {report.get('studentName')}]\n"
                        f"🏫 Group: {report.get('studentClass')}\n"
                        f"Score: {report.get('scorePct')}% ({report.get('correctCount')}/{report.get('totalQuestions')})"
                    )
                    # 1. Deliver to group teacher
                    if target_teacher_chat and str(target_teacher_chat) != admin_chat_id:
                        try:
                            bot_client.send_message(int(target_teacher_chat), f"📊 [GROUP REPORT: {report.get('studentClass')}]\n" + report_text)
                        except Exception:
                            pass
                    # 2. Deliver to Admin
                    if admin_chat_id:
                        try:
                            bot_client.send_message(int(admin_chat_id), f"📊 [ADMIN REPORT: {report.get('studentClass')}]\n" + report_text)
                        except Exception:
                            pass

                payload = json.dumps({"ok": True}).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_cors_headers()
                self.end_headers()
                self.wfile.write(payload)
                return

            self.send_response(404)
            self.end_headers()

    server = HTTPServer(("0.0.0.0", port), SATMasterHandler)
    server.serve_forever()

def main():
    if "--test" in sys.argv:
        print("Running SATMaster Telegram Bot self-tests...")
        cfg = load_config()
        db = load_db()
        test_link = generate_student_link("http://localhost:8000/index.html", "TG12345", "Test Student", "Group A")
        assert "role=student" in test_link
        assert "uid=TG12345" in test_link
        assert "name=Test+Student" in test_link
        teacher_link = generate_teacher_link("http://localhost:8000/index.html")
        assert "role=teacher" in teacher_link
        print("✅ Self-test passed: Link generation, database load/save all functional!")
        return

    config = load_config()
    db = load_db()

    token = config.get("bot_token")
    if not token and len(sys.argv) > 1 and not sys.argv[1].startswith("--"):
        token = sys.argv[1]
        config["bot_token"] = token
        save_config(config)

    if not token:
        print("Error: No bot token provided in bot_config.json")
        sys.exit(1)

    bot = TelegramBotClient(token)
    me = bot.get_me()
    if not me.get("ok"):
        print(f"❌ Failed to connect to Telegram: {me.get('description')}")
        print("Please check your Bot Token.")
        sys.exit(1)

    bot_info = me.get("result", {})
    bot_username = bot_info.get("username", "UnknownBot")
    config["bot_username"] = bot_username
    save_config(config)

    print(f"✅ Connected to Telegram Bot: @{bot_username} ({bot_info.get('first_name')})")

    if "--serve" in sys.argv or "--web" in sys.argv:
        t = threading.Thread(target=run_local_web_server, args=(8000,), daemon=True)
        t.start()
        print("🌐 Local Web Server started at: http://localhost:8000/index.html")

    print(f"🤖 Bot is now live and waiting for student registrations!")
    print(f"👉 Students: Open @{bot_username} and send /start")
    print(f"👉 Teacher: Select 'I am a Teacher' or send /admin {config.get('admin_password', 'satmaster2026')}")
    print("=" * 60)

    last_offset = None
    print("🚀 Bot is live with sub-second instant response!")
    while True:
        try:
            updates_res = bot.get_updates(offset=last_offset, timeout=0)
            if updates_res.get("ok"):
                results = updates_res.get("result", [])
                for upd in results:
                    last_offset = upd["update_id"] + 1
                    try:
                        handle_update(bot, upd, config, db)
                    except Exception as err:
                        print(f"Error handling update {upd.get('update_id')}: {err}")
                if not results:
                    time.sleep(0.35)
            else:
                time.sleep(0.7)
        except KeyboardInterrupt:
            print("\nShutting down bot.")
            break
        except Exception as e:
            print(f"Loop notice: {e}")
            time.sleep(1)

if __name__ == "__main__":
    main()
