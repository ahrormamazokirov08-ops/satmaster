"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight, Lock, Mail, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        // In local development placeholder mode, inform and navigate to dashboard for preview
        if (authError.message.includes("fetch") || authError.message.includes("placeholder") || !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")) {
          toast.info("Supabase placeholder active — entering demo mode");
          router.push("/dashboard");
          return;
        }
        setError(authError.message);
        toast.error(authError.message);
      } else {
        toast.success("Welcome back!");
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Sign-in error";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    toast.success("Entering Demo Mode");
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 font-bold text-xl text-white mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/25">
              <Sparkles className="h-5 w-5" />
            </div>
            <span>Apply<span className="text-blue-400">Pilot</span></span>
          </Link>
          <h1 className="text-2xl font-bold text-white tracking-tight">Welcome back</h1>
          <p className="text-xs text-slate-400 mt-1">Sign in to manage your tailored applications</p>
        </div>

        <Card className="p-6 bg-slate-900/80 border-slate-800 shadow-2xl backdrop-blur-xl">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSignIn} className="space-y-4">
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

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-medium text-slate-300">Password</label>
                <Link href="/forgot-password" className="text-blue-400 hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  className="pl-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button type="submit" variant="gradient" className="w-full gap-2 mt-2" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing In...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-4 pt-4 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              className="w-full text-xs text-slate-300 border-slate-700 bg-slate-800/60 hover:bg-slate-800"
              onClick={handleDemoLogin}
            >
              One-Click Demo Sign In (No Auth Required)
            </Button>
          </div>
        </Card>

        <p className="text-center text-xs text-slate-400">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-blue-400 hover:underline font-medium">
            Sign up free
          </Link>
        </p>
      </div>
    </div>
  );
}
