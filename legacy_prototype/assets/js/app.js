// ApplyPilot Main Application Controller
// Orchestrates views, interactions, modals, notifications, and event handlers

class ApplyPilotApp {
  constructor() {
    this.currentView = 'landing';
    this.activeJob = null;
    this.activeMatch = null;
    this.tailoredCV = null;
    this.activeTab = 'analysis';
    this.interviewSession = {
      active: false,
      questions: [],
      currentIndex: 0,
      feedbackList: []
    };

    // Reference dependencies
    this.store = window.applypilotStore;
    this.parser = window.applypilotParser;
    this.analyzer = window.applypilotAnalyzer;
    this.tailor = window.applypilotTailor;
    this.coverLetter = window.applypilotCoverLetter;
    this.answers = window.applypilotAnswers;
    this.interview = window.applypilotInterview;
    this.templates = window.applypilotTemplates;
    this.research = window.applypilotResearch;

    this.init();
  }

  init() {
    // Check if user is logged in
    if (this.store.isLoggedIn()) {
      this.navigate('dashboard');
    } else {
      this.navigate('landing');
    }

    // Subscribe to store updates
    this.store.subscribe('auth:change', (user) => {
      this.renderNav();
      if (!user) {
        this.navigate('landing');
      } else {
        this.navigate('dashboard');
      }
    });

    this.store.subscribe('applications:update', () => {
      if (this.currentView === 'dashboard' || this.currentView === 'tracker') {
        this.renderCurrentView();
      }
    });

    this.renderNav();
  }

  // Router / View Navigation
  navigate(viewName, params = {}) {
    this.currentView = viewName;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const mainContainer = document.getElementById('app-main');
    if (!mainContainer) return;

    // Reset modals or dropdowns
    this.closeModal();

    switch (viewName) {
      case 'landing':
        mainContainer.innerHTML = this.renderLandingPage();
        this.bindLandingEvents();
        break;

      case 'onboarding':
        mainContainer.innerHTML = this.renderOnboarding(params.step || 1);
        this.bindOnboardingEvents(params.step || 1);
        break;

      case 'dashboard':
        mainContainer.innerHTML = this.renderDashboard();
        this.bindDashboardEvents();
        break;

      case 'profile':
        mainContainer.innerHTML = this.renderProfileView();
        this.bindProfileEvents();
        break;

      case 'add-job':
        mainContainer.innerHTML = this.renderAddJobView();
        this.bindAddJobEvents();
        break;

      case 'application-workspace':
        if (params.job) this.activeJob = params.job;
        if (!this.activeJob) {
          this.activeJob = this.store.getSavedJobs()[0];
        }
        if (params.tab) this.activeTab = params.tab;

        // Run alignment analysis
        this.activeMatch = this.analyzer.computeMatch(this.store.getProfile(), this.activeJob);
        if (!this.tailoredCV || this.tailoredCV.jobId !== this.activeJob.id) {
          this.tailoredCV = this.tailor.tailorCV(this.store.getProfile(), this.activeJob, this.activeMatch);
        }

        mainContainer.innerHTML = this.renderApplicationWorkspace();
        this.bindWorkspaceEvents();
        break;

      case 'tracker':
        mainContainer.innerHTML = this.renderTrackerView(params.filter || 'all');
        this.bindTrackerEvents();
        break;

      default:
        mainContainer.innerHTML = this.renderLandingPage();
    }

    this.renderNav();
  }

  // Render Navigation Bar
  renderNav() {
    const navRight = document.getElementById('nav-user-actions');
    if (!navRight) return;

    const isAuth = this.store.isLoggedIn();
    const user = this.store.getAuthUser();

    if (isAuth) {
      navRight.innerHTML = `
        <div class="flex items-center gap-4">
          <button onclick="window.applypilot.navigate('dashboard')" class="text-sm font-medium text-slate-300 hover:text-white px-2 py-1 ${this.currentView === 'dashboard' ? 'text-blue-400 font-semibold' : ''}">
            Dashboard
          </button>
          <button onclick="window.applypilot.navigate('tracker')" class="text-sm font-medium text-slate-300 hover:text-white px-2 py-1 ${this.currentView === 'tracker' ? 'text-blue-400 font-semibold' : ''}">
            Tracker
          </button>
          <button onclick="window.applypilot.navigate('profile')" class="text-sm font-medium text-slate-300 hover:text-white px-2 py-1 ${this.currentView === 'profile' ? 'text-blue-400 font-semibold' : ''}">
            Career Profile
          </button>
          <div class="h-4 w-px bg-slate-700"></div>
          <button onclick="window.applypilot.navigate('add-job')" class="btn-primary btn-sm flex items-center gap-1.5 shadow-sm">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
            <span>New Application</span>
          </button>
          <div class="relative group">
            <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-xs font-bold text-white cursor-pointer border border-white/20">
              ${user.name ? user.name.charAt(0) : 'U'}
            </div>
            <div class="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 hidden group-hover:block z-50">
              <div class="px-4 py-2 border-b border-slate-700 text-xs text-slate-400">
                Signed in as <strong class="text-white block truncate">${user.email}</strong>
              </div>
              <button onclick="window.applypilot.navigate('profile')" class="w-full text-left px-4 py-2 text-xs text-slate-200 hover:bg-slate-700">Career Profile</button>
              <button onclick="window.applypilot.store.resetToDemo('student'); window.applypilot.navigate('dashboard'); window.applypilot.showToast('Reset to Student persona');" class="w-full text-left px-4 py-2 text-xs text-slate-200 hover:bg-slate-700">Load Student Demo</button>
              <button onclick="window.applypilot.store.resetToDemo('graduate'); window.applypilot.navigate('dashboard'); window.applypilot.showToast('Reset to Graduate persona');" class="w-full text-left px-4 py-2 text-xs text-slate-200 hover:bg-slate-700">Load Graduate Demo</button>
              <button onclick="window.applypilot.store.logout();" class="w-full text-left px-4 py-2 text-xs text-rose-400 hover:bg-slate-700 border-t border-slate-700">Sign Out</button>
            </div>
          </div>
        </div>
      `;
    } else {
      navRight.innerHTML = `
        <div class="flex items-center gap-3">
          <button onclick="window.applypilot.openAuthModal('signin')" class="text-sm font-semibold text-slate-300 hover:text-white px-3 py-1.5 transition">
            Sign In
          </button>
          <button onclick="window.applypilot.openAuthModal('signup')" class="btn-primary btn-sm">
            Get Started
          </button>
        </div>
      `;
    }
  }

