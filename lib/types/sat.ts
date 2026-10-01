export type SATSection = "reading-writing" | "math";

export type SATDomain =
  // Reading & Writing Domains
  | "Craft and Structure"
  | "Information and Ideas"
  | "Standard English Conventions"
  | "Expression of Ideas"
  // Math Domains
  | "Algebra"
  | "Advanced Math"
  | "Problem-Solving and Data Analysis"
  | "Geometry and Trigonometry";

export type QuestionType = "multiple-choice" | "student-produced-response";

export type DifficultyLevel = "Easy" | "Medium" | "Hard";

export type UserRole = "teacher" | "student";

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  password: string; // Securely stored password
  role: UserRole;
  classCode?: string; // Optional class join code for students
  createdAt: string;
}

export interface SATQuestionOption {
  id: "A" | "B" | "C" | "D";
  text: string;
}

export interface SATQuestion {
  id: string;
  section: SATSection;
  domain: SATDomain | string;
  skill: string;
  difficulty: DifficultyLevel;
  passage?: string; // For Reading & Writing or contextual word problems
  prompt: string;
  type: QuestionType;
  options?: SATQuestionOption[]; // Required for multiple-choice
  correctAnswer: string; // "A", "B", "C", "D" or numeric string "3.5"
  acceptedAnswers?: string[]; // Alternate representations for grid-ins (e.g. ["3.5", "7/2"])
  explanation: string;
}

export interface SATClass {
  id: string;
  name: string;
  code: string; // Unique class join code e.g. "CLASS-10A"
  description?: string;
  schedule?: string;
  createdAt: string;
}

export interface SATAssignment {
  id: string;
  code: string; // e.g., "SAT-402" for student join
  classId?: string; // Associated class id
  title: string;
  description?: string;
  section: SATSection | "mixed";
  questionIds: string[];
  timeLimitMinutes?: number; // 0 or undefined for untimed
  showExplanationsImmediately: boolean;
  createdAt: string;
  dueDate?: string;
}

export interface QuestionResult {
  questionId: string;
  isCorrect: boolean;
  studentAnswer: string;
  correctAnswer: string;
}

export interface SATSubmission {
  id: string;
  assignmentId: string;
  classId?: string;
  studentName: string;
  studentEmail?: string;
  submittedAt: string;
  timeSpentSeconds: number;
  answers: Record<string, string>; // questionId -> studentAnswer
  results: Record<string, QuestionResult>;
  score: number;
  totalQuestions: number;
  percentage: number;
  teacherFeedback?: string;
}
