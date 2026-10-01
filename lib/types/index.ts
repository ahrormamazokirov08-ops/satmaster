export type UserRole = "student" | "graduate" | "professional" | "career_changer";

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  headline?: string;
  location?: string;
  phone?: string;
  linkedin_url?: string;
  portfolio_url?: string;
  github_url?: string;
  current_status: UserRole;
  target_roles: string[];
  target_industries: string[];
  skills: {
    technical: string[];
    soft: string[];
    languages: string[];
    tools: string[];
  };
  experience: {
    id: string;
    title: string;
    company: string;
    location?: string;
    start_date: string;
    end_date?: string;
    current: boolean;
    bullets: string[];
  }[];
  education: {
    id: string;
    degree: string;
    institution: string;
    location?: string;
    graduation_year: string;
    gpa?: string;
    coursework?: string[];
  }[];
  projects: {
    id: string;
    name: string;
    description: string;
    technologies: string[];
    url?: string;
  }[];
  created_at?: string;
  updated_at?: string;
}

export type ApplicationStatus =
  | "saved"
  | "preparing"
  | "applied"
  | "assessment"
  | "interview"
  | "offer"
  | "rejected"
  | "withdrawn";

export interface JobListing {
  id: string;
  user_id: string;
  title: string;
  company: string;
  location: string;
  workplace_type: "remote" | "hybrid" | "on_site";
  source_url?: string;
  description_raw: string;
  parsed_requirements?: {
    required_skills: string[];
    preferred_skills: string[];
    experience_years?: string;
    education?: string;
    responsibilities: string[];
    keywords: string[];
  };
  created_at: string;
}

export interface Application {
  id: string;
  user_id: string;
  job_id: string;
  job: JobListing;
  status: ApplicationStatus;
  match_score: number;
  match_breakdown: {
    skills: number;
    experience: number;
    education: number;
    projects: number;
  };
  notes?: string;
  applied_at?: string;
  interview_date?: string;
  created_at: string;
  updated_at: string;
}

export interface DiffSuggestion {
  id: string;
  section: "summary" | "experience" | "skills" | "projects";
  itemId?: string;
  bulletIndex?: number;
  original: string;
  suggested: string;
  rationale: string;
  accepted?: boolean;
}

export interface InterviewQuestionItem {
  id: string;
  question: string;
  type: "behavioral" | "technical" | "culture" | "role_specific";
  difficulty: "junior" | "mid" | "senior";
  starGuidance: {
    situation: string;
    task: string;
    action: string;
    result: string;
  };
}
