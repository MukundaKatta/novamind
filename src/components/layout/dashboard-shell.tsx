"use client";

import React, { useEffect } from "react";
import { Sidebar } from "./sidebar";
import { useAppStore } from "@/stores/app-store";
import { useSupabase } from "@/hooks/use-supabase";
import { TooltipProvider } from "@/components/ui/tooltip";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const supabase = useSupabase();
  const { setProfile, setWorkspaces, setActiveWorkspace } = useAppStore();

  useEffect(() => {
    async function loadUserData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile) setProfile(profile);

      const { data: workspaces } = await supabase
        .from("workspaces")
        .select("*")
        .order("created_at", { ascending: true });

      if (workspaces && workspaces.length > 0) {
        setWorkspaces(workspaces);
        setActiveWorkspace(workspaces[0].id);
      }
    }

    loadUserData();
  }, [supabase, setProfile, setWorkspaces, setActiveWorkspace]);

  return (
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </TooltipProvider>
  );
}
