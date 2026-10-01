import {
  SATAssignment,
  SATClass,
  SATQuestion,
  SATSubmission,
  UserAccount,
  UserRole,
} from "../types/sat";
import { DEFAULT_SAT_QUESTIONS } from "../data/sat-bank";

const STORAGE_KEYS = {
  USERS: "satflow_users",
  CURRENT_USER: "satflow_current_user",
  CLASSES: "satflow_classes",
  QUESTIONS: "satflow_questions",
  ASSIGNMENTS: "satflow_assignments",
  SUBMISSIONS: "satflow_submissions",
};

// Default User Accounts Database
export const DEFAULT_USERS: UserAccount[] = [
  {
    id: "user-teacher-01",
    name: "SAT Instructor",
    email: "teacher@satmaster.edu",
    password: "teacher123",
    role: "teacher",
    createdAt: "2026-09-01T00:00:00.000Z",
  },
  {
    id: "user-student-01",
    name: "Alex Chen",
    email: "alex.c@student.edu",
    password: "student123",
    role: "student",
    classCode: "MATH-AM",
    createdAt: "2026-09-10T00:00:00.000Z",
  },
  {
    id: "user-student-02",
    name: "Sophia Miller",
    email: "sophia.m@student.edu",
    password: "student123",
    role: "student",
    classCode: "MATH-AM",
    createdAt: "2026-09-11T00:00:00.000Z",
  },
];

// Seed Classes
export const DEFAULT_CLASSES: SATClass[] = [
  {
    id: "class-10a",
    name: "Class 10-A SAT Prep",
    code: "CLASS-10A",
    description: "Standard high school SAT preparation group.",
    schedule: "Mon/Wed 9:00 AM",
    createdAt: "2026-09-15T08:00:00.000Z",
  },
  {
    id: "class-math-am",
    name: "SAT Math Morning Cohort",
    code: "MATH-AM",
    description: "Intensive algebra, quadratics & geometry focus.",
    schedule: "Tue/Thu 10:30 AM",
    createdAt: "2026-09-18T10:00:00.000Z",
  },
  {
    id: "class-rw-weekend",
    name: "Weekend Reading & Writing Intensive",
    code: "RW-WEEKEND",
    description: "Passage breakdown, rhetoric synthesis, and grammar conventions.",
    schedule: "Saturday 2:00 PM",
    createdAt: "2026-09-20T14:00:00.000Z",
  },
];

// Seed Assignments
export const DEFAULT_ASSIGNMENTS: SATAssignment[] = [
  {
    id: "assign-math-01",
    code: "MATH-01",
    classId: "class-math-am",
    title: "SAT Math: Algebra, Quadratics & Trigonometry Drill",
    description:
      "Practice set focused on linear equations, vertex form, trigonometric complementary identities, and grid-in algebraic responses.",
    section: "math",
    questionIds: ["m-alg-01", "m-alg-02", "m-spr-01", "m-adv-01", "m-geom-02"],
    timeLimitMinutes: 20,
    showExplanationsImmediately: true,
    createdAt: "2026-09-20T10:00:00.000Z",
    dueDate: "2026-09-28T23:59:00.000Z",
  },
  {
    id: "assign-rw-01",
    code: "READ-01",
    classId: "class-rw-weekend",
    title: "SAT Reading & Writing: Words in Context & Transitions",
    description:
      "Targeted homework for sentence boundaries, modifier placement, context-dependent vocabulary, and transition logic.",
    section: "reading-writing",
    questionIds: [
      "rw-wic-01",
      "rw-wic-02",
      "rw-tsp-01",
      "rw-sec-01",
      "rw-sec-02",
      "rw-eoi-01",
    ],
    timeLimitMinutes: 15,
    showExplanationsImmediately: true,
    createdAt: "2026-09-21T14:30:00.000Z",
    dueDate: "2026-09-29T23:59:00.000Z",
  },
  {
    id: "assign-mixed-01",
    code: "SAT-MIX",
    classId: "class-10a",
    title: "Comprehensive Digital SAT Diagnostic Review",
    description:
      "A fast mixed section review combining both Reading/Writing analysis and High-yield Math concepts.",
    section: "mixed",
    questionIds: [
      "rw-wic-01",
      "rw-sec-01",
      "rw-eoi-02",
      "m-alg-01",
      "m-spr-02",
      "m-geom-01",
    ],
    timeLimitMinutes: 25,
    showExplanationsImmediately: true,
    createdAt: "2026-09-22T09:15:00.000Z",
    dueDate: "2026-09-30T23:59:00.000Z",
  },
];

