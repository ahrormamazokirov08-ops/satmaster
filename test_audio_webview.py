#!/usr/bin/env python3
"""
Test Suite: Telegram Mobile WebView Audio Playback & Google TTS Fallback
========================================================================
Verifies pure HTML5 audio element streaming, silent WAV audio context unlocking,
Google Translate direct TTS fallback, and HTTPS protocol sanitization in index.html.
"""

import os
import re

def test_audio_webview():
    html_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "index.html")
    with open(html_path, "r", encoding="utf-8") as f:
        html = f.read()

    print("==================================================================")
    print("🧪 MOBILE WEBVIEW AUDIO PLAYBACK & GOOGLE TTS FALLBACK SUITE")
    print("==================================================================")

    # 1. Mobile Audio Context Unlock (Silent WAV base64)
    print("\n--- Test 1: Mobile Audio Context Unlock ---")
    assert "unlockMobileAudio" in html, "Missing unlockMobileAudio function"
    assert "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA" in html, \
        "Missing silent WAV base64 data URI in unlockMobileAudio"
    
    # Check that unlockMobileAudio is attached to global first interaction
    assert "handleFirstGesture" in html, "Missing first gesture listener"
    assert "window.addEventListener('touchstart', handleFirstGesture" in html, "Missing touchstart first gesture unlock"
    assert "window.addEventListener('click', handleFirstGesture" in html, "Missing click first gesture unlock"

    # Check that speakWord calls unlockMobileAudio synchronously
    speak_idx = html.find("async function speakWord(word, accent = 'US', btnEl = null)")
    assert speak_idx != -1, "Could not find speakWord function declaration"
    speak_chunk = html[speak_idx:speak_idx + 400]
    assert "unlockMobileAudio();" in speak_chunk, "speakWord must invoke unlockMobileAudio() synchronously at entry"
    print("✅ Silent WAV mobile audio context unlock & gesture listeners verified: PASS")

    # 2. HTTPS Protocol Sanitization
    print("\n--- Test 2: Audio URL Sanitization (Force HTTPS) ---")
    assert "function sanitizeAudioUrl(url)" in html, "Missing sanitizeAudioUrl function"
    sanitizer_idx = html.find("function sanitizeAudioUrl(url)")
    sanitizer_end = html.find("function getGoogleTtsAudioUrl", sanitizer_idx)
    sanitizer_body = html[sanitizer_idx:sanitizer_end]
    assert "https:" in sanitizer_body, "sanitizeAudioUrl missing https enforcement"
    assert "replace(/^http:\\/\\//i, 'https://')" in sanitizer_body or "replace(/^http:\\/\\//i" in sanitizer_body, \
        "sanitizeAudioUrl missing http -> https replacement"
    print("✅ HTTPS protocol normalization verified: PASS")

    # 3. Google Translate TTS Endpoint Format
    print("\n--- Test 3: Google Translate Direct TTS Endpoint ---")
    assert "function getGoogleTtsAudioUrl(word, accent = 'US')" in html, "Missing getGoogleTtsAudioUrl function"
    tts_idx = html.find("function getGoogleTtsAudioUrl(word, accent = 'US')")
    tts_end = html.find("function applyAudioButtonFeedback", tts_idx)
    tts_body = html[tts_idx:tts_end]
    assert "https://translate.google.com/translate_tts" in tts_body, "Missing translate.google.com endpoint"
    assert "client=tw-ob" in tts_body, "Missing client=tw-ob parameter for direct MP3 streaming"
    assert "en-US" in tts_body and "en-GB" in tts_body, "Missing en-US and en-GB language options"
    print("✅ Google Translate direct TTS URLs (US/UK) verified: PASS")

    # 4. Pure HTML5 Audio Element Stream Player
    print("\n--- Test 4: Pure HTML5 Audio Stream Player ---")
    assert "function playAudioStream(url, playToken)" in html, "Missing playAudioStream helper"
    stream_idx = html.find("function playAudioStream(url, playToken)")
    stream_end = html.find("function fallbackSpeakWord", stream_idx)
    stream_body = html[stream_idx:stream_end]
    assert "new Audio()" in stream_body or "getSharedVocabAudio()" in stream_body, "playAudioStream must use HTML5 Audio"
    assert "audio.onended" in stream_body, "playAudioStream must listen to onended"
    assert "audio.onerror" in stream_body, "playAudioStream must listen to onerror"
    assert "audio.play()" in stream_body, "playAudioStream must execute play()"
    print("✅ Pure HTML5 audio stream player verified: PASS")

    # 5. Playback Hierarchy in speakWord
    print("\n--- Test 5: Multi-Tier Playback Hierarchy in speakWord ---")
    speak_end = html.find("function speakCurrentQuizWord", speak_idx)
    speak_body = html[speak_idx:speak_end]
    
    # Check that Step 1 is Dictionary API, Step 2 is Google TTS, Step 3 is SpeechSynthesis
    step1_pos = speak_body.find("getDictionaryAudioUrl")
    step2_pos = speak_body.find("getGoogleTtsAudioUrl")
    step3_pos = speak_body.find("fallbackSpeakWord")
    
    assert step1_pos != -1, "speakWord missing getDictionaryAudioUrl lookup"
    assert step2_pos != -1, "speakWord missing getGoogleTtsAudioUrl fallback"
    assert step3_pos != -1, "speakWord missing fallbackSpeakWord last resort"
    assert step1_pos < step2_pos < step3_pos, "Incorrect fallback hierarchy: must be Dictionary API -> Google TTS -> SpeechSynthesis"
    
    # Check that race conditions are prevented with tokens
    assert "currentAudioPlayToken" in speak_body, "speakWord missing currentAudioPlayToken check"
    
    # Check that misleading toasts are NOT shown
    assert "Web Speech audio is not supported in this browser" not in html, \
        "Disallowed misleading 'Web Speech audio is not supported' alert string found in index.html"
    print("✅ Fallback hierarchy (Dictionary API -> Google TTS -> SpeechSynthesis) verified: PASS")

    print("\n🎉 ALL MOBILE WEBVIEW AUDIO PLAYBACK TESTS PASSED!")

if __name__ == "__main__":
    test_audio_webview()
