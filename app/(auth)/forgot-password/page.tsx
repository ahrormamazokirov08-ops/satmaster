"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowLeft, Mail, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/settings`,
      });
      setSubmitted(true);
      toast.success("Password reset instructions sent.");
    } catch {
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="w-full max-w-md relative z-10 space-y-6">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 font-bold text-xl text-white mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <span>Apply<span className="text-blue-400">Pilot</span></span>
          </Link>
          <h1 className="text-2xl font-bold text-white tracking-tight">Reset password</h1>
          <p className="text-xs text-slate-400 mt-1">We will send you instructions to reset your password</p>
        </div>

        <Card className="p-6 bg-slate-900/80 border-slate-800 shadow-2xl">
          {submitted ? (
            <div className="text-center py-4 space-y-3">
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-white text-base">Check your email</h3>
              <p className="text-xs text-slate-400">
                If an account exists for {email}, a recovery link has been sent.
              </p>
              <Button asChild variant="outline" className="w-full mt-4">
                <Link href="/login">Back to Sign In</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    className="pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <Button type="submit" variant="gradient" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Reset Link"}
              </Button>

              <div className="text-center">
                <Link href="/login" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
