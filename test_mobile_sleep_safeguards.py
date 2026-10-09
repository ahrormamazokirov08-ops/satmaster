#!/usr/bin/env python3
"""
Test Suite: Mobile Sleep, Screen Wake-Up Grace Period, Offline Banner & Test Progress Persistence
================================================================================================
Verifies frontend safeguards against session kickout and test wipe when mobile screen sleeps, locks,
or disconnects.
"""

import os
import re

def test_safeguards():
    html_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "index.html")
    with open(html_path, "r", encoding="utf-8") as f:
        html = f.read()

    print("==================================================================")
    print("🧪 MOBILE SCREEN SLEEP, WAKE GRACE & TEST PERSISTENCE TEST SUITE")
    print("==================================================================")

    # 1. Offline Banner Elements
    print("\n--- Test 1: Offline Banner DOM & Listeners ---")
    assert 'id="satmaster-offline-banner"' in html, "Missing #satmaster-offline-banner DOM element"
    assert 'id="satmaster-offline-text"' in html, "Missing #satmaster-offline-text element"
    assert "Offline — Reconnecting..." in html, "Missing offline text"
    assert "window.addEventListener('offline', updateOnlineStatus)" in html, "Missing offline listener"
    assert "window.addEventListener('online', updateOnlineStatus)" in html, "Missing online listener"
    print("✅ Offline Banner DOM, text, and window listeners verified: PASS")

    # 2. Wake-Up Grace Period & Auth Suppression
    print("\n--- Test 2: Wake-Up Grace Period & Auth Suppression ---")
    assert "WAKEUP_GRACE_BUFFER_MS" in html, "Missing WAKEUP_GRACE_BUFFER_MS constant"
    assert "lastWakeUpTime" in html, "Missing lastWakeUpTime tracker"
    assert "10000" in html, "Missing 10-second (10000ms) grace buffer definition"
    assert "handleSessionVisibilityRestore" in html, "Missing handleSessionVisibilityRestore function"
    
    # Check that lockoutStudentSession has offline & grace buffer guards
    lockout_idx = html.find("function lockoutStudentSession(reasonMsg)")
    assert lockout_idx != -1, "Could not find lockoutStudentSession"
    init_tg_idx = html.find("async function initTelegramAuth()", lockout_idx)
    lockout_body = html[lockout_idx:init_tg_idx]
    assert "!navigator.onLine" in lockout_body, "lockoutStudentSession missing offline guard"
    assert "WAKEUP_GRACE_BUFFER_MS" in lockout_body, "lockoutStudentSession missing wake-up grace buffer guard"
    print("✅ Wake-up grace period (10s) & lockoutStudentSession offline/grace guards verified: PASS")

    # 3. Active Test Progress Auto-Save & Recovery Engine
    print("\n--- Test 3: Active Test Progress Auto-Save (satmaster_active_test_progress) ---")
    assert "satmaster_active_test_progress" in html, "Missing satmaster_active_test_progress localStorage key"
    assert "saveActiveTestProgress" in html, "Missing saveActiveTestProgress function"
    assert "getActiveTestProgress" in html, "Missing getActiveTestProgress function"
    assert "clearActiveTestProgress" in html, "Missing clearActiveTestProgress function"
    assert "restoreActiveTestProgress" in html, "Missing restoreActiveTestProgress function"
    assert "saveRunnerTestProgress" in html, "Missing saveRunnerTestProgress function"
    assert "saveVocabTestProgress" in html, "Missing saveVocabTestProgress function"
    
    # Check that progress contains all required fields: test_id, current_question_index, answers_map, time_remaining
    save_idx = html.find("function saveActiveTestProgress(type, data)")
    save_end = html.find("function getActiveTestProgress()", save_idx)
    save_body = html[save_idx:save_end]
    assert "test_id" in save_body, "saveActiveTestProgress missing test_id"
    assert "current_question_index" in save_body, "saveActiveTestProgress missing current_question_index"
    assert "answers_map" in save_body, "saveActiveTestProgress missing answers_map"
    assert "time_remaining" in save_body, "saveActiveTestProgress missing time_remaining"
    print("✅ satmaster_active_test_progress schema & helper functions verified: PASS")

    # 4. Auto-save wired to answer selection and submission clearance
    print("\n--- Test 4: Wire-up on Question Answer Selection & Submit Test Clearance ---")
    # Runner test
    assert "saveRunnerTestProgress()" in html, "Missing saveRunnerTestProgress() call"
    select_runner_idx = html.find("function selectRunnerOption(letter)")
    select_runner_end = html.find("function toggleEliminateRunnerOption", select_runner_idx)
    select_runner_body = html[select_runner_idx:select_runner_end]
    assert "saveRunnerTestProgress()" in select_runner_body, "selectRunnerOption missing auto-save"
    
    # Vocab unit test
    assert "saveVocabTestProgress()" in html, "Missing saveVocabTestProgress() call"
    select_vocab_idx = html.find("function selectVocabTestAnswer(optIdx)")
    select_vocab_end = html.find("function nextVocabTestQuestion()", select_vocab_idx)
    select_vocab_body = html[select_vocab_idx:select_vocab_end]
    assert "saveVocabTestProgress()" in select_vocab_body, "selectVocabTestAnswer missing auto-save"
    
    # Submission clears active progress
    submit_runner_idx = html.find("function submitStudentTest()")
    submit_runner_end = html.find("const test = currentRunnerTest;", submit_runner_idx)
    submit_runner_body = html[submit_runner_idx:submit_runner_end]
    assert "clearActiveTestProgress()" in submit_runner_body, "submitStudentTest missing clearActiveTestProgress()"
    
    submit_vocab_idx = html.find("function submitVocabUnitTest()")
    submit_vocab_end = html.find("let correctCount = 0;", submit_vocab_idx)
    submit_vocab_body = html[submit_vocab_idx:submit_vocab_end]
    assert "clearActiveTestProgress()" in submit_vocab_body, "submitVocabUnitTest missing clearActiveTestProgress()"
    print("✅ Auto-save on answer selection and clearance on Submit Test verified: PASS")

    # 5. Heartbeat & verifyStudentAccount Resilience
    print("\n--- Test 5: Heartbeat & verifyStudentAccount Offline & Grace Buffers ---")
    hb_idx = html.find("function startAuthHeartbeat(studentId)")
    hb_end = html.find("async function verifyStudentAccount", hb_idx)
    hb_body = html[hb_idx:hb_end]
    assert "WAKEUP_GRACE_BUFFER_MS" in hb_body, "startAuthHeartbeat missing WAKEUP_GRACE_BUFFER_MS suppression"
    assert "!navigator.onLine" in hb_body, "startAuthHeartbeat missing offline suppression"

    verify_idx = html.find("async function verifyStudentAccount(")
    verify_end = html.find("function showSplashChecking()", verify_idx)
    verify_body = html[verify_idx:verify_end]
    assert "!navigator.onLine" in verify_body, "verifyStudentAccount missing early offline check"
    assert "isNetworkError: true" in verify_body, "verifyStudentAccount missing network error mapping"
    assert "not_found_or_deleted" in verify_body, "verifyStudentAccount missing strict not_found_or_deleted check"
    print("✅ startAuthHeartbeat & verifyStudentAccount network resilience verified: PASS")

    print("\n🎉 ALL MOBILE SLEEP & TEST PERSISTENCE TESTS PASSED!")

if __name__ == "__main__":
    test_safeguards()
