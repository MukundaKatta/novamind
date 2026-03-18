"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useSupabase } from "@/hooks/use-supabase";
import { useAppStore } from "@/stores/app-store";
import { WorkspaceMember, Profile } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Users,
  Plus,
  Crown,
  Code2,
  Eye,
  Trash2,
  Mail,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatRelativeTime } from "@/lib/utils/format";

interface MemberWithProfile extends WorkspaceMember {
  profile: Profile;
}

export default function WorkspacePage() {
  const supabase = useSupabase();
  const { workspaces, activeWorkspaceId, profile } = useAppStore();
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("developer");
  const [loading, setLoading] = useState(true);

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);
  const currentMember = members.find((m) => m.user_id === profile?.id);
  const isAdmin = currentMember?.role === "admin";

  const loadMembers = useCallback(async () => {
    if (!activeWorkspaceId) return;

    const { data } = await supabase
      .from("workspace_members")
      .select(`
        *,
        profile:profiles(*)
      `)
      .eq("workspace_id", activeWorkspaceId)
      .order("joined_at", { ascending: true });

    if (data) {
      setMembers(
        data.map((m: Record<string, unknown>) => ({
          ...m,
          profile: m.profile as unknown as Profile,
        })) as MemberWithProfile[]
      );
    }
    setLoading(false);
  }, [supabase, activeWorkspaceId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const inviteMember = async () => {
    if (!inviteEmail.trim() || !activeWorkspaceId) return;

    // Look up user by email
    const { data: targetProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", inviteEmail)
      .single();

    if (!targetProfile) {
      alert("User not found. They must have a NovaMind account first.");
      return;
    }

    const { error } = await supabase.from("workspace_members").insert({
      workspace_id: activeWorkspaceId,
      user_id: targetProfile.id,
      role: inviteRole,
      invited_by: profile?.id,
    });

    if (error) {
      alert(error.message);
      return;
    }

    setShowInvite(false);
    setInviteEmail("");
    loadMembers();
  };

  const updateMemberRole = async (memberId: string, newRole: string) => {
    await supabase
      .from("workspace_members")
      .update({ role: newRole })
      .eq("id", memberId);
    loadMembers();
  };

  const removeMember = async (memberId: string) => {
    await supabase.from("workspace_members").delete().eq("id", memberId);
    loadMembers();
  };

  const roleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Crown className="h-3.5 w-3.5" />;
      case "developer":
        return <Code2 className="h-3.5 w-3.5" />;
      case "viewer":
        return <Eye className="h-3.5 w-3.5" />;
      default:
        return null;
    }
  };

  const roleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "default" as const;
      case "developer":
        return "secondary" as const;
      case "viewer":
        return "outline" as const;
      default:
        return "outline" as const;
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Workspace
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your team and workspace settings
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowInvite(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Invite Member
          </Button>
        )}
      </div>

      {/* Workspace Info */}
      {activeWorkspace && (
        <Card>
          <CardHeader>
            <CardTitle>{activeWorkspace.name}</CardTitle>
            <CardDescription>
              {activeWorkspace.slug} &middot; Plan: {activeWorkspace.plan}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3 text-sm">
              <div>
                <p className="text-muted-foreground">Members</p>
                <p className="font-medium text-lg">{members.length}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Created</p>
                <p className="font-medium">{formatRelativeTime(activeWorkspace.created_at)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Your Role</p>
                <Badge variant={roleBadgeVariant(currentMember?.role || "viewer")} className="gap-1">
                  {roleIcon(currentMember?.role || "viewer")}
                  {currentMember?.role || "viewer"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Members List */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Members ({members.length})
        </h2>
        <div className="space-y-2">
          {members.map((member) => (
            <Card key={member.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.profile?.avatar_url || undefined} />
                    <AvatarFallback>
                      {member.profile?.full_name?.charAt(0) ||
                        member.profile?.email?.charAt(0) ||
                        "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {member.profile?.full_name || "Unknown"}
                      </span>
                      {member.user_id === profile?.id && (
                        <Badge variant="outline" className="text-xs py-0">
                          You
                        </Badge>
                      )}
                      {member.user_id === activeWorkspace?.owner_id && (
                        <Badge variant="default" className="text-xs py-0 gap-1">
                          <Crown className="h-3 w-3" />
                          Owner
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {member.profile?.email} &middot; Joined {formatRelativeTime(member.joined_at)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {isAdmin && member.user_id !== profile?.id ? (
                    <>
                      <Select
                        value={member.role}
                        onValueChange={(val) => updateMemberRole(member.id, val)}
                      >
                        <SelectTrigger className="w-[130px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="developer">Developer</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => removeMember(member.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <Badge variant={roleBadgeVariant(member.role)} className="gap-1">
                      {roleIcon(member.role)}
                      {member.role}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Invite Dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Invite someone to join your workspace
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Email Address</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin - Full access</SelectItem>
                  <SelectItem value="developer">Developer - Read & write</SelectItem>
                  <SelectItem value="viewer">Viewer - Read only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvite(false)}>
              Cancel
            </Button>
            <Button onClick={inviteMember} disabled={!inviteEmail.trim()}>
              <Mail className="h-4 w-4 mr-2" />
              Send Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
