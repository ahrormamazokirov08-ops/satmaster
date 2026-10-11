/**
 * public/qb_engine.js
 * Session Generator State Engine for Bluebook Question Bank Practice.
 * Handles question dataset loading, dynamic filter matching,
 * session randomization, and sessionStorage persistence.
 */

window.qbEngine = {
  activeSubject: 'rw', // 'rw' | 'math' | 'combined'
  activeDifficulties: new Set(['Easy', 'Medium', 'Hard']),
  activeCount: 15,
  isCustomCount: false,
  questionsData: { rw: null, math: null },
  isLoading: false,
  isInitialized: false,
  timerInterval: null,
  isTimerHidden: false,

  async init(defaultSubj) {
    // Check if student lockout is active
    const isStudent = (typeof currentUserRole !== 'undefined' && currentUserRole === 'student');
    const isPub = (typeof isQBankPublished === 'function' ? isQBankPublished() : false);
    if (isStudent && !isPub) {
      if (typeof showToast === 'function') {
        showToast("🔒 Question Bank in Draft Mode", "The Question Bank is currently in teacher preview mode and unavailable to students.", "warning");
      }
      const setupView = document.getElementById('qb-setup-view');
      const testContainer = document.getElementById('qb-test-container');
      if (setupView) setupView.classList.add('hidden');
      if (testContainer) testContainer.classList.add('hidden');
      if (typeof switchTab === 'function') switchTab('vocab');
      return;
    }

    // Show setup view, hide test container and legacy views
    const setupView = document.getElementById('qb-setup-view');
    const testContainer = document.getElementById('qb-test-container');
    const hubView = document.getElementById('qbank-hub-view');
    const solverView = document.getElementById('qbank-solver-view');

    if (setupView) setupView.classList.remove('hidden');
    if (testContainer) testContainer.classList.add('hidden');
    if (hubView) hubView.classList.add('hidden');
    if (solverView) solverView.classList.add('hidden');

    if (defaultSubj && ['rw', 'math', 'combined'].includes(defaultSubj)) {
      this.activeSubject = defaultSubj;
    }

    if (!this.isInitialized) {
      this.isInitialized = true;
      this.syncUI();
      if (defaultSubj) this.setSubject(defaultSubj);
      await this.loadQuestions();
    } else {
      if (defaultSubj) this.setSubject(defaultSubj);
      this.updateMatchingCount();
    }
  },

  async loadQuestions() {
    if (this.questionsData.rw && this.questionsData.math) {
      this.updateMatchingCount();
      return;
    }

    this.isLoading = true;
    const countEl = document.getElementById('qb-matching-count');
    if (countEl) countEl.innerText = "⏳ Loading College Board question datasets...";

    try {
      const fetchWithFallback = async (relPath) => {
        const candidates = [
          relPath,
          '/' + relPath,
          './' + relPath,
          '../' + relPath,
          'public/' + relPath,
          '/public/' + relPath
        ];
        for (const path of candidates) {
          try {
            const res = await fetch(path);
            if (res.ok) return await res.json();
          } catch (e) {}
        }
        throw new Error(`Failed to load ${relPath}`);
      };

      const [rwQuestions, mathQuestions] = await Promise.all([
        fetchWithFallback('data/questions/reading_writing.json'),
        fetchWithFallback('data/questions/math.json')
      ]);

      this.questionsData.rw = rwQuestions || [];
      this.questionsData.math = mathQuestions || [];
      this.isLoading = false;
      this.updateMatchingCount();
    } catch (err) {
      console.error("[qbEngine] Error loading questions:", err);
      this.isLoading = false;
      if (countEl) {
        countEl.innerHTML = `<span class="text-rose-400">⚠️ Unable to load question dataset files: ${err.message}</span>`;
      }
    }
  },

  setSubject(subj) {
    if (!['rw', 'math', 'combined'].includes(subj)) return;
    this.activeSubject = subj;

    // Update subject tab styling
    ['rw', 'math', 'combined'].forEach(s => {
      const tab = document.getElementById(`qb-tab-${s}`);
      if (tab) {
        if (s === subj) {
          tab.className = "qb-subject-tab py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all text-center flex items-center justify-center gap-2 bg-blue-600 text-white shadow-md";
        } else {
          tab.className = "qb-subject-tab py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all text-center flex items-center justify-center gap-2 text-slate-400 hover:text-white";
        }
      }
    });

    // Update Domain grids visibility
    const rwWrapper = document.getElementById('qb-domains-rw-wrapper');
    const mathWrapper = document.getElementById('qb-domains-math-wrapper');

    if (rwWrapper) {
      if (subj === 'rw' || subj === 'combined') {
        rwWrapper.classList.remove('hidden');
      } else {
        rwWrapper.classList.add('hidden');
      }
    }

    if (mathWrapper) {
      if (subj === 'math' || subj === 'combined') {
        mathWrapper.classList.remove('hidden');
      } else {
        mathWrapper.classList.add('hidden');
      }
    }

    this.updateToggleDomainsButtonText();
    this.updateMatchingCount();
  },

  getActiveDomains() {
    const active = new Set();
    const getCheckedIn = (containerId) => {
      const container = document.getElementById(containerId);
      if (!container) return;
      const cbs = container.querySelectorAll('input.qb-domain-cb');
      cbs.forEach(cb => {
        if (cb.checked) active.add(cb.value);
      });
    };

    if (this.activeSubject === 'rw' || this.activeSubject === 'combined') {
      getCheckedIn('qb-domains-rw-grid');
    }
    if (this.activeSubject === 'math' || this.activeSubject === 'combined') {
      getCheckedIn('qb-domains-math-grid');
    }
    return active;
  },

  getVisibleDomainCheckboxes() {
    const cbs = [];
    if (this.activeSubject === 'rw' || this.activeSubject === 'combined') {
      const c1 = document.getElementById('qb-domains-rw-grid');
      if (c1) cbs.push(...c1.querySelectorAll('input.qb-domain-cb'));
    }
    if (this.activeSubject === 'math' || this.activeSubject === 'combined') {
      const c2 = document.getElementById('qb-domains-math-grid');
      if (c2) cbs.push(...c2.querySelectorAll('input.qb-domain-cb'));
    }
    return cbs;
  },

  toggleAllDomains() {
    const cbs = this.getVisibleDomainCheckboxes();
    if (!cbs || cbs.length === 0) return;

    const allChecked = cbs.every(cb => cb.checked);
    cbs.forEach(cb => {
      cb.checked = !allChecked;
    });

    this.updateToggleDomainsButtonText();
    this.updateMatchingCount();
  },

  updateToggleDomainsButtonText() {
    const btn = document.getElementById('qb-btn-toggle-domains');
    if (!btn) return;
    const cbs = this.getVisibleDomainCheckboxes();
    const allChecked = cbs.length > 0 && cbs.every(cb => cb.checked);
    btn.innerHTML = allChecked ? "<span>Deselect All</span>" : "<span>Select All</span>";
  },

  onDomainChange() {
    this.updateToggleDomainsButtonText();
    this.updateMatchingCount();
  },

  toggleDifficulty(diff) {
    if (this.activeDifficulties.has(diff)) {
      if (this.activeDifficulties.size > 1) {
        this.activeDifficulties.delete(diff);
      }
    } else {
      this.activeDifficulties.add(diff);
    }

    this.syncDifficultyUI();
    this.updateMatchingCount();
  },

  syncDifficultyUI() {
    const colorConfigs = {
      Easy: { active: 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300', dot: 'bg-emerald-400' },
      Medium: { active: 'bg-amber-500/15 border-amber-500/50 text-amber-300', dot: 'bg-amber-400' },
      Hard: { active: 'bg-rose-500/15 border-rose-500/50 text-rose-300', dot: 'bg-rose-400' }
    };

    ['Easy', 'Medium', 'Hard'].forEach(diff => {
      const btn = document.getElementById(`qb-diff-${diff}`);
      if (!btn) return;
      const isAct = this.activeDifficulties.has(diff);
      const conf = colorConfigs[diff];
      if (isAct) {
        btn.className = `qb-diff-pill px-5 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${conf.active} shadow-sm`;
      } else {
        btn.className = `qb-diff-pill px-5 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all bg-slate-900 border-[#334155] text-slate-500 hover:text-slate-300`;
      }
    });
  },

  setCount(cnt) {
    if (cnt === 'custom') {
      this.isCustomCount = true;
      const wrapper = document.getElementById('qb-custom-count-wrapper');
      if (wrapper) wrapper.classList.remove('hidden');
      const input = document.getElementById('qb-custom-count-input');
      if (input) this.activeCount = parseInt(input.value) || 25;
    } else {
      this.isCustomCount = false;
      this.activeCount = parseInt(cnt) || 15;
      const wrapper = document.getElementById('qb-custom-count-wrapper');
      if (wrapper) wrapper.classList.add('hidden');
    }

    this.syncCountUI();
  },

  onCustomCountInput(val) {
    const num = parseInt(val);
    if (!isNaN(num) && num > 0) {
      this.activeCount = Math.min(100, Math.max(1, num));
    }
  },

  syncCountUI() {
    const counts = [5, 10, 15, 20, 30, 'custom'];
    counts.forEach(c => {
      const btn = document.getElementById(`qb-count-${c}`);
      if (!btn) return;
      const isAct = (c === 'custom' && this.isCustomCount) || (!this.isCustomCount && this.activeCount === c);
      if (isAct) {
        btn.className = "qb-count-btn px-4 py-2 rounded-xl border text-xs font-bold transition-all bg-blue-600 border-blue-500 text-white shadow-sm";
      } else {
        btn.className = "qb-count-btn px-4 py-2 rounded-xl border text-xs font-bold transition-all bg-slate-900 border-[#334155] text-slate-300 hover:text-white";
      }
    });
  },

  syncUI() {
    this.syncDifficultyUI();
    this.syncCountUI();
    this.updateToggleDomainsButtonText();
  },

  getFilteredQuestions() {
    let pool = [];
    if (this.activeSubject === 'rw') {
      pool = this.questionsData.rw || [];
    } else if (this.activeSubject === 'math') {
      pool = this.questionsData.math || [];
    } else {
      pool = [...(this.questionsData.rw || []), ...(this.questionsData.math || [])];
    }

    const activeDomains = this.getActiveDomains();
    if (activeDomains.size === 0) return [];

    // Normalize domain lookup helper
    const domainNorm = (d) => (d || '').toLowerCase().replace(/&/g, 'and').replace(/\s+/g, ' ').trim();
    const activeDomainNorms = new Set(Array.from(activeDomains).map(d => domainNorm(d)));

    return pool.filter(q => {
      const qDomNorm = domainNorm(q.domain);
      const matchesDomain = activeDomainNorms.has(qDomNorm);
      const matchesDiff = this.activeDifficulties.has(q.difficulty);
      return matchesDomain && matchesDiff;
    });
  },

  updateMatchingCount() {
    const countEl = document.getElementById('qb-matching-count');
    const poolDetailEl = document.getElementById('qb-pool-detail');
    const startBtn = document.getElementById('qb-btn-start');

    if (this.isLoading) return;

    const filtered = this.getFilteredQuestions();
    const totalCount = filtered.length;

    if (countEl) {
      if (totalCount > 0) {
        countEl.innerHTML = `⚡ <span class="text-sky-300 font-black">${totalCount.toLocaleString()}</span> questions available matching your filters`;
      } else {
        countEl.innerHTML = `<span class="text-amber-400 font-bold">⚠️ 0 questions matching these filters</span>`;
      }
    }

    if (poolDetailEl) {
      const subjName = this.activeSubject === 'rw' ? 'Reading & Writing' : (this.activeSubject === 'math' ? 'Math' : 'Combined');
      const diffList = Array.from(this.activeDifficulties).join(', ');
      const domainCount = this.getActiveDomains().size;
      poolDetailEl.innerText = `${subjName} • ${domainCount} active domain(s) • [${diffList}]`;
    }

    if (startBtn) {
      startBtn.disabled = (totalCount === 0);
    }
  },

  startPractice() {
    const isStudent = (typeof currentUserRole !== 'undefined' && currentUserRole === 'student');
    const isPub = (typeof isQBankPublished === 'function' ? isQBankPublished() : false);
    if (isStudent && !isPub) {
      if (typeof showToast === 'function') {
        showToast("🔒 Question Bank in Draft Mode", "The Question Bank is currently in teacher preview mode and unavailable to students.", "warning");
      }
      const setupView = document.getElementById('qb-setup-view');
      const testContainer = document.getElementById('qb-test-container');
      if (setupView) setupView.classList.add('hidden');
      if (testContainer) testContainer.classList.add('hidden');
      if (typeof switchTab === 'function') switchTab('vocab');
      return;
    }

    const filtered = this.getFilteredQuestions();
    if (!filtered || filtered.length === 0) {
      if (typeof showToast === 'function') {
        showToast("⚠️ No Matching Questions", "Please select at least one domain and difficulty with available questions.", "warning");
      } else {
        alert("No questions match your current filters.");
      }
      return;
    }

    // Determine target question count
    let targetCount = this.isCustomCount
      ? (parseInt(document.getElementById('qb-custom-count-input')?.value) || 25)
      : this.activeCount;

    targetCount = Math.max(1, Math.min(targetCount, filtered.length));

    // Fisher-Yates Shuffle
    const shuffled = [...filtered];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const selectedQuestions = shuffled.slice(0, targetCount);

    // Save active session state in sessionStorage
    const activeSession = {
      questions: selectedQuestions,
      currentIdx: 0,
      answers: {},
      timePerQuestion: {},
      flags: {},
      strikethroughs: {},
      config: {
        subject: this.activeSubject,
        domains: Array.from(this.getActiveDomains()),
        difficulties: Array.from(this.activeDifficulties),
        requestedCount: targetCount,
        totalAvailable: filtered.length
      },
      startedAt: Date.now()
    };

    sessionStorage.setItem('qb_active_session', JSON.stringify(activeSession));

    // Switch view to #qb-test-container
    const setupView = document.getElementById('qb-setup-view');
    const testContainer = document.getElementById('qb-test-container');

    if (setupView) setupView.classList.add('hidden');
    if (testContainer) testContainer.classList.remove('hidden');

    // Render current question
    this.renderCurrentQuestion();

    if (typeof showToast === 'function') {
      showToast("🚀 Session Initialized", `${selectedQuestions.length} practice questions loaded! Good luck!`, "success");
    }
  },

  renderCurrentQuestion() {
    let session = null;
    try {
      session = JSON.parse(sessionStorage.getItem('qb_active_session'));
    } catch (e) {}

    if (!session || !session.questions || session.questions.length === 0) {
      this.returnToSetup();
      return;
    }

    const idx = session.currentIdx || 0;
    const q = session.questions[idx];
    if (!q) return;

    // Header updates
    const headerSubj = document.getElementById('qb-header-subject');
    const headerDomain = document.getElementById('qb-header-domain');
    const headerQnum = document.getElementById('qb-header-qnum');
    const navBadge = document.getElementById('qb-nav-current-badge');
    const flagBtn = document.getElementById('qb-btn-flag');
    const flagIcon = document.getElementById('qb-flag-icon');
    const flagText = document.getElementById('qb-flag-text');

    if (headerSubj) headerSubj.innerText = `Section: ${q.subject || 'SAT Practice'}`;
    if (headerDomain) headerDomain.innerText = q.domain || '';
    if (headerQnum) headerQnum.innerText = `Question ${idx + 1} of ${session.questions.length}`;
    if (navBadge) navBadge.innerText = `${idx + 1} of ${session.questions.length}`;

    const isFlagged = Boolean(session.flags && session.flags[idx]);
    if (flagBtn) {
      if (isFlagged) {
        flagBtn.className = "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm";
        if (flagIcon) flagIcon.innerText = "🚩";
        if (flagText) flagText.innerText = "Flagged for Review";
      } else {
        flagBtn.className = "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all text-slate-300 border-slate-700 bg-slate-900 hover:bg-slate-800";
        if (flagIcon) flagIcon.innerText = "⚑";
        if (flagText) flagText.innerText = "Mark for Review";
      }
    }

    // Passage pane handling
    const passagePane = document.getElementById('qb-passage-pane');
    const passageContent = document.getElementById('qb-passage-content');
    const passageSkill = document.getElementById('qb-passage-skill');
    const splitContainer = document.getElementById('qb-split-container');

    const hasPassage = Boolean(q.passage && q.passage.trim().length > 0);
    if (passagePane) {
      if (hasPassage) {
        passagePane.classList.remove('hidden');
        if (passageSkill) passageSkill.innerText = q.skill || q.domain || 'Passage';
        if (passageContent) passageContent.innerHTML = this.formatQuestionText(q.passage);
        if (splitContainer) {
          splitContainer.className = "grid grid-cols-1 lg:grid-cols-2 gap-3 min-h-[520px]";
        }
      } else {
        passagePane.classList.add('hidden');
        if (splitContainer) {
          splitContainer.className = "grid grid-cols-1 gap-3 min-h-[520px]";
        }
      }
    }

    // Right pane question prompt & metadata
    const diffEl = document.getElementById('qb-q-difficulty');
    const qidEl = document.getElementById('qb-q-id');
    const promptEl = document.getElementById('qb-prompt-content');

    if (diffEl) {
      diffEl.innerText = q.difficulty || 'Medium';
      if (q.difficulty === 'Easy') {
        diffEl.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30";
      } else if (q.difficulty === 'Hard') {
        diffEl.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30";
      } else {
        diffEl.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30";
      }
    }

    if (qidEl) qidEl.innerText = q.id || '';
    if (promptEl) promptEl.innerHTML = this.formatQuestionText(q.prompt);

    // Choices vs SPR
    this.updateChoicesUI();

    // Footer buttons
    const prevBtn = document.getElementById('qb-btn-prev');
    const nextBtn = document.getElementById('qb-btn-next');
    const nextLabel = document.getElementById('qb-next-label');

    if (prevBtn) prevBtn.disabled = (idx === 0);
    if (nextLabel) {
      nextLabel.innerText = (idx === session.questions.length - 1) ? "Review & Submit 🏁" : "Next";
    }

    // Math typesetting
    this.renderMath(document.getElementById('qb-split-container'));

    // Start / resume per-question stopwatch
    this.startTimer();
  },

  updateChoicesUI() {
    let session = null;
    try {
      session = JSON.parse(sessionStorage.getItem('qb_active_session'));
    } catch (e) {}
    if (!session) return;

    const idx = session.currentIdx || 0;
    const q = session.questions[idx];
    if (!q) return;

    const isSPR = Boolean(q.is_spr || !q.options || Object.keys(q.options || {}).length === 0);
    const mcqContainer = document.getElementById('qb-mcq-container');
    const sprContainer = document.getElementById('qb-spr-container');
    const elimTip = document.getElementById('qb-elim-tip');
    const answeredStatus = document.getElementById('qb-answered-status');

    const studentAnswer = session.answers ? session.answers[idx] : undefined;

    if (isSPR) {
      if (mcqContainer) mcqContainer.classList.add('hidden');
      if (sprContainer) sprContainer.classList.remove('hidden');
      if (elimTip) elimTip.classList.add('hidden');

      const sprInput = document.getElementById('qb-spr-input');
      const sprStatus = document.getElementById('qb-spr-status');
      if (sprInput) sprInput.value = studentAnswer || '';
      if (sprStatus) sprStatus.innerText = studentAnswer ? '✓ Saved' : '';
    } else {
      if (mcqContainer) mcqContainer.classList.remove('hidden');
      if (sprContainer) sprContainer.classList.add('hidden');
      if (elimTip) elimTip.classList.remove('hidden');

      const strikethroughs = (session.strikethroughs && session.strikethroughs[idx]) || [];
      const optionEntries = Object.entries(q.options || {});

      let html = '';
      optionEntries.forEach(([key, val]) => {
        const isSelected = (studentAnswer === key);
        const isStruck = strikethroughs.includes(key);

        const borderBg = isSelected
          ? 'bg-blue-950/60 border-blue-500 ring-1 ring-blue-500 text-white'
          : 'bg-slate-900/80 border-slate-700/80 hover:border-slate-600 hover:bg-slate-800/40 text-slate-200';

        const badgeClass = isSelected
          ? 'bg-blue-600 text-white shadow-sm'
          : 'bg-slate-800 text-slate-300 border border-slate-700';

        const strikeBtnClass = isStruck
          ? 'bg-rose-500/15 border-rose-500/50 text-rose-300'
          : 'bg-slate-900/80 border-slate-700/80 text-slate-500 hover:text-slate-300 hover:border-slate-600';

        const textStrike = isStruck ? 'line-through opacity-40 text-slate-500' : '';

        html += `
          <div class="flex items-center gap-2 group" data-choice="${key}">
            <button type="button" onclick="qbEngine.selectOption('${key}')" id="qb-choice-btn-${key}" class="flex-1 flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${borderBg}">
              <span class="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${badgeClass}">
                ${key}
              </span>
              <span class="text-xs sm:text-sm font-medium leading-relaxed pt-0.5 qb-choice-text ${textStrike}">
                ${this.formatQuestionText(val)}
              </span>
            </button>
            <button type="button" onclick="qbEngine.toggleStrikethrough('${key}', event)" title="Eliminate option" class="px-2.5 py-3.5 rounded-xl border text-xs font-bold transition-all ${strikeBtnClass}">
              <span class="${isStruck ? 'line-through' : ''}">̶${key}̶</span>
            </button>
          </div>
        `;
      });

      if (mcqContainer) {
        mcqContainer.innerHTML = html;
        this.renderMath(mcqContainer);
      }
    }

    if (answeredStatus) {
      if (studentAnswer) {
        answeredStatus.innerHTML = `<span class="text-emerald-400 font-extrabold">● Answered: ${studentAnswer}</span>`;
      } else {
        answeredStatus.innerHTML = `<span class="text-slate-500 font-bold">○ Unanswered</span>`;
      }
    }
  },

  selectOption(letter) {
    let session = null;
    try {
      session = JSON.parse(sessionStorage.getItem('qb_active_session'));
    } catch (e) {}
    if (!session) return;

    if (!session.answers) session.answers = {};
    session.answers[session.currentIdx] = letter;
    sessionStorage.setItem('qb_active_session', JSON.stringify(session));

    this.updateChoicesUI();
  },

  toggleStrikethrough(letter, event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    let session = null;
    try {
      session = JSON.parse(sessionStorage.getItem('qb_active_session'));
    } catch (e) {}
    if (!session) return;

    if (!session.strikethroughs) session.strikethroughs = {};
    const list = session.strikethroughs[session.currentIdx] || [];
    if (list.includes(letter)) {
      session.strikethroughs[session.currentIdx] = list.filter(k => k !== letter);
    } else {
      session.strikethroughs[session.currentIdx] = [...list, letter];
    }
    sessionStorage.setItem('qb_active_session', JSON.stringify(session));

    this.updateChoicesUI();
  },

  onSPRInput(val) {
    let session = null;
    try {
      session = JSON.parse(sessionStorage.getItem('qb_active_session'));
    } catch (e) {}
    if (!session) return;

    if (!session.answers) session.answers = {};
    const clean = (val || '').trim();
    if (clean) {
      session.answers[session.currentIdx] = clean;
    } else {
      delete session.answers[session.currentIdx];
    }
    sessionStorage.setItem('qb_active_session', JSON.stringify(session));

    const sprStatus = document.getElementById('qb-spr-status');
    const answeredStatus = document.getElementById('qb-answered-status');
    if (sprStatus) sprStatus.innerText = clean ? '✓ Saved' : '';
    if (answeredStatus) {
      if (clean) {
        answeredStatus.innerHTML = `<span class="text-emerald-400 font-extrabold">● Answered: ${clean}</span>`;
      } else {
        answeredStatus.innerHTML = `<span class="text-slate-500 font-bold">○ Unanswered</span>`;
      }
    }
  },

  toggleFlagReview() {
    let session = null;
    try {
      session = JSON.parse(sessionStorage.getItem('qb_active_session'));
    } catch (e) {}
    if (!session) return;

    if (!session.flags) session.flags = {};
    const curr = Boolean(session.flags[session.currentIdx]);
    session.flags[session.currentIdx] = !curr;
    sessionStorage.setItem('qb_active_session', JSON.stringify(session));

    const flagBtn = document.getElementById('qb-btn-flag');
    const flagIcon = document.getElementById('qb-flag-icon');
    const flagText = document.getElementById('qb-flag-text');

    if (flagBtn) {
      if (!curr) {
        flagBtn.className = "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm";
        if (flagIcon) flagIcon.innerText = "🚩";
        if (flagText) flagText.innerText = "Flagged for Review";
      } else {
        flagBtn.className = "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all text-slate-300 border-slate-700 bg-slate-900 hover:bg-slate-800";
        if (flagIcon) flagIcon.innerText = "⚑";
        if (flagText) flagText.innerText = "Mark for Review";
      }
    }
  },

  startTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    let session = null;
    try {
      session = JSON.parse(sessionStorage.getItem('qb_active_session'));
    } catch (e) {}
    if (!session) return;

    const idx = session.currentIdx || 0;
    if (!session.timePerQuestion) session.timePerQuestion = {};
    let currentSec = session.timePerQuestion[idx] || 0;

    this.updateTimerDisplay(currentSec);

    this.timerInterval = setInterval(() => {
      currentSec++;
      this.updateTimerDisplay(currentSec);

      try {
        const s = JSON.parse(sessionStorage.getItem('qb_active_session')) || session;
        if (!s.timePerQuestion) s.timePerQuestion = {};
        s.timePerQuestion[idx] = currentSec;
        sessionStorage.setItem('qb_active_session', JSON.stringify(s));
      } catch (e) {}
    }, 1000);
  },

  updateTimerDisplay(sec) {
    const el = document.getElementById('qb-timer-display');
    if (!el) return;

    if (this.isTimerHidden) {
      el.innerText = "--:--";
      return;
    }

    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    el.innerText = `${m}:${s}`;
  },

  toggleTimerVisibility() {
    this.isTimerHidden = !this.isTimerHidden;
    let session = null;
    try {
      session = JSON.parse(sessionStorage.getItem('qb_active_session'));
    } catch (e) {}
    const sec = (session && session.timePerQuestion && session.timePerQuestion[session.currentIdx]) || 0;
    this.updateTimerDisplay(sec);
  },

  prevQuestion() {
    let session = null;
    try {
      session = JSON.parse(sessionStorage.getItem('qb_active_session'));
    } catch (e) {}
    if (!session) return;

    if (session.currentIdx > 0) {
      session.currentIdx--;
      sessionStorage.setItem('qb_active_session', JSON.stringify(session));
      this.renderCurrentQuestion();
    }
  },

  nextQuestion() {
    let session = null;
    try {
      session = JSON.parse(sessionStorage.getItem('qb_active_session'));
    } catch (e) {}
    if (!session) return;

    if (session.currentIdx < session.questions.length - 1) {
      session.currentIdx++;
      sessionStorage.setItem('qb_active_session', JSON.stringify(session));
      this.renderCurrentQuestion();
    } else {
      this.openReviewSubmitModal();
    }
  },

  goToQuestion(idx) {
    let session = null;
    try {
      session = JSON.parse(sessionStorage.getItem('qb_active_session'));
    } catch (e) {}
    if (!session) return;

    if (idx >= 0 && idx < session.questions.length) {
      session.currentIdx = idx;
      sessionStorage.setItem('qb_active_session', JSON.stringify(session));
      this.closeNavigatorModal();
      this.closeReviewSubmitModal();
      this.renderCurrentQuestion();
    }
  },

  openNavigatorModal() {
    let session = null;
    try {
      session = JSON.parse(sessionStorage.getItem('qb_active_session'));
    } catch (e) {}
    if (!session) return;

    const grid = document.getElementById('qb-navigator-grid');
    if (!grid) return;

    let html = '';
    session.questions.forEach((q, i) => {
      const isCurrent = (i === session.currentIdx);
      const isAnswered = Boolean(session.answers && session.answers[i]);
      const isFlagged = Boolean(session.flags && session.flags[i]);

      let bgStyle = 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500';
      if (isAnswered) {
        bgStyle = 'bg-blue-600/25 border-blue-500 text-blue-300 font-extrabold';
      }
      if (isCurrent) {
        bgStyle += ' ring-2 ring-white';
      }

      html += `
        <button type="button" onclick="qbEngine.goToQuestion(${i})" class="relative h-11 rounded-xl border text-xs flex items-center justify-center transition-all ${bgStyle}">
          <span>${i + 1}</span>
          ${isFlagged ? '<span class="absolute top-1 right-1 text-[10px] text-amber-400 font-bold leading-none">⚑</span>' : ''}
        </button>
      `;
    });

    grid.innerHTML = html;
    const modal = document.getElementById('qb-navigator-modal');
    if (modal) modal.classList.remove('hidden');
  },

  closeNavigatorModal() {
    const modal = document.getElementById('qb-navigator-modal');
    if (modal) modal.classList.add('hidden');
  },

  openReviewSubmitModal() {
    let session = null;
    try {
      session = JSON.parse(sessionStorage.getItem('qb_active_session'));
    } catch (e) {}
    if (!session) return;

    const total = session.questions.length;
    const answeredCount = Object.keys(session.answers || {}).length;
    const unansweredCount = Math.max(0, total - answeredCount);
    const flaggedCount = Object.values(session.flags || {}).filter(Boolean).length;

    const statAns = document.getElementById('qb-stat-answered');
    const statUnans = document.getElementById('qb-stat-unanswered');
    const statFlag = document.getElementById('qb-stat-flagged');

    if (statAns) statAns.innerText = answeredCount;
    if (statUnans) statUnans.innerText = unansweredCount;
    if (statFlag) statFlag.innerText = flaggedCount;

    const reviewGrid = document.getElementById('qb-review-grid');
    if (reviewGrid) {
      let html = '';
      session.questions.forEach((q, i) => {
        const isAns = Boolean(session.answers && session.answers[i]);
        const isFlg = Boolean(session.flags && session.flags[i]);
        const pillClass = isAns
          ? 'bg-blue-600/20 border-blue-500/60 text-blue-300'
          : 'bg-slate-800/80 border-slate-700 text-slate-400';

        html += `
          <button type="button" onclick="qbEngine.goToQuestion(${i})" class="relative p-2 rounded-lg border text-[11px] font-bold flex items-center justify-center transition-all hover:scale-105 ${pillClass}">
            <span>Q${i + 1}</span>
            ${isFlg ? '<span class="text-amber-400 ml-1 font-bold">⚑</span>' : ''}
          </button>
        `;
      });
      reviewGrid.innerHTML = html;
    }

    const modal = document.getElementById('qb-review-submit-modal');
    if (modal) modal.classList.remove('hidden');
  },

  closeReviewSubmitModal() {
    const modal = document.getElementById('qb-review-submit-modal');
    if (modal) modal.classList.add('hidden');
  },

  finishSession() {
    this.closeReviewSubmitModal();

    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    let session = null;
    try {
      session = JSON.parse(sessionStorage.getItem('qb_active_session'));
    } catch (e) {}
    if (!session) return;

    const total = session.questions.length;
    let correctCount = 0;
    let totalSeconds = 0;

    session.questions.forEach((q, i) => {
      const studentAns = session.answers ? session.answers[i] : undefined;
      const isSPR = Boolean(q.is_spr || !q.options || Object.keys(q.options || {}).length === 0);

      let isCorrect = false;
      if (isSPR) {
        isCorrect = this.isSPREqual(studentAns, q.correct_answer);
      } else {
        isCorrect = Boolean(studentAns && String(studentAns).trim().toUpperCase() === String(q.correct_answer || '').trim().toUpperCase());
      }
      if (isCorrect) correctCount++;

      const secSpent = (session.timePerQuestion && session.timePerQuestion[i]) || 0;
      totalSeconds += secSpent;
    });

    const accuracyPct = Math.round((correctCount / total) * 100);
    const avgSec = Math.round(totalSeconds / total);

    const summaryEl = document.getElementById('qb-results-summary');
    if (summaryEl) {
      summaryEl.innerHTML = `
        <div class="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400 tracking-tight">
          ${correctCount} / ${total}
        </div>
        <div class="text-xs sm:text-sm font-bold text-slate-300">
          Accuracy: <span class="text-emerald-400 font-extrabold">${accuracyPct}%</span> • Total Time: <span class="font-mono text-sky-300 font-bold">${Math.floor(totalSeconds / 60)}m ${totalSeconds % 60}s</span> (avg ${avgSec}s / q)
        </div>
      `;
    }

    const listEl = document.getElementById('qb-results-list');
    if (listEl) {
      let html = '';
      session.questions.forEach((q, i) => {
        const studentAns = session.answers ? session.answers[i] : null;
        const isSPR = Boolean(q.is_spr || !q.options || Object.keys(q.options || {}).length === 0);
        const isCorrect = isSPR
          ? this.isSPREqual(studentAns, q.correct_answer)
          : Boolean(studentAns && String(studentAns).trim().toUpperCase() === String(q.correct_answer || '').trim().toUpperCase());

        const secSpent = (session.timePerQuestion && session.timePerQuestion[i]) || 0;
        const borderClass = isCorrect ? 'border-emerald-500/40 bg-emerald-950/20' : 'border-rose-500/40 bg-rose-950/20';
        const badgeClass = isCorrect ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300';

        html += `
          <details class="p-3.5 rounded-2xl border ${borderClass} transition-all space-y-2">
            <summary class="cursor-pointer flex items-center justify-between text-xs font-bold text-slate-200">
              <div class="flex items-center gap-2">
                <span class="w-6 h-6 rounded-full ${badgeClass} flex items-center justify-center font-extrabold text-[11px]">
                  ${isCorrect ? '✓' : '✗'}
                </span>
                <span>Question ${i + 1} (${q.domain})</span>
              </div>
              <div class="flex items-center gap-2 font-mono text-[11px]">
                <span class="${isCorrect ? 'text-emerald-400' : 'text-rose-400'} font-bold">You: ${studentAns || 'Skipped'}</span>
                <span class="text-slate-400">|</span>
                <span class="text-sky-300 font-bold">Key: ${q.correct_answer || '-'}</span>
                <span class="text-slate-500">(${secSpent}s)</span>
              </div>
            </summary>
            <div class="pt-2 border-t border-slate-800 text-[11px] text-slate-300 space-y-2 leading-relaxed">
              <div class="text-white font-medium whitespace-pre-line">${this.formatQuestionText(q.prompt)}</div>
              ${q.rationale ? `<div class="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 whitespace-pre-line"><strong class="text-sky-300 block mb-1">Explanation:</strong>${this.formatQuestionText(q.rationale)}</div>` : ''}
            </div>
          </details>
        `;
      });
      listEl.innerHTML = html;
      this.renderMath(listEl);
    }

    const resultsModal = document.getElementById('qb-results-modal');
    if (resultsModal) resultsModal.classList.remove('hidden');
  },

  isSPREqual(studentVal, correctVal) {
    if (!studentVal || !correctVal) return false;
    const sStr = String(studentVal).trim().toLowerCase();
    const cStr = String(correctVal).trim().toLowerCase();
    if (sStr === cStr) return true;

    const parseVal = (v) => {
      if (v.includes('/')) {
        const parts = v.split('/');
        if (parts.length === 2) {
          const num = parseFloat(parts[0]);
          const den = parseFloat(parts[1]);
          if (den !== 0 && !isNaN(num) && !isNaN(den)) return num / den;
        }
      }
      const fl = parseFloat(v);
      return isNaN(fl) ? null : fl;
    };

    const sNum = parseVal(sStr);
    const cNum = parseVal(cStr);
    if (sNum !== null && cNum !== null) {
      return Math.abs(sNum - cNum) < 0.001;
    }
    return false;
  },

  returnToSetupFromResults() {
    const resultsModal = document.getElementById('qb-results-modal');
    if (resultsModal) resultsModal.classList.add('hidden');
    this.returnToSetup();
  },

  returnToSetup() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    const testContainer = document.getElementById('qb-test-container');
    const setupView = document.getElementById('qb-setup-view');
    const hubView = document.getElementById('qbank-hub-view');
    const solverView = document.getElementById('qbank-solver-view');
    const navModal = document.getElementById('qb-navigator-modal');
    const revModal = document.getElementById('qb-review-submit-modal');
    const resModal = document.getElementById('qb-results-modal');

    if (testContainer) testContainer.classList.add('hidden');
    if (hubView) hubView.classList.add('hidden');
    if (solverView) solverView.classList.add('hidden');
    if (navModal) navModal.classList.add('hidden');
    if (revModal) revModal.classList.add('hidden');
    if (resModal) resModal.classList.add('hidden');
    if (setupView) setupView.classList.remove('hidden');

    this.updateMatchingCount();
  },

  renderMath(el) {
    if (!el) return;
    if (typeof window.renderMathInElement === 'function') {
      try {
        window.renderMathInElement(el, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\(', right: '\\)', display: false },
            { left: '\\[', right: '\\]', display: true }
          ],
          throwOnError: false
        });
      } catch (err) {
        console.warn("[qbEngine] KaTeX render error:", err);
      }
    } else {
      setTimeout(() => {
        if (typeof window.renderMathInElement === 'function') {
          try {
            window.renderMathInElement(el, {
              delimiters: [
                { left: '$$', right: '$$', display: true },
                { left: '$', right: '$', display: false },
                { left: '\\(', right: '\\)', display: false },
                { left: '\\[', right: '\\]', display: true }
              ],
              throwOnError: false
            });
          } catch (e) {}
        }
      }, 250);
    }
  },

  formatQuestionText(raw) {
    if (!raw) return '';
    // Replace markdown image ![alt](url) with responsive img
    return raw.replace(/!\[(.*?)\]\((.*?)\)/g, (match, alt, url) => {
      return `<img src="${url}" alt="${alt || 'Figure'}" class="max-w-full h-auto rounded-xl border border-slate-700 bg-white/5 my-3 shadow-md mx-auto block" loading="lazy" />`;
    });
  }
};
