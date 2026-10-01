"use client";

import React, { useState } from "react";
import {
  Settings,
  CreditCard,
  User,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function SettingsPage() {
  const [name, setName] = useState("Alex Morgan");
  const [email, setEmail] = useState("alex.morgan@email.com");

  return (
    <div className="space-y-8 animate-in fade-in-0 duration-300">
      <PageHeader
        heading="Account & Settings"
        description="Manage your account preferences, authentication details, and billing plan."
      />

      <Tabs defaultValue="account" className="space-y-6">
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="account" className="gap-2">
            <User className="h-4 w-4" />
            Account Details
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Subscription & Billing
          </TabsTrigger>
        </TabsList>

        {/* Account Tab */}
        <TabsContent value="account" className="space-y-4">
          <Card className="p-6 bg-slate-900/60 border-slate-800 space-y-4 max-w-2xl">
            <h3 className="text-base font-semibold text-white">Personal Information</h3>
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Display Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Email Address</label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <Button
              variant="gradient"
              size="sm"
              onClick={() => toast.success("Account settings updated")}
            >
              Save Changes
            </Button>
          </Card>
        </TabsContent>

        {/* Billing Tab (Polar.sh Integration) */}
        <TabsContent value="billing" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
            <Card className="p-6 bg-slate-900/60 border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-white">Current Plan</h3>
                <Badge variant="secondary" className="text-xs">Free Tier</Badge>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Includes 3 tailored job applications per month, standard ATS templates, and community STAR interview question sets.
              </p>
              <div className="pt-2">
                <Button variant="outline" size="sm" className="text-xs w-full" disabled>
                  Active Plan
                </Button>
              </div>
            </Card>

            <Card className="p-6 bg-blue-950/20 border-blue-500/30 space-y-4 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-white">ApplyPilot Pro</h3>
                <Badge variant="default" className="text-xs gap-1">
                  <Sparkles className="h-3 w-3" />
                  Popular
                </Badge>
              </div>
              <div className="text-2xl font-black text-white">$12 <span className="text-xs font-normal text-slate-400">/ month</span></div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Unlimited job tailoring, AI-powered side-by-side diff inspector, ATS PDF downloads, and custom STAR interview evaluation.
              </p>
              <ul className="space-y-1.5 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Unlimited job applications</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Interactive STAR simulator</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Powered by Polar.sh global payments</span>
                </li>
              </ul>
              <Button
                variant="gradient"
                size="sm"
                className="w-full gap-1.5 text-xs"
                onClick={() => toast.info("Polar checkout will be activated in billing integration step")}
              >
                Upgrade to Pro
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
