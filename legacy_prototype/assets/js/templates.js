// ApplyPilot ATS-Friendly Resume Templates & PDF Export
// Generates clean semantic HTML with 3 distinct ATS-compliant templates: Classic, Modern, Academic

class ApplyPilotTemplates {
  constructor() {}

  render(profile, templateName = 'modern', tailoredData = null) {
    if (!profile) return "<div>No profile data found.</div>";

    switch (templateName) {
      case 'classic':
        return this._renderClassic(profile, tailoredData);
      case 'academic':
        return this._renderAcademic(profile, tailoredData);
      case 'modern':
      default:
        return this._renderModern(profile, tailoredData);
    }
  }

  _renderHeader(p) {
    const links = [
      p.email ? `<a href="mailto:${p.email}">${p.email}</a>` : null,
      p.phone ? `<span>${p.phone}</span>` : null,
      p.location ? `<span>${p.location}</span>` : null,
      p.linkedin ? `<a href="${p.linkedin}" target="_blank">LinkedIn</a>` : null,
      p.github ? `<a href="${p.github}" target="_blank">GitHub</a>` : null,
      p.portfolio ? `<a href="${p.portfolio}" target="_blank">Portfolio</a>` : null
    ].filter(Boolean).join(' • ');

    return `
      <div class="resume-header">
        <h1 class="candidate-name">${p.firstName || ''} ${p.lastName || ''}</h1>
        <div class="candidate-contact">${links}</div>
      </div>
    `;
  }

  _renderSummary(profile, tailoredData) {
    let summaryText = "";
    if (tailoredData && tailoredData.tailoredSummary) {
      // Use suggested if accepted or pending
      summaryText = tailoredData.tailoredSummary.suggested;
    } else {
      const skills = (profile.skills?.technical || []).slice(0, 4).join(', ');
      summaryText = `Dedicated ${profile.personal?.currentStatus || 'technical'} candidate with solid foundations in ${skills}. Eager to leverage hands-on project experience, proactive problem-solving, and disciplined code quality in collaborative engineering teams.`;
    }

    return `
      <div class="resume-section">
        <h2 class="section-title">Professional Summary</h2>
        <p class="summary-body">${summaryText}</p>
      </div>
    `;
  }

  _renderExperience(profile, tailoredData) {
    const exps = profile.experience || [];
    if (exps.length === 0) return '';

    const itemsHtml = exps.map(exp => {
      let bullets = exp.responsibilities || [];
      if (tailoredData && tailoredData.experience) {
        const tailoredExp = tailoredData.experience.find(te => te.id === exp.id);
        if (tailoredExp && tailoredExp.bulletDiffs) {
          bullets = tailoredExp.bulletDiffs.map(b => b.suggested || b.original);
        }
      }

      return `
        <div class="resume-entry">
          <div class="entry-header">
            <div><strong>${exp.title}</strong> — <span class="company-name">${exp.company}</span></div>
            <div class="entry-date">${exp.startDate} - ${exp.endDate}</div>
          </div>
          <ul class="entry-bullets">
            ${bullets.map(b => `<li>${b}</li>`).join('')}
          </ul>
        </div>
      `;
    }).join('');

    return `
      <div class="resume-section">
        <h2 class="section-title">Work Experience</h2>
        ${itemsHtml}
      </div>
    `;
  }

  _renderEducation(profile) {
    const edus = profile.education || [];
    if (edus.length === 0) return '';

    const itemsHtml = edus.map(edu => `
      <div class="resume-entry">
        <div class="entry-header">
          <div><strong>${edu.institution}</strong> — <span>${edu.degree} in ${edu.field}</span></div>
          <div class="entry-date">${edu.startDate} - ${edu.endDate}</div>
        </div>
        ${edu.gpa ? `<div class="entry-sub">GPA: ${edu.gpa}</div>` : ''}
        ${edu.coursework ? `<div class="entry-sub text-muted"><strong>Key Coursework:</strong> ${edu.coursework}</div>` : ''}
      </div>
    `).join('');

    return `
      <div class="resume-section">
        <h2 class="section-title">Education</h2>
        ${itemsHtml}
      </div>
    `;
  }

