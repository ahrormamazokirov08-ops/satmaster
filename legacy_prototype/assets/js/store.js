// ApplyPilot Reactive Store & Persistence Manager
// Manages local state, IndexedDB/LocalStorage persistence, and event notifications

class ApplyPilotStore {
  constructor() {
    this.STORAGE_KEYS = {
      AUTH_USER: 'applypilot_auth_user',
      PROFILE: 'applypilot_user_profile',
      APPLICATIONS: 'applypilot_applications',
      SAVED_JOBS: 'applypilot_saved_jobs',
      SETTINGS: 'applypilot_settings'
    };

    this.listeners = new Map();
    this.init();
  }

  init() {
    // Load initial state or initialize defaults
    this.authUser = this._load(this.STORAGE_KEYS.AUTH_USER, null);
    
    // Default to student profile if none exists
    const defaultProfile = window.APPLYPILOT_DEMO_DATA ? 
      JSON.parse(JSON.stringify(window.APPLYPILOT_DEMO_DATA.profiles.student)) : null;
    
    this.profile = this._load(this.STORAGE_KEYS.PROFILE, defaultProfile);

    // Initial applications
    const initialApps = [
      {
        id: "app_1",
        jobId: "job_sample_1",
        company: "Stripe",
        role: "Software Engineering Intern - Frontend & Tools",
        location: "San Francisco, CA / Remote",
        status: "Applied", // Saved, Preparing, Applied, Assessment, Interview, Offer, Rejected, Withdrawn
        matchScore: 84,
        dateAdded: "2025-02-10",
        dateApplied: "2025-02-12",
        contactPerson: "Jordan Ellis (Talent Lead)",
        notes: "Submitted tailored CV emphasizing StudySync collaborative editor and React performance optimizations.",
        interviewDate: "2025-03-02",
        followUpDate: "2025-02-26",
        documents: {
          tailoredCv: true,
          coverLetter: true,
          answers: 4
        }
      },
      {
        id: "app_2",
        jobId: "job_sample_2",
        company: "Wayfair",
        role: "Junior Data Analyst",
        location: "Boston, MA (Hybrid)",
        status: "Interview",
        matchScore: 78,
        dateAdded: "2025-01-28",
        dateApplied: "2025-02-01",
        contactPerson: "Sarah Lin",
        notes: "Passed take-home SQL assessment. Scheduled for technical interview on March 5th.",
        interviewDate: "2025-03-05",
        followUpDate: "2025-03-08",
        documents: {
          tailoredCv: true,
          coverLetter: true,
          answers: 2
        }
      }
    ];

    this.applications = this._load(this.STORAGE_KEYS.APPLICATIONS, initialApps);
    this.savedJobs = this._load(this.STORAGE_KEYS.SAVED_JOBS, window.APPLYPILOT_DEMO_DATA ? window.APPLYPILOT_DEMO_DATA.jobs : []);
    this.settings = this._load(this.STORAGE_KEYS.SETTINGS, {
      template: 'modern',
      theme: 'light',
      showGaps: true
    });
  }

  _load(key, fallback) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch (e) {
      console.warn(`LocalStorage read error for ${key}:`, e);
      return fallback;
    }
  }

  _save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`LocalStorage write error for ${key}:`, e);
    }
  }

  // Subscribe to state changes
  subscribe(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    return () => {
      const list = this.listeners.get(event);
      if (list) {
        this.listeners.set(event, list.filter(cb => cb !== callback));
      }
    };
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(cb => cb(data));
    }
  }

  // Auth methods
  login(email, name = null) {
    this.authUser = {
      id: "usr_" + Math.random().toString(36).substring(2, 9),
      email: email,
      name: name || (email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1)),
      isAuthenticated: true
    };
    this._save(this.STORAGE_KEYS.AUTH_USER, this.authUser);
    this.emit('auth:change', this.authUser);
    return this.authUser;
  }

  logout() {
    this.authUser = null;
    localStorage.removeItem(this.STORAGE_KEYS.AUTH_USER);
    this.emit('auth:change', null);
  }

  isLoggedIn() {
    return !!(this.authUser && this.authUser.isAuthenticated);
  }

  getAuthUser() {
    return this.authUser || { name: "Guest User", email: "guest@applypilot.io", isAuthenticated: false };
  }

  // Profile methods
  getProfile() {
    return this.profile;
  }

  updateProfile(newProfile) {
    this.profile = { ...this.profile, ...newProfile };
    this._save(this.STORAGE_KEYS.PROFILE, this.profile);
    this.emit('profile:update', this.profile);
    return this.profile;
  }

  addConfirmedSkill(skillName, category = 'technical') {
    if (!this.profile) return;
    if (!this.profile.skills) {
      this.profile.skills = { technical: [], soft: [], languages: [] };
    }
    const cat = this.profile.skills[category] || this.profile.skills.technical;
    if (!cat.includes(skillName)) {
      cat.push(skillName);
      this._save(this.STORAGE_KEYS.PROFILE, this.profile);
      this.emit('profile:update', this.profile);
    }
  }

  // Applications methods
  getApplications() {
    return this.applications;
  }

  getApplication(id) {
    return this.applications.find(a => a.id === id);
  }

  saveApplication(appData) {
    const existingIndex = this.applications.findIndex(a => a.id === appData.id);
    if (existingIndex >= 0) {
      this.applications[existingIndex] = { ...this.applications[existingIndex], ...appData };
    } else {
      const newApp = {
        id: appData.id || "app_" + Date.now(),
        dateAdded: new Date().toISOString().split('T')[0],
        status: appData.status || 'Saved',
        ...appData
      };
      this.applications.unshift(newApp);
    }
    this._save(this.STORAGE_KEYS.APPLICATIONS, this.applications);
    this.emit('applications:update', this.applications);
  }

  updateApplicationStatus(id, newStatus) {
    const app = this.applications.find(a => a.id === id);
    if (app) {
      app.status = newStatus;
      if (newStatus === 'Applied' && !app.dateApplied) {
        app.dateApplied = new Date().toISOString().split('T')[0];
      }
      this._save(this.STORAGE_KEYS.APPLICATIONS, this.applications);
      this.emit('applications:update', this.applications);
    }
  }

  deleteApplication(id) {
    this.applications = this.applications.filter(a => a.id !== id);
    this._save(this.STORAGE_KEYS.APPLICATIONS, this.applications);
    this.emit('applications:update', this.applications);
  }

  // Jobs methods
  getSavedJobs() {
    return this.savedJobs;
  }

  getJob(id) {
    return this.savedJobs.find(j => j.id === id);
  }

  saveJob(job) {
    const existing = this.savedJobs.find(j => j.id === job.id);
    if (existing) {
      Object.assign(existing, job);
    } else {
      this.savedJobs.unshift(job);
    }
    this._save(this.STORAGE_KEYS.SAVED_JOBS, this.savedJobs);
    this.emit('jobs:update', this.savedJobs);
    return job;
  }

  resetToDemo(persona = 'student') {
    const demo = window.APPLYPILOT_DEMO_DATA;
    if (demo && demo.profiles[persona]) {
      this.profile = JSON.parse(JSON.stringify(demo.profiles[persona]));
      this._save(this.STORAGE_KEYS.PROFILE, this.profile);
      this.login(this.profile.personal.email, this.profile.personal.firstName);
      this.emit('profile:update', this.profile);
    }
  }
}

window.applypilotStore = new ApplyPilotStore();
