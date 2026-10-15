import unittest
import json
import urllib.parse
from io import BytesIO
from http.server import HTTPServer
from api.index import handler
from database import db as rdb

class DummyWFile:
    def __init__(self):
        self.data = bytearray()
    def write(self, b):
        self.data.extend(b)

class TestHomeworkAPI(unittest.TestCase):
    def setUp(self):
        self.rdb = rdb

    def test_homework_crud_api(self):
        # 1. Test POST /api/homework
        post_body = json.dumps({
            "title": "SAT Test Homework Drill",
            "type": "vocab",
            "group_id": "SAT Masters 2026",
            "className": "SAT Masters 2026",
            "code": "TEST-99",
            "config": {
                "scopeId": "lesson-1",
                "question_count": 20
            },
            "deadline": "2026-10-20T23:59:59Z",
            "timeLimitMinutes": 15,
            "created_by": "teacher"
        }).encode('utf-8')

        h_post = handler.__new__(handler)
        h_post.headers = {
            "Content-Length": str(len(post_body)),
            "Content-Type": "application/json",
            "X-User-Role": "teacher"
        }
        h_post.path = "/api/homework"
        h_post.rfile = BytesIO(post_body)
        h_post.wfile = DummyWFile()
        h_post.send_response = lambda code, message=None: setattr(h_post, 'status_code', code)
        h_post.send_header = lambda k, v: None
        h_post.end_headers = lambda: None

        h_post.do_POST()
        self.assertEqual(h_post.status_code, 201)
        resp_post = json.loads(h_post.wfile.data.decode('utf-8'))
        self.assertTrue(resp_post.get("ok"))
        created_hw = resp_post.get("assignment")
        hw_id = created_hw["id"]
        self.assertEqual(created_hw["title"], "SAT Test Homework Drill")
        print(f"✅ POST /api/homework succeeded: ID = {hw_id}")

        # 2. Test GET /api/homework
        h_get = handler.__new__(handler)
        h_get.headers = {"X-User-Role": "student"}
        h_get.path = "/api/homework?group_id=SAT%20Masters%202026"
        h_get.wfile = DummyWFile()
        h_get.send_response = lambda code, message=None: setattr(h_get, 'status_code', code)
        h_get.send_header = lambda k, v: None
        h_get.end_headers = lambda: None

        h_get.do_GET()
        self.assertEqual(h_get.status_code, 200)
        resp_get = json.loads(h_get.wfile.data.decode('utf-8'))
        self.assertTrue(resp_get.get("ok"))
        assignments = resp_get.get("assignments", [])
        found = any(a["id"] == hw_id for a in assignments)
        self.assertTrue(found, "Created assignment must be in GET /api/homework output")
        print(f"✅ GET /api/homework succeeded: found {len(assignments)} assignments")

        # 3. Test DELETE /api/homework/:id
        h_del = handler.__new__(handler)
        h_del.headers = {"X-User-Role": "teacher"}
        h_del.path = f"/api/homework/{hw_id}"
        h_del.wfile = DummyWFile()
        h_del.send_response = lambda code, message=None: setattr(h_del, 'status_code', code)
        h_del.send_header = lambda k, v: None
        h_del.end_headers = lambda: None

        h_del.do_DELETE()
        self.assertEqual(h_del.status_code, 200)
        resp_del = json.loads(h_del.wfile.data.decode('utf-8'))
        self.assertTrue(resp_del.get("ok"))
        print(f"✅ DELETE /api/homework/{hw_id} succeeded")

        # 4. Verify deleted assignment is no longer returned in GET /api/homework
        h_get2 = handler.__new__(handler)
        h_get2.headers = {"X-User-Role": "student"}
        h_get2.path = "/api/homework?group_id=SAT%20Masters%202026"
        h_get2.wfile = DummyWFile()
        h_get2.send_response = lambda code, message=None: setattr(h_get2, 'status_code', code)
        h_get2.send_header = lambda k, v: None
        h_get2.end_headers = lambda: None

        h_get2.do_GET()
        self.assertEqual(h_get2.status_code, 200)
        resp_get2 = json.loads(h_get2.wfile.data.decode('utf-8'))
        self.assertFalse(any(a["id"] == hw_id for a in resp_get2.get("assignments", [])))
        print(f"✅ Assignment {hw_id} verified permanently removed from database")

if __name__ == '__main__':
    unittest.main()
