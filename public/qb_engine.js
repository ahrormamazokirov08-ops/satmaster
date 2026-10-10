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

  async init() {
    // Show setup view, hide test container and legacy views
    const setupView = document.getElementById('qb-setup-view');
    const testContainer = document.getElementById('qb-test-container');
    const hubView = document.getElementById('qbank-hub-view');
    const solverView = document.getElementById('qbank-solver-view');

    if (setupView) setupView.classList.remove('hidden');
    if (testContainer) testContainer.classList.add('hidden');
    if (hubView) hubView.classList.add('hidden');
    if (solverView) solverView.classList.add('hidden');

    if (!this.isInitialized) {
      this.isInitialized = true;
      this.syncUI();
      await this.loadQuestions();
    } else {
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
        try {
          const res = await fetch(relPath);
          if (res.ok) return await res.json();
        } catch (e) {}
        const absRes = await fetch('/' + relPath);
        if (absRes.ok) return await absRes.json();
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

    // Render placeholder view #qb-test-container
    const setupView = document.getElementById('qb-setup-view');
    const testContainer = document.getElementById('qb-test-container');
    const summaryCard = document.getElementById('qb-session-summary-card');

    if (setupView) setupView.classList.add('hidden');
    if (testContainer) testContainer.classList.remove('hidden');

    if (summaryCard) {
      const subjTitle = this.activeSubject === 'rw' ? 'Reading & Writing' : (this.activeSubject === 'math' ? 'Math' : 'Combined (RW + Math)');
      const domainsSummary = activeSession.config.domains.join(', ');
      const diffSummary = activeSession.config.difficulties.join(', ');

      summaryCard.innerHTML = `
        <div class="flex items-center justify-between border-b border-[#334155] pb-2">
          <span class="font-bold text-slate-300">Session Status</span>
          <span class="font-extrabold text-emerald-400">● ACTIVE SESSION READY</span>
        </div>
        <div class="grid grid-cols-2 gap-2 pt-1 text-[11px]">
          <div><span class="text-slate-400">Questions:</span> <strong class="text-white">${selectedQuestions.length} items</strong></div>
          <div><span class="text-slate-400">Subject:</span> <strong class="text-sky-300">${subjTitle}</strong></div>
          <div><span class="text-slate-400">Difficulties:</span> <strong class="text-amber-300">${diffSummary}</strong></div>
          <div><span class="text-slate-400">Pool Available:</span> <strong class="text-slate-300">${filtered.length} matching</strong></div>
        </div>
        <div class="pt-1 text-[11px]">
          <span class="text-slate-400 block mb-0.5">Active Domains:</span>
          <span class="text-slate-200 font-medium">${domainsSummary}</span>
        </div>
        <div class="pt-2 border-t border-[#334155] text-[10px] text-slate-500 font-mono">
          sessionStorage.qb_active_session: ${selectedQuestions.length} questions stored. Ready for Step 3 Interface.
        </div>
      `;
    }

    if (typeof showToast === 'function') {
      showToast("🚀 Session Initialized", `${selectedQuestions.length} practice questions prepared and saved to sessionStorage!`, "success");
    }
  },

  returnToSetup() {
    const setupView = document.getElementById('qb-setup-view');
    const testContainer = document.getElementById('qb-test-container');

    if (testContainer) testContainer.classList.add('hidden');
    if (setupView) setupView.classList.remove('hidden');

    this.updateMatchingCount();
  }
};
