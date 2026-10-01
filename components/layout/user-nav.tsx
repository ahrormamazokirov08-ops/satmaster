"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { GraduationCap, BookOpen, Settings, LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export function UserNav() {
  const router = useRouter();

  const handleSignOut = () => {
    toast.success("Teacher session reset to default");
    router.push("/");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full ring-2 ring-slate-800 hover:ring-blue-500/50 transition-all p-0">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-semibold text-xs">
              SAT
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <div className="flex items-center justify-start gap-2 p-2">
          <div className="flex flex-col space-y-1 leading-none">
            <p className="font-semibold text-white text-sm">SAT Instructor</p>
            <p className="w-[200px] truncate text-xs text-slate-400">
              teacher@satmaster.edu
            </p>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/dashboard" className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-slate-400" />
              <span>Teacher Dashboard</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/bank" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-slate-400" />
              <span>Question Bank</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-red-400 focus:text-red-300 focus:bg-red-500/10 cursor-pointer flex items-center gap-2"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          <span>Reset / Exit</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
