#!/usr/bin/env python3
"""
Test Suite: Telegram Mobile WebView Audio Playback & Open Stream Fallback
========================================================================
Verifies pure HTML5 audio element streaming, silent WAV audio context unlocking,
open dictionary audio endpoint fallback (no Android 403 / CORS blocks), backend /api/tts proxy,
flashcard front/back audio routing, toast suppression, and cache-busting headers.
"""

import os
import re

def test_audio_webview():
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
    print("🧪 MOBILE WEBVIEW AUDIO PLAYBACK, FLASHCARD & CACHE SUITE")
    print("==================================================================")

    # 1. Mobile Audio Context Unlock (Silent WAV base64)
    print("\n--- Test 1: Mobile Audio Context Unlock ---")
    assert "unlockMobileAudio" in html, "Missing unlockMobileAudio function"
    assert "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA" in html, \
        "Missing silent WAV base64 data URI in unlockMobileAudio"
    
    assert "handleFirstGesture" in html, "Missing first gesture listener"
    assert "window.addEventListener('touchstart', handleFirstGesture" in html, "Missing touchstart first gesture unlock"
    assert "window.addEventListener('click', handleFirstGesture" in html, "Missing click first gesture unlock"

    speak_idx = html.find("async function speakWord(word, accent = 'US', btnEl = null)")
    assert speak_idx != -1, "Could not find speakWord function declaration"
    speak_chunk = html[speak_idx:speak_idx + 400]
    assert "unlockMobileAudio();" in speak_chunk, "speakWord must invoke unlockMobileAudio() synchronously at entry"
    print("✅ Silent WAV mobile audio context unlock & gesture listeners verified: PASS")

    # 2. HTTPS Protocol Sanitization
    print("\n--- Test 2: Audio URL Sanitization (Force HTTPS) ---")
    assert "function sanitizeAudioUrl(url)" in html, "Missing sanitizeAudioUrl function"
    sanitizer_idx = html.find("function sanitizeAudioUrl(url)")
    sanitizer_end = html.find("function getOpenDictAudioUrl", sanitizer_idx)
    sanitizer_body = html[sanitizer_idx:sanitizer_end]
    assert "https:" in sanitizer_body, "sanitizeAudioUrl missing https enforcement"
    print("✅ HTTPS protocol normalization verified: PASS")

    # 3. Open Dictionary Audio Stream Endpoint (No Android WebView 403 / CORS block)
    print("\n--- Test 3: Open Dictionary Audio Endpoint ---")
    assert "function getOpenDictAudioUrl(word, accent = 'US')" in html, "Missing getOpenDictAudioUrl function"
    open_idx = html.find("function getOpenDictAudioUrl(word, accent = 'US')")
    open_end = html.find("function applyAudioButtonFeedback", open_idx)
    open_body = html[open_idx:open_end]
    assert "dictvoice" in open_body, "Missing dictvoice endpoint in getOpenDictAudioUrl"
    assert "isUK ? 1 : 2" in open_body or ("type=" in open_body), "Missing UK (type 1) and US (type 2) options"
    print("✅ Open dictionary audio stream URL verified: PASS")

    # 4. Backend Audio Proxy (/api/tts)
    print("\n--- Test 4: Backend Audio Proxy (/api/tts) ---")
    assert 'clean_path == "/api/tts"' in api_index, "api/index.py missing /api/tts endpoint"
    assert "audio/mpeg" in api_index, "api/index.py missing audio/mpeg content type"
    assert 'clean_path == "/api/tts"' in tg_bot, "telegram_bot.py missing /api/tts endpoint"
    assert "audio/mpeg" in tg_bot, "telegram_bot.py missing audio/mpeg content type"
    print("✅ Backend /api/tts proxy verified across Vercel & Render: PASS")

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
    fc_func_end = html.find("if (typeof window !== 'undefined' && 'speechSynthesis'", fc_func_idx)
    fc_func_body = html[fc_func_idx:fc_func_end]
    assert "fc-word" in fc_func_body, "speakCurrentFlashcardWord must have fc-word DOM fallback"
    assert "speakWord(" in fc_func_body, "speakCurrentFlashcardWord must call speakWord"
    print("✅ Flashcard front & back audio buttons and DOM fallback verified: PASS")

    # 6. Toast Suppression Filter in showToast
    print("\n--- Test 6: Audio Toast Suppression Filter in showToast ---")
    toast_idx = html.find("function showToast(title, message, type = 'success')")
    assert toast_idx != -1, "Missing showToast function"
    toast_chunk = html[toast_idx:toast_idx + 400]
    assert "/audio/i.test" in toast_chunk, "showToast must intercept and suppress audio toasts"
    assert "Web Speech audio is not supported in this browser" not in html, \
        "Disallowed misleading 'Web Speech audio is not supported' alert string found in index.html"
    print("✅ Audio toast suppression verified: PASS")

    # 7. Cache-Busting Versioning & Headers
    print("\n--- Test 7: Cache-Busting Meta Headers & Version Queries ---")
    assert 'meta http-equiv="Cache-Control"' in html, "Missing Cache-Control meta tag in head"
    assert 'meta http-equiv="Pragma"' in html, "Missing Pragma meta tag in head"
    assert "telegram-web-app.js?v=1.0.5" in html, "Missing ?v=1.0.5 on telegram-web-app.js"
    assert "tailwindcss.min.js?v=1.0.5" in html, "Missing ?v=1.0.5 on tailwindcss.min.js"
    print("✅ Cache-busting meta headers and ?v=1.0.5 query parameters verified: PASS")

    # 8. Playback Hierarchy in speakWord
    print("\n--- Test 8: Playback Hierarchy in speakWord ---")
    speak_end = html.find("function speakCurrentQuizWord", speak_idx)
    speak_body = html[speak_idx:speak_end]
    
    tier1_pos = speak_body.find("getDictionaryAudioUrl")
    tier2_pos = speak_body.find("getOpenDictAudioUrl")
    tier3_pos = speak_body.find("/api/tts")
    tier4_pos = speak_body.find("fallbackSpeakWord")
    
    assert tier1_pos != -1, "speakWord missing Tier 1 Dictionary API lookup"
    assert tier2_pos != -1, "speakWord missing Tier 2 Open Audio Stream"
    assert tier3_pos != -1, "speakWord missing Tier 3 Backend Proxy"
    assert tier4_pos != -1, "speakWord missing Tier 4 SpeechSynthesis fallback"
    assert tier1_pos < tier2_pos < tier3_pos < tier4_pos, \
        "Incorrect fallback order: Tier 1 (Dict API) -> Tier 2 (Open Dict) -> Tier 3 (Backend Proxy) -> Tier 4 (SpeechSynthesis)"
    
    assert "currentAudioPlayToken" in speak_body, "speakWord missing token check"
    print("✅ 4-Tier resilient playback hierarchy verified: PASS")

    print("\n🎉 ALL FLASHCARD AUDIO, STREAM, AND CACHE TESTS PASSED!")

if __name__ == "__main__":
    test_audio_webview()
