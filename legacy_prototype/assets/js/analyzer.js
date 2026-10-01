// ApplyPilot Job Analysis & Alignment Score Engine
// Analyzes job descriptions and computes profile-to-job alignment without fabricating qualifications

class ApplyPilotAnalyzer {
  constructor() {
    this.SKILL_DICTIONARY = {
      languages: ["Python", "JavaScript", "TypeScript", "Java", "C++", "C#", "Go", "Rust", "SQL", "HTML", "HTML5", "CSS", "CSS3", "Bash", "Shell"],
      frameworks: ["React", "Vue", "Angular", "Next.js", "Node.js", "Express", "FastAPI", "Django", "Flask", "Tailwind CSS", "Bootstrap", "Spring Boot"],
      databases: ["PostgreSQL", "MySQL", "MongoDB", "Redis", "SQLite", "Snowflake", "BigQuery", "DynamoDB"],
      tools: ["Git", "GitHub", "Docker", "Kubernetes", "AWS", "GCP", "Google Cloud", "Azure", "CI/CD", "Linux", "Webpack", "Vite", "Tableau", "Power BI", "Excel", "pandas", "Jupyter", "REST APIs", "GraphQL", "Jest", "Pytest"]
    };
  }

  // Parse raw job description into structured object
  analyzeJob(rawText, jobMeta = {}) {
    const text = rawText || "";
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    // 1. Identify skills mentioned
    const allKnownSkills = [
      ...this.SKILL_DICTIONARY.languages,
      ...this.SKILL_DICTIONARY.frameworks,
      ...this.SKILL_DICTIONARY.databases,
      ...this.SKILL_DICTIONARY.tools
    ];

    const detectedSkills = [];
    allKnownSkills.forEach(skill => {
      const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'i');
      if (regex.test(text) && !detectedSkills.includes(skill)) {
        detectedSkills.push(skill);
      }
    });

    // 2. Identify required vs preferred skills
    const requiredSkills = [];
    const preferredSkills = [];
    
    // Heuristic: Check if mentioned near 'nice to have' or 'preferred'
    const preferredSectionIndex = text.search(/nice to have|preferred qualifications|desired qualifications|plus\b/i);

    detectedSkills.forEach(skill => {
      const skillIdx = text.toLowerCase().indexOf(skill.toLowerCase());
      if (preferredSectionIndex !== -1 && skillIdx >= preferredSectionIndex) {
        preferredSkills.push(skill);
      } else {
        requiredSkills.push(skill);
      }
    });

    // 3. Extract key responsibilities
    const responsibilities = [];
    let inResp = false;
    lines.forEach(line => {
      if (/responsibilities|what you will do|what you'll do|key tasks/i.test(line)) {
        inResp = true;
        return;
      }
      if (inResp && /qualifications|who you are|requirements|about you|benefits/i.test(line)) {
        inResp = false;
        return;
      }
      if (inResp && (line.startsWith('-') || line.startsWith('•') || line.startsWith('*') || /^\d+\./.test(line))) {
        responsibilities.push(line.replace(/^[-•*]|\d+\.\s*/, '').trim());
      }
    });

    // Fallback responsibilities if not formatted in bullets
    if (responsibilities.length === 0) {
      responsibilities.push(
        "Design, develop, and maintain high quality software features.",
        "Collaborate with cross-functional team members and stakeholders.",
        "Write clean, tested, and maintainable code adhering to best practices."
      );
    }

    // 4. Education & Experience requirements
    let educationReq = "Bachelor's degree in Computer Science, Information Systems, or related field (or equivalent practical experience)";
    if (/master/i.test(text)) educationReq = "Master's or Bachelor's degree in relevant discipline";
    if (/high school/i.test(text)) educationReq = "High school diploma or equivalent";

    let experienceReq = "Entry-level or internship experience with foundational software principles";
    const expMatch = text.match(/(\d+)\+?\s*years?(?:\s*of)?\s*experience/i);
    if (expMatch) {
      experienceReq = `${expMatch[1]}+ years of relevant experience`;
    }

    // 5. Important phrases & keywords
    const keywords = [
      ...detectedSkills,
      "Code Review", "Agile", "Unit Testing", "Debugging", "Cross-Functional", "Performance Optimization"
    ].filter(k => text.toLowerCase().includes(k.toLowerCase()));

