import { create } from "zustand";
import { Profile, Workspace, WorkspaceMember } from "@/types";

interface AppState {
  profile: Profile | null;
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  workspaceMembers: WorkspaceMember[];
  sidebarOpen: boolean;

  setProfile: (profile: Profile | null) => void;
  setWorkspaces: (workspaces: Workspace[]) => void;
  setActiveWorkspace: (id: string | null) => void;
  setWorkspaceMembers: (members: WorkspaceMember[]) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  profile: null,
  workspaces: [],
  activeWorkspaceId: null,
  workspaceMembers: [],
  sidebarOpen: true,

  setProfile: (profile) => set({ profile }),
  setWorkspaces: (workspaces) => set({ workspaces }),
  setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),
  setWorkspaceMembers: (members) => set({ workspaceMembers: members }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