  // -------------------------------------------------------------
  // LANDING PAGE VIEW
  // -------------------------------------------------------------
  renderLandingPage() {
    return `
      <!-- Hero Section -->
      <section class="hero-gradient pt-16 pb-20 px-4 sm:px-6 lg:px-8 border-b border-slate-800/80">
        <div class="max-w-5xl mx-auto text-center">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-6 animate-pulse">
            <span class="w-2 h-2 rounded-full bg-blue-400"></span>
            Zero-Fabrication Job Application Assistant
          </div>

          <h1 class="text-4xl sm:text-6xl font-extrabold text-white tracking-tight mb-6 leading-tight">
            Stop sending the same CV <br class="hidden sm:inline"/>to every job.
          </h1>

          <p class="text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto font-normal mb-8 leading-relaxed">
            ApplyPilot analyzes the job you want and helps you tailor your CV and application around what that employer is actually looking for — <span class="text-white font-medium underline decoration-blue-500 underline-offset-4">without inventing experience</span>.
          </p>

          <div class="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
            <button onclick="window.applypilot.startFlow()" class="btn-primary text-base px-8 py-3.5 shadow-lg shadow-blue-500/25 w-full sm:w-auto">
              <span>Tailor My First Application</span>
              <svg class="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
            </button>
            <button onclick="document.getElementById('how-it-works').scrollIntoView({behavior: 'smooth'})" class="btn-secondary text-base px-7 py-3.5 w-full sm:w-auto">
              See How It Works
            </button>
          </div>

          <!-- Hero Graphic / Mockup Preview -->
          <div class="relative mx-auto max-w-4xl rounded-2xl glass-panel p-3 sm:p-5 shadow-2xl border border-slate-700/60 overflow-hidden">
            <div class="flex items-center justify-between pb-3 mb-4 border-b border-slate-700/60 text-xs text-slate-400">
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded-full bg-rose-500/80"></div>
                <div class="w-3 h-3 rounded-full bg-amber-500/80"></div>
                <div class="w-3 h-3 rounded-full bg-emerald-500/80"></div>
                <span class="ml-2 font-mono text-slate-400">applypilot.io / match-analysis / stripe-swe-intern</span>
              </div>
              <span class="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">84% Alignment</span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
              <!-- Column 1: Match Score -->
              <div class="bg-slate-900/80 rounded-xl p-4 border border-slate-800">
                <span class="text-xs uppercase font-bold text-slate-400">Profile-to-Job Alignment</span>
                <div class="flex items-center gap-4 mt-3">
                  <div class="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center font-extrabold text-xl text-emerald-300">
                    84%
                  </div>
                  <div>
                    <h4 class="text-sm font-bold text-white">Stripe</h4>
                    <p class="text-xs text-slate-400">Frontend Intern</p>
                    <span class="text-[11px] text-blue-400 font-medium">Verified from CV</span>
                  </div>
                </div>
              </div>

              <!-- Column 2: Strong Matches -->
              <div class="bg-slate-900/80 rounded-xl p-4 border border-slate-800">
                <span class="text-xs uppercase font-bold text-emerald-400 flex items-center gap-1.5">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                  Strong Matches
                </span>
                <div class="flex flex-wrap gap-1.5 mt-3">
                  <span class="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 text-xs border border-emerald-500/20">React</span>
                  <span class="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 text-xs border border-emerald-500/20">TypeScript</span>
                  <span class="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 text-xs border border-emerald-500/20">REST APIs</span>
                  <span class="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 text-xs border border-emerald-500/20">Git</span>
                </div>
              </div>

              <!-- Column 3: Grounded Suggestions -->
              <div class="bg-slate-900/80 rounded-xl p-4 border border-slate-800">
                <span class="text-xs uppercase font-bold text-amber-400 flex items-center gap-1.5">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                  Needs Attention
                </span>
                <p class="text-xs text-slate-300 mt-2 leading-relaxed">
                  <span class="font-medium text-amber-300">Docker</span> is listed in job description but <span class="underline decoration-amber-400/40">not found in profile</span>.
                </p>
                <div class="mt-2 text-[11px] text-slate-400 italic">User confirms before adding.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Trust & Philosophy Section (Section 5) -->
      <section class="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div class="text-center mb-12">
          <h2 class="text-2xl sm:text-3xl font-bold text-white mb-3">
            Your experience stays yours. AI helps you present it better.
          </h2>
          <p class="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base">
            Employers can spot exaggerated AI resumes in seconds. ApplyPilot is engineered around strict truthfulness: no invented jobs, no fabricated skills, no inflated metrics.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div class="glass-panel p-6 border border-slate-800/80 rounded-xl">
            <div class="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            </div>
            <h3 class="text-base font-bold text-white mb-2">Analyze jobs in seconds</h3>
            <p class="text-xs text-slate-400 leading-relaxed">Extract required tools, responsibilities, and hidden employer keywords from any posting.</p>
          </div>

          <div class="glass-panel p-6 border border-slate-800/80 rounded-xl">
            <div class="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
            </div>
            <h3 class="text-base font-bold text-white mb-2">Real experience at center</h3>
            <p class="text-xs text-slate-400 leading-relaxed">We reframe and highlight your genuine coursework, internships, and projects to match job phrasing.</p>
          </div>

          <div class="glass-panel p-6 border border-slate-800/80 rounded-xl">
            <div class="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            </div>
            <h3 class="text-base font-bold text-white mb-2">Job-specific applications</h3>
            <p class="text-xs text-slate-400 leading-relaxed">Generate targeted CV variations, tailored cover letters, and application questions for each role.</p>
          </div>

          <div class="glass-panel p-6 border border-slate-800/80 rounded-xl">
            <div class="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
            </div>
            <h3 class="text-base font-bold text-white mb-2">Track everything in one place</h3>
            <p class="text-xs text-slate-400 leading-relaxed">Integrated Kanban board and tracker keep interview dates, tailored documents, and notes organized.</p>
          </div>
        </div>
      </section>

      <!-- How It Works Section (Section 6) -->
      <section id="how-it-works" class="py-16 bg-slate-900/60 border-y border-slate-800 px-4 sm:px-6 lg:px-8">
        <div class="max-w-6xl mx-auto">
          <div class="text-center mb-14">
            <span class="text-xs font-bold uppercase tracking-wider text-blue-400">Step-by-Step Workflow</span>
            <h2 class="text-3xl font-extrabold text-white mt-1">How ApplyPilot Works</h2>
            <p class="text-slate-400 text-sm mt-2">Four simple steps from standard CV to job-ready submission.</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
            <!-- Step 1 -->
            <div class="glass-panel p-6 rounded-xl border border-slate-800 relative hover:border-blue-500/50 transition cursor-pointer group">
              <div class="text-3xl font-black text-slate-700 group-hover:text-blue-500 transition mb-3">01</div>
              <h3 class="text-lg font-bold text-white mb-1">Upload your CV</h3>
              <p class="text-xs text-slate-400 mb-4">Your existing resume becomes your structured career profile.</p>
              <div class="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80 text-[11px] text-slate-300">
                <span class="text-blue-400 font-semibold block mb-0.5">Automated Extraction:</span>
                Personal info, degrees, projects, verified technical skills.
              </div>
            </div>

            <!-- Step 2 -->
            <div class="glass-panel p-6 rounded-xl border border-slate-800 relative hover:border-blue-500/50 transition cursor-pointer group">
              <div class="text-3xl font-black text-slate-700 group-hover:text-blue-500 transition mb-3">02</div>
              <h3 class="text-lg font-bold text-white mb-1">Add a job</h3>
              <p class="text-xs text-slate-400 mb-4">Paste a job description or supported job URL.</p>
              <div class="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80 text-[11px] text-slate-300">
                <span class="text-indigo-400 font-semibold block mb-0.5">Smart Ingestion:</span>
                LinkedIn, Indeed, Stripe, Wayfair, or any career page.
              </div>
            </div>

            <!-- Step 3 -->
            <div class="glass-panel p-6 rounded-xl border border-slate-800 relative hover:border-blue-500/50 transition cursor-pointer group">
              <div class="text-3xl font-black text-slate-700 group-hover:text-blue-500 transition mb-3">03</div>
              <h3 class="text-lg font-bold text-white mb-1">See your match</h3>
              <p class="text-xs text-slate-400 mb-4">Understand strengths, gaps, and relevant keywords.</p>
              <div class="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80 text-[11px] text-slate-300">
                <span class="text-emerald-400 font-semibold block mb-0.5">Objective Alignment:</span>
                Clear labels: Strong matches, Needs attention, Potential gaps.
              </div>
            </div>

            <!-- Step 4 -->
            <div class="glass-panel p-6 rounded-xl border border-slate-800 relative hover:border-blue-500/50 transition cursor-pointer group">
              <div class="text-3xl font-black text-slate-700 group-hover:text-blue-500 transition mb-3">04</div>
              <h3 class="text-lg font-bold text-white mb-1">Build your application</h3>
              <p class="text-xs text-slate-400 mb-4">Generate tailored CV, cover letter, answers, and interview prep.</p>
              <div class="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80 text-[11px] text-slate-300">
                <span class="text-amber-400 font-semibold block mb-0.5">Full Toolkit:</span>
                Side-by-side diffs, ATS PDF templates, STAR interview simulator.
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Main CTA Section (Section 7) -->
      <section class="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto text-center">
        <div class="glass-panel p-10 sm:p-14 border border-blue-500/30 bg-gradient-to-b from-slate-900 to-blue-950/40 rounded-3xl shadow-2xl">
          <h2 class="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            Your next application starts here.
          </h2>
          <p class="text-slate-300 max-w-xl mx-auto text-sm sm:text-base mb-8">
            Tailor your application around what the hiring team is looking for in less than 5 minutes.
          </p>
          <button onclick="window.applypilot.startFlow()" class="btn-primary text-base px-9 py-4 shadow-xl">
            Create My Application
          </button>
        </div>
      </section>
    `;
  }

  bindLandingEvents() {
    // Interactive bindings for landing page
  }

  // -------------------------------------------------------------
  // PROGRESSIVE ONBOARDING (Sections 8, 9)
  // -------------------------------------------------------------
  startFlow() {
    if (this.store.isLoggedIn()) {
      this.navigate('add-job');
    } else {
      this.navigate('onboarding', { step: 1 });
    }
  }

  renderOnboarding(step) {
    const profile = this.store.getProfile() || {};
    const personal = profile.personal || {};
    const pref = profile.preferences || {};

    let stepContent = '';

    if (step === 1) {
      stepContent = `
        <div class="text-center mb-8">
          <span class="text-xs font-bold uppercase tracking-wider text-blue-400">Step 1 of 3</span>
          <h2 class="text-2xl sm:text-3xl font-extrabold text-white mt-1">Let's build your career profile.</h2>
          <p class="text-xs sm:text-sm text-slate-400 mt-2">This ensures all tailored documents are strictly based on your actual history.</p>
        </div>

        <form id="onboarding-step1-form" class="space-y-5">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1.5">First Name *</label>
              <input type="text" id="ob-firstName" required value="${personal.firstName || 'Alex'}" class="input-field" placeholder="e.g. Alex" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1.5">Last Name *</label>
              <input type="text" id="ob-lastName" required value="${personal.lastName || 'Morgan'}" class="input-field" placeholder="e.g. Morgan" />
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1.5">Email Address *</label>
            <input type="email" id="ob-email" required value="${personal.email || 'alex.morgan@university.edu'}" class="input-field" placeholder="alex@example.com" />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1.5">Current Status *</label>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              ${['student', 'graduate', 'working professional', 'career changer', 'other'].map(status => `
                <label class="flex items-center gap-2 p-3 rounded-lg border border-slate-700 bg-slate-800/60 cursor-pointer hover:border-blue-500/60 transition text-xs text-slate-200">
                  <input type="radio" name="ob-status" value="${status}" ${(personal.currentStatus || 'student').toLowerCase() === status ? 'checked' : ''} class="text-blue-600 focus:ring-0">
                  <span class="capitalize">${status}</span>
                </label>
              `).join('')}
            </div>
          </div>

          <div class="pt-4 flex justify-between items-center">
            <button type="button" onclick="window.applypilot.store.resetToDemo('student'); window.applypilot.navigate('dashboard');" class="text-xs text-blue-400 hover:underline">
              ⚡ Quick Fill Student Demo & Skip
            </button>
            <button type="submit" class="btn-primary">
              Continue to Preferences →
            </button>
          </div>
        </form>
      `;
    } else if (step === 2) {
      stepContent = `
        <div class="text-center mb-8">
          <span class="text-xs font-bold uppercase tracking-wider text-blue-400">Step 2 of 3</span>
          <h2 class="text-2xl sm:text-3xl font-extrabold text-white mt-1">What are you looking for?</h2>
          <p class="text-xs sm:text-sm text-slate-400 mt-2">Help ApplyPilot highlight the most relevant target roles for you.</p>
        </div>

        <form id="onboarding-step2-form" class="space-y-5">
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1.5">Desired Job Titles (comma separated) *</label>
            <input type="text" id="ob-titles" required value="${(pref.desiredTitles || ['Software Engineering Intern', 'Junior Frontend Engineer']).join(', ')}" class="input-field" placeholder="e.g. Software Engineering Intern, Junior Developer" />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1.5">Preferred Industries</label>
              <input type="text" id="ob-industries" value="${(pref.industries || ['Technology', 'FinTech']).join(', ')}" class="input-field" placeholder="Technology, Finance" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1.5">Preferred Locations</label>
              <input type="text" id="ob-locations" value="${(pref.locations || ['Boston, MA', 'Remote']).join(', ')}" class="input-field" placeholder="Boston, Remote" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1.5">Workplace Preference</label>
              <select id="ob-workplace" class="input-field">
                <option value="remote" ${pref.workplaceType === 'remote' ? 'selected' : ''}>Remote</option>
                <option value="hybrid" ${pref.workplaceType === 'hybrid' ? 'selected' : ''}>Hybrid</option>
                <option value="onsite" ${pref.workplaceType === 'onsite' ? 'selected' : ''}>Onsite</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1.5">Salary Expectation (Optional)</label>
              <input type="text" id="ob-salary" value="${pref.salaryExpectation || '$35 - $45 / hr'}" class="input-field" placeholder="e.g. $70,000 or $35/hr" />
            </div>
          </div>

          <div class="pt-4 flex justify-between items-center">
            <button type="button" onclick="window.applypilot.navigate('onboarding', { step: 1 })" class="btn-secondary btn-sm">
              ← Back
            </button>
            <button type="submit" class="btn-primary">
              Continue to CV Upload →
            </button>
          </div>
        </form>
      `;
    } else if (step === 3) {
      stepContent = `
        <div class="text-center mb-8">
          <span class="text-xs font-bold uppercase tracking-wider text-blue-400">Step 3 of 3</span>
          <h2 class="text-2xl sm:text-3xl font-extrabold text-white mt-1">Upload your existing CV</h2>
          <p class="text-xs sm:text-sm text-slate-400 mt-2">Supports PDF, DOCX, or direct text. We parse and extract your verified experience.</p>
        </div>

        <div class="space-y-6">
          <div id="drop-zone" class="border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-2xl p-8 text-center bg-slate-900/40 transition cursor-pointer">
            <div class="w-12 h-12 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto mb-3">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
            </div>
            <p class="text-sm font-semibold text-white mb-1">Click to browse or drag & drop your CV</p>
            <p class="text-xs text-slate-400 mb-3">PDF or DOCX (Max 10MB)</p>
            <input type="file" id="cv-file-input" accept=".pdf,.docx,.txt" class="hidden" />
            <button type="button" onclick="document.getElementById('cv-file-input').click()" class="btn-secondary btn-sm">
              Choose Document
            </button>
          </div>

          <div class="relative flex items-center justify-center">
            <div class="border-t border-slate-800 w-full"></div>
            <span class="bg-slate-900 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">or paste CV text directly</span>
          </div>

          <div>
            <textarea id="cv-paste-text" class="input-field textarea-field text-xs font-mono" placeholder="Paste your resume or CV text here..."></textarea>
          </div>

          <div id="upload-status" class="hidden p-3 rounded-lg text-xs"></div>

          <div class="pt-2 flex justify-between items-center">
            <button type="button" onclick="window.applypilot.navigate('onboarding', { step: 2 })" class="btn-secondary btn-sm">
              ← Back
            </button>
            <div class="flex gap-2">
              <button type="button" onclick="window.applypilot.loadSampleCV('student')" class="btn-secondary btn-sm">
                Use Sample Student CV
              </button>
              <button type="button" id="confirm-upload-btn" class="btn-primary">
                Parse & Finish Onboarding →
              </button>
            </div>
          </div>
        </div>
      `;
    }

    return `
      <div class="py-12 px-4 max-w-2xl mx-auto">
        <div class="glass-panel p-6 sm:p-10 border border-slate-800 rounded-2xl shadow-xl">
          ${stepContent}
        </div>
      </div>
    `;
  }

