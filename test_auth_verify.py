#!/usr/bin/env python3
"""
Test Suite: Real-Time Link Verification & Live Session Lockout
==============================================================
Tests /api/auth/verify across both GET & POST, ID prefixes (TG/STU/UUID/raw int),
and ensures immediate lockout when a student or class cohort is deleted.
Tested via mock socket streams (BytesIO) requiring no network socket bindings.
"""

import os
import io
import json
import urllib.parse

from database import db as rdb
from telegram_bot import SATMasterHandler
from api.index import handler as VercelHandler


class DummyRequest:
    def __init__(self, raw_input=b""):
        self.rfile = io.BytesIO(raw_input)
        self.wfile = io.BytesIO()

    def makefile(self, mode, *args, **kwargs):
        if "r" in mode:
            return self.rfile
        return self.wfile

    def sendall(self, data):
        self.wfile.write(data)


def execute_mock_request(handler_cls, method, path, headers=None, body=b""):
    headers = headers or {}
    if body and "Content-Length" not in headers:
        headers["Content-Length"] = str(len(body))
    
    request_text = f"{method} {path} HTTP/1.1\r\n"
    for k, v in headers.items():
        request_text += f"{k}: {v}\r\n"
    request_text += "\r\n"
    raw_input = request_text.encode("utf-8") + body

    dummy_sock = DummyRequest(raw_input)
    h = handler_cls(dummy_sock, ("127.0.0.1", 12345), None)
    
    raw_response = dummy_sock.wfile.getvalue().decode("utf-8")
    
    status_line = raw_response.split("\r\n")[0]
    status_code = int(status_line.split(" ")[1])
    
    parts = raw_response.split("\r\n\r\n", 1)
    response_body = parts[1] if len(parts) > 1 else ""
    try:
        json_data = json.loads(response_body)
    except Exception:
        json_data = response_body
        
    return status_code, json_data


