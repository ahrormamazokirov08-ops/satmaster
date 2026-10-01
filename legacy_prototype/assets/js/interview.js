// ApplyPilot Interview Preparation & Interactive Simulator
// Generates role-specific questions and simulates interactive mock interviews with STAR-based objective feedback

class ApplyPilotInterview {
  constructor() {}

  // Generate question sets tailored to job & profile
  generateQuestionSet(profile, job) {
    if (!profile || !job) return { jobQuestions: [], profileQuestions: [], techQuestions: [], behavioralQuestions: [], candidateQuestions: [] };

    const role = job.title || "Target Role";
    const company = job.company || "Target Company";
    const reqSkills = job.skills?.required || ["React", "JavaScript", "Git"];
    const primaryProj = profile.projects?.[0]?.name || "your main project";

    return {
      jobQuestions: [
        `What specifically interests you about the ${role} position at ${company}?`,
        `How do you think your background prepares you for our current frontend/infrastructure priorities?`,
        `How do you handle ambiguous requirements when developing a new feature on a tight deadline?`
      ],
      profileQuestions: [
        `In your resume, you highlighted ${primaryProj}. What was the most significant technical hurdle you overcame on that project?`,
        `Walk us through a time you had to review a peer's code or receive critical feedback on your pull request.`,
        `You've worked with ${reqSkills.slice(0, 2).join(' and ')}. What best practices do you follow to ensure your code is maintainable?`
      ],
      techQuestions: [
        `How does asynchronous state management work in modern web applications, and how do you prevent race conditions?`,
        `Explain the difference between optimistic UI updates and traditional pessimistic server-driven state updates.`,
        `When optimizing web performance, what metrics and browser developer tools do you consult first?`
      ],
      behavioralQuestions: [
        `Tell me about a time you had a disagreement with a team member over an implementation approach. How did you resolve it?`,
        `Describe a situation where a project deliverable was delayed. What proactive steps did you take?`,
        `Can you give an example of how you prioritized multiple competing academic or professional deadlines?`
      ],
      candidateQuestions: [
        `What does a typical day look like for an engineer in this team during an active sprint?`,
        `How does the team approach testing, automated code reviews, and production deployments?`,
        `What are the most significant technical initiatives the team is aiming to accomplish over the next two quarters?`,
        `What opportunities for mentorship and cross-functional collaboration exist for junior engineers/interns?`
      ]
    };
  }

  // Evaluate candidate answer objectively (Relevance, Clarity, Structure, Specificity)
  evaluateAnswer(question, answer, job) {
    if (!answer || answer.trim().length < 20) {
      return {
        score: 40,
        relevance: "Needs improvement",
        clarity: "Answer is too brief to evaluate thoroughly.",
        structure: "No clear beginning, action, or outcome structure.",
        specificity: "Lacks concrete examples or metrics.",
        suggestions: "Expand on specific actions you personally took and mention a concrete result or what you learned."
      };
    }

    const wordCount = answer.trim().split(/\s+/).length;
    const lower = answer.toLowerCase();

    // Check STAR components (Situation/Task, Action, Result)
    const hasAction = /i built|i designed|i developed|i researched|i implemented|i led|i created|i resolved|my approach was/i.test(lower);
    const hasResult = /as a result|resulting in|which improved|successfully|achieved|reduced|learned that|outcome/i.test(lower);
    const hasTechnicalDetail = /because|testing|architecture|debug|performance|modular|component|data|api/i.test(lower);

    let score = 70;
    if (wordCount >= 40 && wordCount <= 180) score += 10;
    if (hasAction) score += 10;
    if (hasResult) score += 10;

    let structureFeedback = "Good narrative flow.";
    if (hasAction && hasResult) {
      structureFeedback = "Strong STAR structure: Clearly states the context, the personal actions you executed, and the resulting outcome.";
    } else if (hasAction && !hasResult) {
      structureFeedback = "Moderate structure: Good explanation of actions taken, but consider closing with the quantifiable impact or lesson learned.";
    } else {
      structureFeedback = "Structure could be sharper: Try using the STAR method (Situation, Task, Action, Result).";
    }

    let specificityFeedback = hasTechnicalDetail ? 
      "Concrete technical focus with good terminology." : 
      "Slightly general. Include 1-2 specific tools or measurable parameters to make your answer more memorable.";

    return {
      score: Math.min(score, 96),
      relevance: "Directly addresses the question.",
      clarity: wordCount > 200 ? "A bit wordy. Aim for 90-140 words in verbal responses." : "Clear, direct, and easy to follow.",
      structure: structureFeedback,
      specificity: specificityFeedback,
      suggestions: !hasResult ? "Add a concluding sentence detailing the positive result or key takeaway." : "Strong foundation! Keep your delivery confident and conversational."
    };
  }
}

window.applypilotInterview = new ApplyPilotInterview();
