"use client";

import React, { useState } from "react";
import {
  FileEdit,
  Download,
  Eye,
  CheckCircle2,
  Sparkles,
  LayoutTemplate,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { toast } from "sonner";

export default function CvBuilderPage() {
  const [selectedTemplate, setSelectedTemplate] = useState("modern");

  const templates = [
    {
      id: "modern",
      name: "Modern Clean",
      desc: "Sleek contemporary layout with subtle divider rules, perfect for tech, startups, and software engineering roles.",
      badge: "Most Popular",
    },
    {
      id: "classic",
      name: "Classic ATS",
      desc: "Traditional serif format built for strict enterprise ATS parsers, finance, consulting, and corporate roles.",
      badge: "High ATS Pass Rate",
    },
    {
      id: "academic",
      name: "Academic / Research",
      desc: "Emphasizes coursework, thesis research, university honors, and technical publications for students.",
      badge: "For Students & Grads",
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in-0 duration-300">
      <PageHeader
        heading="CV Builder & ATS Templates"
        description="Craft, preview, and export ATS-tested resume versions tailored from your genuine career profile."
      >
        <Button variant="gradient" size="sm" className="gap-2" onClick={() => toast.success("Exporting ATS-Compliant PDF...")}>
          <Download className="h-4 w-4" />
          Export PDF
        </Button>
      </PageHeader>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Template Selector */}
        <div className="space-y-4 lg:col-span-1">
          <h3 className="text-sm font-semibold text-white">Select ATS Layout</h3>
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              onClick={() => {
                setSelectedTemplate(tpl.id);
                toast.info(`Switched to ${tpl.name} template`);
              }}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedTemplate === tpl.id
                  ? "bg-blue-950/30 border-blue-500 shadow-md shadow-blue-500/10"
                  : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-white text-sm">{tpl.name}</span>
                <Badge variant={selectedTemplate === tpl.id ? "default" : "secondary"} className="text-[10px]">
                  {tpl.badge}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{tpl.desc}</p>
            </div>
          ))}
        </div>

        {/* Live Resume Sheet Preview */}
        <Card className="lg:col-span-2 p-6 bg-slate-900/60 border-slate-800">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-300">Live Preview ({selectedTemplate.toUpperCase()} TEMPLATE)</span>
            </div>
            <Badge variant="outline" className="text-xs text-emerald-400 border-emerald-500/30">
              100% ATS Compatible
            </Badge>
          </div>

          <div className="p-8 sm:p-12 rounded-xl bg-white text-slate-900 shadow-2xl max-w-2xl mx-auto space-y-6 text-sm font-sans">
            <div className="text-center border-b pb-4 border-slate-200">
              <h2 className="text-2xl font-bold uppercase tracking-wider text-slate-900">
                Alex Morgan
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                London, UK • alex.morgan@email.com • +44 7700 900077 • linkedin.com/in/alexmorgan
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-1 mb-2">
                Professional Summary
              </h4>
              <p className="text-xs text-slate-700 leading-relaxed">
                Computer Science graduate with hands-on experience developing full-stack applications in TypeScript, React, and PostgreSQL. Demonstrated ability to optimize backend database queries and architect reliable cloud microservices.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-1 mb-2">
                Technical Skills
              </h4>
              <p className="text-xs text-slate-700">
                <strong>Languages:</strong> TypeScript, JavaScript, Python, SQL<br />
                <strong>Frameworks & Tools:</strong> React, Next.js, Node.js, PostgreSQL, Tailwind CSS, Git, Docker
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-1 mb-2">
                Experience
              </h4>
              <div className="flex justify-between font-semibold text-xs text-slate-900">
                <span>Software Engineer Intern — CloudScale</span>
                <span>Jun 2025 – Sep 2025</span>
              </div>
              <ul className="list-disc list-inside text-xs text-slate-700 mt-1 space-y-1">
                <li>Engineered backend REST APIs with Node.js and PostgreSQL, cutting query latency by 28%.</li>
                <li>Created reusable UI components in React and TypeScript for internal customer dashboards.</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
