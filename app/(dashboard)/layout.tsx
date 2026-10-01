"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { satStorage } from "@/lib/storage/sat-storage";
import { UserAccount } from "@/lib/types/sat";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = satStorage.getCurrentUser();
    setCurrentUser(user);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        Checking access credentials...
      </div>
    );
  }

  // Strict Role Protection: Block Students from Teacher Portal
  if (currentUser && currentUser.role === "student") {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 border-rose-500/30 bg-slate-900/90 text-center space-y-4 shadow-2xl">
          <div className="h-14 w-14 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="h-8 w-8" />
          </div>

          <h1 className="text-xl font-extrabold text-white">
            Access Denied: Teacher Account Required
          </h1>

          <p className="text-xs text-slate-300 leading-relaxed">
            You are currently logged in as a student (<strong className="text-white">{currentUser.name}</strong>). Students are not permitted to enter the teacher dashboard or gradebook.
          </p>

          <div className="pt-2 flex flex-col gap-2">
            <Button asChild variant="gradient" className="text-xs py-5 font-bold">
              <Link href="/hw">Go to Student Portal</Link>
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                satStorage.logoutUser();
                window.location.href = "/";
              }}
              className="text-xs border-slate-700 text-slate-400 hover:text-white"
            >
              Sign Out / Switch Account
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <DashboardSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
