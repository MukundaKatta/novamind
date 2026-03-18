"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageSquare,
  Key,
  BookOpen,
  BarChart3,
  Settings,
  Users,
  Beaker,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Brain,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppStore } from "@/stores/app-store";
import { useSupabase } from "@/hooks/use-supabase";
import { cn } from "@/lib/utils/cn";
import { formatTokens, percentOf } from "@/lib/utils/format";

const navItems = [
  { href: "/dashboard/conversations", label: "Conversations", icon: MessageSquare },
  { href: "/dashboard/playground", label: "Playground", icon: Beaker },
  { href: "/dashboard/prompts", label: "Prompt Library", icon: BookOpen },
  { href: "/dashboard/api-keys", label: "API Keys", icon: Key },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/workspace", label: "Workspace", icon: Users },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const supabase = useSupabase();
  const { profile, sidebarOpen, toggleSidebar } = useAppStore();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth/login";
  };

  const tokenUsagePercent = profile
    ? percentOf(profile.tokens_used_this_month, profile.monthly_token_limit)
    : 0;

  return (
    <aside
      className={cn(
        "flex flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-300",
        sidebarOpen ? "w-64" : "w-16"
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center justify-between px-4">
        {sidebarOpen && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text text-transparent">
              NovaMind
            </span>
          </Link>
        )}
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-8 w-8">
          {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3",
                  !sidebarOpen && "justify-center px-2"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
              </Button>
            </Link>
          );
        })}
      </nav>

      {/* Token Usage */}
      {sidebarOpen && profile && (
        <div className="mx-3 mb-3 rounded-lg border bg-background/50 p-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Token Usage</span>
            <span>{tokenUsagePercent}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                tokenUsagePercent > 90
                  ? "bg-destructive"
                  : tokenUsagePercent > 70
                  ? "bg-amber-500"
                  : "bg-primary"
              )}
              style={{ width: `${Math.min(tokenUsagePercent, 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {formatTokens(profile.tokens_used_this_month)} / {formatTokens(profile.monthly_token_limit)}
          </p>
        </div>
      )}

      <Separator />

      {/* User Menu */}
      <div className="p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn("w-full justify-start gap-3", !sidebarOpen && "justify-center px-2")}
            >
              <Avatar className="h-6 w-6">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              {sidebarOpen && (
                <div className="flex flex-col items-start text-xs">
                  <span className="font-medium truncate max-w-[140px]">
                    {profile?.full_name || "User"}
                  </span>
                  <span className="text-muted-foreground truncate max-w-[140px]">
                    {profile?.subscription_tier}
                  </span>
                </div>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="text-sm font-medium">{profile?.full_name}</p>
              <p className="text-xs text-muted-foreground">{profile?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
