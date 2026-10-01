import Link from "next/link";
import { Sparkles, ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-400 mb-6 border border-blue-500/20">
        <Sparkles className="h-8 w-8" />
      </div>
      <h1 className="text-4xl font-extrabold text-white tracking-tight sm:text-5xl mb-3">
        404
      </h1>
      <h2 className="text-xl font-semibold text-slate-300 mb-2">
        Page Not Found
      </h2>
      <p className="max-w-md text-slate-400 text-sm mb-8 leading-relaxed">
        The page you are looking for does not exist, has been removed, or is temporarily unavailable.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button asChild variant="default" className="gap-2">
          <Link href="/dashboard">
            <Home className="h-4 w-4" />
            Go to Dashboard
          </Link>
        </Button>
        <Button asChild variant="outline" className="gap-2">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            Landing Page
          </Link>
        </Button>
      </div>
    </div>
  );
}
