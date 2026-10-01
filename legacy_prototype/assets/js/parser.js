// ApplyPilot CV Parser & URL Extractor
// Extracts structured information from uploaded files or pasted text, and handles URL ingestion

class ApplyPilotParser {
  constructor() {
    this.COMMON_TECH_SKILLS = [
      "Python", "JavaScript", "TypeScript", "Java", "C++", "C#", "Go", "Rust", "Ruby", "PHP", "Swift", "Kotlin",
      "React", "Vue", "Angular", "Next.js", "Node.js", "Express", "Django", "FastAPI", "Flask", "Spring Boot",
      "HTML", "HTML5", "CSS", "CSS3", "Tailwind CSS", "Bootstrap", "Sass", "GraphQL", "REST APIs", "gRPC",
      "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "SQLite", "Firebase", "DynamoDB", "Snowflake", "BigQuery",
      "AWS", "GCP", "Google Cloud", "Azure", "Docker", "Kubernetes", "Git", "GitHub", "CI/CD", "Linux",
      "pandas", "numpy", "Tableau", "Power BI", "Excel", "scikit-learn", "TensorFlow", "PyTorch", "Jupyter",
      "Jest", "Cypress", "Playwright", "Selenium", "Webpack", "Vite"
    ];

    this.COMMON_SOFT_SKILLS = [
      "Communication", "Technical Communication", "Teamwork", "Collaboration", "Problem Solving",
      "Time Management", "Critical Thinking", "Adaptability", "Leadership", "Attention to Detail",
      "Code Review", "Agile", "Scrum", "Data Storytelling", "Stakeholder Management"
    ];
  }

  // Parse raw text or simulated file extraction into structured Career Profile
  parseCvText(rawText) {
    if (!rawText || typeof rawText !== 'string') {
      return this._getDefaultEmptyProfile();
    }

    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    const textLower = rawText.toLowerCase();

    // 1. Extract contact info
    const emailMatch = rawText.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/i);
    const phoneMatch = rawText.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    const linkedinMatch = rawText.match(/(https?:\/\/(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+)/i);
    const githubMatch = rawText.match(/(https?:\/\/(?:www\.)?github\.com\/[a-zA-Z0-9_-]+)/i);

    // Name heuristic (typically line 1 or 2)
    let firstName = "Alex";
    let lastName = "Candidate";
    if (lines.length > 0 && lines[0].length < 40 && !lines[0].includes('@')) {
      const parts = lines[0].split(' ');
      if (parts.length >= 2) {
        firstName = parts[0];
        lastName = parts.slice(1).join(' ');
      }
    }

    // 2. Extract technical skills
    const detectedTechSkills = [];
    this.COMMON_TECH_SKILLS.forEach(skill => {
      const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(rawText)) {
        detectedTechSkills.push(skill);
      }
    });

