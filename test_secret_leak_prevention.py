#!/usr/bin/env python3
"""
test_secret_leak_prevention.py
==============================
Automated security test to ensure no private credentials, Telegram bot tokens,
or hardcoded secrets ever get committed into any tracked source code files.
"""

import os
import re
import unittest
import subprocess

TELEGRAM_TOKEN_REGEX = re.compile(r'\b\d{8,11}:[A-Za-z0-9_-]{35}\b')

class TestSecretLeakPrevention(unittest.TestCase):
    def test_no_telegram_tokens_in_tracked_files(self):
        """
        Scan all git-tracked files in the repository to guarantee
        that zero Telegram bot tokens exist in the source code.
        """
        repo_root = os.path.dirname(os.path.abspath(__file__))
        
        try:
            cmd = ["git", "ls-files"]
            res = subprocess.run(cmd, cwd=repo_root, capture_output=True, text=True, check=True)
            tracked_files = [f.strip() for f in res.stdout.splitlines() if f.strip()]
        except Exception:
            tracked_files = []
            for root, dirs, files in os.walk(repo_root):
                if any(ignored in root for ignored in [".git", "node_modules", ".cache"]):
                    continue
                for f in files:
                    if f not in [".env", "bot_config.json"]:
                        tracked_files.append(os.path.relpath(os.path.join(root, f), repo_root))

        leaks = []
        for rel_path in tracked_files:
            if rel_path.endswith((".png", ".jpg", ".jpeg", ".webp", ".pdf", ".db", ".ico")):
                continue
            
            full_path = os.path.join(repo_root, rel_path)
            if not os.path.isfile(full_path):
                continue

            try:
                with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                    for line_no, line in enumerate(f, start=1):
                        matches = TELEGRAM_TOKEN_REGEX.findall(line)
                        if matches:
                            real_matches = [m for m in matches if not m.startswith("00000000")]
                            if real_matches:
                                leaks.append(f"{rel_path}:{line_no} contains token match {real_matches[0][:10]}...")
            except Exception:
                pass

        self.assertEqual(
            leaks,
            [],
            f"SECURITY ALERT: Found Telegram bot tokens in git-tracked files:\n" + "\n".join(leaks)
        )

    def test_env_files_remain_git_ignored(self):
        """Ensure .env and bot_config.json are listed in .gitignore."""
        repo_root = os.path.dirname(os.path.abspath(__file__))
        gitignore_path = os.path.join(repo_root, ".gitignore")
        self.assertTrue(os.path.exists(gitignore_path), ".gitignore must exist")

        with open(gitignore_path, "r", encoding="utf-8") as f:
            content = f.read()

        self.assertIn(".env", content, ".env must be ignored in .gitignore")
        self.assertIn("bot_config.json", content, "bot_config.json must be ignored in .gitignore")

if __name__ == "__main__":
    unittest.main()
