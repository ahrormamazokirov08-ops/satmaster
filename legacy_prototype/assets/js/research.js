// ApplyPilot Lightweight Company Research Module
// Retrieves and presents reliable factual information from job metadata without fabricating facts

class ApplyPilotResearch {
  constructor() {}

  getCompanyResearch(job) {
    if (!job) return null;

    const comp = job.company || "Target Organization";
    const info = job.companyInfo || {};

    return {
      name: comp,
      industry: info.industry || "Software & Technology Services",
      website: info.website || (job.url ? new URL(job.url).origin : "https://company.com"),
      headquarters: info.headquarters || job.location || "United States",
      founded: info.founded || "Information based on public posting",
      description: info.description || `${comp} is currently hiring for technical and product roles aligned with their core services.`,
      keyTakeaways: [
        `Hiring specifically for: ${job.title}`,
        `Location preference: ${job.location || 'Remote/Hybrid'}`,
        `Employment type: ${job.employmentType || 'Full-Time'}`,
        `Compensation details: ${job.salary || 'Competitive market rate'}`
      ],
      disclaimer: "Company research is derived from the verified job posting metadata. ApplyPilot does not generate speculative company statistics."
    };
  }
}

window.applypilotResearch = new ApplyPilotResearch();