// Seed Submissions
export const DEFAULT_SUBMISSIONS: SATSubmission[] = [
  {
    id: "sub-01",
    assignmentId: "assign-math-01",
    classId: "class-math-am",
    studentName: "Alex Chen",
    studentEmail: "alex.c@student.edu",
    submittedAt: "2026-09-22T16:20:00.000Z",
    timeSpentSeconds: 680,
    answers: {
      "m-alg-01": "B",
      "m-alg-02": "B",
      "m-spr-01": "220",
      "m-adv-01": "B",
      "m-geom-02": "B",
    },
    results: {
      "m-alg-01": { questionId: "m-alg-01", isCorrect: true, studentAnswer: "B", correctAnswer: "B" },
      "m-alg-02": { questionId: "m-alg-02", isCorrect: true, studentAnswer: "B", correctAnswer: "B" },
      "m-spr-01": { questionId: "m-spr-01", isCorrect: true, studentAnswer: "220", correctAnswer: "220" },
      "m-adv-01": { questionId: "m-adv-01", isCorrect: true, studentAnswer: "B", correctAnswer: "B" },
      "m-geom-02": { questionId: "m-geom-02", isCorrect: true, studentAnswer: "B", correctAnswer: "B" },
    },
    score: 5,
    totalQuestions: 5,
    percentage: 100,
    teacherFeedback: "Flawless work Alex! Excellent pace and zero computational mistakes.",
  },
  {
    id: "sub-02",
    assignmentId: "assign-math-01",
    classId: "class-math-am",
    studentName: "Sophia Miller",
    studentEmail: "sophia.m@student.edu",
    submittedAt: "2026-09-22T19:45:00.000Z",
    timeSpentSeconds: 840,
    answers: {
      "m-alg-01": "B",
      "m-alg-02": "B",
      "m-spr-01": "220",
      "m-adv-01": "A",
      "m-geom-02": "B",
    },
    results: {
      "m-alg-01": { questionId: "m-alg-01", isCorrect: true, studentAnswer: "B", correctAnswer: "B" },
      "m-alg-02": { questionId: "m-alg-02", isCorrect: true, studentAnswer: "B", correctAnswer: "B" },
      "m-spr-01": { questionId: "m-spr-01", isCorrect: true, studentAnswer: "220", correctAnswer: "220" },
      "m-adv-01": { questionId: "m-adv-01", isCorrect: false, studentAnswer: "A", correctAnswer: "B" },
      "m-geom-02": { questionId: "m-geom-02", isCorrect: true, studentAnswer: "B", correctAnswer: "B" },
    },
    score: 4,
    totalQuestions: 5,
    percentage: 80,
    teacherFeedback: "Strong algebra skills. Review parabola sign when a < 0 (opens downward, max value).",
  },
];

// Helper to evaluate fraction or decimal strings
function parseMathValue(val: string): number | null {
  const clean = val.trim();
  if (clean.includes("/")) {
    const parts = clean.split("/");
    if (parts.length === 2) {
      const num = parseFloat(parts[0]);
      const den = parseFloat(parts[1]);
      if (!isNaN(num) && !isNaN(den) && den !== 0) {
        return num / den;
      }
    }
  }
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? null : parsed;
}

// Auto-grader core function
export function gradeAnswer(question: SATQuestion, studentAnswer: string): boolean {
  if (!studentAnswer || !studentAnswer.trim()) return false;
  const cleanedStudent = studentAnswer.trim();

  if (question.type === "multiple-choice") {
    return cleanedStudent.toUpperCase() === question.correctAnswer.trim().toUpperCase();
  }

  const acceptedList = [
    question.correctAnswer,
    ...(question.acceptedAnswers || []),
  ];

  for (const acc of acceptedList) {
    if (acc.trim().toLowerCase() === cleanedStudent.toLowerCase()) {
      return true;
    }
  }

  const studentNum = parseMathValue(cleanedStudent);
  if (studentNum !== null) {
    for (const acc of acceptedList) {
      const accNum = parseMathValue(acc);
      if (accNum !== null && Math.abs(studentNum - accNum) < 0.001) {
        return true;
      }
    }
  }

  return false;
}

