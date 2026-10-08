#!/usr/bin/env python3
"""
Test Suite: Relational Database Schema & Core REST API Endpoints
================================================================
Verifies:
1. Strict relational constraints (foreign keys, cascading deletes, unique telegram_id, UUIDs).
2. All 6 REST API endpoints over HTTP:
   - GET /api/groups (with student count)
   - POST /api/groups (creates new group)
   - DELETE /api/groups/:id (cascades to students and test_results)
   - GET /api/groups/:id/students (isolated to group)
   - GET /api/students/:id/history (past test attempts and scores)
   - DELETE /api/students/:id (cascades to test_results)
3. Zero orphaned records verification.
"""

import os
import sys
import json
import time
import uuid
import sqlite3
import threading
import urllib.request
import urllib.error
from http.server import HTTPServer

from database import RelationalDB

TEST_DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_satmaster.db")
TEST_PORT = 8089


import io
from telegram_bot import SATMasterHandler

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


def http_req(method, path, body=None):
    body_bytes = json.dumps(body).encode("utf-8") if body is not None else b""
    headers = [
        f"{method} {path} HTTP/1.1",
        "Host: localhost",
        "Content-Type: application/json",
        f"Content-Length: {len(body_bytes)}",
        "",
        ""
    ]
    raw_req = "\r\n".join(headers).encode("utf-8") + body_bytes
    sock = FakeSocket(raw_req)
    SATMasterHandler(sock, ("127.0.0.1", 12345), None)
    output = sock.output_buffer.getvalue()

    header_part, _, body_part = output.partition(b"\r\n\r\n")
    status_line = header_part.split(b"\r\n")[0].decode("utf-8")
    status_code = int(status_line.split(" ")[1])

    try:
        data = json.loads(body_part.decode("utf-8")) if body_part else {}
    except Exception:
        data = {"raw": body_part.decode("utf-8", errors="replace")}

    return status_code, data


