"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Target,
  FileEdit,
  FileText,
  MessageSquare,
  GraduationCap,
  Building2,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Copy,
  Download,
  Sparkles,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

export default function ApplicationWorkspacePage() {
  const params = useParams();
  const applicationId = params?.id as string;
  const [activeTab, setActiveTab] = useState("analysis");
  const [acceptedDiffs, setAcceptedDiffs] = useState<Record<string, boolean>>({
    diff1: true,
  });

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const toggleDiff = (id: string) => {
    setAcceptedDiffs((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
    toast.success("Diff preference updated");
  };

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="space-y-1">
          <Link
            href="/applications"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-1 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Applications
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Graduate Software Engineer
            </h1>
            <Badge variant="default" className="text-xs">
              Stripe • London (Hybrid)
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-600/10 border border-blue-500/20 text-xs font-semibold text-blue-400">
            <Target className="h-4 w-4" />
            <span>88% Match</span>
          </div>
          <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => toast.success("Application saved!")}>
            Save Status
          </Button>
        </div>
      </div>

      {/* Main Workspace Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="overflow-x-auto pb-1">
          <TabsList className="bg-slate-900/90 border border-slate-800 p-1">
            <TabsTrigger value="analysis" className="gap-1.5 text-xs sm:text-sm">
              <Target className="h-4 w-4" />
              Match Analysis & Gaps
            </TabsTrigger>
            <TabsTrigger value="tailor-cv" className="gap-1.5 text-xs sm:text-sm">
              <Sparkles className="h-4 w-4 text-blue-400" />
              Tailored CV (Diff View)
            </TabsTrigger>
            <TabsTrigger value="cv-editor" className="gap-1.5 text-xs sm:text-sm">
              <FileEdit className="h-4 w-4" />
              CV Editor & ATS Templates
            </TabsTrigger>
            <TabsTrigger value="cover-letter" className="gap-1.5 text-xs sm:text-sm">
              <FileText className="h-4 w-4" />
              Cover Letter
            </TabsTrigger>
            <TabsTrigger value="answers" className="gap-1.5 text-xs sm:text-sm">
              <MessageSquare className="h-4 w-4" />
              Application Answers
            </TabsTrigger>
            <TabsTrigger value="interview" className="gap-1.5 text-xs sm:text-sm">
              <GraduationCap className="h-4 w-4" />
              Interview Prep
            </TabsTrigger>
            <TabsTrigger value="company" className="gap-1.5 text-xs sm:text-sm">
              <Building2 className="h-4 w-4" />
              Company Research
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Match Analysis & Gaps */}
        <TabsContent value="analysis" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="p-6 bg-slate-900/60 border-slate-800 md:col-span-1 flex flex-col justify-between">
              <div>
                <div className="text-xs uppercase font-bold text-slate-400 mb-1">
                  Overall Correspondence
                </div>
                <div className="text-4xl font-extrabold text-blue-400 my-2">88%</div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Calculated against required qualifications and employer keywords. This measures profile alignment, not guaranteed hiring decisions.
                </p>
              </div>

              <div className="space-y-3 mt-6 pt-4 border-t border-slate-800">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">Skills (45%)</span>
                    <span className="text-blue-400 font-bold">90%</span>
                  </div>
                  <Progress value={90} className="h-1.5" />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">Experience (25%)</span>
                    <span className="text-blue-400 font-bold">85%</span>
                  </div>
                  <Progress value={85} className="h-1.5" />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">Education (15%)</span>
                    <span className="text-blue-400 font-bold">100%</span>
                  </div>
                  <Progress value={100} className="h-1.5" />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">Projects (15%)</span>
                    <span className="text-blue-400 font-bold">80%</span>
                  </div>
                  <Progress value={80} className="h-1.5" />
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-slate-900/60 border-slate-800 md:col-span-2 space-y-6">
              <div>
                <h3 className="text-base font-semibold text-white mb-3">
                  Match Breakdown & Actionable Gaps
                </h3>
                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-emerald-300">Strong Matches:</span>{" "}
                      <span className="text-slate-300">
                        TypeScript, React, Node.js REST APIs, CI/CD pipelines, and Computer Science degree align directly.
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/20 flex items-start gap-2.5">
                    <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-amber-300">Needs Attention:</span>{" "}
                      <span className="text-slate-300">
                        Docker and Distributed Systems are mentioned in the job post. ApplyPilot highlighted your containerized microservices project in the tailored draft.
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-start gap-2.5">
                    <HelpCircle className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-200">Optional / Preferred:</span>{" "}
                      <span className="text-slate-400">
                        Fintech / Payments API experience is preferred. Highlighted your open-source checkout integration project.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button onClick={() => setActiveTab("tailor-cv")} variant="gradient" className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Review Tailored CV Diff →
                </Button>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 2: Tailored CV Diff View */}
        <TabsContent value="tailor-cv" className="space-y-6">
          <Card className="p-6 bg-slate-900/60 border-slate-800 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-white">Side-by-Side Diff Inspector</h3>
                <p className="text-xs text-slate-400">
                  Rewritten bullet points grounded strictly in your verified profile facts.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={() => setActiveTab("cv-editor")}>
                  Full CV Editor
                </Button>
              </div>
            </div>

            {/* Diff Comparison Card */}
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Experience • Software Engineer Intern
                  </span>
                  <Badge variant={acceptedDiffs.diff1 ? "success" : "outline"} className="text-[10px]">
                    {acceptedDiffs.diff1 ? "Accepted" : "Original"}
                  </Badge>
                </div>

                <div className="grid md:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 rounded-lg bg-red-950/10 border border-red-500/20 text-slate-300">
                    <div className="text-[10px] font-bold text-red-400 mb-1">ORIGINAL</div>
                    &quot;Built backend endpoints with Node.js and improved database speeds.&quot;
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-950/10 border border-emerald-500/20 text-slate-200">
                    <div className="text-[10px] font-bold text-emerald-400 mb-1">TAILORED (MATCHES EMPLOYER KEYWORDS)</div>
                    &quot;Architected resilient REST API endpoints in TypeScript/Node.js and optimized PostgreSQL query execution, reducing latency by 28%.&quot;
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-blue-950/20 border border-blue-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="text-slate-300">
                    <span className="font-semibold text-blue-400">Why changed:</span> Aligned technical verbs and highlighted PostgreSQL optimization directly referenced in your verified profile.
                  </div>
                  <Button
                    size="sm"
                    variant={acceptedDiffs.diff1 ? "secondary" : "gradient"}
                    className="h-7 text-xs shrink-0"
                    onClick={() => toggleDiff("diff1")}
                  >
                    {acceptedDiffs.diff1 ? "Revert to Original" : "Accept Suggestion"}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Tab 3: CV Editor & ATS Templates */}
        <TabsContent value="cv-editor" className="space-y-6">
          <Card className="p-6 bg-slate-900/60 border-slate-800 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-white">ATS Resume Preview & Templates</h3>
                <p className="text-xs text-slate-400">
                  Select between ATS-tested layouts and export standard PDF.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="gradient" className="gap-2" onClick={() => toast.success("Exporting ATS-compliant PDF...")}>
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>
              </div>
            </div>

            <div className="p-8 rounded-xl bg-white text-slate-900 shadow-xl max-w-2xl mx-auto space-y-6 text-sm font-sans">
              <div className="text-center border-b pb-4 border-slate-200">
                <h2 className="text-xl font-bold uppercase tracking-wide">Alex Morgan</h2>
                <p className="text-xs text-slate-600 mt-1">
                  London, UK • alex.morgan@email.com • linkedin.com/in/alexmorgan • github.com/alexmorgan
                </p>
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-1 mb-2">
                  Education
                </h4>
                <div className="flex justify-between font-semibold text-xs">
                  <span>B.Sc. in Computer Science (First Class Honours)</span>
                  <span>2022 – 2026</span>
                </div>
                <div className="text-xs text-slate-600">University College London</div>
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-1 mb-2">
                  Technical Experience
                </h4>
                <div className="flex justify-between font-semibold text-xs">
                  <span>Software Engineer Intern — CloudScale</span>
                  <span>Jun 2025 – Sep 2025</span>
                </div>
                <ul className="list-disc list-inside text-xs text-slate-700 mt-1 space-y-1">
                  <li>Architected resilient REST API endpoints in TypeScript/Node.js and optimized PostgreSQL queries.</li>
                  <li>Built responsive React/Next.js dashboard interfaces with automated CI/CD pipeline tests.</li>
                </ul>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Tab 4: Cover Letter */}
        <TabsContent value="cover-letter" className="space-y-6">
          <Card className="p-6 bg-slate-900/60 border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-semibold text-white">Targeted Cover Letter</h3>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                onClick={() =>
                  handleCopy(
                    "Dear Hiring Team,\n\nI am writing to express my strong enthusiasm for the Graduate Software Engineer role at Stripe...",
                    "Cover Letter"
                  )
                }
              >
                <Copy className="h-3.5 w-3.5" />
                Copy Text
              </Button>
            </div>
            <div className="p-6 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 leading-relaxed space-y-3">
              <p>Dear Stripe Engineering Team,</p>
              <p>
                I am writing to express my strong enthusiasm for the Graduate Software Engineer position at Stripe in London. Having closely followed Stripe&apos;s developer-first payments infrastructure, I am excited by the prospect of contributing my full-stack TypeScript and backend API experience to your engineering organization.
              </p>
              <p>
                During my internship at CloudScale, I architected resilient TypeScript and Node.js REST services that reduced database query latency by 28%. Additionally, my capstone project focused on distributed transaction reconciliation, giving me hands-on familiarity with idempotent API design.
              </p>
              <p>
                Thank you for your time and consideration. I welcome the opportunity to discuss how my background aligns with your engineering goals.
              </p>
              <p>Sincerely,<br />Alex Morgan</p>
            </div>
          </Card>
        </TabsContent>

        {/* Tab 5: Application Answers */}
        <TabsContent value="answers" className="space-y-6">
          <Card className="p-6 bg-slate-900/60 border-slate-800 space-y-4">
            <h3 className="text-base font-semibold text-white pb-3 border-b border-slate-800">
              Application Questions & Answers
            </h3>
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="font-semibold text-blue-400">Why do you want to work at Stripe?</div>
                <p className="text-slate-300 leading-relaxed">
                  Stripe sets the global standard for high-reliability API design. My passion lies in building reliable systems with TypeScript and PostgreSQL, and I want to begin my career solving financial infrastructure scalability challenges alongside Stripe&apos;s world-class engineering team.
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Tab 6: Interview Prep */}
        <TabsContent value="interview" className="space-y-6">
          <Card className="p-6 bg-slate-900/60 border-slate-800 space-y-4">
            <h3 className="text-base font-semibold text-white pb-3 border-b border-slate-800">
              STAR Method Interview Questions
            </h3>
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3 text-xs">
              <div className="font-semibold text-purple-400">
                &quot;Describe a time when you had to optimize a slow backend query or service.&quot;
              </div>
              <div className="grid sm:grid-cols-4 gap-2 text-[11px]">
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="font-bold text-blue-400 block mb-1">SITUATION</span>
                  API endpoints during high load were timing out at CloudScale.
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="font-bold text-indigo-400 block mb-1">TASK</span>
                  Profile database query bottlenecks without causing downtime.
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="font-bold text-purple-400 block mb-1">ACTION</span>
                  Added composite indexes in PostgreSQL and implemented Redis cache.
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="font-bold text-emerald-400 block mb-1">RESULT</span>
                  Decreased endpoint p99 response times from 850ms to 95ms.
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Tab 7: Company Research */}
        <TabsContent value="company" className="space-y-6">
          <Card className="p-6 bg-slate-900/60 border-slate-800 space-y-4">
            <h3 className="text-base font-semibold text-white pb-3 border-b border-slate-800">
              Company Brief: Stripe
            </h3>
            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                <span className="font-semibold text-blue-400">Key Focus Areas:</span>
                <p className="text-slate-400">
                  Financial infrastructure for the internet, global payment orchestration, AI monetization, and billing automation.
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
