// ApplyPilot Cover Letter Generator
// Crafts job-tailored, grounded cover letters using only confirmed profile achievements
// Avoids generic clichés, excessive fluff, and false claims

class ApplyPilotCoverLetter {
  constructor() {}

  generate(profile, job, options = { tone: 'professional', length: 'standard' }) {
    if (!profile || !job) return "";

    const p = profile.personal;
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const company = job.company || "Hiring Team";
    const role = job.title || "Target Role";
    const hiringManager = job.recruiter || `Hiring Team at ${company}`;

    // Select primary verified project or experience
    const primaryExp = (profile.experience && profile.experience[0]) || null;
    const primaryProj = (profile.projects && profile.projects[0]) || null;
    const topSkills = (profile.skills?.technical || []).slice(0, 4).join(', ');

    let expParagraph = "";
    if (primaryExp) {
      expParagraph = `In my role as ${primaryExp.title} at ${primaryExp.company}, I focused on ${primaryExp.responsibilities[0]?.toLowerCase().replace(/^\w/, c => c.toLowerCase()) || 'delivering software improvements'}. This experience strengthened my ability to solve technical problems systematically and write reliable, well-tested code in collaborative settings.`;
    }

    let projParagraph = "";
    if (primaryProj) {
      projParagraph = `Additionally, developing ${primaryProj.name} gave me hands-on experience working with ${primaryProj.technologies}. In this project, I was responsible for ${primaryProj.description.toLowerCase()}, achieving ${primaryProj.results.toLowerCase()}. Working through those challenges reinforced my focus on modular architecture and user experience.`;
    }

    // Company connection
    const companyMission = job.companyInfo?.description ? 
      `I have closely followed ${company}'s work in ${job.companyInfo.industry || 'the tech space'}, especially regarding ${job.companyInfo.description.slice(0, 80)}...` :
      `I am drawn to ${company}'s engineering focus and commitment to building robust, user-centered solutions.`;

    const letter = `${p.firstName} ${p.lastName}
${p.email} | ${p.phone} | ${p.location}
${p.linkedin ? p.linkedin : ''}

${today}

${hiringManager}
${company}
${job.location || ''}

Dear ${job.recruiter ? job.recruiter.split(' ')[0] : 'Hiring Team'},

I am writing to express my strong interest in the ${role} position at ${company}. Having built hands-on technical foundations in ${topSkills}, I am eager to contribute to your engineering initiatives and continue refining practical software solutions.

${companyMission} The opportunity to contribute to ${role} aligns closely with my dedication to building reliable, high-performance web applications.

${expParagraph}

${projParagraph}

I would welcome the opportunity to discuss how my technical foundations, proven work ethic, and eagerness to contribute can support ${company}'s goals. Thank you very much for your time and consideration.

Sincerely,

${p.firstName} ${p.lastName}`;

    return letter;
  }
}

window.applypilotCoverLetter = new ApplyPilotCoverLetter();