def run_tests():
    print("==================================================================")
    print("🧪 SATMASTER REAL-TIME LINK VERIFICATION & LOCKOUT TEST SUITE")
    print("==================================================================")

    # 1. Test RelationalDB get_student direct logic
    print("\n--- Test 1: RelationalDB get_student ID prefix normalization ---")
    test_group = rdb.create_group("SAT_Verify_Test_Group")
    grp_id = test_group["id"]
    test_tg_id = 987654321
    rdb.upsert_student(
        telegram_id=test_tg_id,
        display_name="Verify Test Student",
        group_id=grp_id,
        telegram_username="verify_tester"
    )

    # Test raw numeric ID
    s1 = rdb.get_student(test_tg_id)
    assert s1 is not None, "Failed to find student with raw int telegram_id"
    assert s1["display_name"] == "Verify Test Student"
    assert s1["group_name"] == "SAT_Verify_Test_Group"
    print("✅ Raw telegram_id query: PASS")

    # Test string numeric ID
    s2 = rdb.get_student(str(test_tg_id))
    assert s2 is not None, "Failed to find student with string telegram_id"
    print("✅ String telegram_id query: PASS")

    # Test 'TG' prefix
    s3 = rdb.get_student(f"TG{test_tg_id}")
    assert s3 is not None, "Failed to find student with 'TG' prefix"
    assert s3["telegram_id"] == test_tg_id
    print("✅ 'TG' prefix normalization query: PASS")

    # Test UUID
    stu_uuid = s1["id"]
    s4 = rdb.get_student(stu_uuid)
    assert s4 is not None, "Failed to find student by UUID"
    print("✅ UUID query: PASS")

    # Test Non-existent student
    s_none = rdb.get_student("TG9999999999")
    assert s_none is None, "Non-existent student must return None"
    print("✅ Non-existent student query returns None: PASS")

    # 2. Test SATMasterHandler /api/auth/verify (GET & POST)
    print("\n--- Test 2: SATMasterHandler /api/auth/verify (GET & POST) ---")
    
    # GET with TG prefix
    code, data = execute_mock_request(SATMasterHandler, "GET", f"/api/auth/verify?id=TG{test_tg_id}")
    assert code == 200, f"Expected 200, got {code}"
    assert data.get("valid") is True, f"Expected valid=True, got {data}"
    assert data["student"]["telegram_id"] == test_tg_id
    assert data["student"]["group_name"] == "SAT_Verify_Test_Group"
    print("✅ GET /api/auth/verify?id=TG... returns valid: True: PASS")

    # GET with raw telegram_id param
    code, data = execute_mock_request(SATMasterHandler, "GET", f"/api/auth/verify?telegram_id={test_tg_id}")
    assert code == 200
    assert data.get("valid") is True
    print("✅ GET /api/auth/verify?telegram_id=... returns valid: True: PASS")

    # GET with unknown ID
    code, data = execute_mock_request(SATMasterHandler, "GET", "/api/auth/verify?id=TG00000000")
    assert code == 200
    assert data.get("valid") is False
    assert data.get("reason") == "not_found_or_deleted"
    print("✅ GET /api/auth/verify for unknown ID returns valid: False, not_found_or_deleted: PASS")

    # GET without ID param
    code, data = execute_mock_request(SATMasterHandler, "GET", "/api/auth/verify")
    assert code == 400
    assert data.get("valid") is False
    print("✅ GET /api/auth/verify without ID returns 400: PASS")

    # POST with JSON body
    post_body = json.dumps({"uid": f"TG{test_tg_id}"}).encode("utf-8")
    code, data = execute_mock_request(SATMasterHandler, "POST", "/api/auth/verify", headers={"Content-Type": "application/json"}, body=post_body)
    assert code == 200
    assert data.get("valid") is True
    print("✅ POST /api/auth/verify with JSON body returns valid: True: PASS")

    # POST with unknown ID
    post_body = json.dumps({"id": "TG99999999"}).encode("utf-8")
    code, data = execute_mock_request(SATMasterHandler, "POST", "/api/auth/verify", headers={"Content-Type": "application/json"}, body=post_body)
    assert code == 200
    assert data.get("valid") is False
    assert data.get("reason") == "not_found_or_deleted"
    print("✅ POST /api/auth/verify with unknown ID returns valid: False: PASS")

    # 3. Test Vercel Handler api/index.py /api/auth/verify (GET & POST)
    print("\n--- Test 3: Vercel api/index.py /api/auth/verify (GET & POST) ---")
    code, data = execute_mock_request(VercelHandler, "GET", f"/api/auth/verify?id=TG{test_tg_id}")
    assert code == 200
    assert data.get("valid") is True
    print("✅ Vercel GET /api/auth/verify returns valid: True: PASS")

    code, data = execute_mock_request(VercelHandler, "POST", "/api/auth/verify", headers={"Content-Type": "application/json"}, body=post_body)
    assert code == 200
    assert data.get("valid") is False
    assert data.get("reason") == "not_found_or_deleted"
    print("✅ Vercel POST /api/auth/verify returns valid: False for unknown: PASS")

    # 4. Test Group Deletion Cascade & Lockout
    print("\n--- Test 4: Cohort Deletion Cascade Verification ---")
    rdb.delete_group(grp_id)

    # After cohort deletion, endpoint MUST return valid: False
    code, data = execute_mock_request(SATMasterHandler, "GET", f"/api/auth/verify?id=TG{test_tg_id}")
    assert code == 200
    assert data.get("valid") is False, f"Expected valid=False after cohort deletion, got {data}"
    assert data.get("reason") == "not_found_or_deleted"
    print("✅ Deleted cohort immediately revokes student link (valid: False, not_found_or_deleted): PASS")

    # 5. Test index.html frontend requirements
    print("\n--- Test 5: Frontend index.html verification check ---")
    html_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "index.html")
    with open(html_path, "r", encoding="utf-8") as f:
        html = f.read()

    assert "gateway-lockout-banner" in html, "Missing #gateway-lockout-banner in index.html"
    assert "https://t.me/Ahrorbek_SAT_bot" in html, "Missing official bot link in lockout banner"
    assert "startAuthHeartbeat" in html, "Missing startAuthHeartbeat in index.html"
    assert "stopAuthHeartbeat" in html, "Missing stopAuthHeartbeat in index.html"
    assert "lockoutStudentSession" in html, "Missing lockoutStudentSession in index.html"
    assert "verifyStudentAccount" in html, "Missing verifyStudentAccount in index.html"
    assert "12000" in html, "Missing 12000ms (12s) heartbeat polling interval in index.html"
    print("✅ index.html has all required UI banner, lockout, and 12s heartbeat handlers: PASS")

    print("\n🎉 ALL TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_tests()