def test_schema_and_direct_cascades():
    print("=" * 60)
    print("TEST 1: Direct Schema & Foreign Key Cascade Verification")
    print("=" * 60)

    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)

    test_db = RelationalDB(TEST_DB_PATH)

    # 1. Check tables exist
    with test_db.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [r[0] for r in cursor.fetchall()]
        assert "groups" in tables, "groups table missing"
        assert "students" in tables, "students table missing"
        assert "test_results" in tables, "test_results table missing"
        print("  [PASS] Tables 'groups', 'students', 'test_results' exist")

        # 2. Check indexes exist
        cursor.execute("SELECT name FROM sqlite_master WHERE type='index'")
        indexes = [r[0] for r in cursor.fetchall()]
        assert "idx_students_group_id" in indexes, "idx_students_group_id missing"
        assert "idx_test_results_student_id" in indexes, "idx_test_results_student_id missing"
        print("  [PASS] Required indexes idx_students_group_id and idx_test_results_student_id exist")

    # 3. Create Group
    grp1 = test_db.create_group("Cohort Alpha")
    assert grp1["id"] and len(grp1["id"]) == 36, "Group ID must be a UUID"
    print(f"  [PASS] Created group: {grp1['name']} ({grp1['id']})")

    # 4. Foreign key constraint: Reject inserting student with non-existent group_id
    fake_group_id = str(uuid.uuid4())
    rejected = False
    try:
        with test_db.get_connection() as conn:
            conn.execute("INSERT INTO students (id, group_id, telegram_id, display_name) VALUES (?, ?, ?, ?)",
                         (str(uuid.uuid4()), fake_group_id, 999999, "Fake Student"))
    except sqlite3.IntegrityError:
        rejected = True
    assert rejected, "Database failed to reject foreign key violation on invalid group_id"
    print("  [PASS] Foreign Key Constraint enforced: rejected student insert with invalid group_id")

    # 5. Insert valid students
    stu1 = test_db.upsert_student(telegram_id=111111, display_name="Alice Smith", group_id=grp1["id"], telegram_username="alices")
    stu2 = test_db.upsert_student(telegram_id=222222, display_name="Bob Jones", group_id=grp1["id"], telegram_username="bobj")
    assert stu1["id"] and len(stu1["id"]) == 36, "Student ID must be a UUID"
    assert stu2["id"] and len(stu2["id"]) == 36, "Student ID must be a UUID"
    print(f"  [PASS] Inserted students: {stu1['display_name']} ({stu1['id']}), {stu2['display_name']} ({stu2['id']})")

    # 6. Insert test results
    res1 = test_db.record_test_result(student_id=stu1["id"], group_id=grp1["id"], total_score=1520, rw_score=760, math_score=760)
    res2 = test_db.record_test_result(student_id=stu1["id"], group_id=grp1["id"], total_score=1550, rw_score=770, math_score=780)
    res3 = test_db.record_test_result(student_id=stu2["id"], group_id=grp1["id"], total_score=1420, rw_score=700, math_score=720)
    assert res1["id"] and len(res1["id"]) == 36, "Test result ID must be a UUID"
    print(f"  [PASS] Inserted 3 test results for students")

    # 7. Check student history
    history = test_db.get_student_history(stu1["id"])
    assert len(history) == 2, f"Expected 2 test attempts for Alice, got {len(history)}"
    assert history[0]["total_score"] == 1550 and history[0]["rw_score"] == 770 and history[0]["math_score"] == 780
    print(f"  [PASS] Student history returned unit scores: total={history[0]['total_score']}, rw={history[0]['rw_score']}, math={history[0]['math_score']}")

    # 8. Test Student Cascade Delete
    test_db.delete_student(stu1["id"])
    with test_db.get_connection() as conn:
        c = conn.cursor()
        c.execute("SELECT COUNT(*) FROM students WHERE id = ?", (stu1["id"],))
        assert c.fetchone()[0] == 0, "Alice not deleted from students"
        c.execute("SELECT COUNT(*) FROM test_results WHERE student_id = ?", (stu1["id"],))
        assert c.fetchone()[0] == 0, "Alice's test results not deleted via CASCADE"
        # Bob Jones and his test result should still exist
        c.execute("SELECT COUNT(*) FROM students WHERE id = ?", (stu2["id"],))
        assert c.fetchone()[0] == 1, "Bob Jones was inadvertently affected"
        c.execute("SELECT COUNT(*) FROM test_results WHERE student_id = ?", (stu2["id"],))
        assert c.fetchone()[0] == 1, "Bob's test result was inadvertently affected"
    print("  [PASS] Hard-deleted Alice: her test results wiped via CASCADE, Bob unaffected")

    # 9. Test Group Cascade Delete
    test_db.delete_group(grp1["id"])
    with test_db.get_connection() as conn:
        c = conn.cursor()
        c.execute("SELECT COUNT(*) FROM groups WHERE id = ?", (grp1["id"],))
        assert c.fetchone()[0] == 0, "Cohort Alpha not deleted from groups"
        c.execute("SELECT COUNT(*) FROM students WHERE group_id = ?", (grp1["id"],))
        assert c.fetchone()[0] == 0, "Students under Cohort Alpha not deleted via CASCADE"
        c.execute("SELECT COUNT(*) FROM test_results WHERE group_id = ?", (grp1["id"],))
        assert c.fetchone()[0] == 0, "Test results under Cohort Alpha not deleted via CASCADE"
    print("  [PASS] Deleted Cohort Alpha: ALL remaining students and test results wiped via CASCADE (0 orphans)")


