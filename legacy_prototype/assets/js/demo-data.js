// ApplyPilot Demo Data
// Realistic profiles and jobs with zero-fabrication guarantees

window.APPLYPILOT_DEMO_DATA = {
  profiles: {
    student: {
      id: "prof_student_1",
      personal: {
        firstName: "Alex",
        lastName: "Morgan",
        email: "alex.morgan@university.edu",
        phone: "+1 (555) 382-9102",
        location: "Boston, MA",
        currentStatus: "student",
        linkedin: "https://linkedin.com/in/alexmorgan-student",
        github: "https://github.com/alexmorgan-dev",
        portfolio: "https://alexmorgan.dev"
      },
      preferences: {
        desiredTitles: ["Software Engineering Intern", "Frontend Developer Intern", "Junior Full-Stack Engineer"],
        industries: ["Technology", "FinTech", "EdTech"],
        locations: ["Boston, MA", "New York, NY", "Remote"],
        workplaceType: "hybrid",
        salaryExpectation: "$35 - $45 / hour"
      },
      education: [
        {
          id: "edu_1",
          institution: "Northeastern University",
          degree: "Bachelor of Science",
          field: "Computer Science",
          startDate: "2023-09",
          endDate: "2027-05",
          gpa: "3.82 / 4.0",
          coursework: "Data Structures & Algorithms, Object-Oriented Design, Web Development, Database Systems, Computer Systems"
        }
      ],
      experience: [
        {
          id: "exp_1",
          company: "Khoury College of Computer Sciences",
          title: "Teaching Assistant - CS Fundamentals",
          startDate: "2024-01",
          endDate: "Present",
          responsibilities: [
            "Conducted weekly lab sessions and office hours for 60+ undergraduate students covering recursive algorithms and data structures.",
            "Graded weekly coding assignments in Python and provided detailed constructive feedback on algorithmic efficiency and code cleanliness.",
            "Collaborated with head professor to refactor unit test suites using pytest, reducing assignment grading discrepancies."
          ]
        },
        {
          id: "exp_2",
          company: "Campus Tech Collective",
          title: "Student Web Developer",
          startDate: "2023-10",
          endDate: "2024-05",
          responsibilities: [
            "Maintained and improved responsive student organization portal using React, HTML5, and CSS3.",
            "Integrated RESTful API endpoints with Node.js backend to facilitate event registration for 1,200+ active campus members.",
            "Refactored legacy form validation logic, eliminating recurring submission drops and improving mobile responsiveness."
          ]
        }
      ],
      projects: [
        {
          id: "proj_1",
          name: "StudySync - Real-time Collaborative Markdown Editor",
          role: "Solo Developer",
          technologies: "React, TypeScript, WebSocket, Node.js, Tailwind CSS",
          description: "Built a browser-based collaborative markdown notebook supporting live multi-cursor editing and room-based synchronization.",
          results: "Tested with 15 concurrent student peers with zero conflict errors; implemented client-side debounce saving to LocalStorage."
        },
        {
          id: "proj_2",
          name: "UniRide - Campus Carpool Coordinator",
          role: "Team Lead (3 developers)",
          technologies: "Python, FastAPI, PostgreSQL, Docker, Git",
          description: "Designed a lightweight ridesharing match algorithm for university students commuting between Boston campus and suburbs.",
          results: "Awarded 2nd Place at HackNEU 2024; wrote comprehensive OpenAPI documentation and automated CI tests via GitHub Actions."
        }
      ],
      skills: {
        technical: ["JavaScript", "TypeScript", "Python", "React", "Node.js", "HTML5", "CSS3", "Git", "REST APIs", "SQL", "PostgreSQL"],
        soft: ["Technical Communication", "Collaborative Problem Solving", "Time Management", "Code Review"],
        languages: ["English (Native)", "Spanish (Conversational)"]
      },
      certifications: [
        { id: "cert_1", name: "Meta Front-End Developer Specialization", issuer: "Coursera / Meta", year: "2024" }
      ],
      awards: [
        { id: "award_1", title: "Dean's Honor List", organization: "Northeastern University", year: "2023, 2024" },
        { id: "award_2", title: "2nd Place Winner", organization: "HackNEU Hackathon", year: "2024" }
      ]
    },

    graduate: {
      id: "prof_grad_1",
      personal: {
        firstName: "Elena",
        lastName: "Rostova",
        email: "elena.rostova@gmail.com",
        phone: "+1 (555) 749-3321",
        location: "Chicago, IL",
        currentStatus: "graduate",
        linkedin: "https://linkedin.com/in/elena-rostova",
        github: "https://github.com/erostova",
        portfolio: "https://elenarostova.me"
      },
      preferences: {
        desiredTitles: ["Junior Data Analyst", "Business Intelligence Analyst", "Associate Product Analyst"],
        industries: ["Finance", "Healthcare", "E-Commerce"],
        locations: ["Chicago, IL", "Remote"],
        workplaceType: "remote",
        salaryExpectation: "$68,000 - $80,000"
      },
      education: [
        {
          id: "edu_g1",
          institution: "University of Illinois Urbana-Champaign",
          degree: "Bachelor of Science",
          field: "Information Sciences & Statistics",
          startDate: "2020-08",
          endDate: "2024-05",
          gpa: "3.75 / 4.0",
          coursework: "Applied Statistics, Database Design, Data Visualization, Business Analytics, Python for Data Science"
        }
      ],
      experience: [
        {
          id: "exp_g1",
          company: "Midwest Logistics Group",
          title: "Supply Chain Analytics Intern",
          startDate: "2023-06",
          endDate: "2023-12",
          responsibilities: [
            "Extracted and cleaned shipment data across 14 distribution centers using SQL and pandas.",
            "Built interactive Tableau dashboards monitoring delivery on-time rates and fuel efficiency metrics for operations leaders.",
            "Automated weekly inventory reporting using Python scripts, saving 4 hours of manual spreadsheet compilation weekly."
          ]
        }
      ],
      projects: [
        {
          id: "proj_g1",
          name: "Chicago Transit On-Time Performance Explorer",
          role: "Lead Analyst",
          technologies: "Python, pandas, SQL, Tableau, Streamlit",
          description: "Analyzed 1.5 million public CTA transit records to isolate weather-related delay factors across Chicago bus routes.",
          results: "Published interactive dashboard cited in university transportation seminar; identified top 5 bottleneck corridors."
        }
      ],
      skills: {
        technical: ["SQL", "Python", "pandas", "Tableau", "Power BI", "Excel (VLOOKUP, Pivot, PowerQuery)", "Data Modeling", "Git"],
        soft: ["Data Storytelling", "Cross-Functional Collaboration", "Critical Thinking", "Stakeholder Presentation"],
        languages: ["English (Fluent)", "Ukrainian (Native)"]
      },
      certifications: [
        { id: "cert_g1", name: "Google Data Analytics Professional Certificate", issuer: "Google", year: "2023" }
      ],
      awards: []
    }
  },

  jobs: [
    {
      id: "job_sample_1",
      title: "Software Engineering Intern - Frontend & Tools",
      company: "Stripe",
      location: "San Francisco, CA / Remote",
      employmentType: "Internship (Summer 2025)",
      salary: "$55 - $65 / hour + housing stipend",
      url: "https://stripe.com/jobs/swe-intern-summer",
      recruiter: "Jordan Ellis (University Talent Acquisition)",
      description: `About the Role:
At Stripe, we are building economic infrastructure for the internet. As a Software Engineering Intern on our Frontend Infrastructure team, you will collaborate with experienced engineers to craft responsive, intuitive, and reliable user interfaces used by millions of businesses worldwide.

What You Will Do:
- Build and maintain performant user-facing web applications using React, TypeScript, and modern CSS architectures.
- Collaborate closely with Product Designers and Backend Engineers to translate wireframes into high-fidelity code.
- Write clean, modular, and well-tested code accompanied by automated unit tests (Jest, React Testing Library).
- Work with REST APIs and GraphQL endpoints to fetch and synchronize financial transaction state.
- Participate in peer code reviews, sprint planning, and engineering design discussions.
- Identify performance bottlenecks and optimize bundle sizes and client-side rendering times.

Who You Are:
- Currently enrolled in a Bachelor's or Master's degree program in Computer Science, Software Engineering, or related technical field, graduating between Dec 2025 and June 2027.
- Solid foundational understanding of computer science principles (data structures, algorithms, object-oriented or functional programming).
- Hands-on experience developing web applications with JavaScript, TypeScript, React, and CSS/HTML5.
- Familiarity with version control systems such as Git and GitHub.
- Experience consuming REST APIs and handling asynchronous data streams.
- Excellent communication skills, curiosity to learn, and passion for delivering great user experiences.

Nice to Have:
- Experience with testing frameworks (Jest, Playwright, or Cypress).
- Experience with Next.js or modern build tools (Vite, Webpack).
- Prior internship or open-source contribution experience.
- Understanding of basic CI/CD workflows and Docker containerization.`,
      companyInfo: {
        industry: "Financial Technology / SaaS Infrastructure",
        website: "https://stripe.com",
        headquarters: "San Francisco, CA & Dublin, Ireland",
        founded: "2010",
        description: "Stripe is a financial infrastructure platform for businesses, powering payments, subscriptions, and global treasury management."
      }
    },

    {
      id: "job_sample_2",
      title: "Junior Data Analyst",
      company: "Wayfair",
      location: "Boston, MA (Hybrid)",
      employmentType: "Full-Time",
      salary: "$72,000 - $82,000 / year",
      url: "https://www.wayfair.com/careers/junior-data-analyst",
      recruiter: "Sarah Lin (Campus Recruitment)",
      description: `Job Summary:
Wayfair's Customer Analytics team is seeking a driven Junior Data Analyst to help transform customer behavioral data into actionable merchandising insights. You will partner with business partners across marketing, catalog, and operations.

Key Responsibilities:
- Write and optimize complex SQL queries across Snowflake and BigQuery data warehouses to extract customer conversion metrics.
- Build, maintain, and automate executive dashboards in Tableau and Looker.
- Conduct exploratory data analysis using Python (pandas, numpy) to identify trends in customer churn and cart abandonment.
- Present findings and strategic recommendations clearly to non-technical stakeholders.
- Partner with data engineering to validate data pipeline integrity and ensure reporting accuracy.

Qualifications:
- Bachelor's degree in Information Systems, Statistics, Economics, Mathematics, Computer Science, or equivalent practical experience.
- Strong proficiency in SQL (joins, window functions, CTEs, aggregation).
- Practical experience with business intelligence visualization tools (Tableau, Power BI, or Looker).
- Working knowledge of Python or R for statistical manipulation and data cleansing.
- Strong analytical mindset with attention to detail and ability to communicate data-driven recommendations.

Preferred:
- Familiarity with Snowflake, Google BigQuery, or AWS Redshift.
- Experience with Git version control for analytics repositories.
- Understanding of e-commerce business KPIs (CAC, LTV, AOV, Conversion Rate).`,
      companyInfo: {
        industry: "E-Commerce / Retail Tech",
        website: "https://wayfair.com",
        headquarters: "Boston, MA",
        founded: "2002",
        description: "Wayfair is a leading online destination for home goods, furniture, and decor with millions of global customers."
      }
    }
  ]
};
