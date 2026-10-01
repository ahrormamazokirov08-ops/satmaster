import Link from "next/link";
import { Plus, Briefcase, Search, Filter, ArrowRight, Clock, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const sampleApplications = [
  {
    id: "app-1",
    role: "Graduate Software Engineer",
    company: "Stripe",
    location: "London, UK (Hybrid)",
    score: 88,
    status: "interview",
    date: "Sep 21, 2026",
    notes: "Technical phone screen scheduled for next Tuesday.",
  },
  {
    id: "app-2",
    role: "Frontend Developer (React / Next.js)",
    company: "Linear",
    location: "Remote",
    score: 92,
    status: "preparing",
    date: "Sep 23, 2026",
    notes: "Tailoring CV bullet points to emphasize Next.js App Router.",
  },
  {
    id: "app-3",
    role: "Associate Product Analyst",
    company: "Revolut",
    location: "London, UK (On-site)",
    score: 79,
    status: "applied",
    date: "Sep 18, 2026",
    notes: "Submitted via company careers page with tailored cover letter.",
  },
  {
    id: "app-4",
    role: "Junior Full Stack Engineer",
    company: "Monzo Bank",
    location: "London, UK (Hybrid)",
    score: 84,
    status: "saved",
    date: "Sep 15, 2026",
    notes: "Need to review missing PostgreSQL keywords in profile.",
  },
];

const kanbanColumns = [
  { id: "saved", title: "Saved / Exploring", color: "text-slate-400" },
  { id: "preparing", title: "Preparing & Tailoring", color: "text-blue-400" },
  { id: "applied", title: "Applied", color: "text-indigo-400" },
  { id: "interview", title: "Interviewing", color: "text-amber-400" },
  { id: "offer", title: "Offer Received", color: "text-emerald-400" },
];

export default function ApplicationsPage() {
  return (
    <div className="space-y-8 animate-in fade-in-0 duration-300">
      <PageHeader
        heading="Applications & Tracker"
        description="Manage all your job vacancies, match analyses, and application stages in one place."
      >
        <Button asChild variant="gradient" className="gap-2 shadow-md shadow-blue-500/20">
          <Link href="/applications/new">
            <Plus className="h-4 w-4" />
            Add Job to Tailor
          </Link>
        </Button>
      </PageHeader>

      <Tabs defaultValue="list" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <TabsList className="bg-slate-900 border border-slate-800">
            <TabsTrigger value="list">List View</TabsTrigger>
            <TabsTrigger value="kanban">Kanban Pipeline</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <Input placeholder="Search applications..." className="pl-9 h-9" />
            </div>
          </div>
        </div>

        {/* List View */}
        <TabsContent value="list" className="space-y-3">
          {sampleApplications.map((app) => (
            <Card
              key={app.id}
              className="p-5 bg-slate-900/60 border-slate-800 hover:border-slate-700 transition-all"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <h3 className="text-base font-semibold text-white">
                      {app.role}
                    </h3>
                    <Badge
                      variant={
                        app.status === "interview"
                          ? "warning"
                          : app.status === "applied"
                          ? "default"
                          : "secondary"
                      }
                      className="capitalize text-xs"
                    >
                      {app.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="text-slate-300 font-medium">{app.company}</span>
                    <span>•</span>
                    <span>{app.location}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-slate-500">
                      <Clock className="h-3 w-3" />
                      {app.date}
                    </span>
                  </div>
                  {app.notes && (
                    <p className="text-xs text-slate-400 mt-2 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60 inline-block">
                      💡 {app.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between md:justify-end gap-5 pt-3 md:pt-0 border-t md:border-t-0 border-slate-800">
                  <div className="text-left md:text-right">
                    <div className="flex items-center md:justify-end gap-1.5 text-sm font-bold text-blue-400">
                      <Target className="h-4 w-4" />
                      {app.score}% Match
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Skills & Experience Aligned
                    </div>
                  </div>
                  <Button asChild size="sm" variant="gradient" className="gap-1.5 text-xs">
                    <Link href={`/applications/${app.id}`}>
                      Workspace
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>

        {/* Kanban Board View */}
        <TabsContent value="kanban" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4 overflow-x-auto pb-4">
            {kanbanColumns.map((col) => {
              const colApps = sampleApplications.filter((a) =>
                col.id === "saved"
                  ? a.status === "saved"
                  : col.id === "preparing"
                  ? a.status === "preparing"
                  : col.id === "applied"
                  ? a.status === "applied"
                  : col.id === "interview"
                  ? a.status === "interview"
                  : a.status === "offer"
              );

              return (
                <div
                  key={col.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 min-w-[240px] flex flex-col"
                >
                  <div className="flex items-center justify-between mb-3 px-1">
                    <span className={`text-xs font-bold uppercase tracking-wider ${col.color}`}>
                      {col.title}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                      {colApps.length}
                    </span>
                  </div>

                  <div className="space-y-3 flex-1">
                    {colApps.length === 0 ? (
                      <div className="p-4 rounded-lg border border-dashed border-slate-800 text-center text-xs text-slate-500">
                        No jobs in this stage
                      </div>
                    ) : (
                      colApps.map((app) => (
                        <Link
                          key={app.id}
                          href={`/applications/${app.id}`}
                          className="block p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-blue-500/40 hover:bg-slate-850 transition-all space-y-2 group"
                        >
                          <div className="font-semibold text-xs text-white group-hover:text-blue-400 transition-colors">
                            {app.role}
                          </div>
                          <div className="text-[11px] text-slate-400 flex justify-between">
                            <span>{app.company}</span>
                            <span className="font-bold text-blue-400">{app.score}%</span>
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