def test_rest_api_endpoints():
    print("\n" + "=" * 60)
    print("TEST 2: REST API Endpoints & HTTP Data Isolation Verification")
    print("=" * 60)

    import telegram_bot
    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)
    test_db = RelationalDB(TEST_DB_PATH)
    orig_rdb = telegram_bot.rdb
    telegram_bot.rdb = test_db
    active_db = test_db

    # 1. GET /api/groups - Empty list initially
    status, data = http_req("GET", "/api/groups")
    assert status == 200, f"Expected 200, got {status}"
    assert data["ok"] is True and isinstance(data["groups"], list) and len(data["groups"]) == 0
    print("  [PASS] GET /api/groups -> 200 OK (0 groups initially)")

    # 2. POST /api/groups - Validation: missing name returns 400
    status, data = http_req("POST", "/api/groups", {"name": ""})
    assert status == 400, f"Expected 400, got {status}"
    assert data["ok"] is False and "required" in data["error"].lower()
    print("  [PASS] POST /api/groups with empty name -> 400 Bad Request")

    # 3. POST /api/groups - Create Group A
    status, data = http_req("POST", "/api/groups", {"name": "SAT Masters 2026"})
    assert status == 201, f"Expected 201, got {status}"
    assert data["ok"] is True
    group_a_id = data["group"]["id"]
    assert group_a_id and len(group_a_id) == 36
    print(f"  [PASS] POST /api/groups -> 201 Created (ID: {group_a_id})")

    # 4. POST /api/groups - Create Group B
    status, data = http_req("POST", "/api/groups", {"name": "Ivy League Prep"})
    assert status == 201, f"Expected 201, got {status}"
    group_b_id = data["group"]["id"]
    print(f"  [PASS] POST /api/groups -> 201 Created Group B (ID: {group_b_id})")

    # 5. GET /api/groups - Both groups returned with student_count 0
    status, data = http_req("GET", "/api/groups")
    assert status == 200 and len(data["groups"]) == 2
    for g in data["groups"]:
        assert g["student_count"] == 0
    print("  [PASS] GET /api/groups -> 200 OK (2 groups with student_count: 0)")

    # 6. POST /api/students - Register student in Group A
    status, data = http_req("POST", "/api/students", {
        "telegram_id": 501001,
        "display_name": "Daniel Kim",
        "group_id": group_a_id,
        "telegram_username": "dkim"
    })
    assert status == 201 and data["ok"] is True
    student_dan_id = data["student"]["id"]
    print(f"  [PASS] POST /api/students -> 201 Created (Student: Daniel Kim, ID: {student_dan_id})")

    # Register another student in Group A
    status, data = http_req("POST", "/api/students", {
        "telegram_id": 501002,
        "display_name": "Elena Rostova",
        "group_id": group_a_id,
        "telegram_username": "elena_r"
    })
    assert status == 201
    student_elena_id = data["student"]["id"]
    print(f"  [PASS] POST /api/students -> 201 Created (Student: Elena Rostova, ID: {student_elena_id})")

    # Register student in Group B (Isolation Check)
    status, data = http_req("POST", "/api/students", {
        "telegram_id": 501003,
        "display_name": "Frank Miller",
        "group_id": group_b_id,
        "telegram_username": "fmiller"
    })
    assert status == 201
    student_frank_id = data["student"]["id"]
    print(f"  [PASS] POST /api/students -> 201 Created in Group B (Student: Frank Miller, ID: {student_frank_id})")

    # 7. GET /api/groups - Verify isolated student counts
    status, data = http_req("GET", "/api/groups")
    grp_a = next(g for g in data["groups"] if g["id"] == group_a_id)
    grp_b = next(g for g in data["groups"] if g["id"] == group_b_id)
    assert grp_a["student_count"] == 2, f"Expected 2 students in Group A, got {grp_a['student_count']}"
    assert grp_b["student_count"] == 1, f"Expected 1 student in Group B, got {grp_b['student_count']}"
    print(f"  [PASS] GET /api/groups -> Student counts accurate (Group A: 2, Group B: 1)")

    # 8. GET /api/groups/:id/students - Group A isolated student list
    status, data = http_req("GET", f"/api/groups/{group_a_id}/students")
    assert status == 200 and data["ok"] is True
    assert len(data["students"]) == 2
    student_names = [s["display_name"] for s in data["students"]]
    assert "Daniel Kim" in student_names and "Elena Rostova" in student_names
    assert "Frank Miller" not in student_names, "Data isolation leak: Frank Miller appeared in Group A"
    print("  [PASS] GET /api/groups/:id/students -> Returned 2 isolated students for Group A (No leaks)")

    # Non-existent group students -> 404
    status, data = http_req("GET", f"/api/groups/{str(uuid.uuid4())}/students")
    assert status == 404 and data["ok"] is False
    print("  [PASS] GET /api/groups/<non-existent-id>/students -> 404 Not Found")

    # 9. Record test results for Daniel Kim
    status, data = http_req("POST", f"/api/students/{student_dan_id}/test-results", {
        "total_score": 1490,
        "rw_score": 730,
        "math_score": 760
    })
    assert status == 201 and data["ok"] is True

    status, data = http_req("POST", f"/api/students/{student_dan_id}/test-results", {
        "total_score": 1540,
        "rw_score": 760,
        "math_score": 780
    })
    assert status == 201 and data["ok"] is True
    print("  [PASS] POST /api/students/:id/test-results -> 201 Created (2 test attempts recorded)")

    # 10. GET /api/students/:id/history - Return past test attempts & unit scores
    status, data = http_req("GET", f"/api/students/{student_dan_id}/history")
    assert status == 200 and data["ok"] is True
    history = data["history"]
    assert len(history) == 2
    # Verify latest is first (completed_at DESC)
    assert history[0]["total_score"] == 1540 and history[0]["rw_score"] == 760 and history[0]["math_score"] == 780
    assert history[1]["total_score"] == 1490 and history[1]["rw_score"] == 730 and history[1]["math_score"] == 760
    print(f"  [PASS] GET /api/students/:id/history -> 200 OK (2 attempts: latest total={history[0]['total_score']}, rw={history[0]['rw_score']}, math={history[0]['math_score']})")

    # Non-existent student history -> 404
    status, data = http_req("GET", f"/api/students/{str(uuid.uuid4())}/history")
    assert status == 404 and data["ok"] is False
    print("  [PASS] GET /api/students/<non-existent-id>/history -> 404 Not Found")

    # 11. DELETE /api/students/:id - Hard delete Daniel Kim and CASCADE wipe his tests
    status, data = http_req("DELETE", f"/api/students/{student_dan_id}")
    assert status == 200 and data["ok"] is True
    print(f"  [PASS] DELETE /api/students/:id -> 200 OK (Student {student_dan_id} hard deleted)")

    # Verify student is gone
    status, data = http_req("GET", f"/api/students/{student_dan_id}/history")
    assert status == 404
    print("  [PASS] Verified Daniel Kim history is 404 Not Found")

    def _cnt(r):
        return list(r.values())[0] if hasattr(r, 'values') else r[0]

    # Verify no orphaned test results in database
    with active_db.cursor() as c:
        c.execute(active_db._query("SELECT COUNT(*) FROM test_results WHERE CAST(student_id AS TEXT) = %s"), (str(student_dan_id),))
        res = c.fetchone()
        assert _cnt(res) == 0
        c.execute(active_db._query("SELECT COUNT(*) FROM students WHERE CAST(id AS TEXT) = %s"), (str(student_dan_id),))
        res = c.fetchone()
        assert _cnt(res) == 0
    print("  [PASS] Verified 0 orphaned test results left in test_results table")

    # Verify Group A student count dropped to 1
    status, data = http_req("GET", "/api/groups")
    grp_a = next(g for g in data["groups"] if g["id"] == group_a_id)
    assert grp_a["student_count"] == 1
    print("  [PASS] Group A student_count automatically dropped to 1")

    # 12. Record test result for Elena Rostova (in Group A)
    http_req("POST", f"/api/students/{student_elena_id}/test-results", {
        "total_score": 1400,
        "rw_score": 700,
        "math_score": 700
    })

    # 13. DELETE /api/groups/:id - Delete Group A (Triggers CASCADE delete for students and test records)
    status, data = http_req("DELETE", f"/api/groups/{group_a_id}")
    assert status == 200 and data["ok"] is True
    print(f"  [PASS] DELETE /api/groups/:id -> 200 OK (Group A {group_a_id} deleted)")

    # Verify Group A is gone
    status, data = http_req("GET", f"/api/groups/{group_a_id}/students")
    assert status == 404
    print("  [PASS] GET /api/groups/:id/students -> 404 Not Found after deletion")

    # Verify Group A students and their test results are completely purged (0 orphans)
    with active_db.cursor() as c:
        c.execute(active_db._query("SELECT COUNT(*) FROM groups WHERE CAST(id AS TEXT) = %s"), (str(group_a_id),))
        res = c.fetchone()
        assert _cnt(res) == 0
        c.execute(active_db._query("SELECT COUNT(*) FROM students WHERE CAST(group_id AS TEXT) = %s"), (str(group_a_id),))
        res = c.fetchone()
        assert _cnt(res) == 0
        c.execute(active_db._query("SELECT COUNT(*) FROM test_results WHERE CAST(group_id AS TEXT) = %s"), (str(group_a_id),))
        res = c.fetchone()
        assert _cnt(res) == 0
        # Group B, Frank Miller, and any Group B records are intact
        c.execute(active_db._query("SELECT COUNT(*) FROM groups WHERE CAST(id AS TEXT) = %s"), (str(group_b_id),))
        res = c.fetchone()
        assert _cnt(res) == 1
        c.execute(active_db._query("SELECT COUNT(*) FROM students WHERE CAST(id AS TEXT) = %s"), (str(student_frank_id),))
        res = c.fetchone()
        assert _cnt(res) == 1
    print("  [PASS] Verified CASCADE: Group A, all students, and all test records wiped (0 orphans)")
    print("  [PASS] Verified Group B and Frank Miller completely unaffected")

    # 14. DELETE non-existent group -> 404
    status, data = http_req("DELETE", f"/api/groups/{str(uuid.uuid4())}")
    assert status == 404 and data["ok"] is False
    print("  [PASS] DELETE /api/groups/<non-existent-id> -> 404 Not Found")

    # 15. DELETE non-existent student -> 404
    status, data = http_req("DELETE", f"/api/students/{str(uuid.uuid4())}")
    assert status == 404 and data["ok"] is False
    print("  [PASS] DELETE /api/students/<non-existent-id> -> 404 Not Found")

    # Clean up test Group B
    http_req("DELETE", f"/api/groups/{group_b_id}")

    print("\n" + "=" * 60)
    print("ALL 15 REST API ENDPOINT & CASCADE VERIFICATION CHECKS PASSED! 🎉")
    print("=" * 60)

    telegram_bot.rdb = orig_rdb
    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)


if __name__ == "__main__":
    test_schema_and_direct_cascades()
    test_rest_api_endpoints()