  bindOnboardingEvents(step) {
    if (step === 1) {
      const form = document.getElementById('onboarding-step1-form');
      if (form) {
        form.onsubmit = (e) => {
          e.preventDefault();
          const firstName = document.getElementById('ob-firstName').value;
          const lastName = document.getElementById('ob-lastName').value;
          const email = document.getElementById('ob-email').value;
          const status = document.querySelector('input[name="ob-status"]:checked')?.value || 'student';

          const currentProfile = this.store.getProfile() || {};
          currentProfile.personal = {
            ...(currentProfile.personal || {}),
            firstName,
            lastName,
            email,
            currentStatus: status
          };
          this.store.updateProfile(currentProfile);
          this.store.login(email, firstName);
          this.navigate('onboarding', { step: 2 });
        };
      }
    } else if (step === 2) {
      const form = document.getElementById('onboarding-step2-form');
      if (form) {
        form.onsubmit = (e) => {
          e.preventDefault();
          const titles = document.getElementById('ob-titles').value.split(',').map(s => s.trim()).filter(Boolean);
          const industries = document.getElementById('ob-industries').value.split(',').map(s => s.trim()).filter(Boolean);
          const locations = document.getElementById('ob-locations').value.split(',').map(s => s.trim()).filter(Boolean);
          const workplaceType = document.getElementById('ob-workplace').value;
          const salaryExpectation = document.getElementById('ob-salary').value;

          const currentProfile = this.store.getProfile() || {};
          currentProfile.preferences = {
            desiredTitles: titles,
            industries,
            locations,
            workplaceType,
            salaryExpectation
          };
          this.store.updateProfile(currentProfile);
          this.navigate('onboarding', { step: 3 });
        };
      }
    } else if (step === 3) {
      const fileInput = document.getElementById('cv-file-input');
      const confirmBtn = document.getElementById('confirm-upload-btn');
      const statusDiv = document.getElementById('upload-status');

      fileInput.onchange = async (e) => {
        if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          statusDiv.className = 'p-3 rounded-lg text-xs bg-blue-500/10 text-blue-300 border border-blue-500/20';
          statusDiv.textContent = `Parsing "${file.name}"...`;
          statusDiv.classList.remove('hidden');

          try {
            const { profile } = await this.parser.parseUploadedFile(file);
            this.store.updateProfile(profile);
            statusDiv.className = 'p-3 rounded-lg text-xs bg-emerald-500/10 text-emerald-300 border border-emerald-500/20';
            statusDiv.textContent = `✓ Successfully extracted experience and verified skills from ${file.name}.`;
          } catch (err) {
            statusDiv.className = 'p-3 rounded-lg text-xs bg-rose-500/10 text-rose-300 border border-rose-500/20';
            statusDiv.textContent = `Error reading file. Please paste text directly.`;
          }
        }
      };

      confirmBtn.onclick = () => {
        const pasteText = document.getElementById('cv-paste-text').value;
        if (pasteText.trim()) {
          const parsed = this.parser.parseCvText(pasteText);
          this.store.updateProfile(parsed);
        }
        this.showToast('Career Profile ready! Welcome to ApplyPilot.');
        this.navigate('dashboard');
      };
    }
  }

  loadSampleCV(persona = 'student') {
    this.store.resetToDemo(persona);
    this.showToast(`Loaded sample ${persona} profile.`);
    this.navigate('dashboard');
  }

  // -------------------------------------------------------------
  // DASHBOARD VIEW (Sections 11, 12)
  // -------------------------------------------------------------
  renderDashboard() {
    const profile = this.store.getProfile() || {};
    const firstName = profile.personal?.firstName || 'User';
    const applications = this.store.getApplications() || [];

    // Calculate metrics
    const totalApps = applications.length;
    const interviewCount = applications.filter(a => a.status === 'Interview').length;
    const pendingCount = applications.filter(a => ['Applied', 'Assessment', 'Preparing'].includes(a.status)).length;
    const savedJobsCount = this.store.getSavedJobs().length;

    return `
      <div class="max-w-6xl mx-auto py-8 px-4 sm:px-6">
        <!-- Top Greeting -->
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 class="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2">
              Good morning, ${firstName} 👋
            </h1>
            <p class="text-sm text-slate-400 mt-1">Ready for your next application?</p>
          </div>
          <div class="flex items-center gap-3">
            <button onclick="window.applypilot.navigate('tracker')" class="btn-secondary btn-sm">
              <svg class="w-4 h-4 mr-1 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
              View Board
            </button>
            <button onclick="window.applypilot.navigate('add-job')" class="btn-primary btn-sm flex items-center gap-1.5 shadow-md">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
              <span>+ New Application</span>
            </button>
          </div>
        </div>

        <!-- Metric Summary Cards (Section 11) -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div class="glass-panel p-5 rounded-xl border border-slate-800">
            <span class="text-xs uppercase font-bold text-slate-400 tracking-wider">Applications</span>
            <div class="text-2xl sm:text-3xl font-extrabold text-white mt-1">${totalApps}</div>
            <span class="text-[11px] text-slate-500">Active records tracked</span>
          </div>

          <div class="glass-panel p-5 rounded-xl border border-slate-800">
            <span class="text-xs uppercase font-bold text-purple-400 tracking-wider">Interviews</span>
            <div class="text-2xl sm:text-3xl font-extrabold text-purple-300 mt-1">${interviewCount}</div>
            <span class="text-[11px] text-purple-400/80">Scheduled or in progress</span>
          </div>

          <div class="glass-panel p-5 rounded-xl border border-slate-800">
            <span class="text-xs uppercase font-bold text-amber-400 tracking-wider">Pending</span>
            <div class="text-2xl sm:text-3xl font-extrabold text-amber-300 mt-1">${pendingCount}</div>
            <span class="text-[11px] text-amber-400/80">Awaiting recruiter response</span>
          </div>

          <div class="glass-panel p-5 rounded-xl border border-slate-800">
            <span class="text-xs uppercase font-bold text-blue-400 tracking-wider">Saved Jobs</span>
            <div class="text-2xl sm:text-3xl font-extrabold text-blue-300 mt-1">${savedJobsCount}</div>
            <span class="text-[11px] text-blue-400/80">Ready for tailored tailoring</span>
          </div>
        </div>

        <!-- Active Applications List (Section 12) -->
        <div class="glass-panel rounded-2xl border border-slate-800 p-6 mb-8">
          <div class="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
            <div>
              <h2 class="text-lg font-bold text-white">Recent Applications</h2>
              <p class="text-xs text-slate-400">Tailored applications, alignment scores, and status</p>
            </div>
            <button onclick="window.applypilot.navigate('tracker')" class="text-xs text-blue-400 hover:text-blue-300 font-semibold">
              Open Full Tracker →
            </button>
          </div>

          ${applications.length === 0 ? `
            <div class="text-center py-10">
              <p class="text-sm text-slate-400">No applications created yet.</p>
              <button onclick="window.applypilot.navigate('add-job')" class="btn-primary btn-sm mt-3">
                Create First Application
              </button>
            </div>
          ` : `
            <div class="space-y-3">
              ${applications.map(app => `
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition">
                  <div class="flex items-start sm:items-center gap-3">
                    <div class="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center font-bold text-blue-400 text-sm">
                      ${app.company.charAt(0)}
                    </div>
                    <div>
                      <div class="flex items-center gap-2">
                        <h3 class="text-sm font-bold text-white">${app.company}</h3>
                        <span class="text-xs text-slate-400">• ${app.role}</span>
                      </div>
                      <div class="flex items-center gap-3 text-xs text-slate-400 mt-1">
                        <span>Added: ${app.dateAdded}</span>
                        ${app.location ? `<span>• ${app.location}</span>` : ''}
                      </div>
                    </div>
                  </div>

                  <div class="flex items-center gap-3 sm:gap-6">
                    <div class="flex items-center gap-2">
                      <span class="text-xs font-semibold px-2 py-0.5 rounded-full ${this._getStatusBadgeClass(app.status)}">
                        ${app.status}
                      </span>
                    </div>

                    <div class="flex items-center gap-2">
                      <div class="text-right">
                        <span class="text-xs font-bold ${app.matchScore >= 80 ? 'text-emerald-400' : 'text-amber-400'}">${app.matchScore}%</span>
                        <span class="block text-[10px] text-slate-500 uppercase">Alignment</span>
                      </div>
                    </div>

                    <div class="flex items-center gap-2">
                      <button onclick="window.applypilot.openApplicationWorkspace('${app.jobId}')" class="btn-secondary btn-sm text-xs">
                        Open Workspace
                      </button>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <!-- Available Sample Jobs for Quick Start -->
        <div class="glass-panel rounded-2xl border border-slate-800 p-6">
          <div class="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
            <div>
              <h2 class="text-base font-bold text-white">Target Vacancies Ready for Tailoring</h2>
              <p class="text-xs text-slate-400">Click any job to see your real-time match analysis and tailored CV</p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${this.store.getSavedJobs().map(job => `
              <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-blue-500/40 transition">
                <div class="flex justify-between items-start mb-2">
                  <div>
                    <h3 class="text-sm font-bold text-white">${job.title}</h3>
                    <p class="text-xs text-slate-400">${job.company} • ${job.location}</p>
                  </div>
                  <span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    ${job.employmentType}
                  </span>
                </div>
                <p class="text-xs text-slate-300 line-clamp-2 mb-3">${job.description.slice(0, 140)}...</p>
                <div class="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <span class="text-[11px] text-slate-400">Key tools: ${(job.skills?.all || []).slice(0, 3).join(', ')}</span>
                  <button onclick="window.applypilot.openApplicationWorkspace('${job.id}')" class="btn-primary btn-sm text-xs">
                    Tailor For This Job →
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  _getStatusBadgeClass(status) {
    switch (status) {
      case 'Applied': return 'bg-blue-500/10 text-blue-300 border border-blue-500/30';
      case 'Interview': return 'bg-purple-500/10 text-purple-300 border border-purple-500/30';
      case 'Offer': return 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30';
      case 'Assessment': return 'bg-amber-500/10 text-amber-300 border border-amber-500/30';
      case 'Preparing': return 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30';
      case 'Rejected': return 'bg-rose-500/10 text-rose-300 border border-rose-500/30';
      default: return 'bg-slate-700 text-slate-300';
    }
  }

  bindDashboardEvents() {}

  // -------------------------------------------------------------
  // ADD NEW JOB FLOW (Section 13)
  // -------------------------------------------------------------
  renderAddJobView() {
    return `
      <div class="max-w-3xl mx-auto py-10 px-4">
        <div class="flex items-center gap-2 text-xs text-slate-400 mb-4 cursor-pointer" onclick="window.applypilot.navigate('dashboard')">
          ← Back to Dashboard
        </div>

        <div class="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800 shadow-xl">
          <div class="mb-6">
            <h1 class="text-2xl font-extrabold text-white">Add New Job</h1>
            <p class="text-xs sm:text-sm text-slate-400 mt-1">
              Paste a job description or URL. We extract required skills and align your profile without inventing data.
            </p>
          </div>

          <!-- Method Selection Tabs (Section 13) -->
          <div class="flex border-b border-slate-800 mb-6">
            <button id="job-tab-paste" onclick="window.applypilot.switchAddJobTab('paste')" class="tab-btn active">
              Paste Description
            </button>
            <button id="job-tab-url" onclick="window.applypilot.switchAddJobTab('url')" class="tab-btn">
              Paste Job URL
            </button>
            <button id="job-tab-manual" onclick="window.applypilot.switchAddJobTab('manual')" class="tab-btn">
              Enter Manually
            </button>
          </div>

          <!-- Container A: Paste Description -->
          <div id="add-job-pane-paste" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Job Title *</label>
                <input type="text" id="paste-job-title" class="input-field" placeholder="e.g. Frontend Engineer" required />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Company Name *</label>
                <input type="text" id="paste-job-company" class="input-field" placeholder="e.g. Stripe, Figma, Local Startup" required />
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1">Job Description *</label>
              <textarea id="paste-job-desc" class="input-field textarea-field text-xs font-mono" placeholder="Paste full job description from LinkedIn, Indeed, Greenhouse, etc..." style="min-height: 200px;" required></textarea>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Location (Optional)</label>
                <input type="text" id="paste-job-location" class="input-field" placeholder="e.g. San Francisco / Remote" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Recruiter / Contact (Optional)</label>
                <input type="text" id="paste-job-recruiter" class="input-field" placeholder="e.g. Jordan Ellis" />
              </div>
            </div>

            <div class="pt-4 flex justify-between items-center">
              <button type="button" onclick="window.applypilot.fillSampleJobForPaste()" class="text-xs text-blue-400 hover:underline">
                ⚡ Fill with Stripe Sample Job
              </button>
              <button type="button" onclick="window.applypilot.submitPastedJob()" class="btn-primary">
                Analyze Job & View Match →
              </button>
            </div>
          </div>

          <!-- Container B: Paste URL -->
          <div id="add-job-pane-url" class="space-y-4 hidden">
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1">Job Posting URL *</label>
              <div class="flex gap-2">
                <input type="url" id="url-job-input" class="input-field" placeholder="https://company.com/careers/role or LinkedIn/Indeed URL" />
                <button type="button" onclick="window.applypilot.fetchJobFromUrl()" class="btn-primary btn-sm whitespace-nowrap">
                  Fetch Job
                </button>
              </div>
            </div>

            <div id="url-feedback" class="hidden p-3 rounded-lg text-xs"></div>

            <div class="p-3 bg-slate-900/50 rounded-lg border border-slate-800 text-xs text-slate-400">
              <span class="text-white font-semibold block mb-1">Supported platforms:</span>
              Greenhouse, Lever, LinkedIn Jobs, Stripe Careers, Wayfair, Workday, and standard career pages. If automated extraction is blocked by authentication or bot firewalls, ApplyPilot will gracefully ask you to paste the description.
            </div>
          </div>

          <!-- Container C: Manual Entry -->
          <div id="add-job-pane-manual" class="space-y-4 hidden">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Role Title *</label>
                <input type="text" id="man-job-title" class="input-field" placeholder="Software Engineer" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Company *</label>
                <input type="text" id="man-job-company" class="input-field" placeholder="Target Company" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Required Skills (comma separated)</label>
                <input type="text" id="man-job-skills" class="input-field" placeholder="React, TypeScript, Git" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Employment Type</label>
                <input type="text" id="man-job-type" class="input-field" placeholder="Full-Time or Internship" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1">Responsibilities / Notes</label>
              <textarea id="man-job-desc" class="input-field textarea-field text-xs font-mono" placeholder="Key responsibilities and qualifications..."></textarea>
            </div>

            <div class="pt-2 text-right">
              <button type="button" onclick="window.applypilot.submitManualJob()" class="btn-primary">
                Save Job & Analyze →
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  switchAddJobTab(tabName) {
    document.getElementById('job-tab-paste').className = `tab-btn ${tabName === 'paste' ? 'active' : ''}`;
    document.getElementById('job-tab-url').className = `tab-btn ${tabName === 'url' ? 'active' : ''}`;
    document.getElementById('job-tab-manual').className = `tab-btn ${tabName === 'manual' ? 'active' : ''}`;

    document.getElementById('add-job-pane-paste').className = tabName === 'paste' ? 'space-y-4' : 'space-y-4 hidden';
    document.getElementById('add-job-pane-url').className = tabName === 'url' ? 'space-y-4' : 'space-y-4 hidden';
    document.getElementById('add-job-pane-manual').className = tabName === 'manual' ? 'space-y-4' : 'space-y-4 hidden';
  }

  fillSampleJobForPaste() {
    const sample = window.APPLYPILOT_DEMO_DATA.jobs[0];
    document.getElementById('paste-job-title').value = sample.title;
    document.getElementById('paste-job-company').value = sample.company;
    document.getElementById('paste-job-desc').value = sample.description;
    document.getElementById('paste-job-location').value = sample.location;
    document.getElementById('paste-job-recruiter').value = sample.recruiter;
    this.showToast('Sample job details filled.');
  }

  submitPastedJob() {
    const title = document.getElementById('paste-job-title').value.trim();
    const company = document.getElementById('paste-job-company').value.trim();
    const desc = document.getElementById('paste-job-desc').value.trim();
    const location = document.getElementById('paste-job-location').value.trim();
    const recruiter = document.getElementById('paste-job-recruiter').value.trim();

    if (!title || !desc) {
      alert("Please provide both a Job Title and Description.");
      return;
    }

    const structuredJob = this.analyzer.analyzeJob(desc, {
      title,
      company: company || "Target Employer",
      location,
      recruiter
    });

    this.store.saveJob(structuredJob);
    this.openApplicationWorkspace(structuredJob.id);
  }

  async fetchJobFromUrl() {
    const url = document.getElementById('url-job-input').value.trim();
    const feedback = document.getElementById('url-feedback');

    if (!url) {
      alert("Please enter a job URL.");
      return;
    }

    feedback.className = 'p-3 rounded-lg text-xs bg-blue-500/10 text-blue-300 border border-blue-500/20';
    feedback.textContent = `Connecting and inspecting ${url}...`;
    feedback.classList.remove('hidden');

    const extracted = await this.parser.extractJobFromUrl(url);

    if (extracted) {
      feedback.className = 'p-3 rounded-lg text-xs bg-emerald-500/10 text-emerald-300 border border-emerald-500/20';
      feedback.textContent = `✓ Extracted role "${extracted.title}" at ${extracted.company}. Analyzing...`;
      setTimeout(() => {
        const analyzed = this.analyzer.analyzeJob(extracted.description, extracted);
        this.store.saveJob(analyzed);
        this.openApplicationWorkspace(analyzed.id);
      }, 700);
    } else {
      feedback.className = 'p-3 rounded-lg text-xs bg-amber-500/10 text-amber-300 border border-amber-500/20';
      feedback.innerHTML = `
        <strong>URL extraction unavailable:</strong> This site requires login or blocked automated access.
        <br/>Please switch to <strong>Paste Description</strong> to continue tailoring without loss of functionality.
      `;
    }
  }

  submitManualJob() {
    const title = document.getElementById('man-job-title').value.trim() || 'Software Engineer';
    const company = document.getElementById('man-job-company').value.trim() || 'Target Company';
    const skills = document.getElementById('man-job-skills').value.trim();
    const desc = document.getElementById('man-job-desc').value.trim();

    const fullDesc = `${desc}\n\nRequired Skills: ${skills}`;
    const structuredJob = this.analyzer.analyzeJob(fullDesc, {
      title,
      company
    });

    this.store.saveJob(structuredJob);
    this.openApplicationWorkspace(structuredJob.id);
  }

  bindAddJobEvents() {}

  // -------------------------------------------------------------
  // APPLICATION WORKSPACE (Sections 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25)
  // -------------------------------------------------------------
  openApplicationWorkspace(jobId) {
    const job = this.store.getJob(jobId);
    if (!job) {
      alert("Job not found.");
      return;
    }
    this.activeJob = job;
    this.navigate('application-workspace', { job });
  }

  renderApplicationWorkspace() {
    const job = this.activeJob;
    const match = this.activeMatch;
    const profile = this.store.getProfile();
    const activeTab = this.activeTab;

    return `
      <div class="max-w-7xl mx-auto py-8 px-4 sm:px-6">
        <!-- Top Workspace Bar -->
        <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-800">
          <div>
            <div class="flex items-center gap-2 text-xs text-slate-400 mb-1 cursor-pointer" onclick="window.applypilot.navigate('dashboard')">
              ← Dashboard
            </div>
            <div class="flex items-center gap-3">
              <h1 class="text-2xl font-extrabold text-white">${job.title}</h1>
              <span class="text-sm font-semibold text-slate-300">@ ${job.company}</span>
            </div>
            <p class="text-xs text-slate-400 mt-1">${job.location} • ${job.employmentType} • ${job.salary || 'Competitive'}</p>
          </div>

          <div class="flex items-center gap-3">
            <div class="flex items-center gap-3 bg-slate-900/90 px-4 py-2 rounded-xl border border-slate-800">
              <div class="text-right">
                <span class="text-lg font-extrabold text-emerald-400">${match.overall}%</span>
                <span class="block text-[10px] text-slate-400 uppercase font-semibold">Alignment</span>
              </div>
              <div class="w-10 h-10 rounded-full bg-emerald-500/10 border-2 border-emerald-400 flex items-center justify-center text-xs font-bold text-emerald-300">
                ${match.overall}%
              </div>
            </div>

            <button onclick="window.applypilot.saveToTracker()" class="btn-primary btn-sm">
              Save to Tracker
            </button>
          </div>
        </div>

        <!-- Navigation Tabs for Feature Workspace -->
        <div id="workspace-tabs" class="flex border-b border-slate-800 mb-6 overflow-x-auto">
          <button data-tab="analysis" onclick="window.applypilot.switchWorkspaceTab('analysis')" class="tab-btn ${activeTab === 'analysis' ? 'active' : ''}">
            Match Analysis & Gaps
          </button>
          <button data-tab="tailor-cv" onclick="window.applypilot.switchWorkspaceTab('tailor-cv')" class="tab-btn ${activeTab === 'tailor-cv' ? 'active' : ''}">
            ✨ Tailored CV (Diff View)
          </button>
          <button data-tab="cv-editor" onclick="window.applypilot.switchWorkspaceTab('cv-editor')" class="tab-btn ${activeTab === 'cv-editor' ? 'active' : ''}">
            CV Editor & ATS Templates
          </button>
          <button data-tab="cover-letter" onclick="window.applypilot.switchWorkspaceTab('cover-letter')" class="tab-btn ${activeTab === 'cover-letter' ? 'active' : ''}">
            Cover Letter
          </button>
          <button data-tab="answers" onclick="window.applypilot.switchWorkspaceTab('answers')" class="tab-btn ${activeTab === 'answers' ? 'active' : ''}">
            Application Answers
          </button>
          <button data-tab="interview" onclick="window.applypilot.switchWorkspaceTab('interview')" class="tab-btn ${activeTab === 'interview' ? 'active' : ''}">
            Interview Prep & Simulator
          </button>
          <button data-tab="company" onclick="window.applypilot.switchWorkspaceTab('company')" class="tab-btn ${activeTab === 'company' ? 'active' : ''}">
            Company Research
          </button>
        </div>

        <!-- Workspace Content Area -->
        <div id="workspace-tab-content">
          ${this.renderWorkspaceTab(activeTab)}
        </div>
      </div>
    `;
  }

  switchWorkspaceTab(tabName) {
    this.activeTab = tabName;

    // Update active tab button style
    const tabButtons = document.querySelectorAll('#workspace-tabs .tab-btn');
    tabButtons.forEach(btn => {
      const targetTab = btn.getAttribute('data-tab');
      if (targetTab === tabName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    const container = document.getElementById('workspace-tab-content');
    if (container) {
      container.innerHTML = this.renderWorkspaceTab(tabName);
      this.bindWorkspaceEvents();
    }
  }

  renderWorkspaceTab(tabName) {
    switch (tabName) {
      case 'analysis':
        return this.renderMatchAnalysisTab();
      case 'tailor-cv':
        return this.renderTailorCvTab();
      case 'cv-editor':
        return this.renderCvEditorTab();
      case 'cover-letter':
        return this.renderCoverLetterTab();
      case 'answers':
        return this.renderAnswersTab();
      case 'interview':
        return this.renderInterviewTab();
      case 'company':
        return this.renderCompanyResearchTab();
      default:
        return this.renderMatchAnalysisTab();
    }
  }

  // 15, 16, 17: Match Analysis & Keyword Inspector
  renderMatchAnalysisTab() {
    const match = this.activeMatch;
    const b = match.breakdown || {};

    return `
      <div class="space-y-6">
        <!-- Score Banner -->
        <div class="glass-panel p-6 rounded-2xl border border-slate-800">
          <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div class="flex items-center gap-5">
              <div class="match-score-badge" style="--score-pct: ${match.overall}">
                <div class="match-score-inner">
                  <span class="text-2xl font-black text-white">${match.overall}%</span>
                  <span class="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Match</span>
                </div>
              </div>
              <div>
                <h2 class="text-xl font-bold text-white">${match.label}</h2>
                <p class="text-xs text-slate-400 max-w-xl mt-1">${match.disclaimer}</p>
              </div>
            </div>

            <!-- Alignment Breakdown Bars (Section 15) -->
            <div class="w-full md:w-72 space-y-2.5">
              <div>
                <div class="flex justify-between text-xs mb-1">
                  <span class="text-slate-300 font-medium">Skills Alignment</span>
                  <span class="text-white font-bold">${b.skills}%</span>
                </div>
                <div class="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div class="h-full bg-emerald-500 rounded-full" style="width: ${b.skills}%"></div>
                </div>
              </div>

              <div>
                <div class="flex justify-between text-xs mb-1">
                  <span class="text-slate-300 font-medium">Experience Alignment</span>
                  <span class="text-white font-bold">${b.experience}%</span>
                </div>
                <div class="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div class="h-full bg-blue-500 rounded-full" style="width: ${b.experience}%"></div>
                </div>
              </div>

              <div>
                <div class="flex justify-between text-xs mb-1">
                  <span class="text-slate-300 font-medium">Education Alignment</span>
                  <span class="text-white font-bold">${b.education}%</span>
                </div>
                <div class="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div class="h-full bg-purple-500 rounded-full" style="width: ${b.education}%"></div>
                </div>
              </div>

              <div>
                <div class="flex justify-between text-xs mb-1">
                  <span class="text-slate-300 font-medium">Relevant Projects</span>
                  <span class="text-white font-bold">${b.projects}%</span>
                </div>
                <div class="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div class="h-full bg-cyan-500 rounded-full" style="width: ${b.projects}%"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Match Details: Strong Matches, Needs Attention, Potential Gaps (Section 16) -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <!-- Strong Matches -->
          <div class="glass-panel p-5 rounded-xl border border-slate-800">
            <div class="flex items-center gap-2 mb-3">
              <span class="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">✓</span>
              <h3 class="text-sm font-bold text-white">Strong Matches (${match.strong.length})</h3>
            </div>
            <p class="text-xs text-slate-400 mb-3">Confirmed in your profile and matched to the job description:</p>
            <div class="flex flex-wrap gap-2">
              ${match.strong.map(s => `
                <span class="px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  ✓ ${s}
                </span>
              `).join('')}
            </div>
          </div>

          <!-- Needs Attention -->
          <div class="glass-panel p-5 rounded-xl border border-slate-800">
            <div class="flex items-center gap-2 mb-3">
              <span class="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold">⚠</span>
              <h3 class="text-sm font-bold text-white">Needs Attention (${match.attention.length})</h3>
            </div>
            <p class="text-xs text-slate-400 mb-3">Key requirements not found in your profile:</p>
            <div class="space-y-2">
              ${match.attention.length === 0 ? `<div class="text-xs text-slate-500">None! All key requirements matched.</div>` : match.attention.map(item => `
                <div class="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20 flex items-start justify-between gap-2">
                  <div class="text-xs text-amber-200">${item.message}</div>
                  <button onclick="window.applypilot.confirmAndAddSkill('${item.skill}')" class="btn-secondary btn-sm text-[11px] whitespace-nowrap">
                    + Add if accurate
                  </button>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Potential Gaps -->
          <div class="glass-panel p-5 rounded-xl border border-slate-800">
            <div class="flex items-center gap-2 mb-3">
              <span class="w-6 h-6 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center text-xs font-bold">○</span>
              <h3 class="text-sm font-bold text-white">Potential Gaps (${match.gaps.length})</h3>
            </div>
            <p class="text-xs text-slate-400 mb-3">Preferred / nice-to-have items:</p>
            <div class="space-y-2">
              ${match.gaps.length === 0 ? `<div class="text-xs text-slate-500">No gap items found.</div>` : match.gaps.map(item => `
                <div class="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 flex items-start justify-between gap-2">
                  <div class="text-xs text-slate-300">${item.message}</div>
                  <button onclick="window.applypilot.confirmAndAddSkill('${item.skill}')" class="btn-secondary btn-sm text-[11px] whitespace-nowrap">
                    + Add if accurate
                  </button>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Keyword Analysis (Section 17) -->
        <div class="glass-panel p-6 rounded-2xl border border-slate-800">
          <div class="mb-4">
            <h3 class="text-base font-bold text-white">Keywords employers may look for</h3>
            <p class="text-xs text-slate-400">Grouped into verified presence and potential gaps. Never auto-inserted.</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 class="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">Already present</h4>
              <div class="flex flex-wrap gap-1.5">
                ${(match.keywords.present || []).map(k => `
                  <span class="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 text-xs border border-emerald-500/20">${k}</span>
                `).join('')}
              </div>
            </div>

            <div>
              <h4 class="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">Present but could be clearer</h4>
              <div class="flex flex-wrap gap-1.5">
                ${(match.keywords.couldBeClearer || []).map(k => `
                  <span class="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 text-xs border border-blue-500/20">${k}</span>
                `).join('')}
              </div>
            </div>

            <div>
              <h4 class="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">Not found in profile</h4>
              <div class="space-y-1.5">
                ${(match.keywords.notFound || []).map(k => `
                  <div class="flex items-center justify-between p-1.5 rounded bg-slate-900 border border-slate-800 text-xs">
                    <span class="text-slate-300">${k}</span>
                    <button onclick="window.applypilot.confirmAndAddSkill('${k}')" class="text-[11px] text-blue-400 hover:text-blue-300 underline ml-2">
                      Add only if accurate
                    </button>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Confirm and manually add missing skill (User confirmation guarantee)
  confirmAndAddSkill(skillName) {
    if (confirm(`Did you genuinely use or learn ${skillName}?\n\nApplyPilot strictly prohibits inventing experience. Click OK only if you have real experience with this skill.`)) {
      this.store.addConfirmedSkill(skillName);
      // Recompute match
      this.activeMatch = this.analyzer.computeMatch(this.store.getProfile(), this.activeJob);
      this.tailoredCV = this.tailor.tailorCV(this.store.getProfile(), this.activeJob, this.activeMatch);
      this.showToast(`Added "${skillName}" to verified profile skills.`);
      this.renderCurrentView();
    }
  }

  // 18, 19: Tailor CV Feature & Before/After Diff Inspector
  renderTailorCvTab() {
    const tailored = this.tailoredCV;
    if (!tailored) {
      return `<div class="p-8 text-center text-slate-400">Generating tailored CV preview...</div>`;
    }

    return `
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-bold text-white">Before & After Tailoring Comparison</h2>
            <p class="text-xs text-slate-400">Review suggested phrasing enhancements based on confirmed experiences.</p>
          </div>
          <div class="flex gap-2">
            <button onclick="window.applypilot.acceptAllDiffs()" class="btn-primary btn-sm text-xs">
              Accept All Suggestions
            </button>
            <button onclick="window.applypilot.switchWorkspaceTab('cv-editor')" class="btn-secondary btn-sm text-xs">
              Go to Full CV Editor →
            </button>
          </div>
        </div>

        <!-- Summary Diff Box -->
        <div class="glass-panel p-5 rounded-xl border border-slate-800">
          <h3 class="text-xs uppercase font-bold text-slate-400 mb-3">Professional Summary</h3>
          <div class="diff-container">
            <div class="diff-box-original">
              <span class="text-[11px] font-bold text-rose-400 uppercase tracking-wider block mb-1">Original</span>
              <p class="text-xs text-slate-300 leading-relaxed">${tailored.tailoredSummary.original}</p>
            </div>
            <div class="diff-box-suggested">
              <span class="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">Tailored for ${tailored.jobTitle}</span>
              <p class="text-xs text-slate-100 font-medium leading-relaxed">${tailored.tailoredSummary.suggested}</p>
            </div>
          </div>
          <div class="rationale-box">
            <strong>Why this changed:</strong> ${tailored.tailoredSummary.rationale}
          </div>
        </div>

        <!-- Experience Diffs -->
        <div class="space-y-4">
          <h3 class="text-base font-bold text-white">Experience Bullet Optimization</h3>

          ${(tailored.experience || []).map((exp, expIdx) => `
            <div class="glass-panel p-5 rounded-xl border border-slate-800 space-y-4">
              <div class="border-b border-slate-800 pb-2">
                <h4 class="text-sm font-bold text-white">${exp.title} — <span class="text-slate-400">${exp.company}</span></h4>
              </div>

              ${(exp.bulletDiffs || []).map((diff, bIdx) => `
                <div class="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                  <div class="diff-container mb-2">
                    <div class="diff-box-original">
                      <span class="text-[10px] font-bold text-rose-400 uppercase block mb-1">Original Bullet</span>
                      <p class="text-xs text-slate-300">${diff.original}</p>
                    </div>
                    <div class="diff-box-suggested">
                      <span class="text-[10px] font-bold text-emerald-400 uppercase block mb-1">Suggested Phrasing</span>
                      <p class="text-xs text-slate-100 font-medium">${diff.suggested}</p>
                    </div>
                  </div>

                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-800/80">
                    <div class="text-[11px] text-blue-400">
                      <strong>Why this changed:</strong> ${diff.rationale}
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="text-[11px] font-semibold ${diff.status === 'accepted' ? 'text-emerald-400' : diff.status === 'rejected' ? 'text-rose-400' : 'text-slate-400'}">
                        ${diff.status === 'accepted' ? '✓ Accepted' : diff.status === 'rejected' ? '✕ Rejected' : 'Pending Review'}
                      </span>
                      <button onclick="window.applypilot.acceptDiff('${exp.id}', '${diff.id}')" class="btn-primary btn-sm text-[11px] py-1 px-2.5">
                        Accept
                      </button>
                      <button onclick="window.applypilot.rejectDiff('${exp.id}', '${diff.id}')" class="btn-secondary btn-sm text-[11px] py-1 px-2.5">
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  acceptDiff(expId, diffId) {
    const exp = this.tailoredCV.experience.find(e => e.id === expId);
    if (exp) {
      const diff = exp.bulletDiffs.find(d => d.id === diffId);
      if (diff) {
        diff.status = 'accepted';
        this.showToast('Accepted tailored bullet point.');
        this.renderCurrentView();
      }
    }
  }

  rejectDiff(expId, diffId) {
    const exp = this.tailoredCV.experience.find(e => e.id === expId);
    if (exp) {
      const diff = exp.bulletDiffs.find(d => d.id === diffId);
      if (diff) {
        diff.status = 'rejected';
        diff.suggested = diff.original;
        this.showToast('Rejected suggestion. Kept original phrasing.');
        this.renderCurrentView();
      }
    }
  }

  acceptAllDiffs() {
    this.tailoredCV.experience.forEach(exp => {
      exp.bulletDiffs.forEach(d => { d.status = 'accepted'; });
    });
    this.showToast('All tailored suggestions accepted.');
    this.renderCurrentView();
  }

  // 20, 21: CV Editor & ATS-Friendly Templates
  renderCvEditorTab() {
    const currentTemplate = this.store.settings.template || 'modern';
    const profile = this.store.getProfile();

    return `
      <div class="space-y-6">
        <!-- Control Header -->
        <div class="glass-panel p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <span class="text-xs font-semibold text-slate-300">ATS Template:</span>
            <div class="flex gap-1.5">
              <button onclick="window.applypilot.changeTemplate('modern')" class="btn-sm ${currentTemplate === 'modern' ? 'btn-primary' : 'btn-secondary'}">
                Modern (Minimal)
              </button>
              <button onclick="window.applypilot.changeTemplate('classic')" class="btn-sm ${currentTemplate === 'classic' ? 'btn-primary' : 'btn-secondary'}">
                Classic (Traditional)
              </button>
              <button onclick="window.applypilot.changeTemplate('academic')" class="btn-sm ${currentTemplate === 'academic' ? 'btn-primary' : 'btn-secondary'}">
                Academic (Research)
              </button>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button onclick="window.applypilot.templates.triggerPrint('rendered-resume-box')" class="btn-primary btn-sm flex items-center gap-1.5">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              <span>Download PDF</span>
            </button>
            <button onclick="window.applypilot.navigate('profile')" class="btn-secondary btn-sm text-xs">
              Edit Career Profile
            </button>
          </div>
        </div>

        <!-- Live ATS Resume Container -->
        <div class="resume-preview-wrapper">
          <div id="rendered-resume-box">
            ${this.templates.render(profile, currentTemplate, this.tailoredCV)}
          </div>
        </div>
      </div>
    `;
  }

  changeTemplate(tmpl) {
    this.store.settings.template = tmpl;
    this.store._save(this.store.STORAGE_KEYS.SETTINGS, this.store.settings);
    this.renderCurrentView();
  }

  // 22: Cover Letter Generator
  renderCoverLetterTab() {
    const profile = this.store.getProfile();
    const job = this.activeJob;
    const letter = this.coverLetter.generate(profile, job);

    return `
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-bold text-white">Tailored Cover Letter</h2>
            <p class="text-xs text-slate-400">Professional, grounded in verified achievements, free of artificial buzzwords.</p>
          </div>
          <div class="flex gap-2">
            <button onclick="window.applypilot.copyCoverLetter()" class="btn-secondary btn-sm text-xs">
              Copy Text
            </button>
            <button onclick="window.applypilot.regenerateCoverLetter()" class="btn-primary btn-sm text-xs">
              Regenerate
            </button>
          </div>
        </div>

        <div class="glass-panel p-6 rounded-2xl border border-slate-800">
          <textarea id="cover-letter-text" class="input-field textarea-field font-sans text-sm text-slate-100 bg-slate-900/80 p-5 rounded-xl border border-slate-800" style="min-height: 480px; line-height: 1.7;">${letter}</textarea>
        </div>
      </div>
    `;
  }

  copyCoverLetter() {
    const text = document.getElementById('cover-letter-text')?.value;
    if (text) {
      navigator.clipboard.writeText(text);
      this.showToast('Cover letter copied to clipboard!');
    }
  }

  regenerateCoverLetter() {
    const profile = this.store.getProfile();
    const job = this.activeJob;
    const letter = this.coverLetter.generate(profile, job);
    const textarea = document.getElementById('cover-letter-text');
    if (textarea) textarea.value = letter;
    this.showToast('Regenerated tailored cover letter.');
  }

  // 23: Application Answers Generator
  renderAnswersTab() {
    const profile = this.store.getProfile();
    const job = this.activeJob;
    const defaultQs = this.answers.DEFAULT_QUESTIONS;

    return `
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-bold text-white">Application Question Answers</h2>
            <p class="text-xs text-slate-400">Generate truthful, high-impact responses to common and custom application questions.</p>
          </div>
        </div>

        <!-- Custom Question Ingestion -->
        <div class="glass-panel p-5 rounded-xl border border-slate-800">
          <label class="block text-xs font-semibold text-slate-300 mb-1">Paste Any Application Question</label>
          <div class="flex gap-2">
            <input type="text" id="custom-app-question" class="input-field" placeholder="e.g. Why are you interested in our engineering culture?" />
            <button onclick="window.applypilot.answerCustomQuestion()" class="btn-primary btn-sm whitespace-nowrap">
              Generate Answer
            </button>
          </div>
        </div>

        <!-- Pre-populated Answers -->
        <div class="space-y-4" id="answers-accordion">
          ${defaultQs.map((q, idx) => {
            const ans = this.answers.generateAnswer(q, profile, job);
            return `
              <div class="glass-panel p-5 rounded-xl border border-slate-800 space-y-2">
                <div class="flex justify-between items-center">
                  <h3 class="text-sm font-bold text-white">Q: "${q}"</h3>
                  <button onclick="window.applypilot.copyAnswer('answer-text-${idx}')" class="text-xs text-blue-400 hover:text-blue-300">
                    Copy Answer
                  </button>
                </div>
                <textarea id="answer-text-${idx}" class="input-field textarea-field text-xs text-slate-200 bg-slate-900/60 p-3 rounded-lg border border-slate-800/80" style="min-height: 90px; line-height: 1.6;">${ans}</textarea>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  answerCustomQuestion() {
    const input = document.getElementById('custom-app-question');
    const question = input.value.trim();
    if (!question) return;

    const profile = this.store.getProfile();
    const job = this.activeJob;
    const ans = this.answers.generateAnswer(question, profile, job);

    const container = document.getElementById('answers-accordion');
    const newBox = document.createElement('div');
    newBox.className = 'glass-panel p-5 rounded-xl border border-blue-500/40 space-y-2 animate-fade-in';
    newBox.innerHTML = `
      <div class="flex justify-between items-center">
        <h3 class="text-sm font-bold text-blue-300">Q: "${question}"</h3>
        <button onclick="navigator.clipboard.writeText(this.closest('.glass-panel').querySelector('textarea').value); window.applypilot.showToast('Answer copied');" class="text-xs text-blue-400 hover:text-blue-300">
          Copy Answer
        </button>
      </div>
      <textarea class="input-field textarea-field text-xs text-slate-200 bg-slate-900/60 p-3 rounded-lg border border-slate-800/80" style="min-height: 100px; line-height: 1.6;">${ans}</textarea>
    `;

    container.prepend(newBox);
    input.value = '';
    this.showToast('Generated grounded answer.');
  }

  copyAnswer(elemId) {
    const text = document.getElementById(elemId)?.value;
    if (text) {
      navigator.clipboard.writeText(text);
      this.showToast('Copied to clipboard!');
    }
  }

  // 25: Interview Preparation & Practice Simulator
  renderInterviewTab() {
    const profile = this.store.getProfile();
    const job = this.activeJob;
    const qSets = this.interview.generateQuestionSet(profile, job);

    return `
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-bold text-white">Interview Preparation</h2>
            <p class="text-xs text-slate-400">Role-specific questions and interactive practice simulator with STAR feedback.</p>
          </div>
        </div>

        <!-- Practice Interview Simulator Card -->
        <div class="glass-panel p-6 rounded-2xl border border-blue-500/30 bg-gradient-to-r from-slate-900 via-blue-950/20 to-slate-900">
          <div class="flex items-center justify-between mb-4">
            <span class="text-xs font-bold text-blue-400 uppercase tracking-wider">Interactive Mock Practice</span>
            <span class="text-xs text-slate-400">Question ${this.interviewSession.currentIndex + 1} of ${qSets.jobQuestions.length}</span>
          </div>

          <div class="p-4 rounded-xl bg-slate-950/80 border border-slate-800 mb-4">
            <span class="text-xs text-slate-400 block mb-1">AI Interviewer asks:</span>
            <p class="text-base font-semibold text-white" id="current-interview-q">
              "${qSets.jobQuestions[this.interviewSession.currentIndex]}"
            </p>
          </div>

          <div class="space-y-2 mb-4">
            <label class="block text-xs font-semibold text-slate-300">Your Response (Type naturally as you would speak):</label>
            <textarea id="practice-response-input" class="input-field textarea-field text-xs text-slate-100" style="min-height: 110px;" placeholder="When I developed the StudySync project, our goal was to..."></textarea>
          </div>

          <div class="flex justify-between items-center">
            <button onclick="window.applypilot.fillSampleInterviewAnswer()" class="text-xs text-blue-400 hover:underline">
              ⚡ Fill Sample STAR Answer
            </button>
            <button onclick="window.applypilot.submitInterviewAnswer()" class="btn-primary btn-sm">
              Submit & Get Feedback →
            </button>
          </div>

          <!-- Feedback Box -->
          <div id="interview-feedback-box" class="hidden mt-4 pt-4 border-t border-slate-800"></div>
        </div>

        <!-- Categorized Question Bank -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="glass-panel p-5 rounded-xl border border-slate-800">
            <h3 class="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-blue-400"></span>
              Job & Role Specific Questions
            </h3>
            <ul class="space-y-2 text-xs text-slate-300">
              ${qSets.jobQuestions.map(q => `<li class="p-2.5 rounded bg-slate-900/60 border border-slate-800/80">${q}</li>`).join('')}
            </ul>
          </div>

          <div class="glass-panel p-5 rounded-xl border border-slate-800">
            <h3 class="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
              Questions Based on Your Profile
            </h3>
            <ul class="space-y-2 text-xs text-slate-300">
              ${qSets.profileQuestions.map(q => `<li class="p-2.5 rounded bg-slate-900/60 border border-slate-800/80">${q}</li>`).join('')}
            </ul>
          </div>

          <div class="glass-panel p-5 rounded-xl border border-slate-800">
            <h3 class="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-purple-400"></span>
              Technical Foundations
            </h3>
            <ul class="space-y-2 text-xs text-slate-300">
              ${qSets.techQuestions.map(q => `<li class="p-2.5 rounded bg-slate-900/60 border border-slate-800/80">${q}</li>`).join('')}
            </ul>
          </div>

          <div class="glass-panel p-5 rounded-xl border border-slate-800">
            <h3 class="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-amber-400"></span>
              Smart Questions to Ask the Employer
            </h3>
            <ul class="space-y-2 text-xs text-slate-300">
              ${qSets.candidateQuestions.map(q => `<li class="p-2.5 rounded bg-slate-900/60 border border-slate-800/80">${q}</li>`).join('')}
            </ul>
          </div>
        </div>
      </div>
    `;
  }

  fillSampleInterviewAnswer() {
    const input = document.getElementById('practice-response-input');
    if (input) {
      input.value = "When developing StudySync, I focused on client-side state synchronization with WebSocket. We encountered an issue where simultaneous typing led to race conditions in the markdown preview. I isolated the problem by inspecting the event dispatch loop and implemented debounced reconciliation. As a result, 15 concurrent peers tested the editor with zero conflict drops, which taught me the importance of modular state management.";
    }
  }

  submitInterviewAnswer() {
    const input = document.getElementById('practice-response-input');
    const answer = input?.value.trim();
    const qSets = this.interview.generateQuestionSet(this.store.getProfile(), this.activeJob);
    const question = qSets.jobQuestions[this.interviewSession.currentIndex];

    const evaluation = this.interview.evaluateAnswer(question, answer, this.activeJob);
    const box = document.getElementById('interview-feedback-box');

    box.className = 'mt-4 pt-4 border-t border-slate-800 animate-fade-in block';
    box.innerHTML = `
      <div class="p-4 rounded-xl bg-slate-900 border border-slate-700">
        <div class="flex items-center justify-between mb-3">
          <span class="text-xs uppercase font-bold text-emerald-400">Objective Feedback</span>
          <span class="px-2 py-0.5 rounded text-xs font-bold ${evaluation.score >= 80 ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'}">
            Score: ${evaluation.score}/100
          </span>
        </div>
        <div class="grid grid-cols-2 gap-3 text-xs mb-3">
          <div><span class="text-slate-400">Relevance:</span> <span class="text-white">${evaluation.relevance}</span></div>
          <div><span class="text-slate-400">Clarity:</span> <span class="text-white">${evaluation.clarity}</span></div>
        </div>
        <div class="text-xs text-slate-300 mb-2">
          <strong>Structure (STAR):</strong> ${evaluation.structure}
        </div>
        <div class="text-xs text-slate-300 mb-2">
          <strong>Specificity:</strong> ${evaluation.specificity}
        </div>
        <div class="p-2.5 rounded bg-blue-500/10 text-blue-300 text-xs border border-blue-500/20">
          💡 <strong>Tip:</strong> ${evaluation.suggestions}
        </div>
      </div>
    `;
  }

  // 24: Company Research
  renderCompanyResearchTab() {
    const res = this.research.getCompanyResearch(this.activeJob);
    return `
      <div class="space-y-6 max-w-3xl">
        <div class="glass-panel p-6 rounded-2xl border border-slate-800">
          <div class="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
            <div>
              <h2 class="text-xl font-bold text-white">${res.name}</h2>
              <span class="text-xs text-slate-400">${res.industry} • ${res.headquarters}</span>
            </div>
            <a href="${res.website}" target="_blank" class="btn-secondary btn-sm text-xs">
              Visit Website ↗
            </a>
          </div>

          <p class="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6">
            ${res.description}
          </p>

          <h3 class="text-xs font-bold text-white uppercase tracking-wider mb-2">Posting Insights</h3>
          <ul class="space-y-2 mb-6">
            ${res.keyTakeaways.map(t => `
              <li class="flex items-center gap-2 text-xs text-slate-300">
                <span class="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                ${t}
              </li>
            `).join('')}
          </ul>

          <div class="p-3 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-400 italic">
            ${res.disclaimer}
          </div>
        </div>
      </div>
    `;
  }

  saveToTracker() {
    const job = this.activeJob;
    const match = this.activeMatch;

    this.store.saveApplication({
      id: "app_" + job.id,
      jobId: job.id,
      company: job.company,
      role: job.title,
      location: job.location,
      status: "Preparing",
      matchScore: match.overall,
      notes: "Tailored application with ApplyPilot."
    });

    this.showToast(`Saved ${job.title} at ${job.company} to Application Tracker.`);
  }

  bindWorkspaceEvents() {}

  // -------------------------------------------------------------
  // APPLICATION TRACKER (KANBAN & LIST) (Section 26)
  // -------------------------------------------------------------
  renderTrackerView(filter = 'all') {
    const apps = this.store.getApplications() || [];
    const columns = ['Saved', 'Preparing', 'Applied', 'Assessment', 'Interview', 'Offer'];

    return `
      <div class="max-w-7xl mx-auto py-8 px-4 sm:px-6">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-800">
          <div>
            <h1 class="text-2xl font-extrabold text-white">Application Tracker</h1>
            <p class="text-xs text-slate-400 mt-1">Organize your pipeline across Kanban stages</p>
          </div>
          <div class="flex items-center gap-3">
            <button onclick="window.applypilot.navigate('add-job')" class="btn-primary btn-sm flex items-center gap-1.5">
              <span>+ Add Job</span>
            </button>
          </div>
        </div>

        <!-- Kanban Board (Section 26) -->
        <div class="kanban-board">
          ${columns.map(col => {
            const colApps = apps.filter(a => a.status === col);
            return `
              <div class="kanban-column" ondragover="event.preventDefault()" ondrop="window.applypilot.handleDrop(event, '${col}')">
                <div class="kanban-column-header">
                  <span>${col}</span>
                  <span class="w-5 h-5 rounded-full bg-slate-800 text-slate-300 text-xs flex items-center justify-center font-bold">
                    ${colApps.length}
                  </span>
                </div>

                <div class="space-y-3 pt-2">
                  ${colApps.map(app => `
                    <div class="kanban-card" draggable="true" ondragstart="event.dataTransfer.setData('text/plain', '${app.id}')">
                      <div class="flex justify-between items-start mb-1">
                        <strong class="text-xs font-bold text-white block">${app.company}</strong>
                        <span class="text-[11px] font-bold ${app.matchScore >= 80 ? 'text-emerald-400' : 'text-amber-400'}">${app.matchScore}%</span>
                      </div>
                      <p class="text-[11px] text-slate-300 line-clamp-1 mb-2">${app.role}</p>
                      
                      ${app.interviewDate ? `
                        <div class="text-[10px] text-purple-300 font-semibold mb-2 flex items-center gap-1">
                          <span>📅 Interview: ${app.interviewDate}</span>
                        </div>
                      ` : ''}

                      <div class="flex justify-between items-center pt-2 border-t border-slate-800 text-[10px] text-slate-400">
                        <span>${app.dateAdded}</span>
                        <div class="flex gap-2">
                          <button onclick="window.applypilot.openApplicationWorkspace('${app.jobId}')" class="text-blue-400 hover:underline">
                            Open
                          </button>
                          <button onclick="window.applypilot.deleteApp('${app.id}')" class="text-rose-400 hover:underline">
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  handleDrop(e, targetStatus) {
    e.preventDefault();
    const appId = e.dataTransfer.getData('text/plain');
    if (appId) {
      this.store.updateApplicationStatus(appId, targetStatus);
      this.showToast(`Moved application to ${targetStatus}`);
      this.renderCurrentView();
    }
  }

  deleteApp(id) {
    if (confirm("Remove this application from your tracker?")) {
      this.store.deleteApplication(id);
      this.showToast("Application removed.");
      this.renderCurrentView();
    }
  }

  bindTrackerEvents() {}

  // -------------------------------------------------------------
  // CAREER PROFILE VIEW (Section 10)
  // -------------------------------------------------------------
  renderProfileView() {
    const profile = this.store.getProfile() || {};
    const p = profile.personal || {};
    const skills = profile.skills || {};

    return `
      <div class="max-w-4xl mx-auto py-8 px-4 sm:px-6">
        <div class="flex items-center justify-between pb-6 mb-6 border-b border-slate-800">
          <div>
            <h1 class="text-2xl font-extrabold text-white">Career Profile</h1>
            <p class="text-xs text-slate-400 mt-1">Review your profile before using it in applications.</p>
          </div>
          <button onclick="window.applypilot.saveProfileChanges()" class="btn-primary btn-sm">
            Save Profile Changes
          </button>
        </div>

        <div class="space-y-6">
          <!-- Personal Section -->
          <div class="glass-panel p-6 rounded-2xl border border-slate-800">
            <h2 class="text-sm font-bold text-white uppercase tracking-wider mb-4">Personal Information</h2>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-400 mb-1">First Name</label>
                <input type="text" id="prof-first" value="${p.firstName || ''}" class="input-field" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-400 mb-1">Last Name</label>
                <input type="text" id="prof-last" value="${p.lastName || ''}" class="input-field" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-400 mb-1">Email</label>
                <input type="email" id="prof-email" value="${p.email || ''}" class="input-field" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-400 mb-1">Phone</label>
                <input type="text" id="prof-phone" value="${p.phone || ''}" class="input-field" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-400 mb-1">Location</label>
                <input type="text" id="prof-loc" value="${p.location || ''}" class="input-field" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-400 mb-1">LinkedIn URL</label>
                <input type="text" id="prof-li" value="${p.linkedin || ''}" class="input-field" />
              </div>
            </div>
          </div>

          <!-- Skills Section -->
          <div class="glass-panel p-6 rounded-2xl border border-slate-800">
            <h2 class="text-sm font-bold text-white uppercase tracking-wider mb-4">Verified Technical Skills</h2>
            <div class="flex flex-wrap gap-2 mb-3">
              ${(skills.technical || []).map(s => `
                <span class="px-2.5 py-1 rounded bg-blue-500/10 text-blue-300 text-xs border border-blue-500/20 flex items-center gap-1.5">
                  ${s}
                  <button onclick="window.applypilot.removeSkill('${s}')" class="text-slate-400 hover:text-white">✕</button>
                </span>
              `).join('')}
            </div>
            <div class="flex gap-2">
              <input type="text" id="add-skill-input" class="input-field text-xs" placeholder="Add verified skill (e.g. Docker, AWS)..." />
              <button onclick="window.applypilot.addManualSkill()" class="btn-secondary btn-sm whitespace-nowrap">
                + Add Skill
              </button>
            </div>
          </div>

          <!-- Experience Section -->
          <div class="glass-panel p-6 rounded-2xl border border-slate-800">
            <h2 class="text-sm font-bold text-white uppercase tracking-wider mb-4">Experience</h2>
            <div class="space-y-4">
              ${(profile.experience || []).map((exp, idx) => `
                <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div class="flex justify-between font-bold text-sm text-white mb-1">
                    <span>${exp.title} — ${exp.company}</span>
                    <span class="text-xs text-slate-400 font-normal">${exp.startDate} - ${exp.endDate}</span>
                  </div>
                  <ul class="list-disc pl-5 text-xs text-slate-300 space-y-1">
                    ${exp.responsibilities.map(r => `<li>${r}</li>`).join('')}
                  </ul>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  saveProfileChanges() {
    const profile = this.store.getProfile();
    profile.personal.firstName = document.getElementById('prof-first').value;
    profile.personal.lastName = document.getElementById('prof-last').value;
    profile.personal.email = document.getElementById('prof-email').value;
    profile.personal.phone = document.getElementById('prof-phone').value;
    profile.personal.location = document.getElementById('prof-loc').value;
    profile.personal.linkedin = document.getElementById('prof-li').value;

    this.store.updateProfile(profile);
    this.showToast('Profile updated successfully.');
  }

  removeSkill(skill) {
    const profile = this.store.getProfile();
    profile.skills.technical = (profile.skills.technical || []).filter(s => s !== skill);
    this.store.updateProfile(profile);
    this.renderCurrentView();
  }

  addManualSkill() {
    const input = document.getElementById('add-skill-input');
    const skill = input?.value.trim();
    if (skill) {
      this.store.addConfirmedSkill(skill);
      this.showToast(`Added "${skill}" to verified profile.`);
      this.renderCurrentView();
    }
  }

  bindProfileEvents() {}

  // -------------------------------------------------------------
  // AUTH MODAL & TOASTS (Section 8)
  // -------------------------------------------------------------
  openAuthModal(mode = 'signin') {
    const modal = document.getElementById('auth-modal');
    const content = document.getElementById('auth-modal-content');
    if (!modal || !content) return;

    content.innerHTML = `
      <div class="p-6">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-lg font-bold text-white">${mode === 'signin' ? 'Sign In to ApplyPilot' : 'Create Free Account'}</h3>
          <button onclick="window.applypilot.closeModal()" class="text-slate-400 hover:text-white">✕</button>
        </div>

        <form onsubmit="event.preventDefault(); window.applypilot.handleAuthSubmit('${mode}');" class="space-y-4">
          ${mode === 'signup' ? `
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
              <input type="text" id="auth-name" required class="input-field" placeholder="Alex Morgan" />
            </div>
          ` : ''}

          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
            <input type="email" id="auth-email" required class="input-field" placeholder="alex@university.edu" />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Password</label>
            <input type="password" id="auth-pass" required class="input-field" placeholder="••••••••" />
          </div>

          <button type="submit" class="btn-primary w-full py-2.5 mt-2">
            ${mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>

          <div class="pt-2 text-center text-xs text-slate-400">
            ${mode === 'signin' ? `
              Don't have an account? <a href="#" onclick="window.applypilot.openAuthModal('signup')" class="text-blue-400 hover:underline">Sign up</a>
            ` : `
              Already have an account? <a href="#" onclick="window.applypilot.openAuthModal('signin')" class="text-blue-400 hover:underline">Sign in</a>
            `}
          </div>

          <div class="pt-3 border-t border-slate-800 text-center">
            <button type="button" onclick="window.applypilot.store.resetToDemo('student'); window.applypilot.closeModal(); window.applypilot.navigate('dashboard');" class="text-xs text-blue-400 font-semibold hover:underline">
              ⚡ One-Click Demo Student Sign In
            </button>
          </div>
        </form>
      </div>
    `;

    modal.classList.remove('hidden');
  }

  handleAuthSubmit(mode) {
    const email = document.getElementById('auth-email').value;
    const name = mode === 'signup' ? document.getElementById('auth-name').value : null;

    this.store.login(email, name);
    this.closeModal();
    this.showToast(`Welcome back, ${this.store.getAuthUser().name}!`);
    this.navigate('dashboard');
  }

  closeModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.add('hidden');
  }

  showToast(message) {
    const toast = document.getElementById('toast-notification');
    if (!toast) return;

    toast.textContent = message;
    toast.classList.remove('translate-y-20', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');

    setTimeout(() => {
      toast.classList.remove('translate-y-0', 'opacity-100');
      toast.classList.add('translate-y-20', 'opacity-0');
    }, 3200);
  }

  renderCurrentView() {
    this.navigate(this.currentView, { job: this.activeJob, tab: this.activeTab });
  }
}

// Global initialization
window.addEventListener('DOMContentLoaded', () => {
  window.applypilot = new ApplyPilotApp();
});