    return {
      id: jobMeta.id || "job_" + Date.now(),
      title: jobMeta.title || "Software Engineering Role",
      company: jobMeta.company || "Target Company",
      location: jobMeta.location || "Remote / Hybrid",
      employmentType: jobMeta.employmentType || "Full-Time",
      salary: jobMeta.salary || "Competitive",
      url: jobMeta.url || "",
      recruiter: jobMeta.recruiter || "",
      description: text,
      skills: {
        all: detectedSkills,
        required: requiredSkills,
        preferred: preferredSkills
      },
      responsibilities: responsibilities.slice(0, 6),
      educationRequirement: educationReq,
      experienceRequirement: experienceReq,
      keywords: Array.from(new Set(keywords)),
      companyInfo: jobMeta.companyInfo || {
        industry: "Technology",
        website: "https://example.com",
        description: "An innovative company focused on modern digital workflows."
      }
    };
  }

  // Calculate Profile-to-Job Alignment & categorized insights
  computeMatch(profile, job) {
    if (!profile || !job) {
      return { overall: 0, breakdown: {}, strong: [], attention: [], gaps: [], keywords: {} };
    }

    const userSkills = [
      ...(profile.skills?.technical || []),
      ...(profile.skills?.soft || [])
    ].map(s => s.toLowerCase());

    const jobSkills = (job.skills?.all || []).map(s => s.toLowerCase());
    const jobKeywords = (job.keywords || []).map(k => k.toLowerCase());

    // 1. Matched skills
    const strongMatches = [];
    const attentionItems = [];
    const gapItems = [];

    (job.skills?.all || []).forEach(skill => {
      const sLower = skill.toLowerCase();
      const isPresentInProfile = userSkills.includes(sLower) || 
        userSkills.some(us => us.includes(sLower) || sLower.includes(us));

      if (isPresentInProfile) {
        strongMatches.push(skill);
      } else {
        const isRequired = (job.skills?.required || []).map(r => r.toLowerCase()).includes(sLower);
        if (isRequired) {
          attentionItems.push({
            skill: skill,
            message: `${skill} is listed in the job description but is not currently shown in your profile.`
          });
        } else {
          gapItems.push({
            skill: skill,
            message: `${skill} is requested as a plus/preferred skill and was not found in the provided profile.`
          });
        }
      }
    });

    // 2. Score breakdown calculations
    // Skills alignment: weight 45%
    const totalJobSkills = Math.max(job.skills?.all?.length || 1, 1);
    const skillsRatio = strongMatches.length / totalJobSkills;
    const skillsScore = Math.min(Math.round(skillsRatio * 100), 100);

    // Experience alignment: weight 25%
    const hasExp = (profile.experience || []).length > 0;
    const experienceScore = hasExp ? 88 : 60;

    // Education alignment: weight 15%
    const hasEdu = (profile.education || []).length > 0;
    const educationScore = hasEdu ? 92 : 70;

    // Projects alignment: weight 15%
    const hasProjects = (profile.projects || []).length > 0;
    const projectsScore = hasProjects ? 85 : 55;

    // Composite alignment score (Internal alignment metric, not a hiring prediction)
    const compositeScore = Math.min(
      Math.round((skillsScore * 0.45) + (experienceScore * 0.25) + (educationScore * 0.15) + (projectsScore * 0.15)),
      98
    );

    // 3. Keyword analysis categorization
    const kwPresent = [];
    const kwCouldBeClearer = [];
    const kwNotFound = [];

    (job.keywords || []).forEach(kw => {
      const kwLower = kw.toLowerCase();
      const inSkills = userSkills.includes(kwLower);
      const inProfileText = JSON.stringify(profile).toLowerCase().includes(kwLower);

      if (inSkills) {
        kwPresent.push(kw);
      } else if (inProfileText) {
        kwCouldBeClearer.push(kw);
      } else {
        kwNotFound.push(kw);
      }
    });

    return {
      overall: compositeScore,
      label: "Profile-to-job alignment",
      disclaimer: "This reflects internal alignment between your provided profile and the job posting. It is not an employer hiring prediction.",
      breakdown: {
        skills: skillsScore,
        experience: experienceScore,
        education: educationScore,
        projects: projectsScore
      },
      strong: strongMatches,
      attention: attentionItems,
      gaps: gapItems,
      keywords: {
        present: kwPresent,
        couldBeClearer: kwCouldBeClearer,
        notFound: kwNotFound
      }
    };
  }
}

window.applypilotAnalyzer = new ApplyPilotAnalyzer();