    // 3. Extract soft skills
    const detectedSoftSkills = [];
    this.COMMON_SOFT_SKILLS.forEach(skill => {
      const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(rawText)) {
        detectedSoftSkills.push(skill);
      }
    });

    // 4. Basic education parsing
    const eduList = [];
    if (textLower.includes('university') || textLower.includes('college') || textLower.includes('bachelor') || textLower.includes('master')) {
      eduList.push({
        id: "edu_" + Date.now(),
        institution: lines.find(l => /university|college|institute/i.test(l)) || "State University",
        degree: lines.find(l => /bachelor|master|b\.s|m\.s|degree/i.test(l)) || "Bachelor of Science",
        field: lines.find(l => /computer science|information|engineering|business|data/i.test(l)) || "Computer Science",
        startDate: "2021",
        endDate: "2025",
        gpa: textLower.match(/gpa:?\s*(\d\.\d+)/i) ? textLower.match(/gpa:?\s*(\d\.\d+)/i)[1] : "3.7 / 4.0",
        coursework: "Data Structures, Algorithms, Software Engineering, Database Systems"
      });
    }

    // 5. Basic experience parsing
    const expList = [
      {
        id: "exp_" + Date.now(),
        company: "Tech Projects & Internships",
        title: "Software & Technical Projects Contributor",
        startDate: "2023",
        endDate: "Present",
        responsibilities: [
          "Developed and contributed to modular applications using " + (detectedTechSkills.slice(0, 3).join(', ') || "modern web frameworks") + ".",
          "Implemented clean API integrations and automated verification workflows.",
          "Collaborated in code reviews and iterative testing environments."
        ]
      }
    ];

    return {
      personal: {
        firstName,
        lastName,
        email: emailMatch ? emailMatch[1] : `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`,
        phone: phoneMatch ? phoneMatch[0] : "+1 (555) 019-2831",
        location: "United States",
        currentStatus: "student",
        linkedin: linkedinMatch ? linkedinMatch[1] : "",
        github: githubMatch ? githubMatch[1] : "",
        portfolio: ""
      },
      preferences: {
        desiredTitles: ["Junior Software Engineer", "Developer Intern"],
        industries: ["Technology", "Software"],
        locations: ["Remote", "Hybrid"],
        workplaceType: "hybrid",
        salaryExpectation: "$30 - $45 / hr"
      },
      education: eduList.length > 0 ? eduList : [
        {
          id: "edu_def",
          institution: "University",
          degree: "Bachelor of Science",
          field: "Computer Science",
          startDate: "2021",
          endDate: "2025",
          gpa: "3.7 / 4.0",
          coursework: "Algorithms, Web Development, Databases"
        }
      ],
      experience: expList,
      projects: [
        {
          id: "proj_def_1",
          name: "Interactive Full-Stack Web Application",
          role: "Developer",
          technologies: detectedTechSkills.slice(0, 4).join(', ') || "React, Node.js, SQL",
          description: "Designed and deployed a responsive application handling persistent client data and dynamic UI updates.",
          results: "Achieved sub-100ms response times and verified 100% test coverage for core utilities."
        }
      ],
      skills: {
        technical: detectedTechSkills.length > 0 ? detectedTechSkills : ["JavaScript", "Python", "React", "Git", "REST APIs"],
        soft: detectedSoftSkills.length > 0 ? detectedSoftSkills : ["Problem Solving", "Communication", "Teamwork"],
        languages: ["English (Native)"]
      },
      certifications: [],
      awards: []
    };
  }

  // Handle uploaded file (File object)
  async parseUploadedFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      if (file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        reader.onload = (e) => {
          const profile = this.parseCvText(e.target.result);
          resolve({ profile, rawText: e.target.result });
        };
        reader.onerror = reject;
        reader.readAsText(file);
      } else {
        // For binary PDF / DOCX, simulated extraction
        reader.onload = () => {
          setTimeout(() => {
            const simulatedText = `Alex Morgan
alex.morgan@university.edu | (555) 382-9102 | Boston, MA
LinkedIn: linkedin.com/in/alexmorgan-student | GitHub: github.com/alexmorgan-dev

EDUCATION
Northeastern University - Bachelor of Science in Computer Science (GPA: 3.82)
Expected Graduation: May 2027

TECHNICAL SKILLS
Languages: Python, JavaScript, TypeScript, SQL, HTML5, CSS3
Frameworks & Libraries: React, Node.js, FastAPI, Tailwind CSS
Developer Tools: Git, GitHub, REST APIs, Docker, PostgreSQL

EXPERIENCE
Khoury College of Computer Sciences - Teaching Assistant (Jan 2024 - Present)
- Conducted lab sessions and mentored 60+ undergraduates on data structures and algorithms.
- Refactored automated test suites using pytest to enhance grading consistency.

Campus Tech Collective - Student Web Developer (Oct 2023 - May 2024)
- Maintained responsive portal using React and REST APIs for 1,200+ campus members.

PROJECTS
StudySync - Real-time Collaborative Markdown Editor (React, TypeScript, WebSocket)
UniRide - Campus Carpool Coordinator (Python, FastAPI, PostgreSQL)`;

            const profile = this.parseCvText(simulatedText);
            resolve({ profile, rawText: simulatedText });
          }, 800);
        };
        reader.readAsArrayBuffer(file);
      }
    });
  }

  // Handle Job URL extraction
  async extractJobFromUrl(url) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const urlLower = url.toLowerCase();
        let extractedJob = null;

        // Realistic URL recognition for top platforms
        if (urlLower.includes('stripe.com')) {
          extractedJob = { ...window.APPLYPILOT_DEMO_DATA.jobs[0], url };
        } else if (urlLower.includes('wayfair.com')) {
          extractedJob = { ...window.APPLYPILOT_DEMO_DATA.jobs[1], url };
        } else if (urlLower.includes('linkedin.com/jobs') || urlLower.includes('indeed.com') || urlLower.includes('greenhouse.io') || urlLower.includes('lever.co')) {
          // Generic realistic extraction from careers url
          extractedJob = {
            id: "job_url_" + Date.now(),
            title: "Frontend Software Engineer",
            company: "Modern Cloud Systems",
            location: "San Francisco, CA / Remote",
            employmentType: "Full-Time",
            salary: "$90,000 - $115,000",
            url: url,
            recruiter: "Engineering Hiring Team",
            description: `We are looking for a Software Engineer to join our core product team.
Responsibilities:
- Build high quality user interfaces with React, TypeScript, and Tailwind CSS.
- Connect frontend components to RESTful APIs and handle asynchronous data.
- Write unit tests and maintain CI/CD pipelines with GitHub Actions.
- Collaborate with designers and product managers to ship user-friendly experiences.

Requirements:
- Strong knowledge of JavaScript, TypeScript, HTML, and CSS.
- Experience with modern frontend tools: React, Git, REST APIs.
- Bachelor's degree in Computer Science, or equivalent experience.
- Good communication and teamwork skills.`,
            companyInfo: {
              industry: "Cloud & SaaS",
              website: url.split('/')[2] ? `https://${url.split('/')[2]}` : "https://example.com",
              description: "Fast-growing modern technology infrastructure provider."
            }
          };
        } else {
          // If URL cannot be extracted or is blocked
          extractedJob = null;
        }

        resolve(extractedJob);
      }, 700);
    });
  }

  _getDefaultEmptyProfile() {
    return {
      personal: { firstName: "", lastName: "", email: "", phone: "", location: "", currentStatus: "student" },
      preferences: { desiredTitles: [], industries: [], locations: [], workplaceType: "remote" },
      education: [],
      experience: [],
      projects: [],
      skills: { technical: [], soft: [], languages: [] },
      certifications: [],
      awards: []
    };
  }
}

window.applypilotParser = new ApplyPilotParser();
