#!/usr/bin/env python3
"""
Test Suite: Instant Synchronous Audio in Telegram Android WebView
=================================================================
Verifies synchronous window.satAudio.play() on click (no async fetch delays),
open dictionary audio endpoint, direct error fallback to backend /api/tts proxy,
flashcard front/back audio button routing, permanent toast suppression,
and total removal of SpeechSynthesis.
"""

import os
import re

def test_instant_audio_webview():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    html_path = os.path.join(base_dir, "index.html")
    with open(html_path, "r", encoding="utf-8") as f:
        html = f.read()

    api_index_path = os.path.join(base_dir, "api", "index.py")
    with open(api_index_path, "r", encoding="utf-8") as f:
        api_index = f.read()

    tg_bot_path = os.path.join(base_dir, "telegram_bot.py")
    with open(tg_bot_path, "r", encoding="utf-8") as f:
        tg_bot = f.read()

    print("==================================================================")
    print("🧪 INSTANT AUDIO IN TELEGRAM ANDROID WEBVIEW SUITE")
    print("==================================================================")

    # 1. Instant Synchronous Playback on Click with window.satAudio
    print("\n--- Test 1: Synchronous window.satAudio Playback on Click ---")
    speak_idx = html.find("function speakWord(word, accent = 'US', btnEl = null)")
    assert speak_idx != -1, "Missing synchronous speakWord declaration"
    assert "async function speakWord" not in html, "speakWord must NOT be async (avoids gesture revocation)"

    speak_end = html.find("function speakCurrentQuizWord", speak_idx)
    speak_body = html[speak_idx:speak_end]

    assert "window.satAudio" in speak_body, "speakWord must use persistent window.satAudio"
    assert "window.satAudio.play()" in speak_body, "speakWord must call window.satAudio.play() synchronously"
    assert "await " not in speak_body, "speakWord must not await before play"
    assert "fetch(" not in speak_body, "speakWord must not fetch before play"
    assert "dictvoice" in speak_body, "speakWord must use dictvoice open audio endpoint"
    assert "type=1" in speak_body and "type=2" in speak_body, "speakWord must handle UK (type=1) and US (type=2)"
    print("✅ Synchronous window.satAudio.play() with open dict endpoint verified: PASS")

    # 2. Direct Fallback via error / catch event to /api/tts
    print("\n--- Test 2: Direct Error Fallback to Backend Proxy (/api/tts) ---")
    assert "window.satAudio.onerror" in speak_body, "speakWord must handle window.satAudio.onerror"
    assert "/api/tts" in speak_body, "speakWord must fallback to /api/tts proxy on error"
    assert 'clean_path == "/api/tts"' in api_index, "api/index.py missing /api/tts endpoint"
    assert 'clean_path == "/api/tts"' in tg_bot, "telegram_bot.py missing /api/tts endpoint"
    print("✅ Direct fallback to backend /api/tts proxy verified: PASS")

    # 3. Total Removal of SpeechSynthesis
    print("\n--- Test 3: Total Removal of SpeechSynthesis ---")
    assert "speechSynthesis" not in html, "speechSynthesis must be completely removed from index.html"
    assert "SpeechSynthesisUtterance" not in html, "SpeechSynthesisUtterance must be completely removed"
    assert "fallbackSpeakWord" not in html, "fallbackSpeakWord must be completely removed"
    print("✅ 100% removal of SpeechSynthesis verified: PASS")

    # 4. Toast Suppression Filter in showToast
    print("\n--- Test 4: Audio Toast Suppression Filter in showToast ---")
    toast_idx = html.find("function showToast(title, message, type = 'success')")
    assert toast_idx != -1, "Missing showToast function"
    toast_chunk = html[toast_idx:toast_idx + 400]
    assert "/audio/i.test" in toast_chunk, "showToast must intercept and suppress audio toasts"
    assert "Web Speech audio is not supported in this browser" not in html, \
        "Disallowed misleading 'Web Speech audio is not supported' alert string found in index.html"
    print("✅ Audio toast suppression verified: PASS")

    # 5. Flashcard View Audio Handlers (Front & Back)
    print("\n--- Test 5: Flashcard Audio Routing (Front & Back) ---")
    # Front side
    assert "speakCurrentFlashcardWord('US', this)" in html, "Missing speakCurrentFlashcardWord US call on flashcard front"
    assert "speakCurrentFlashcardWord('UK', this)" in html, "Missing speakCurrentFlashcardWord UK call on flashcard front"
    # Back side companion buttons
    back_idx = html.find('id="flashcard-back"')
    assert back_idx != -1, "Missing #flashcard-back element"
    back_chunk = html[back_idx:back_idx + 3000]
    assert "speakCurrentFlashcardWord('US', this)" in back_chunk, "Missing companion US audio button on flashcard-back"
    assert "speakCurrentFlashcardWord('UK', this)" in back_chunk, "Missing companion UK audio button on flashcard-back"
    assert "event.stopPropagation()" in back_chunk, "Flashcard-back audio buttons must prevent card flip"

    # speakCurrentFlashcardWord implementation
    fc_func_idx = html.find("function speakCurrentFlashcardWord(accent = 'US', btnEl = null)")
    assert fc_func_idx != -1, "Missing speakCurrentFlashcardWord function"
    fc_func_end = html.find("function renderLessonWordList", fc_func_idx)
    fc_func_body = html[fc_func_idx:fc_func_end]
    assert "fc-word" in fc_func_body, "speakCurrentFlashcardWord must have fc-word DOM fallback"
    assert "speakWord(" in fc_func_body, "speakCurrentFlashcardWord must call speakWord"
    print("✅ Flashcard front & back audio buttons and DOM fallback verified: PASS")

    # 6. Cache-Busting Versioning & Headers
    print("\n--- Test 6: Cache-Busting Meta Headers & Version Queries ---")
    assert 'meta http-equiv="Cache-Control"' in html, "Missing Cache-Control meta tag in head"
    assert 'meta http-equiv="Pragma"' in html, "Missing Pragma meta tag in head"
    assert "telegram-web-app.js" not in html, "telegram-web-app.js must be decoupled from index.html"
    assert "tailwindcss.min.js?v=1.0.5" in html, "Missing ?v=1.0.5 on tailwindcss.min.js"
    print("✅ Cache-busting meta headers and decoupled WebApp SDK verified: PASS")

    print("\n🎉 ALL INSTANT AUDIO & TELEGRAM WEBVIEW TESTS PASSED!")

if __name__ == "__main__":
    test_instant_audio_webview()
