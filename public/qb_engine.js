/**
 * public/qb_engine.js
 * Session Generator State Engine for Bluebook Question Bank Practice.
 * Handles question dataset loading, dynamic filter matching,
 * session randomization, and sessionStorage persistence.
 */

window.qbEngine = {
  activeSubject: 'rw', // 'rw' | 'math' | 'combined'
  activeView: 'hub', // 'hub' | 'detail'
  activeDifficulties: new Set(['Easy', 'Medium', 'Hard']),
  activeStatusFilter: 'unsolved', // 'unsolved' | 'solved' | 'all'
  solvedQuestionIds: new Set(),
  correctQuestionIds: new Set(),
  statsPerSkill: {},
  selectedSkills: new Set(),
  activeCount: 20,
  isCustomCount: false,
  isAllCount: false,
  questionsData: { rw: null, math: null },
  isLoading: false,
  isInitialized: false,
  timerInterval: null,
  isTimerHidden: false,

  skillHierarchy: {
    rw: [
      {
        domain: "Craft and Structure",
        skills: [
          { name: "Words in Context", total: 261 },
          { name: "Text Structure and Purpose", total: 149 },
          { name: "Cross-Text Connections", total: 61 }
        ]
      },
      {
        domain: "Information and Ideas",
        skills: [
          { name: "Command of Evidence", total: 277 },
          { name: "Inferences", total: 140 },
          { name: "Central Ideas and Details", total: 138 }
        ]
      },
      {
        domain: "Standard English Conventions",
        skills: [
          { name: "Boundaries", total: 213 },
          { name: "Form, Structure, and Sense", total: 208 }
        ]
      },
      {
        domain: "Expression of Ideas",
        skills: [
          { name: "Rhetorical Synthesis", total: 204 },
          { name: "Transitions", total: 194 }
        ]
      }
    ],
    math: [
      {
        domain: "Algebra",
        skills: [
          { name: "Linear functions", total: 170 },
          { name: "Linear equations in two variables", total: 130 },
          { name: "Systems of two linear equations in two variables", total: 126 },
          { name: "Linear equations in one variable", total: 112 },
          { name: "Linear inequalities in one or two variables", total: 78 }
        ]
      },
      {
        domain: "Advanced Math",
        skills: [
          { name: "Nonlinear functions", total: 259 },
          { name: "Nonlinear equations in one variable and systems of equations in two variables", total: 165 },
          { name: "Equivalent expressions", total: 116 }
        ]
      },
      {
        domain: "Problem-Solving and Data Analysis",
        skills: [
          { name: "Ratios, rates, proportional relationships, and units", total: 93 },
          { name: "Percentages", total: 84 },
          { name: "One-variable data: Distributions and measures of center and spread", total: 84 },
          { name: "Two-variable data: Models and scatterplots", total: 71 },
          { name: "Probability and conditional probability", total: 49 },
          { name: "Inference from sample statistics and margin of error", total: 28 },
          { name: "Evaluating statistical claims: Observational studies and experiments", total: 12 }
        ]
      },
      {
        domain: "Geometry and Trigonometry",
        skills: [
          { name: "Area and volume", total: 110 },
          { name: "Lines, angles, and triangles", total: 102 },
          { name: "Right triangles and trigonometry", total: 69 },
          { name: "Circles", total: 67 }
        ]
      }
    ]
  },

  normalizeSkill(raw) {
    if (!raw) return '';
    const s = String(raw).trim();
    if (s.toLowerCase() === 'cross-text connections') {
      return 'Cross-Text Connections';
    }
    return s;
  },

  initSelectedSkills(subject) {
    this.selectedSkills = new Set();
    const hierarchy = this.skillHierarchy[subject] || [];
    hierarchy.forEach(d => {
      d.skills.forEach(s => this.selectedSkills.add(s.name));
    });
  },

  showHubView() {
    this.activeView = 'hub';
    const hub = document.getElementById('qb-hub-view');
    const detail = document.getElementById('qb-detail-view');
    if (hub) hub.classList.remove('hidden');
    if (detail) detail.classList.add('hidden');
  },

  showDetailView() {
    this.activeView = 'detail';
    const hub = document.getElementById('qb-hub-view');
    const detail = document.getElementById('qb-detail-view');
    if (hub) hub.classList.add('hidden');
    if (detail) detail.classList.remove('hidden');
  },

  selectSubjectView(subject) {
    const targetSubj = (subject && ['rw', 'math', 'combined'].includes(subject)) ? subject : 'rw';
    this.activeSubject = targetSubj;
    this.initSelectedSkills(targetSubj);
    this.showDetailView();
    this.syncSubjectDetailHeader();
    this.renderSkillList();
    this.updateMatchingCount();
    const setupView = document.getElementById('qb-setup-view');
    if (setupView) {
      setupView.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  },

  backToHub() {
    this.showHubView();
    const setupView = document.getElementById('qb-setup-view');
    if (setupView) {
      setupView.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  },

  syncSubjectDetailHeader() {
    const titleEl = document.getElementById('qb-detail-subject-title');
    const badgeEl = document.getElementById('qb-detail-subject-badge');
    const subtitleEl = document.getElementById('qb-practice-all-subtitle');

    if (this.activeSubject === 'rw') {
      if (titleEl) titleEl.innerText = "Reading & Writing";
      if (badgeEl) badgeEl.innerText = "1,845 questions • 10 skills";
      if (subtitleEl) subtitleEl.innerText = "Start practicing all 10 skills in Reading & Writing.";
    } else if (this.activeSubject === 'math') {
      if (titleEl) titleEl.innerText = "Math";
      if (badgeEl) badgeEl.innerText = "1,925 questions • 19 skills";
      if (subtitleEl) subtitleEl.innerText = "Start practicing all 19 skills in Math.";
    } else {
      if (titleEl) titleEl.innerText = "Combined / All";
      if (badgeEl) badgeEl.innerText = "3,770 questions • 29 skills";
      if (subtitleEl) subtitleEl.innerText = "Start practicing all 29 skills across both subjects.";
    }

    ['rw', 'math', 'combined'].forEach(s => {
      const tab = document.getElementById(`qb-tab-${s}`);
      if (tab) {
        if (s === this.activeSubject) {
          tab.className = "qb-subject-tab py-1.5 px-3 rounded-lg text-xs font-bold transition-all bg-blue-600 text-white shadow-xs";
        } else {
          tab.className = "qb-subject-tab py-1.5 px-3 rounded-lg text-xs font-bold transition-all text-slate-600 hover:text-slate-900 hover:bg-slate-200/50";
        }
      }
    });
  },

  renderSkillList() {
    const container = document.getElementById('qb-skills-list-container');
    if (!container) return;

    const subj = this.activeSubject;
    const hierarchy = this.skillHierarchy[subj] || (subj === 'combined' ? [...this.skillHierarchy.rw, ...this.skillHierarchy.math] : this.skillHierarchy.rw);
    if (!hierarchy) return;

    const skillCounts = {};
    const skillSolved = {};
    const skillCorrect = {};

    const allQuestions = (subj === 'rw') 
      ? (this.questionsData.rw || [])
      : (subj === 'math')
        ? (this.questionsData.math || [])
        : [...(this.questionsData.rw || []), ...(this.questionsData.math || [])];

    hierarchy.forEach(dom => {
      dom.skills.forEach(sk => {
        skillCounts[sk.name] = (allQuestions.length === 0) ? sk.total : 0;
        skillSolved[sk.name] = 0;
        skillCorrect[sk.name] = 0;
      });
    });

    if (allQuestions.length > 0) {
      allQuestions.forEach(q => {
        const norm = this.normalizeSkill(q.skill);
        const matchesDiff = this.activeDifficulties.has(q.difficulty);
        if (matchesDiff) {
          if (typeof skillCounts[norm] === 'number') {
            skillCounts[norm]++;
          }
        }
        if (this.solvedQuestionIds.has(q.id)) {
          if (typeof skillSolved[norm] === 'number') {
            skillSolved[norm]++;
          }
          if (this.correctQuestionIds.has(q.id)) {
            if (typeof skillCorrect[norm] === 'number') {
              skillCorrect[norm]++;
            }
          }
        }
      });
    }

    if (this.statsPerSkill && typeof this.statsPerSkill === 'object') {
      hierarchy.forEach(dom => {
        dom.skills.forEach(sk => {
          const s = this.statsPerSkill[sk.name];
          if (s) {
            skillSolved[sk.name] = Math.max(skillSolved[sk.name] || 0, Number(s.solved) || 0);
            skillCorrect[sk.name] = Math.max(skillCorrect[sk.name] || 0, Number(s.correct) || 0);
          }
        });
      });
    }

    let html = '';
    hierarchy.forEach(domGroup => {
      const domainName = domGroup.domain;
      const domSkills = domGroup.skills;
      const allDomSelected = domSkills.every(sk => this.selectedSkills.has(sk.name));

      html += `
        <div class="space-y-2.5">
          <div class="flex items-center justify-between pb-1.5 border-b border-slate-100">
            <label class="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" class="w-4 h-4 rounded text-blue-600 bg-white border-slate-300 focus:ring-0 cursor-pointer" 
                ${allDomSelected ? 'checked' : ''} 
                onchange="qbEngine.toggleDomainSkills('${domainName.replace(/'/g, "\\'")}', this.checked)">
              <span class="text-sm font-black text-slate-900">${domainName}</span>
            </label>
            <span class="text-[11px] font-semibold text-slate-400">
              ${domSkills.length} skills
            </span>
          </div>
          <div class="space-y-1">
      `;

      domSkills.forEach(sk => {
        const isChecked = this.selectedSkills.has(sk.name);
        const total = (typeof skillCounts[sk.name] === 'number') ? skillCounts[sk.name] : sk.total;
        const solved = skillSolved[sk.name] || 0;
        const correct = skillCorrect[sk.name] || 0;
        const pct = (total > 0) ? Math.min(100, Math.round((solved / total) * 100)) : 0;
        
        let accuracyStr = `<span class="text-xs font-semibold text-slate-400 text-right">-</span>`;
        if (solved > 0) {
          const accPct = Math.round((correct / solved) * 100);
          const dotColor = (accPct >= 70) ? 'bg-emerald-500' : (accPct >= 50 ? 'bg-amber-500' : 'bg-rose-500');
          const txtColor = (accPct >= 70) ? 'text-emerald-700' : (accPct >= 50 ? 'text-amber-700' : 'text-rose-700');
          accuracyStr = `<span class="text-xs font-bold ${txtColor} flex items-center justify-end gap-1"><span class="w-1.5 h-1.5 rounded-full ${dotColor}"></span>${accPct}%</span>`;
        }

        html += `
          <div class="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-slate-50 transition-colors group">
            <label class="flex items-center gap-3 cursor-pointer select-none flex-1 min-w-0 pr-4">
              <input type="checkbox" class="qb-skill-cb w-4 h-4 rounded text-blue-600 bg-white border-slate-300 focus:ring-0 cursor-pointer" 
                data-skill="${sk.name.replace(/"/g, '&quot;')}"
                ${isChecked ? 'checked' : ''} 
                onchange="qbEngine.onSkillChange('${sk.name.replace(/'/g, "\\'")}', this.checked)">
              <span class="text-xs sm:text-sm font-semibold text-slate-800 group-hover:text-blue-600 transition-colors truncate">
                ${sk.name}
              </span>
            </label>
            <div class="flex items-center gap-6 shrink-0">
              <div class="flex items-center gap-3 w-36 justify-end">
                <div class="w-16 sm:w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden shrink-0">
                  <div class="h-full bg-blue-500 rounded-full transition-all duration-300" style="width: ${pct}%"></div>
                </div>
                <span class="text-xs font-semibold font-mono text-slate-600 text-right w-12 shrink-0">
                  ${solved}/${total}
                </span>
              </div>
              <div class="w-14 text-right shrink-0">
                ${accuracyStr}
              </div>
            </div>
          </div>
        `;
      });

      html += `
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  },

  onSkillChange(skillName, isChecked) {
    if (isChecked) {
      this.selectedSkills.add(skillName);
    } else {
      this.selectedSkills.delete(skillName);
    }
    this.renderSkillList();
    this.updateMatchingCount();
  },

  toggleDomainSkills(domainName, isChecked) {
    const subj = this.activeSubject;
    const hierarchy = this.skillHierarchy[subj] || [];
    const domGroup = hierarchy.find(d => d.domain === domainName);
    if (!domGroup) return;

    domGroup.skills.forEach(sk => {
      if (isChecked) {
        this.selectedSkills.add(sk.name);
      } else {
        this.selectedSkills.delete(sk.name);
      }
    });

    this.renderSkillList();
    this.updateMatchingCount();
  },

  toggleAllSkills() {
    const subj = this.activeSubject;
    const hierarchy = this.skillHierarchy[subj] || [];
    const allSkills = [];
    hierarchy.forEach(d => d.skills.forEach(s => allSkills.push(s.name)));

    const allSelected = allSkills.length > 0 && allSkills.every(s => this.selectedSkills.has(s));
    if (allSelected) {
      this.selectedSkills.clear();
    } else {
      allSkills.forEach(s => this.selectedSkills.add(s));
    }

    const btn = document.getElementById('qb-btn-toggle-domains');
    if (btn) {
      btn.innerText = (!allSelected) ? "Deselect All" : "Select All";
    }

    this.renderSkillList();
    this.updateMatchingCount();
  },

  startPracticeAll() {
    const subj = this.activeSubject;
    const hierarchy = this.skillHierarchy[subj] || [];
    hierarchy.forEach(d => d.skills.forEach(s => this.selectedSkills.add(s)));
    this.renderSkillList();
    this.updateMatchingCount();
    this.startPractice();
  },

  getCurrentStudentId() {
    let uid = '';
    try {
      if (typeof currentSession !== 'undefined' && currentSession?.uid) {
        uid = currentSession.uid;
      } else if (typeof currentSession !== 'undefined' && currentSession?.telegram_id) {
        uid = currentSession.telegram_id;
      }
      if (!uid) {
        const stored = localStorage.getItem('satmaster_user_session') || localStorage.getItem('satmaster_session');
        if (stored) {
          const parsed = JSON.parse(stored);
          uid = parsed.uid || parsed.telegram_id || parsed.id || '';
        }
      }
    } catch (e) {}
    return String(uid || 'guest').trim();
  },

  async syncPendingAttempts(studentId) {
    if (!studentId || studentId === 'guest') return;
    try {
      const pendingKey = `qb_pending_attempts_${studentId}`;
      const pendingRaw = localStorage.getItem(pendingKey);
      if (!pendingRaw) return;
      const pending = JSON.parse(pendingRaw);
      if (!Array.isArray(pending) || pending.length === 0) return;

      const res = await fetch('/api/qbank/record-attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: studentId,
          attempts: pending
        })
      });
      if (res.ok) {
        localStorage.removeItem(pendingKey);
      }
    } catch (e) {
      // Still offline, will retry on next sync
    }
  },

  queuePendingAttempt(studentId, attemptObj) {
    if (!studentId || studentId === 'guest' || !attemptObj) return;
    try {
      const pendingKey = `qb_pending_attempts_${studentId}`;
      const raw = localStorage.getItem(pendingKey);
      const list = raw ? JSON.parse(raw) : [];
      list.push(attemptObj);
      localStorage.setItem(pendingKey, JSON.stringify(list));
    } catch (e) {}
  },

  async loadSolvedQuestions() {
    const studentId = this.getCurrentStudentId();
    // 1. Load locally cached solved IDs first
    try {
      const localCached = localStorage.getItem(`qb_solved_${studentId}`) || localStorage.getItem(`satmaster_solved_q_${studentId}`);
      if (localCached) {
        const parsed = JSON.parse(localCached);
        if (Array.isArray(parsed)) {
          this.solvedQuestionIds = new Set(parsed);
        }
      }
      const localCorrect = localStorage.getItem(`satmaster_correct_q_${studentId}`);
      if (localCorrect) {
        const parsedC = JSON.parse(localCorrect);
        if (Array.isArray(parsedC)) {
          this.correctQuestionIds = new Set(parsedC);
        }
      }
      const localStats = localStorage.getItem(`qb_stats_${studentId}`);
      if (localStats) {
        this.statsPerSkill = JSON.parse(localStats) || {};
      }
    } catch (e) {}

    // 2. Fetch from backend if registered / not guest
    if (studentId && studentId !== 'guest') {
      try {
        await this.syncPendingAttempts(studentId);

        const res = await fetch(`/api/qbank/user-history?uid=${encodeURIComponent(studentId)}`);
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.solved_ids)) {
            data.solved_ids.forEach(qid => this.solvedQuestionIds.add(qid));
            localStorage.setItem(`qb_solved_${studentId}`, JSON.stringify(Array.from(this.solvedQuestionIds)));
            localStorage.setItem(`satmaster_solved_q_${studentId}`, JSON.stringify(Array.from(this.solvedQuestionIds)));
          }
          if (data && data.stats) {
            this.statsPerSkill = data.stats;
            localStorage.setItem(`qb_stats_${studentId}`, JSON.stringify(data.stats));
          }
        }
      } catch (err) {
        console.warn("[qbEngine] Offline or error fetching solved questions:", err);
      }
    }

    this.syncStatusUI();
    this.renderSkillList();
    this.updateMatchingCount();
  },

  async recordQuestionSolved(questionId, isCorrect = false, selectedAnswer = null, metadata = {}) {
    if (!questionId) return;
    const qid = String(questionId).trim();
    this.solvedQuestionIds.add(qid);
    if (isCorrect) {
      this.correctQuestionIds.add(qid);
    }

    const studentId = this.getCurrentStudentId();
    try {
      localStorage.setItem(`qb_solved_${studentId}`, JSON.stringify(Array.from(this.solvedQuestionIds)));
      localStorage.setItem(`satmaster_solved_q_${studentId}`, JSON.stringify(Array.from(this.solvedQuestionIds)));
      localStorage.setItem(`satmaster_correct_q_${studentId}`, JSON.stringify(Array.from(this.correctQuestionIds)));
    } catch (e) {}

    const payload = {
      uid: studentId,
      question_id: qid,
      subject: metadata.subject || null,
      domain: metadata.domain || null,
      skill: metadata.skill || null,
      is_correct: Boolean(isCorrect),
      selected_answer: selectedAnswer,
      time_spent_seconds: metadata.time_spent_seconds || 0
    };

    if (metadata.skill) {
      const sk = metadata.skill;
      if (!this.statsPerSkill) this.statsPerSkill = {};
      if (!this.statsPerSkill[sk]) this.statsPerSkill[sk] = { solved: 0, correct: 0 };
      this.statsPerSkill[sk].solved += 1;
      if (isCorrect) this.statsPerSkill[sk].correct += 1;
      try {
        localStorage.setItem(`qb_stats_${studentId}`, JSON.stringify(this.statsPerSkill));
      } catch (e) {}
    }

    // Asynchronously dispatch to backend with offline queue fallback
    if (studentId && studentId !== 'guest') {
      try {
        fetch('/api/qbank/record-attempt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).then(res => {
          if (!res.ok) this.queuePendingAttempt(studentId, payload);
        }).catch(() => {
          this.queuePendingAttempt(studentId, payload);
        });
      } catch (e) {
        this.queuePendingAttempt(studentId, payload);
      }
    }

    this.renderSkillList();
    this.updateMatchingCount();
  },

  async recordSolvedBatch(batchItems) {
    if (!batchItems || batchItems.length === 0) return;
    const studentId = this.getCurrentStudentId();

    batchItems.forEach(it => {
      const qid = it.question_id || it.id;
      if (qid) this.solvedQuestionIds.add(String(qid).trim());
      if (it.is_correct && qid) this.correctQuestionIds.add(String(qid).trim());

      if (it.skill) {
        const sk = it.skill;
        if (!this.statsPerSkill) this.statsPerSkill = {};
        if (!this.statsPerSkill[sk]) this.statsPerSkill[sk] = { solved: 0, correct: 0 };
        this.statsPerSkill[sk].solved += 1;
        if (it.is_correct) this.statsPerSkill[sk].correct += 1;
      }
    });

    try {
      localStorage.setItem(`qb_solved_${studentId}`, JSON.stringify(Array.from(this.solvedQuestionIds)));
      localStorage.setItem(`satmaster_solved_q_${studentId}`, JSON.stringify(Array.from(this.solvedQuestionIds)));
      localStorage.setItem(`satmaster_correct_q_${studentId}`, JSON.stringify(Array.from(this.correctQuestionIds)));
      if (this.statsPerSkill) {
        localStorage.setItem(`qb_stats_${studentId}`, JSON.stringify(this.statsPerSkill));
      }
    } catch (e) {}

    if (studentId && studentId !== 'guest') {
      try {
        fetch('/api/qbank/record-attempt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: studentId, attempts: batchItems })
        }).then(res => {
          if (!res.ok) {
            batchItems.forEach(it => this.queuePendingAttempt(studentId, it));
          }
        }).catch(() => {
          batchItems.forEach(it => this.queuePendingAttempt(studentId, it));
        });
      } catch (e) {
        batchItems.forEach(it => this.queuePendingAttempt(studentId, it));
      }
    }

    this.renderSkillList();
    this.updateMatchingCount();
  },

  saveActiveQuestionIfAnswered(questionIdx = null) {
    let session = null;
    try {
      session = JSON.parse(sessionStorage.getItem('qb_active_session'));
    } catch (e) {}
    if (!session || !session.questions) return;

    const idx = (questionIdx !== null) ? questionIdx : (session.currentIdx || 0);
    const q = session.questions[idx];
    if (!q) return;

    const studentAnswer = session.answers ? session.answers[idx] : undefined;
    if (studentAnswer === undefined || studentAnswer === null || String(studentAnswer).trim() === '') {
      return;
    }

    const isSPR = Boolean(q.is_spr || !q.options || Object.keys(q.options || {}).length === 0);
    const isCorrect = isSPR
      ? this.isSPREqual(studentAnswer, q.correct_answer)
      : Boolean(String(studentAnswer).trim().toUpperCase() === String(q.correct_answer || '').trim().toUpperCase());
    const secSpent = (session.timePerQuestion && session.timePerQuestion[idx]) || (session.timeSpent && session.timeSpent[idx]) || 0;

    this.recordQuestionSolved(q.id, isCorrect, studentAnswer, {
      subject: q.subject || session.subject,
      domain: q.domain,
      skill: this.normalizeSkill(q.skill),
      time_spent_seconds: secSpent
    });
  },

  saveAllAnsweredQuestionsFromSession() {
    let session = null;
    try {
      session = JSON.parse(sessionStorage.getItem('qb_active_session'));
    } catch (e) {}
    if (!session || !session.questions) return;

    const batch = [];
    session.questions.forEach((q, i) => {
      const studentAns = session.answers ? session.answers[i] : null;
      if (studentAns !== undefined && studentAns !== null && String(studentAns).trim() !== '') {
        const isSPR = Boolean(q.is_spr || !q.options || Object.keys(q.options || {}).length === 0);
        const isCorr = isSPR
          ? this.isSPREqual(studentAns, q.correct_answer)
          : Boolean(String(studentAns).trim().toUpperCase() === String(q.correct_answer || '').trim().toUpperCase());
        const secSpent = (session.timePerQuestion && session.timePerQuestion[i]) || (session.timeSpent && session.timeSpent[i]) || 0;
        batch.push({
          question_id: q.id,
          subject: q.subject || session.subject,
          domain: q.domain,
          skill: this.normalizeSkill(q.skill),
          is_correct: isCorr,
          selected_answer: studentAns,
          time_spent_seconds: secSpent
        });
      }
    });

    if (batch.length > 0) {
      this.recordSolvedBatch(batch);
    }
  },

  openSetup(subject) {
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

    const qbSection = document.getElementById('tab-qbank');
    if (!qbSection || qbSection.classList.contains('hidden')) {
      if (typeof switchTab === 'function') switchTab('qbank');
    }

    const hubView = document.getElementById('qbank-hub-view');
    const solverView = document.getElementById('qbank-solver-view');
    const testContainer = document.getElementById('qb-test-container');
    const setupView = document.getElementById('qb-setup-view');

    if (hubView) hubView.classList.add('hidden');
    if (solverView) solverView.classList.add('hidden');
    if (testContainer) testContainer.classList.add('hidden');
    if (setupView) setupView.classList.remove('hidden');

    const targetSubj = (subject && ['rw', 'math', 'combined'].includes(subject)) ? subject : null;

    if (!this.isInitialized) {
      this.init(targetSubj);
    } else {
      this.loadSolvedQuestions();
      if (targetSubj) {
        this.selectSubjectView(targetSubj);
      } else {
        this.backToHub();
      }
    }

    if (setupView) {
      setupView.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  },

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

    // Invalidate stale active session from older versions
    try {
      const activeSess = JSON.parse(sessionStorage.getItem('qb_active_session'));
      if (activeSess && activeSess.version !== this.dataVersion) {
        sessionStorage.removeItem('qb_active_session');
      }
    } catch (e) {}

    if (!this.isInitialized) {
      this.isInitialized = true;
      this.initSelectedSkills(this.activeSubject || 'rw');
      this.syncUI();
      await this.loadQuestions();
      await this.loadSolvedQuestions();
    } else {
      await this.loadSolvedQuestions();
    }

    if (defaultSubj && ['rw', 'math', 'combined'].includes(defaultSubj)) {
      this.selectSubjectView(defaultSubj);
    } else {
      this.backToHub();
    }
  },

  dataVersion: '2.5.0',
  currentDataVersion: null,

  async loadQuestions(force = false) {
    if (!force && this.questionsData.rw && this.questionsData.math && this.currentDataVersion === this.dataVersion) {
      this.updateMatchingCount();
      return;
    }

    this.isLoading = true;
    const countEl = document.getElementById('qb-matching-count');
    if (countEl) countEl.innerText = "⏳ Loading College Board question datasets...";

    try {
      const fetchWithFallback = async (relPath) => {
        const v = `v=${this.dataVersion}_${Date.now()}`;
        const qp = relPath.includes('?') ? '&' : '?';
        const candidates = [
          relPath + qp + v,
          '/' + relPath + qp + v,
          './' + relPath + qp + v,
          'public/' + relPath + qp + v,
          '/public/' + relPath + qp + v,
          relPath,
          '/' + relPath,
          './' + relPath,
          '../' + relPath,
          'public/' + relPath,
          '/public/' + relPath
        ];
        for (const path of candidates) {
          try {
            const res = await fetch(path, { cache: 'no-store' });
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
      this.currentDataVersion = this.dataVersion;
      this.isLoading = false;
      this.renderSkillList();
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
    this.initSelectedSkills(subj);

    // Update subject tab styling
    ['rw', 'math', 'combined'].forEach(s => {
      const tab = document.getElementById(`qb-tab-${s}`);
      if (tab) {
        if (s === subj) {
          tab.className = "qb-subject-tab py-1.5 px-3 rounded-lg text-xs font-bold transition-all bg-blue-600 text-white shadow-xs";
        } else {
          tab.className = "qb-subject-tab py-1.5 px-3 rounded-lg text-xs font-bold transition-all text-slate-600 hover:text-slate-900 hover:bg-slate-200/50";
        }
      }
    });

    // Update Domain grids visibility (backward compatibility)
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

    this.syncSubjectDetailHeader();
    this.renderSkillList();
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
    this.toggleAllSkills();
  },

  updateToggleDomainsButtonText() {
    const btn = document.getElementById('qb-btn-toggle-domains');
    if (!btn) return;
    const subj = this.activeSubject;
    const hierarchy = this.skillHierarchy[subj] || [];
    const allSkills = [];
    hierarchy.forEach(d => d.skills.forEach(s => allSkills.push(s.name)));
    const allChecked = allSkills.length > 0 && allSkills.every(s => this.selectedSkills.has(s));
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
    this.renderSkillList();
    this.updateMatchingCount();
  },

  syncDifficultyUI() {
    const colorConfigs = {
      Easy: { active: 'bg-emerald-50 border-emerald-400 text-emerald-800 font-bold', dot: 'bg-emerald-500' },
      Medium: { active: 'bg-amber-50 border-amber-400 text-amber-800 font-bold', dot: 'bg-amber-500' },
      Hard: { active: 'bg-rose-50 border-rose-400 text-rose-800 font-bold', dot: 'bg-rose-500' }
    };

    ['Easy', 'Medium', 'Hard'].forEach(diff => {
      const btn = document.getElementById(`qb-diff-${diff}`);
      if (!btn) return;
      const isAct = this.activeDifficulties.has(diff);
      const conf = colorConfigs[diff];
      if (isAct) {
        btn.className = `qb-diff-pill px-5 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${conf.active} shadow-sm`;
      } else {
        btn.className = `qb-diff-pill px-5 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 shadow-xs`;
      }
    });
  },

  setStatusFilter(filter) {
    if (!['unsolved', 'solved', 'all'].includes(filter)) return;
    this.activeStatusFilter = filter;
    this.syncStatusUI();
    this.renderSkillList();
    this.updateMatchingCount();
  },

  syncStatusUI() {
    const statuses = ['unsolved', 'solved', 'all'];
    statuses.forEach(st => {
      const btn = document.getElementById(`qb-status-${st}`);
      if (!btn) return;
      const isAct = (this.activeStatusFilter === st);
      if (isAct) {
        btn.className = "qb-status-pill px-4 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 bg-blue-600 border-blue-500 text-white shadow-sm";
      } else {
        btn.className = "qb-status-pill px-4 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-xs";
      }
    });
  },

  setCount(cnt) {
    if (cnt === 'custom') {
      this.isCustomCount = true;
      this.isAllCount = false;
      const wrapper = document.getElementById('qb-custom-count-wrapper');
      if (wrapper) wrapper.classList.remove('hidden');
      const chevron = document.getElementById('qb-custom-chevron');
      if (chevron) chevron.classList.add('rotate-180');
      
      const input = document.getElementById('qb-custom-count-input');
      const curVal = input ? (parseInt(input.value) || 25) : 25;
      const filtered = this.getFilteredQuestions();
      const maxAvailable = Math.max(1, filtered.length || 1);
      this.activeCount = Math.min(curVal, maxAvailable);
      this.syncCustomUI();
    } else if (cnt === 'all') {
      this.isCustomCount = false;
      this.isAllCount = true;
      this.activeCount = 'all';
      const wrapper = document.getElementById('qb-custom-count-wrapper');
      if (wrapper) wrapper.classList.add('hidden');
      const chevron = document.getElementById('qb-custom-chevron');
      if (chevron) chevron.classList.remove('rotate-180');
    } else {
      this.isCustomCount = false;
      this.isAllCount = false;
      this.activeCount = parseInt(cnt) || 20;
      const wrapper = document.getElementById('qb-custom-count-wrapper');
      if (wrapper) wrapper.classList.add('hidden');
      const chevron = document.getElementById('qb-custom-chevron');
      if (chevron) chevron.classList.remove('rotate-180');
    }

    this.syncCountUI();
  },

  adjustCustomCount(delta) {
    this.isCustomCount = true;
    this.isAllCount = false;
    const current = (typeof this.activeCount === 'number') ? this.activeCount : (parseInt(document.getElementById('qb-custom-count-input')?.value) || 25);
    const filtered = this.getFilteredQuestions();
    const maxAvailable = Math.max(1, filtered.length || 1);
    
    let nextCount = current + delta;
    nextCount = Math.max(1, Math.min(nextCount, maxAvailable));
    this.activeCount = nextCount;
    this.syncCustomUI();
    this.syncCountUI();
  },

  setCustomCountDirect(num) {
    this.isCustomCount = true;
    this.isAllCount = false;
    const filtered = this.getFilteredQuestions();
    const maxAvailable = Math.max(1, filtered.length || 1);
    
    if (num === 'max') {
      this.activeCount = maxAvailable;
    } else {
      const val = parseInt(num) || 25;
      this.activeCount = Math.max(1, Math.min(val, maxAvailable));
    }
    this.syncCustomUI();
    this.syncCountUI();
  },

  onCustomCountInput(val) {
    const num = parseInt(val);
    const filtered = this.getFilteredQuestions();
    const maxAvailable = Math.max(1, filtered.length || 1);
    if (!isNaN(num) && num > 0) {
      this.activeCount = Math.max(1, Math.min(num, maxAvailable));
      this.syncCustomUI();
    }
  },

  syncCustomUI() {
    const val = (typeof this.activeCount === 'number') ? this.activeCount : 25;
    const disp = document.getElementById('qb-custom-count-display');
    if (disp) disp.innerText = val.toString();
    const input = document.getElementById('qb-custom-count-input');
    if (input) input.value = val;

    // Highlight active quick pill if matching
    const quickPills = document.querySelectorAll('.qb-custom-quick-btn');
    quickPills.forEach(btn => {
      const qVal = btn.getAttribute('data-quick');
      const isAct = (qVal === 'max' && val === this.getFilteredQuestions().length) || (parseInt(qVal) === val);
      if (isAct) {
        btn.className = "qb-custom-quick-btn px-3 py-1.5 rounded-lg border text-xs font-bold transition-all bg-blue-600 border-blue-500 text-white shadow-xs";
      } else {
        btn.className = "qb-custom-quick-btn px-3 py-1.5 rounded-lg border text-xs font-bold transition-all bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 shadow-xs";
      }
    });

    this.updateCustomRemark();
  },

  updateCustomRemark() {
    const filtered = this.getFilteredQuestions();
    const totalCount = filtered.length;
    const badge = document.getElementById('qb-custom-max-badge');
    const remark = document.getElementById('qb-custom-max-remark');
    if (badge) {
      badge.innerText = `Max: ${totalCount.toLocaleString()} available`;
    }
    if (remark) {
      const subjName = this.activeSubject === 'rw' ? 'Reading & Writing' : (this.activeSubject === 'math' ? 'Math' : 'Combined');
      remark.innerHTML = `This section currently has a maximum of <strong class="text-blue-800">${totalCount.toLocaleString()}</strong> questions available based on your selected <strong>${subjName}</strong> filters.`;
    }
  },

  syncCountUI() {
    const presetCounts = [20, 30, 40, 50, 'all', 'custom'];
    presetCounts.forEach(c => {
      const btn = document.getElementById(`qb-count-${c}`);
      if (!btn) return;
      const isAct = (c === 'custom' && this.isCustomCount) || 
                    (c === 'all' && this.isAllCount) || 
                    (!this.isCustomCount && !this.isAllCount && this.activeCount === c);
      if (isAct) {
        btn.className = "qb-count-btn px-4 py-2 rounded-xl border text-xs font-bold transition-all bg-blue-600 border-blue-500 text-white shadow-sm" + (c === 'custom' ? " flex items-center gap-1.5" : "");
      } else {
        btn.className = "qb-count-btn px-4 py-2 rounded-xl border text-xs font-bold transition-all bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-xs" + (c === 'custom' ? " flex items-center gap-1.5" : "");
      }
    });
  },

  syncUI() {
    this.syncDifficultyUI();
    this.syncStatusUI();
    this.syncCountUI();
    this.syncCustomUI();
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
      if (!matchesDomain || !matchesDiff) return false;

      // Filter by selected skills
      if (this.selectedSkills) {
        if (this.selectedSkills.size === 0) return false;
        const qSkill = this.normalizeSkill(q.skill);
        if (!this.selectedSkills.has(qSkill)) return false;
      }

      // Status Filter
      if (this.activeStatusFilter === 'unsolved') {
        return !this.solvedQuestionIds.has(q.id);
      } else if (this.activeStatusFilter === 'solved') {
        return this.solvedQuestionIds.has(q.id);
      }
      return true; // 'all'
    });
  },

  updateMatchingCount() {
    const countEl = document.getElementById('qb-matching-count');
    const poolDetailEl = document.getElementById('qb-pool-detail');
    const startBtn = document.getElementById('qb-btn-start');
    const allBtn = document.getElementById('qb-count-all');

    if (this.isLoading) return;

    const filtered = this.getFilteredQuestions();
    const totalCount = filtered.length;

    // Update Section Availability Remark
    this.updateCustomRemark();

    // If custom count is active and exceeds available questions, clamp it
    if (this.isCustomCount && typeof this.activeCount === 'number' && this.activeCount > totalCount && totalCount > 0) {
      this.activeCount = totalCount;
      this.syncCustomUI();
    }

    if (allBtn) {
      allBtn.innerHTML = `<span>All</span> <span class="text-[10px] opacity-80">(${totalCount.toLocaleString()})</span>`;
    }

    if (countEl) {
      const statusLabel = this.activeStatusFilter === 'unsolved' ? 'Unsolved' : (this.activeStatusFilter === 'solved' ? 'Solved' : 'Total');
      if (totalCount > 0) {
        countEl.innerHTML = `⚡ <span class="text-blue-600 font-black">${totalCount.toLocaleString()}</span> ${statusLabel.toLowerCase()} questions available from selected skills`;
      } else {
        countEl.innerHTML = `<span class="text-amber-500 font-bold">⚠️ 0 questions matching these skills and filters (${statusLabel})</span>`;
      }
    }

    if (poolDetailEl) {
      const subjName = this.activeSubject === 'rw' ? 'Reading & Writing' : (this.activeSubject === 'math' ? 'Math' : 'Combined');
      const diffList = Array.from(this.activeDifficulties).join(', ');
      const skillCount = this.selectedSkills ? this.selectedSkills.size : 0;
      const statusText = this.activeStatusFilter === 'unsolved' ? 'Fresh/Unsolved' : (this.activeStatusFilter === 'solved' ? 'Solved Review' : 'All Bank');
      poolDetailEl.innerText = `${subjName} • ${skillCount} active skill(s) • [${diffList}] • Mode: ${statusText}`;
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
    let targetCount = filtered.length;
    if (this.isAllCount) {
      targetCount = filtered.length;
    } else if (this.isCustomCount) {
      targetCount = parseInt(document.getElementById('qb-custom-count-input')?.value) || (typeof this.activeCount === 'number' ? this.activeCount : 25);
    } else {
      targetCount = this.activeCount;
    }

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
      checked: {},
      config: {
        subject: this.activeSubject,
        domains: Array.from(this.getActiveDomains()),
        difficulties: Array.from(this.activeDifficulties),
        requestedCount: targetCount,
        totalAvailable: filtered.length
      },
      version: this.dataVersion,
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
    let q = session.questions[idx];
    if (!q) return;

    // Self-healing synchronization with fresh questionsData (syncs tables and graphs if session was cached)
    if (q && q.id && this.questionsData) {
      const isMath = (q.subject === 'Math' || (q.id && q.id.startsWith('cb_math')));
      const pool = isMath ? this.questionsData.math : this.questionsData.rw;
      if (pool && Array.isArray(pool)) {
        const freshQ = pool.find(item => item.id === q.id);
        if (freshQ && freshQ.passage && freshQ.passage !== q.passage) {
          q.passage = freshQ.passage;
          q.prompt = freshQ.prompt;
          session.questions[idx] = q;
          try {
            sessionStorage.setItem('qb_active_session', JSON.stringify(session));
          } catch (e) {}
        }
      }
    }

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
        flagBtn.className = "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all bg-amber-50 text-amber-800 border-amber-300 shadow-xs";
        if (flagIcon) flagIcon.innerText = "🚩";
        if (flagText) flagText.innerText = "Flagged for Review";
      } else {
        flagBtn.className = "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all text-slate-700 border-slate-300 bg-white hover:bg-slate-50 shadow-sm";
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
    const qnumBadge = document.getElementById('qb-q-num-badge');

    if (qnumBadge) qnumBadge.innerText = (idx + 1);

    if (diffEl) {
      diffEl.innerText = q.difficulty || 'Medium';
      if (q.difficulty === 'Easy') {
        diffEl.className = "text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200";
      } else if (q.difficulty === 'Hard') {
        diffEl.className = "text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200";
      } else {
        diffEl.className = "text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200";
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

    const isChecked = Boolean(session.checked && session.checked[idx]);
    const isSPR = Boolean(q.is_spr || !q.options || Object.keys(q.options || {}).length === 0);
    const mcqContainer = document.getElementById('qb-mcq-container');
    const sprContainer = document.getElementById('qb-spr-container');
    const elimTip = document.getElementById('qb-elim-tip');
    const answeredStatus = document.getElementById('qb-answered-status');

    const studentAnswer = session.answers ? session.answers[idx] : undefined;

    // Check action controls & explanation elements
    const checkBtnText = document.getElementById('qb-check-btn-text');
    const feedbackPill = document.getElementById('qb-check-feedback-pill');
    const explCard = document.getElementById('qb-explanation-card');
    const explHeader = document.getElementById('qb-explanation-header');
    const explContent = document.getElementById('qb-explanation-content');
    const checkContainer = document.getElementById('qb-check-container');
    const footerCheckBtn = document.getElementById('qb-footer-btn-check');

    // In homework mode, the student must not see check answer buttons or intermediate rationales
    const isHomeworkMode = Boolean(
      window.activeHomeworkAssignment || 
      (session.config && session.config.homework)
    );
    if (isHomeworkMode) {
      if (checkContainer) checkContainer.classList.add('hidden');
      if (footerCheckBtn) footerCheckBtn.classList.add('hidden');
      if (explCard) explCard.classList.add('hidden');
      if (feedbackPill) feedbackPill.classList.add('hidden');
    } else {
      if (checkContainer) checkContainer.classList.remove('hidden');
      if (footerCheckBtn) footerCheckBtn.classList.remove('hidden');
    }

    if (isSPR) {
      if (mcqContainer) mcqContainer.classList.add('hidden');
      if (sprContainer) sprContainer.classList.remove('hidden');
      if (elimTip) elimTip.classList.add('hidden');

      const sprInput = document.getElementById('qb-spr-input');
      const sprStatus = document.getElementById('qb-spr-status');
      if (sprInput) sprInput.value = studentAnswer || '';

      if (isChecked) {
        const isCorrect = this.isSPREqual(studentAnswer, q.correct_answer);
        if (sprInput) {
          if (isCorrect) {
            sprInput.className = "w-full sm:w-64 bg-emerald-50 border-2 border-emerald-500 rounded-xl px-4 py-2.5 text-base font-mono font-bold text-emerald-900 outline-none shadow-sm";
          } else {
            sprInput.className = "w-full sm:w-64 bg-rose-50 border-2 border-rose-500 rounded-xl px-4 py-2.5 text-base font-mono font-bold text-rose-900 outline-none shadow-sm";
          }
        }
        if (sprStatus) {
          if (isCorrect) {
            sprStatus.innerHTML = `<span class="text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-md">✓ Correct!</span>`;
          } else {
            sprStatus.innerHTML = `<span class="text-xs font-bold text-rose-800 bg-rose-100 border border-rose-300 px-2.5 py-1 rounded-md">✗ Incorrect • Key: <strong class="text-emerald-700 font-mono">${q.correct_answer}</strong></span>`;
          }
        }
      } else {
        if (sprInput) {
          sprInput.className = "w-full sm:w-64 bg-white border-2 border-slate-300 focus:border-blue-600 rounded-xl px-4 py-2.5 text-base font-mono font-bold text-slate-900 outline-none placeholder:text-slate-400 shadow-sm";
        }
        if (sprStatus) sprStatus.innerText = studentAnswer ? '✓ Saved' : '';
      }
    } else {
      if (mcqContainer) mcqContainer.classList.remove('hidden');
      if (sprContainer) sprContainer.classList.add('hidden');
      if (elimTip) elimTip.classList.remove('hidden');

      const strikethroughs = (session.strikethroughs && session.strikethroughs[idx]) || [];
      const optionEntries = Object.entries(q.options || {});
      const correctLetter = String(q.correct_answer || '').trim().toUpperCase();

      let html = '';
      optionEntries.forEach(([key, val]) => {
        const keyUpper = String(key).trim().toUpperCase();
        const isSelected = (studentAnswer === key);
        const isStruck = strikethroughs.includes(key);
        const isCorrectChoice = (keyUpper === correctLetter);

        let borderBg = '';
        let badgeClass = '';
        let statusTag = '';

        if (isChecked) {
          if (isCorrectChoice) {
            // Correct choice: soft green card with green badge
            borderBg = 'bg-emerald-50/90 border-2 border-emerald-500 text-slate-900 shadow-sm';
            badgeClass = 'bg-emerald-600 text-white font-black shadow-xs';
            statusTag = isSelected
              ? `<span class="ml-auto text-xs font-extrabold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-md shrink-0 flex items-center gap-1">✓ Your Choice (Correct!)</span>`
              : `<span class="ml-auto text-xs font-extrabold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-md shrink-0 flex items-center gap-1">✓ Correct Answer</span>`;
          } else if (isSelected && !isCorrectChoice) {
            // Student selected wrong choice: soft red card with red badge
            borderBg = 'bg-rose-50/90 border-2 border-rose-500 text-slate-900 shadow-sm';
            badgeClass = 'bg-rose-600 text-white font-black shadow-xs';
            statusTag = `<span class="ml-auto text-xs font-extrabold text-rose-800 bg-rose-100 border border-rose-300 px-2.5 py-1 rounded-md shrink-0 flex items-center gap-1">✗ Your Choice (Incorrect)</span>`;
          } else {
            // Neutral choices
            borderBg = 'bg-slate-50/50 border border-slate-200 text-slate-400 opacity-60';
            badgeClass = 'bg-slate-100 text-slate-400 border border-slate-200';
          }
        } else {
          // Normal state before checking: clean white cards, royal blue when selected
          borderBg = isSelected
            ? 'bg-blue-50/80 border-2 border-blue-600 text-slate-900 ring-2 ring-blue-600/20 shadow-sm'
            : 'bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 text-slate-800 shadow-xs';

          badgeClass = isSelected
            ? 'bg-blue-600 text-white font-bold shadow-xs'
            : 'bg-slate-100 border border-slate-300 text-slate-700 font-bold';
        }

        const strikeBtnClass = isStruck
          ? 'bg-rose-50 border-rose-300 text-rose-600'
          : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-100';

        const textStrike = isStruck ? 'line-through opacity-40 text-slate-400' : '';

        html += `
          <div class="flex items-center gap-2 group" data-choice="${key}">
            <button type="button" onclick="qbEngine.selectOption('${key}')" id="qb-choice-btn-${key}" class="flex-1 flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${borderBg}">
              <span class="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${badgeClass}">
                ${key}
              </span>
              <span class="text-xs sm:text-sm font-medium leading-relaxed pt-0.5 qb-choice-text ${textStrike}">
                ${this.formatQuestionText(val)}
              </span>
              ${statusTag}
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
        answeredStatus.innerHTML = `<span class="text-emerald-700 font-extrabold">● Answered: ${studentAnswer}</span>`;
      } else {
        answeredStatus.innerHTML = `<span class="text-slate-400 font-bold">○ Unanswered</span>`;
      }
    }

    // Evaluation for feedback pill and explanation card
    let isCorrect = false;
    if (isSPR) {
      isCorrect = this.isSPREqual(studentAnswer, q.correct_answer);
    } else {
      isCorrect = Boolean(studentAnswer && String(studentAnswer).trim().toUpperCase() === String(q.correct_answer || '').trim().toUpperCase());
    }

    if (isChecked) {
      if (checkBtnText) checkBtnText.innerText = "Re-check Answer";
      if (feedbackPill) {
        feedbackPill.classList.remove('hidden');
        if (isCorrect) {
          feedbackPill.className = "text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-xs";
          feedbackPill.innerHTML = `<span>✓</span><span>Correct Answer!</span>`;
        } else {
          feedbackPill.className = "text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 bg-rose-50 text-rose-800 border border-rose-300 shadow-xs";
          feedbackPill.innerHTML = `<span>✗</span><span>Incorrect (Answer: <strong class="text-emerald-700 font-mono">${q.correct_answer}</strong>)</span>`;
        }
      }

      if (explCard) {
        explCard.classList.remove('hidden');
        explCard.className = isCorrect
          ? "rounded-2xl p-4 sm:p-5 border transition-all space-y-3 shadow-sm bg-emerald-50/40 border-emerald-300 text-slate-800"
          : "rounded-2xl p-4 sm:p-5 border transition-all space-y-3 shadow-sm bg-rose-50/40 border-rose-300 text-slate-800";

        if (explHeader) {
          explHeader.innerHTML = `
            <div class="space-y-2.5 w-full">
              <!-- Summary Status matching user reference image -->
              <div class="flex flex-wrap items-center gap-4 text-xs sm:text-sm font-bold border-b border-slate-200/80 pb-2">
                <span class="${isCorrect ? 'text-emerald-800' : 'text-rose-700'}">Your Answer: <strong class="font-black text-sm">${studentAnswer || 'None'}</strong></span>
                <span class="text-emerald-800">Correct Answer: <strong class="font-black text-sm">${q.correct_answer}</strong></span>
              </div>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="w-6 h-6 rounded-full ${isCorrect ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-rose-100 text-rose-700 border-rose-300'} border flex items-center justify-center font-black text-xs">
                    ${isCorrect ? '✓' : '✗'}
                  </span>
                  <span class="text-sm font-black ${isCorrect ? 'text-emerald-800' : 'text-rose-800'}">
                    ${isCorrect ? 'Correct! Excellent job!' : 'Incorrect Choice'}
                  </span>
                </div>
                <span class="text-xs font-mono font-bold ${isCorrect ? 'text-emerald-800 bg-emerald-100 border-emerald-300' : 'text-slate-700 bg-white border-slate-200'} border px-2.5 py-1 rounded-md">
                  Key: ${q.correct_answer}
                </span>
              </div>
            </div>
          `;
        }

        if (explContent) {
          const rawRationale = q.rationale && q.rationale.trim();
          if (rawRationale) {
            explContent.innerHTML = this.formatQuestionText(rawRationale);
          } else {
            explContent.innerHTML = `<p class="text-slate-700">The correct answer for this question is <strong class="text-emerald-700 font-mono">${q.correct_answer}</strong>.</p>`;
          }
        }
        this.renderMath(explCard);
      }
    } else {
      if (checkBtnText) checkBtnText.innerText = "Check Answer";
      if (feedbackPill) feedbackPill.classList.add('hidden');
      if (explCard) explCard.classList.add('hidden');
    }
  },

  checkCurrentAnswer() {
    let session = null;
    try {
      session = JSON.parse(sessionStorage.getItem('qb_active_session'));
    } catch (e) {}
    if (!session || !session.questions) return;

    const isHomeworkMode = Boolean(
      window.activeHomeworkAssignment || 
      (session.config && session.config.homework)
    );
    if (isHomeworkMode) {
      if (typeof showToast === 'function') {
        showToast("🔒 Homework Mode", "Answers and explanations are revealed after submitting your homework task.", "info");
      }
      return;
    }

    const idx = session.currentIdx || 0;
    const q = session.questions[idx];
    if (!q) return;

    const studentAnswer = session.answers ? session.answers[idx] : undefined;
    const isSPR = Boolean(q.is_spr || !q.options || Object.keys(q.options || {}).length === 0);

    if (studentAnswer === undefined || String(studentAnswer).trim() === '') {
      if (typeof showToast === 'function') {
        showToast("⚠️ Answer Required", isSPR ? "Please enter your answer before checking." : "Please select an answer choice before checking.", "warning");
      } else {
        alert(isSPR ? "Please enter your answer before checking." : "Please select an answer choice before checking.");
      }
      return;
    }

    if (!session.checked) session.checked = {};
    session.checked[idx] = true;
    sessionStorage.setItem('qb_active_session', JSON.stringify(session));

    // Record question as solved immediately for this student
    const isCorrect = isSPR
      ? this.isSPREqual(studentAnswer, q.correct_answer)
      : Boolean(String(studentAnswer).trim().toUpperCase() === String(q.correct_answer || '').trim().toUpperCase());
    const timeSpent = (session.timeSpent && session.timeSpent[idx]) ? session.timeSpent[idx] : 0;
    this.recordQuestionSolved(q.id, isCorrect, studentAnswer, {
      subject: q.subject || session.subject,
      domain: q.domain,
      skill: this.normalizeSkill(q.skill),
      time_spent_seconds: timeSpent
    });

    this.updateChoicesUI();

    const explCard = document.getElementById('qb-explanation-card');
    if (explCard) {
      explCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
    if (session.checked && session.checked[session.currentIdx]) {
      delete session.checked[session.currentIdx];
    }
    sessionStorage.setItem('qb_active_session', JSON.stringify(session));

    this.updateChoicesUI();

    // Immediately record question as solved
    this.saveActiveQuestionIfAnswered();
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
    if (session.checked && session.checked[session.currentIdx]) {
      delete session.checked[session.currentIdx];
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

    if (clean) {
      this.saveActiveQuestionIfAnswered();
    }

    if (!session.checked || !session.checked[session.currentIdx]) {
      const explCard = document.getElementById('qb-explanation-card');
      const feedbackPill = document.getElementById('qb-check-feedback-pill');
      const checkBtnText = document.getElementById('qb-check-btn-text');
      if (explCard) explCard.classList.add('hidden');
      if (feedbackPill) feedbackPill.classList.add('hidden');
      if (checkBtnText) checkBtnText.innerText = "Check Answer";
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
        flagBtn.className = "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all bg-amber-50 text-amber-800 border-amber-300 shadow-xs";
        if (flagIcon) flagIcon.innerText = "🚩";
        if (flagText) flagText.innerText = "Flagged for Review";
      } else {
        flagBtn.className = "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all text-slate-700 border-slate-300 bg-white hover:bg-slate-50 shadow-sm";
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

    // Immediately record active question as solved if answered
    this.saveActiveQuestionIfAnswered();

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

    // Immediately record active question as solved if answered
    this.saveActiveQuestionIfAnswered();

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

    // Immediately record active question as solved if answered
    this.saveActiveQuestionIfAnswered();

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

      let bgStyle = 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-400 hover:bg-slate-100';
      if (isAnswered) {
        bgStyle = 'bg-blue-50 border-blue-600 text-blue-700 font-bold';
      }
      if (isCurrent) {
        bgStyle += ' ring-2 ring-blue-600 font-black';
      }

      html += `
        <button type="button" onclick="qbEngine.goToQuestion(${i})" class="relative h-11 rounded-xl border text-xs flex items-center justify-center transition-all ${bgStyle}">
          <span>${i + 1}</span>
          ${isFlagged ? '<span class="absolute top-1 right-1 text-[10px] text-amber-500 font-bold leading-none">⚑</span>' : ''}
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
          ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold'
          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100';

        html += `
          <button type="button" onclick="qbEngine.goToQuestion(${i})" class="relative p-2 rounded-lg border text-[11px] font-bold flex items-center justify-center transition-all hover:scale-105 ${pillClass}">
            <span>Q${i + 1}</span>
            ${isFlg ? '<span class="text-amber-500 ml-1 font-bold">⚑</span>' : ''}
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
        <div class="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
          ${correctCount} / ${total}
        </div>
        <div class="text-xs sm:text-sm font-bold text-slate-600">
          Accuracy: <span class="text-emerald-600 font-extrabold">${accuracyPct}%</span> • Total Time: <span class="font-mono text-blue-700 font-bold">${Math.floor(totalSeconds / 60)}m ${totalSeconds % 60}s</span> (avg ${avgSec}s / q)
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
        const borderClass = isCorrect ? 'border-emerald-200 bg-emerald-50/50' : 'border-rose-200 bg-rose-50/50';
        const badgeClass = isCorrect ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : 'bg-rose-100 text-rose-700 border border-rose-300';

        html += `
          <details class="p-3.5 rounded-2xl border ${borderClass} transition-all space-y-2">
            <summary class="cursor-pointer flex items-center justify-between text-xs font-bold text-slate-800">
              <div class="flex items-center gap-2">
                <span class="w-6 h-6 rounded-full ${badgeClass} flex items-center justify-center font-extrabold text-[11px]">
                  ${isCorrect ? '✓' : '✗'}
                </span>
                <span>Question ${i + 1} (${q.domain})</span>
              </div>
              <div class="flex items-center gap-2 font-mono text-[11px]">
                <span class="${isCorrect ? 'text-emerald-700' : 'text-rose-700'} font-bold">You: ${studentAns || 'Skipped'}</span>
                <span class="text-slate-300">|</span>
                <span class="text-blue-700 font-bold">Key: ${q.correct_answer || '-'}</span>
                <span class="text-slate-500">(${secSpent}s)</span>
              </div>
            </summary>
            <div class="pt-2 border-t border-slate-200 text-[11px] text-slate-700 space-y-2 leading-relaxed">
              <div class="text-slate-900 font-medium whitespace-pre-line">${this.formatQuestionText(q.prompt)}</div>
              ${q.rationale ? `<div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 whitespace-pre-line"><strong class="text-blue-700 block mb-1">Explanation:</strong>${this.formatQuestionText(q.rationale)}</div>` : ''}
            </div>
          </details>
        `;
      });
      listEl.innerHTML = html;
      this.renderMath(listEl);
    }

    // Batch record all answered questions from this session as solved
    try {
      const batchAnswers = [];
      session.questions.forEach((q, i) => {
        const studentAns = session.answers ? session.answers[i] : null;
        if (studentAns !== undefined && studentAns !== null && String(studentAns).trim() !== '') {
          const isSPR = Boolean(q.is_spr || !q.options || Object.keys(q.options || {}).length === 0);
          const isCorr = isSPR
            ? this.isSPREqual(studentAns, q.correct_answer)
            : Boolean(String(studentAns).trim().toUpperCase() === String(q.correct_answer || '').trim().toUpperCase());
          const timeSpent = (session.timeSpent && session.timeSpent[i]) ? session.timeSpent[i] : 0;
          batchAnswers.push({
            question_id: q.id,
            subject: q.subject || session.subject,
            domain: q.domain,
            skill: this.normalizeSkill(q.skill),
            is_correct: isCorr,
            selected_answer: studentAns,
            time_spent_seconds: timeSpent
          });
        }
      });
      if (batchAnswers.length > 0) {
        this.recordSolvedBatch(batchAnswers);
      }
    } catch (e) {}

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
    this.saveAllAnsweredQuestionsFromSession();
    this.returnToSetup();
  },

  returnToSetup() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    // Persist all answered questions from the session immediately
    this.saveAllAnsweredQuestionsFromSession();

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

    if (this.activeView === 'detail') {
      this.showDetailView();
    } else {
      this.showHubView();
    }

    this.renderSkillList();
    this.updateMatchingCount();
  },

  renderMath(el) {
    if (!el) return;
    const katexConfig = {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false },
        { left: '\\(', right: '\\)', display: false },
        { left: '\\[', right: '\\]', display: true }
      ],
      ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'annotation', 'annotation-xml', 'svg'],
      ignoredClasses: ['qb-figure-wrapper'],
      throwOnError: false
    };

    if (typeof window.renderMathInElement === 'function') {
      try {
        window.renderMathInElement(el, katexConfig);
      } catch (err) {
        console.warn("[qbEngine] KaTeX render error:", err);
      }
    } else {
      setTimeout(() => {
        if (typeof window.renderMathInElement === 'function') {
          try {
            window.renderMathInElement(el, katexConfig);
          } catch (e) {}
        }
      }, 250);
    }
  },

  formatNotesContent(raw) {
    if (!raw || typeof raw !== 'string') return null;

    // 1. Check for notes introductory phrase (e.g. 'While researching a topic, a student has taken the following notes:')
    const notesRegex = /^(.*?(?:taken\s+the\s+following\s+notes|following\s+notes)\s*:?\s*)([\s\S]+)$/i;
    const match = raw.match(notesRegex);
    if (match) {
      let intro = match[1].trim();
      if (!intro.endsWith(':')) {
        intro = intro.replace(/\s*:?$/, ':');
      }
      const body = match[2].trim();
      const rawLines = body.split(/\n+/).map(l => l.trim()).filter(Boolean);
      if (rawLines.length > 0) {
        const items = rawLines.map(line => {
          return line.replace(/^[•\-\*\u2022\u2023\u25E6\u2043\u2219]\s*/, '').trim();
        }).filter(Boolean);

        if (items.length > 0) {
          const listItemsHtml = items.map(item => `
            <li class="flex items-start gap-2.5 sm:gap-3 text-slate-800 leading-relaxed text-sm sm:text-base">
              <span class="text-slate-900 text-base leading-snug flex-shrink-0 select-none font-bold" aria-hidden="true">•</span>
              <span class="flex-1">${item}</span>
            </li>
          `.trim()).join('');

          return `
            <div class="qb-notes-wrapper whitespace-normal space-y-3.5 my-1">
              <p class="text-slate-900 leading-relaxed font-normal">${intro}</p>
              <ul class="qb-notes-list space-y-3 pl-3 sm:pl-4 list-none m-0 p-0">
                ${listItemsHtml}
              </ul>
            </div>
          `.trim();
        }
      }
    }

    // 2. Check for explicit bullet lines (lines starting with • or bullet characters)
    if (raw.includes('•') || raw.includes('\u2022')) {
      const lines = raw.split(/\n+/).map(l => l.trim()).filter(Boolean);
      const bulletLines = lines.filter(l => /^[•\u2022]/.test(l));
      if (bulletLines.length >= 2) {
        const introLines = [];
        const items = [];
        let inBullets = false;
        lines.forEach(l => {
          if (/^[•\u2022]/.test(l)) {
            inBullets = true;
            items.push(l.replace(/^[•\u2022]\s*/, '').trim());
          } else if (!inBullets) {
            introLines.push(l);
          } else {
            items.push(l);
          }
        });

        const listItemsHtml = items.map(item => `
          <li class="flex items-start gap-2.5 sm:gap-3 text-slate-800 leading-relaxed text-sm sm:text-base">
            <span class="text-slate-900 text-base leading-snug flex-shrink-0 select-none font-bold" aria-hidden="true">•</span>
            <span class="flex-1">${item}</span>
          </li>
        `.trim()).join('');

        const introHtml = introLines.length > 0
          ? `<p class="text-slate-900 leading-relaxed font-normal mb-3">${introLines.join('<br>')}</p>`
          : '';

        return `
          <div class="qb-notes-wrapper whitespace-normal space-y-3.5 my-1">
            ${introHtml}
            <ul class="qb-notes-list space-y-3 pl-3 sm:pl-4 list-none m-0 p-0">
              ${listItemsHtml}
            </ul>
          </div>
        `.trim();
      }
    }

    return null;
  },

  formatQuestionText(raw) {
    if (!raw) return '';

    // First replace markdown image ![alt](url) with responsive img
    let formatted = raw.replace(/!\[(.*?)\]\((.*?)\)/g, (match, alt, url) => {
      return `<img src="${url}" alt="${alt || 'Figure'}" class="max-w-full h-auto rounded-xl border border-slate-700 bg-white/5 my-3 shadow-md mx-auto block" loading="lazy" />`;
    });

    // Check if this text is a notes question
    const notesHtml = this.formatNotesContent(formatted);
    if (notesHtml) {
      return notesHtml;
    }

    return formatted;
  }
};

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    try {
      if (typeof qbEngine !== 'undefined' && qbEngine.saveAllAnsweredQuestionsFromSession) {
        qbEngine.saveAllAnsweredQuestionsFromSession();
      }
    } catch (e) {}
  });
}
