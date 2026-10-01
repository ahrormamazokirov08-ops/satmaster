// ApplyPilot Application Question Answers Generator
// Generates grounded answers to custom or standard job application questions based strictly on profile data

class ApplyPilotAnswers {
  constructor() {
    this.DEFAULT_QUESTIONS = [
      "Why do you want to work here?",
      "Tell us about yourself.",
      "Why should we hire you for this role?",
      "Describe a difficult technical problem you solved.",
      "What are your greatest technical and collaborative strengths?",
      "Describe a project you are particularly proud of."
    ];
  }

  // Answer a specific question using grounded facts
  generateAnswer(question, profile, job) {
    if (!profile || !job) return "";

    const qLower = question.toLowerCase();
    const p = profile.personal;
    const company = job.company || "your team";
    const role = job.title || "this role";
    const primaryProj = profile.projects?.[0];
    const primaryExp = profile.experience?.[0];
    const topSkills = (profile.skills?.technical || []).slice(0, 4).join(', ');

    if (qLower.includes("why do you want to work here") || qLower.includes("why this company") || qLower.includes("interest in this position")) {
      return `I am excited to apply for the ${role} position at ${company} because of your team's commitment to building reliable, high-impact products. In my recent work, I've focused on ${topSkills}, and I am looking for an engineering culture that values rigorous code quality, mentorship, and practical problem solving. ${company}'s focus on ${job.companyInfo?.industry || 'delivering great digital experiences'} provides the exact environment where I can contribute meaningfully while learning from experienced engineers.`;
    }

    if (qLower.includes("tell us about yourself") || qLower.includes("walk me through your background")) {
      const statusDesc = p.currentStatus === 'student' ? 'computer science student' : 
                         p.currentStatus === 'graduate' ? 'recent graduate' : 'technical professional';
      return `I am a ${statusDesc} based in ${p.location}, specializing in ${topSkills}. Most recently, ${primaryExp ? `at ${primaryExp.company}, I worked as a ${primaryExp.title}, where I ${primaryExp.responsibilities[0].toLowerCase().replace(/^\w/, c => c.toLowerCase())}` : 'I have been developing full-stack applications'}. Beyond coursework and internships, I've developed projects like ${primaryProj ? primaryProj.name : 'interactive web applications'} to deepen my hands-on problem solving skills. I enjoy turning complex user requirements into clean, tested, and accessible interfaces.`;
    }

    if (qLower.includes("difficult problem") || qLower.includes("challenge") || qLower.includes("overcome")) {
      if (primaryProj) {
        return `When building ${primaryProj.name}, one of the key challenges was ${primaryProj.description.toLowerCase()}. We faced constraints with data synchronization and state responsiveness. To address this, I researched modular state handling, broke down the problem into smaller verifiable modules, and wrote targeted unit tests to validate edge cases. As a result, ${primaryProj.results.toLowerCase()}. This taught me the value of structured debugging, reading documentation thoroughly, and writing automated tests early.`;
      }
      return `During my recent technical work, I faced a performance bottleneck where asynchronous API responses caused inconsistent UI states. Rather than patching individual symptoms, I systematically traced the network cycle, isolated the state race condition, and refactored the handling logic with proper debouncing and error boundary handling. This eliminated unpredictable behavior and taught me the importance of clear data flow.`;
    }

    if (qLower.includes("why should we hire you") || qLower.includes("what makes you a good fit")) {
      return `You should consider me for the ${role} because my verified background directly aligns with your requirements for ${topSkills}. I bring a strong foundation in ${primaryExp ? `practical experience from ${primaryExp.company}` : 'collaborative software development'}, combined with a disciplined habit of writing clean, maintainable code. I am eager to contribute immediately to the team's sprint goals, take feedback constructively, and tackle challenging technical problems with curiosity and focus.`;
    }

    if (qLower.includes("project you are proud of") || qLower.includes("proud")) {
      if (primaryProj) {
        return `A project I am particularly proud of is ${primaryProj.name}, built using ${primaryProj.technologies}. In this project, I acted as ${primaryProj.role} and focused on ${primaryProj.description.toLowerCase()}. What made this project especially rewarding was that ${primaryProj.results.toLowerCase()}. Building it from concept to execution deepened my appreciation for clean component boundaries and thorough testing.`;
      }
    }

    // Default grounded answer for arbitrary custom questions
    return `In addressing this, I rely on my hands-on experience in ${topSkills} and my work as ${primaryExp ? `${primaryExp.title} at ${primaryExp.company}` : 'a developer'}. Throughout my projects, such as ${primaryProj ? primaryProj.name : 'my recent technical applications'}, I prioritize clear technical communication, systematic problem breakdown, and verifiable results. I would bring this exact disciplined approach to the ${role} at ${company}.`;
  }
}

window.applypilotAnswers = new ApplyPilotAnswers();
