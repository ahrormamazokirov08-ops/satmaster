/**
 * "Do You Love Me?" Romantic Questionnaire
 * Mobile-First Interactive Experience
 */

(function () {
  'use strict';

  // ==========================================
  // 1. Questionnaire Data Definition
  // ==========================================
  const QUESTIONS = [
    {
      id: 1,
      question: "Ready for a little quiz?",
      positiveText: "Yes",
      negativeText: "Let's go",
      isDodging: false,
      isIntroAlternative: true // Both options advance warmly
    },
    {
      id: 2,
      question: "Do you think about me during the day?",
      positiveText: "Yes",
      negativeText: "No",
      isDodging: false
    },
    {
      id: 3,
      question: "Have you ever stalked my Telegram at 2am?",
      positiveText: "Yes",
      negativeText: "No",
      isDodging: true // Dodging button
    },
    {
      id: 4,
      question: "Do I make you laugh more than anyone else?",
      positiveText: "Yes",
      negativeText: "No",
      isDodging: false
    },
    {
      id: 5,
      question: "Do I actually look handsome, or are you just being nice?",
      positiveText: "Yes",
      negativeText: "Honestly no",
      isDodging: true // Dodging button
    },
    {
      id: 6,
      WouldYouPickMeAgain: true,
      question: "Would you pick me again if you could redo it all?",
      positiveText: "Yes",
      negativeText: "No",
      isDodging: false
    },
    {
      id: 7,
      question: "Do you miss me when I'm not around?",
      positiveText: "Yes",
      negativeText: "No",
      isDodging: true // The big dodging challenge!
    },
    {
      id: 8,
      question: "Do you love me?",
      positiveText: "Yes",
      negativeText: "No",
      isDodging: false // Normal, easy, satisfying finale
    }
  ];

  // Playful dodging feedback phrases
  const DODGE_PHRASES = [
    "Nope! 😉",
    "Nice try! 🏃💨",
    "Too slow! ✨",
    "You know the truth 💛",
    "Can't click that! 😂",
    "Almost... not! 😜",
    "Just tap Yes already 💫"
  ];

  // ==========================================
  // 2. Application State
  // ==========================================
  const state = {
    currentIndex: -1, // -1: Intro, 0..7: Questions, 8: End
    answers: [],
    dodgeCounts: {}, // questionId -> count
    isSoundEnabled: true,
    telegramUser: null,
    finalRedirectUrl: (window.QUIZ_CONFIG && window.QUIZ_CONFIG.FINAL_REDIRECT_URL) || "[INSERT YOUR LINK HERE]"
  };

  // ==========================================
  // 3. DOM Elements
  // ==========================================
  const dom = {
    viewIntro: document.getElementById('view-intro'),
    viewQuestion: document.getElementById('view-question'),
    viewEnd: document.getElementById('view-end'),
    startQuizBtn: document.getElementById('start-quiz-btn'),
    progressContainer: document.getElementById('progress-container'),
    progressDots: document.getElementById('progress-dots'),
    questionStepLabel: document.getElementById('question-step-label'),
    questionTitle: document.getElementById('question-title'),
    dodgeFeedback: document.getElementById('dodge-feedback'),
    buttonArena: document.getElementById('button-arena'),
    btnGroup: document.getElementById('btn-group'),
    btnPositive: document.getElementById('btn-positive'),
    btnNegative: document.getElementById('btn-negative'),
    positiveText: document.getElementById('positive-text'),
    negativeText: document.getElementById('negative-text'),
    soundBtn: document.getElementById('sound-btn'),
    soundIcon: document.getElementById('sound-icon'),
    countdownNum: document.getElementById('countdown-num'),
    redirectStatusText: document.getElementById('redirect-status-text'),
    finalRedirectBtn: document.getElementById('final-redirect-btn'),
    finalRedirectBtnText: document.getElementById('final-redirect-btn-text'),
    ambientCanvas: document.getElementById('ambient-canvas'),
    confettiCanvas: document.getElementById('confetti-canvas'),
    mainCard: document.getElementById('main-card')
  };

  // ==========================================
  // 4. Telegram WebApp Integration
  // ==========================================
  function initTelegramWebApp() {
    if (window.Telegram && window.Telegram.WebApp) {
      const tg = window.Telegram.WebApp;
      try {
        tg.ready();
        tg.expand();
        if (tg.setHeaderColor) tg.setHeaderColor('#1a0a0f');
        if (tg.setBackgroundColor) tg.setBackgroundColor('#1a0a0f');
        
        if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
          state.telegramUser = tg.initDataUnsafe.user;
        }
      } catch (e) {
        console.log('Telegram WebApp init note:', e);
      }
    }
  }

  function triggerHaptic(type = 'light') {
    // 1. Try Telegram native haptics
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
      try {
        if (type === 'success') {
          window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        } else if (type === 'warning') {
          window.Telegram.WebApp.HapticFeedback.notificationOccurred('warning');
        } else {
          window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
        }
        return;
      } catch (e) {}
    }

    // 2. Standard navigator.vibrate fallback
    if (navigator.vibrate) {
      try {
        if (type === 'success') navigator.vibrate([30, 50, 40]);
        else if (type === 'warning') navigator.vibrate([15, 30, 15]);
        else navigator.vibrate(20);
      } catch (e) {}
    }
  }

  // ==========================================
  // 5. Audio Synthesizer (Zero asset dependencies)
  // ==========================================
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContextClass();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playTone(freq, type = 'sine', duration = 0.35, delay = 0, gainLevel = 0.15) {
    if (!state.isSoundEnabled || !audioCtx) return;

    setTimeout(() => {
      try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

        gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(gainLevel, audioCtx.currentTime + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + duration + 0.05);
      } catch (e) {}
    }, delay * 1000);
  }

  function playChime() {
    initAudio();
    // Warm romantic major pentatonic chime (Eb5, G5, Bb5)
    playTone(622.25, 'sine', 0.28, 0, 0.12);
    playTone(783.99, 'sine', 0.35, 0.08, 0.14);
    playTone(932.33, 'triangle', 0.45, 0.16, 0.12);
  }

  function playDodgeSound() {
    initAudio();
    // Playful quick blip
    playTone(480, 'sine', 0.1, 0, 0.08);
    playTone(640, 'sine', 0.12, 0.05, 0.08);
  }

  function playCelebrationChord() {
    initAudio();
    // Shimmering romantic celebration arpeggio
    const chord = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    chord.forEach((note, index) => {
      playTone(note, 'sine', 0.6, index * 0.09, 0.16);
    });
  }

  // ==========================================
  // 6. Progress Dots Setup
  // ==========================================
  function createProgressDots() {
    dom.progressDots.innerHTML = '';
    QUESTIONS.forEach((q, index) => {
      const dot = document.createElement('div');
      dot.className = 'dot';
      dot.id = `dot-${index}`;
      dot.setAttribute('title', `Question ${index + 1}`);
      dom.progressDots.appendChild(dot);
    });
  }

  function updateProgressDots(currentIndex) {
    QUESTIONS.forEach((q, index) => {
      const dot = document.getElementById(`dot-${index}`);
      if (!dot) return;
      dot.classList.remove('active', 'passed');
      if (index < currentIndex) {
        dot.classList.add('passed');
      } else if (index === currentIndex) {
        dot.classList.add('active');
      }
    });
  }

  // ==========================================
  // 7. Dodging Button Physics & Logic
  // ==========================================
  let isNegativeDodging = false;
  let dodgeTimeout = null;

  function resetNegativeButton() {
    isNegativeDodging = false;
    dom.btnNegative.classList.remove('btn-dodging');
    dom.btnNegative.style.position = '';
    dom.btnNegative.style.top = '';
    dom.btnNegative.style.left = '';
    dom.btnNegative.style.transform = '';
    dom.dodgeFeedback.classList.remove('visible');
    dom.dodgeFeedback.textContent = '';
  }

  function setupNegativeDodging(currentQ) {
    resetNegativeButton();

    if (!currentQ.isDodging) {
      return;
    }

    isNegativeDodging = true;
    if (!state.dodgeCounts[currentQ.id]) {
      state.dodgeCounts[currentQ.id] = 0;
    }
  }

  function executeDodge() {
    const currentQ = QUESTIONS[state.currentIndex];
    if (!currentQ || !currentQ.isDodging) return;

    state.dodgeCounts[currentQ.id] = (state.dodgeCounts[currentQ.id] || 0) + 1;
    const dodgeNum = state.dodgeCounts[currentQ.id];

    triggerHaptic('warning');
    playDodgeSound();

    // Show dynamic teasing phrase
    const phrase = DODGE_PHRASES[(dodgeNum - 1) % DODGE_PHRASES.length];
    dom.dodgeFeedback.textContent = phrase;
    dom.dodgeFeedback.classList.add('visible');

    // Switch button to absolute positioning within the card
    if (!dom.btnNegative.classList.contains('btn-dodging')) {
      dom.btnNegative.classList.add('btn-dodging');
    }

    // Calculate safe bounding boundaries within the main card
    const cardRect = dom.mainCard.getBoundingClientRect();
    const btnRect = dom.btnNegative.getBoundingClientRect();
    const posBtnRect = dom.btnPositive.getBoundingClientRect();

    const padding = 16;
    const minX = padding;
    const maxX = cardRect.width - btnRect.width - padding;

    // Keep button in the lower interactive half of the card
    const minY = Math.max(140, cardRect.height - 150);
    const maxY = cardRect.height - btnRect.height - padding;

    // Find a random position sufficiently far from previous and not covering Yes button
    let randomX = Math.floor(Math.random() * (maxX - minX + 1)) + minX;
    let randomY = Math.floor(Math.random() * (maxY - minY + 1)) + minY;

    // Slight playful random tilt (-6deg to +6deg)
    const randomAngle = (Math.random() * 12 - 6).toFixed(1);

    dom.btnNegative.style.left = `${randomX}px`;
    dom.btnNegative.style.top = `${randomY}px`;
    dom.btnNegative.style.transform = `rotate(${randomAngle}deg) scale(0.98)`;

    // Hide feedback message after 1.8s of inactivity
    clearTimeout(dodgeTimeout);
    dodgeTimeout = setTimeout(() => {
      dom.dodgeFeedback.classList.remove('visible');
    }, 1800);
  }

  // Pointer proximity detection for desktop
  function handlePointerMove(e) {
    const currentQ = QUESTIONS[state.currentIndex];
    if (!currentQ || !currentQ.isDodging) return;

    const btnRect = dom.btnNegative.getBoundingClientRect();
    const btnCenterX = btnRect.left + btnRect.width / 2;
    const btnCenterY = btnRect.top + btnRect.height / 2;

    const distance = Math.hypot(e.clientX - btnCenterX, e.clientY - btnCenterY);

    // If mouse gets within 75px radius, dodge away!
    if (distance < 75) {
      executeDodge();
    }
  }

  // ==========================================
  // 8. Questionnaire Flow & Views
  // ==========================================
  function showView(viewName) {
    [dom.viewIntro, dom.viewQuestion, dom.viewEnd].forEach(view => {
      view.classList.remove('active', 'slide-in-right');
    });

    if (viewName === 'intro') {
      dom.viewIntro.classList.add('active');
      dom.progressContainer.style.display = 'none';
    } else if (viewName === 'question') {
      dom.viewQuestion.classList.add('active', 'slide-in-right');
      dom.progressContainer.style.display = 'flex';
    } else if (viewName === 'end') {
      dom.viewEnd.classList.add('active', 'slide-in-right');
      dom.progressContainer.style.display = 'none';
    }
  }

  function startQuiz() {
    initAudio();
    playChime();
    triggerHaptic('light');
    createProgressDots();
    state.currentIndex = 0;
    renderCurrentQuestion();
    showView('question');
  }

  function renderCurrentQuestion() {
    const q = QUESTIONS[state.currentIndex];
    if (!q) return;

    updateProgressDots(state.currentIndex);

    dom.questionStepLabel.textContent = `Question ${state.currentIndex + 1} of ${QUESTIONS.length}`;
    dom.questionTitle.textContent = q.question;
    dom.positiveText.textContent = q.positiveText;
    dom.negativeText.textContent = q.negativeText;

    setupNegativeDodging(q);
  }

  function handleAnswer(answerText) {
    const currentQ = QUESTIONS[state.currentIndex];
    if (!currentQ) return;

    playChime();
    triggerHaptic('light');

    // Record answer
    const dodgeCount = state.dodgeCounts[currentQ.id] || 0;
    state.answers.push({
      questionId: currentQ.id,
      question: currentQ.question,
      answer: answerText,
      dodgeCount: dodgeCount
    });

    // Advance to next question or end
    if (state.currentIndex < QUESTIONS.length - 1) {
      state.currentIndex++;
      renderCurrentQuestion();
    } else {
      finishQuiz();
    }
  }

  // ==========================================
  // 9. Celebration & Backend Telegram Submission
  // ==========================================
  async function finishQuiz() {
    showView('end');
    playCelebrationChord();
    triggerHaptic('success');
    triggerConfetti();

    // Prepare Telegram payload
    const payload = {
      answers: state.answers,
      user: state.telegramUser,
      timestamp: new Date().toISOString()
    };

    // Send answers to backend endpoint
    const endpoint = (window.QUIZ_CONFIG && window.QUIZ_CONFIG.API_ENDPOINT) || '/api/submit';
    try {
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(res => res.json())
      .then(data => {
        if (data.mock) {
          console.log('Quiz response received (mock mode):', data.message);
        } else {
          console.log('Quiz delivered to Telegram bot!', data);
        }
      })
      .catch(err => {
        console.warn('Backend submission note (offline or local preview):', err.message);
      });
    } catch (e) {
      console.warn('Fetch error:', e);
    }

    // Configure final destination link
    setupFinalRedirect();
  }

  function setupFinalRedirect() {
    let targetUrl = state.finalRedirectUrl;
    
    // Check if user has replaced placeholder
    const isPlaceholder = !targetUrl || targetUrl.includes('INSERT YOUR LINK HERE');

    if (isPlaceholder) {
      dom.redirectStatusText.textContent = "You're the best thing that ever happened to me 💛";
      dom.finalRedirectBtn.style.display = 'none';
      return;
    }

    dom.finalRedirectBtn.href = targetUrl;
    dom.finalRedirectBtn.style.display = 'inline-flex';

    const delayMs = (window.QUIZ_CONFIG && window.QUIZ_CONFIG.REDIRECT_DELAY_MS) || 3800;

    if (delayMs > 0) {
      let secondsLeft = Math.ceil(delayMs / 1000);
      dom.countdownNum.textContent = secondsLeft;

      const countdownInterval = setInterval(() => {
        secondsLeft--;
        if (secondsLeft > 0) {
          dom.countdownNum.textContent = secondsLeft;
        } else {
          clearInterval(countdownInterval);
          dom.redirectStatusText.textContent = "Redirecting with love... 💛";
          window.location.href = targetUrl;
        }
      }, 1000);
    } else {
      dom.redirectStatusText.style.display = 'none';
    }
  }

  // ==========================================
  // 10. Ambient Canvas Particles (Hearts & Stardust)
  // ==========================================
  function initAmbientCanvas() {
    const canvas = dom.ambientCanvas;
    const ctx = canvas.getContext('2d');

    let width, height;
    function resize() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    const particles = [];
    const PARTICLE_COUNT = 24;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 12 + 8,
        speedY: Math.random() * 0.45 + 0.25,
        speedX: Math.random() * 0.3 - 0.15,
        opacity: Math.random() * 0.35 + 0.15,
        pulseSpeed: Math.random() * 0.02 + 0.01,
        pulseVal: Math.random() * Math.PI * 2,
        isHeart: Math.random() > 0.4
      });
    }

    function drawHeart(ctx, x, y, size, opacity) {
      ctx.save();
      ctx.beginPath();
      const topCurveHeight = size * 0.3;
      ctx.moveTo(x, y + topCurveHeight);
      ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + topCurveHeight);
      ctx.bezierCurveTo(x - size / 2, y + (size + topCurveHeight) / 2, x, y + size, x, y + size);
      ctx.bezierCurveTo(x, y + size, x + size / 2, y + (size + topCurveHeight) / 2, x + size / 2, y + topCurveHeight);
      ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + topCurveHeight);
      ctx.closePath();
      
      // Warm gold & ruby glow
      ctx.fillStyle = `rgba(212, 175, 55, ${opacity * 0.85})`;
      ctx.shadowColor = 'rgba(212, 175, 55, 0.4)';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.restore();
    }

    function drawStar(ctx, x, y, size, opacity) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, size * 0.18, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 235, 170, ${opacity})`;
      ctx.shadowColor = 'rgba(255, 215, 0, 0.6)';
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.restore();
    }

    function renderAmbient() {
      ctx.clearRect(0, 0, width, height);

      particles.forEach(p => {
        p.y -= p.speedY;
        p.x += p.speedX;
        p.pulseVal += p.pulseSpeed;

        const currentOpacity = p.opacity * (0.8 + 0.3 * Math.sin(p.pulseVal));

        if (p.isHeart) {
          drawHeart(ctx, p.x, p.y, p.size, currentOpacity);
        } else {
          drawStar(ctx, p.x, p.y, p.size, currentOpacity);
        }

        // Recycle particle when it floats past top
        if (p.y < -30) {
          p.y = height + 20;
          p.x = Math.random() * width;
        }
        if (p.x < -20) p.x = width + 20;
        if (p.x > width + 20) p.x = -20;
      });

      requestAnimationFrame(renderAmbient);
    }

    renderAmbient();
  }

  // ==========================================
  // 11. Grand Finale Confetti (Hearts & Gold Stars)
  // ==========================================
  function triggerConfetti() {
    const canvas = dom.confettiCanvas;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const confettiList = [];
    const COUNT = 70;
    const colors = ['#d4af37', '#f6e594', '#ff4d6d', '#ff758f', '#ffffff'];

    for (let i = 0; i < COUNT; i++) {
      confettiList.push({
        x: canvas.width / 2,
        y: canvas.height / 2 + 50,
        vx: (Math.random() - 0.5) * 14,
        vy: -Math.random() * 14 - 6,
        size: Math.random() * 14 + 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 10,
        gravity: 0.32,
        isHeart: Math.random() > 0.45,
        alpha: 1
      });
    }

    function renderConfetti() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let aliveCount = 0;

      confettiList.forEach(c => {
        c.x += c.vx;
        c.y += c.vy;
        c.vy += c.gravity;
        c.rotation += c.rotSpeed;
        c.alpha -= 0.007;

        if (c.alpha > 0) {
          aliveCount++;
          ctx.save();
          ctx.translate(c.x, c.y);
          ctx.rotate((c.rotation * Math.PI) / 180);
          ctx.globalAlpha = Math.max(0, c.alpha);
          ctx.fillStyle = c.color;

          if (c.isHeart) {
            // Mini heart shape
            ctx.beginPath();
            const s = c.size * 0.7;
            ctx.moveTo(0, s * 0.3);
            ctx.bezierCurveTo(0, 0, -s / 2, 0, -s / 2, s * 0.3);
            ctx.bezierCurveTo(-s / 2, s * 0.7, 0, s, 0, s);
            ctx.bezierCurveTo(0, s, s / 2, s * 0.7, s / 2, s * 0.3);
            ctx.bezierCurveTo(s / 2, 0, 0, 0, 0, s * 0.3);
            ctx.fill();
          } else {
            // Gold foil confetti flake
            ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size * 0.6);
          }
          ctx.restore();
        }
      });

      if (aliveCount > 0) {
        requestAnimationFrame(renderConfetti);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    renderConfetti();
  }

  // ==========================================
  // 12. Event Listeners & Binding
  // ==========================================
  function bindEvents() {
    // Start Quiz
    dom.startQuizBtn.addEventListener('click', () => {
      startQuiz();
    });

    // Sound toggle button
    dom.soundBtn.addEventListener('click', () => {
      state.isSoundEnabled = !state.isSoundEnabled;
      dom.soundIcon.textContent = state.isSoundEnabled ? '✨' : '🔇';
      dom.soundBtn.setAttribute('aria-label', state.isSoundEnabled ? 'Mute sound' : 'Unmute sound');
      if (state.isSoundEnabled) playChime();
    });

    // Positive Button ("Yes" or positive alternative)
    dom.btnPositive.addEventListener('click', () => {
      const q = QUESTIONS[state.currentIndex];
      handleAnswer(q.positiveText);
    });

    // Negative Button interaction
    // Touch Devices (Mobile priority for Telegram):
    dom.btnNegative.addEventListener('touchstart', (e) => {
      const currentQ = QUESTIONS[state.currentIndex];
      if (currentQ && currentQ.isDodging) {
        e.preventDefault(); // Prevent accidental click registration
        executeDodge();
      }
    }, { passive: false });

    dom.btnNegative.addEventListener('pointerdown', (e) => {
      const currentQ = QUESTIONS[state.currentIndex];
      if (currentQ && currentQ.isDodging) {
        e.preventDefault();
        executeDodge();
      }
    });

    // Hover / Proximity on Desktop
    dom.btnNegative.addEventListener('mouseenter', () => {
      const currentQ = QUESTIONS[state.currentIndex];
      if (currentQ && currentQ.isDodging) {
        executeDodge();
      }
    });

    // Desktop pointer movement proximity
    window.addEventListener('pointermove', handlePointerMove);

    // Click handler for normal (non-dodging) negative answers
    dom.btnNegative.addEventListener('click', (e) => {
      const currentQ = QUESTIONS[state.currentIndex];
      if (!currentQ) return;

      if (currentQ.isDodging) {
        e.preventDefault();
        executeDodge();
        return;
      }

      // Normal negative response (e.g. Q1 "Let's go", Q2, Q4, Q6, Q8)
      handleAnswer(currentQ.negativeText);
    });

    // Fetch dynamic backend config (if available)
    fetch('/api/config')
      .then(res => res.json())
      .then(cfg => {
        if (cfg.finalRedirectUrl) {
          state.finalRedirectUrl = cfg.finalRedirectUrl;
        }
      })
      .catch(() => {});
  }

  // ==========================================
  // 13. Initialization
  // ==========================================
  function init() {
    initTelegramWebApp();
    initAmbientCanvas();
    bindEvents();
    showView('intro');
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