// Client Storage & Auth API
export const satStorage = {
  // User Authentication & Contact Database API
  getUsers(): UserAccount[] {
    if (typeof window === "undefined") return DEFAULT_USERS;
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.USERS);
      if (!stored) {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(DEFAULT_USERS));
        return DEFAULT_USERS;
      }
      return JSON.parse(stored);
    } catch {
      return DEFAULT_USERS;
    }
  },

  registerUser(data: Omit<UserAccount, "id" | "createdAt">): UserAccount {
    const users = this.getUsers();
    const existing = users.find(
      (u) => u.email.toLowerCase() === data.email.toLowerCase()
    );
    if (existing) {
      throw new Error("An account with this email address already exists.");
    }

    const newUser: UserAccount = {
      ...data,
      id: "user-" + Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
    };

    const updated = [newUser, ...users];
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updated));
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(newUser));
    }
    return newUser;
  },

  loginUser(email: string, pass: string): UserAccount {
    const users = this.getUsers();
    const found = users.find(
      (u) =>
        u.email.toLowerCase() === email.trim().toLowerCase() &&
        u.password === pass
    );
    if (!found) {
      throw new Error("Invalid email address or password.");
    }

    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(found));
    }
    return found;
  },

  getCurrentUser(): UserAccount | null {
    if (typeof window === "undefined") return DEFAULT_USERS[0]; // Default to Teacher
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (!stored) {
        localStorage.setItem(
          STORAGE_KEYS.CURRENT_USER,
          JSON.stringify(DEFAULT_USERS[0])
        );
        return DEFAULT_USERS[0];
      }
      return JSON.parse(stored);
    } catch {
      return DEFAULT_USERS[0];
    }
  },

  logoutUser(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  },

  // Classes API
  getClasses(): SATClass[] {
    if (typeof window === "undefined") return DEFAULT_CLASSES;
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CLASSES);
      if (!stored) {
        localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(DEFAULT_CLASSES));
        return DEFAULT_CLASSES;
      }
      return JSON.parse(stored);
    } catch {
      return DEFAULT_CLASSES;
    }
  },

  getClassById(id: string): SATClass | undefined {
    return this.getClasses().find((c) => c.id === id);
  },

  getClassByCode(code: string): SATClass | undefined {
    const clean = code.trim().toUpperCase();
    return this.getClasses().find((c) => c.code.toUpperCase() === clean);
  },

  createClass(data: Omit<SATClass, "id" | "createdAt">): SATClass {
    const id = "class-" + Math.random().toString(36).substring(2, 9);
    const newClass: SATClass = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
    };
    const current = this.getClasses();
    const updated = [newClass, ...current];
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(updated));
    }
    return newClass;
  },

  deleteClass(id: string): void {
    const current = this.getClasses();
    const updated = current.filter((c) => c.id !== id);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(updated));
    }
  },

  // Questions API
  getQuestions(): SATQuestion[] {
    if (typeof window === "undefined") return DEFAULT_SAT_QUESTIONS;
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.QUESTIONS);
      if (!stored) {
        localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(DEFAULT_SAT_QUESTIONS));
        return DEFAULT_SAT_QUESTIONS;
      }
      return JSON.parse(stored);
    } catch {
      return DEFAULT_SAT_QUESTIONS;
    }
  },

  addQuestion(question: SATQuestion): SATQuestion {
    const questions = this.getQuestions();
    const updated = [question, ...questions];
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(updated));
    }
    return question;
  },

  getQuestionById(id: string): SATQuestion | undefined {
    return this.getQuestions().find((q) => q.id === id);
  },

  // Assignments API
  getAssignments(classId?: string): SATAssignment[] {
    let list: SATAssignment[] = DEFAULT_ASSIGNMENTS;
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(STORAGE_KEYS.ASSIGNMENTS);
        if (stored) {
          list = JSON.parse(stored);
        } else {
          localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(DEFAULT_ASSIGNMENTS));
        }
      } catch {
        list = DEFAULT_ASSIGNMENTS;
      }
    }
    if (classId) {
      return list.filter((a) => a.classId === classId);
    }
    return list;
  },

  getAssignmentById(id: string): SATAssignment | undefined {
    return this.getAssignments().find((a) => a.id === id);
  },

  getAssignmentByCode(code: string): SATAssignment | undefined {
    const clean = code.trim().toUpperCase();
    return this.getAssignments().find((a) => a.code.toUpperCase() === clean);
  },

  createAssignment(data: Omit<SATAssignment, "id" | "code" | "createdAt">): SATAssignment {
    const id = "assign-" + Math.random().toString(36).substring(2, 9);
    const randomDigits = Math.floor(100 + Math.random() * 900);
    const code = `SAT-${randomDigits}`;
    const newAssignment: SATAssignment = {
      ...data,
      id,
      code,
      createdAt: new Date().toISOString(),
    };

    const current = this.getAssignments();
    const updated = [newAssignment, ...current];
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(updated));
    }
    return newAssignment;
  },

  deleteAssignment(id: string): void {
    const current = this.getAssignments();
    const updated = current.filter((a) => a.id !== id);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(updated));
    }
  },

  // Submissions API
  getSubmissions(assignmentId?: string, classId?: string): SATSubmission[] {
    let list: SATSubmission[] = DEFAULT_SUBMISSIONS;
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(STORAGE_KEYS.SUBMISSIONS);
        if (stored) {
          list = JSON.parse(stored);
        } else {
          localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(DEFAULT_SUBMISSIONS));
        }
      } catch {
        list = DEFAULT_SUBMISSIONS;
      }
    }
    if (assignmentId) {
      return list.filter((s) => s.assignmentId === assignmentId);
    }
    if (classId) {
      return list.filter((s) => s.classId === classId);
    }
    return list;
  },

  getSubmissionById(id: string): SATSubmission | undefined {
    return this.getSubmissions().find((s) => s.id === id);
  },

  saveSubmission(submission: SATSubmission): SATSubmission {
    const current = this.getSubmissions();
    const updated = [submission, ...current];
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(updated));
    }
    return submission;
  },

  updateTeacherFeedback(submissionId: string, feedback: string): void {
    const current = this.getSubmissions();
    const updated = current.map((s) =>
      s.id === submissionId ? { ...s, teacherFeedback: feedback } : s
    );
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(updated));
    }
  },
};
