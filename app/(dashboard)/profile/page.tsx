"use client";

import React, { useState } from "react";
import {
  UserCheck,
  Plus,
  Briefcase,
  GraduationCap,
  FolderGit2,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Edit2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function CareerProfilePage() {
  const [skills, setSkills] = useState([
    "TypeScript",
    "React",
    "Next.js",
    "Node.js",
    "PostgreSQL",
    "Tailwind CSS",
    "REST APIs",
    "Git",
    "CI/CD",
  ]);
  const [newSkill, setNewSkill] = useState("");

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkill.trim()) return;
    if (skills.includes(newSkill.trim())) {
      toast.error("Skill already exists in your profile");
      return;
    }
    setSkills([...skills, newSkill.trim()]);
    setNewSkill("");
    toast.success("Skill added to verified profile");
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
    toast.success("Skill removed");
  };

  return (
    <div className="space-y-8 animate-in fade-in-0 duration-300">
      <PageHeader
        heading="Career Profile Command Center"
        description="Your permanent, authentic career record. ApplyPilot uses this as the single source of truth for all job tailoring."
      >
        <Button variant="gradient" size="sm" onClick={() => toast.success("Career profile saved!")}>
          Save Profile
        </Button>
      </PageHeader>

      {/* Grounding Integrity Callout */}
      <div className="p-4 rounded-2xl bg-blue-950/20 border border-blue-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">
              Zero-Fabrication Ground Truth Active
            </h4>
            <p className="text-xs text-slate-400">
              Only skills, experiences, and metrics added here will be referenced when tailoring CVs and generating cover letters.
            </p>
          </div>
        </div>
        <Badge variant="default" className="text-xs shrink-0 self-start sm:self-auto">
          Verified Profile
        </Badge>
      </div>

      <Tabs defaultValue="experience" className="space-y-6">
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="experience" className="gap-2">
            <Briefcase className="h-4 w-4" />
            Experience
          </TabsTrigger>
          <TabsTrigger value="education" className="gap-2">
            <GraduationCap className="h-4 w-4" />
            Education
          </TabsTrigger>
          <TabsTrigger value="skills" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Skills ({skills.length})
          </TabsTrigger>
          <TabsTrigger value="projects" className="gap-2">
            <FolderGit2 className="h-4 w-4" />
            Projects
          </TabsTrigger>
        </TabsList>

        {/* Experience Tab */}
        <TabsContent value="experience" className="space-y-4">
          <Card className="p-6 bg-slate-900/60 border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">Work Experience</h3>
              <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => toast.info("Experience modal ready")}>
                <Plus className="h-3.5 w-3.5" />
                Add Position
              </Button>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-white">Software Engineer Intern</h4>
                  <p className="text-xs text-slate-400">CloudScale • London, UK • Jun 2025 – Sep 2025</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-white">
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                <li>Engineered backend API microservices using Node.js, Express, and PostgreSQL.</li>
                <li>Optimized high-traffic queries, reducing database response latency by 28%.</li>
                <li>Collaborated with senior engineers on continuous integration workflows in GitHub Actions.</li>
              </ul>
            </div>
          </Card>
        </TabsContent>

        {/* Education Tab */}
        <TabsContent value="education" className="space-y-4">
          <Card className="p-6 bg-slate-900/60 border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">Education & Qualifications</h3>
              <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => toast.info("Education modal ready")}>
                <Plus className="h-3.5 w-3.5" />
                Add Degree
              </Button>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <h4 className="text-sm font-semibold text-white">B.Sc. in Computer Science (First Class Honours)</h4>
              <p className="text-xs text-slate-400">University College London • 2022 – 2026</p>
              <p className="text-xs text-slate-400 mt-2">
                Coursework: Data Structures & Algorithms, Distributed Systems, Database Systems, Web Engineering.
              </p>
            </div>
          </Card>
        </TabsContent>

        {/* Skills Tab */}
        <TabsContent value="skills" className="space-y-4">
          <Card className="p-6 bg-slate-900/60 border-slate-800 space-y-6">
            <div>
              <h3 className="text-base font-semibold text-white mb-1">Technical & Soft Skills</h3>
              <p className="text-xs text-slate-400">
                Skills cataloged here are matched against employer job requirements.
              </p>
            </div>

            <form onSubmit={handleAddSkill} className="flex gap-2 max-w-md">
              <Input
                placeholder="e.g. Docker, Python, Figma..."
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                className="h-9 text-xs"
              />
              <Button type="submit" variant="gradient" size="sm" className="h-9">
                Add Skill
              </Button>
            </form>

            <div className="flex flex-wrap gap-2 pt-2">
              {skills.map((skill) => (
                <Badge
                  key={skill}
                  variant="secondary"
                  className="px-3 py-1.5 text-xs text-slate-200 bg-slate-800 border-slate-700 flex items-center gap-2 group"
                >
                  <span>{skill}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    className="text-slate-500 hover:text-red-400 transition-colors"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-4">
          <Card className="p-6 bg-slate-900/60 border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">Portfolio & Independent Projects</h3>
              <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => toast.info("Project modal ready")}>
                <Plus className="h-3.5 w-3.5" />
                Add Project
              </Button>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-white">Fullstack E-Commerce & Checkout Engine</h4>
                <Badge variant="outline" className="text-[10px]">GitHub Repository</Badge>
              </div>
              <p className="text-xs text-slate-300">
                Built a full-stack payments-enabled marketplace with Next.js 14 App Router, PostgreSQL, Prisma, and Stripe SDK.
              </p>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