  _renderProjects(profile, tailoredData) {
    const projs = profile.projects || [];
    if (projs.length === 0) return '';

    const itemsHtml = projs.map(proj => {
      let results = proj.results;
      if (tailoredData && tailoredData.projects) {
        const tp = tailoredData.projects.find(p => p.id === proj.id);
        if (tp && tp.tailoredResults) {
          results = tp.tailoredResults;
        }
      }

      return `
        <div class="resume-entry">
          <div class="entry-header">
            <div><strong>${proj.name}</strong> ${proj.role ? `(${proj.role})` : ''}</div>
            <div class="entry-date">${proj.technologies ? `<em>${proj.technologies}</em>` : ''}</div>
          </div>
          <ul class="entry-bullets">
            <li>${proj.description}</li>
            <li><strong>Outcome:</strong> ${results}</li>
          </ul>
        </div>
      `;
    }).join('');

    return `
      <div class="resume-section">
        <h2 class="section-title">Key Projects</h2>
        ${itemsHtml}
      </div>
    `;
  }

  _renderSkills(profile, tailoredData) {
    let techSkills = profile.skills?.technical || [];
    if (tailoredData && tailoredData.skills?.technical) {
      techSkills = tailoredData.skills.technical;
    }
    const softSkills = profile.skills?.soft || [];
    const languages = profile.skills?.languages || [];

    return `
      <div class="resume-section">
        <h2 class="section-title">Technical & Professional Skills</h2>
        <div class="skills-grid">
          ${techSkills.length > 0 ? `<div><strong>Technical:</strong> ${techSkills.join(', ')}</div>` : ''}
          ${softSkills.length > 0 ? `<div><strong>Core Competencies:</strong> ${softSkills.join(', ')}</div>` : ''}
          ${languages.length > 0 ? `<div><strong>Languages:</strong> ${languages.join(', ')}</div>` : ''}
        </div>
      </div>
    `;
  }

  // Modern Template
  _renderModern(profile, tailoredData) {
    return `
      <div class="resume-document resume-template-modern">
        ${this._renderHeader(profile.personal)}
        ${this._renderSummary(profile, tailoredData)}
        ${this._renderEducation(profile)}
        ${this._renderExperience(profile, tailoredData)}
        ${this._renderProjects(profile, tailoredData)}
        ${this._renderSkills(profile, tailoredData)}
      </div>
    `;
  }

  // Classic Template
  _renderClassic(profile, tailoredData) {
    return `
      <div class="resume-document resume-template-classic">
        ${this._renderHeader(profile.personal)}
        <hr class="classic-divider"/>
        ${this._renderSummary(profile, tailoredData)}
        ${this._renderEducation(profile)}
        ${this._renderExperience(profile, tailoredData)}
        ${this._renderProjects(profile, tailoredData)}
        ${this._renderSkills(profile, tailoredData)}
      </div>
    `;
  }

  // Academic Template
  _renderAcademic(profile, tailoredData) {
    return `
      <div class="resume-document resume-template-academic">
        ${this._renderHeader(profile.personal)}
        <hr class="academic-divider"/>
        ${this._renderEducation(profile)}
        ${this._renderProjects(profile, tailoredData)}
        ${this._renderExperience(profile, tailoredData)}
        ${this._renderSkills(profile, tailoredData)}
        ${(profile.awards && profile.awards.length > 0) ? `
          <div class="resume-section">
            <h2 class="section-title">Honors & Academic Awards</h2>
            <ul class="entry-bullets">
              ${profile.awards.map(a => `<li><strong>${a.title}</strong> — ${a.organization} (${a.year})</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `;
  }

  // Trigger print dialog configured for standard clean PDF save
  triggerPrint(elementId = 'resume-preview-content') {
    const printContents = document.getElementById(elementId)?.innerHTML;
    if (!printContents) {
      alert("Unable to locate resume preview container.");
      return;
    }

    const printWindow = window.open('', '_blank', 'width=850,height=1100');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Resume - ${document.title}</title>
          <link rel="stylesheet" href="assets/css/style.css">
          <style>
            body { background: white !important; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111; }
            .resume-document { box-shadow: none !important; margin: 0 auto; width: 100%; max-width: 800px; padding: 0 !important; }
            @page { margin: 15mm; size: auto; }
          </style>
        </head>
        <body>
          ${printContents}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }
}

window.applypilotTemplates = new ApplyPilotTemplates();
