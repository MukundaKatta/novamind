"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useSupabase } from "@/hooks/use-supabase";
import { ApiKey } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Key,
  Plus,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  AlertTriangle,
  Activity,
} from "lucide-react";
import { formatRelativeTime, formatNumber } from "@/lib/utils/format";
import { maskApiKey } from "@/lib/utils/api-keys";
import { cn } from "@/lib/utils/cn";

export default function ApiKeysPage() {
  const supabase = useSupabase();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newKeyRevealed, setNewKeyRevealed] = useState<string | null>(null);

  // Create form state
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyRpm, setNewKeyRpm] = useState(60);
  const [newKeyRpd, setNewKeyRpd] = useState(1000);
  const [newKeyTpm, setNewKeyTpm] = useState(100000);

  const loadKeys = useCallback(async () => {
    const { data } = await supabase
      .from("api_keys")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setKeys(data);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  const createKey = async () => {
    if (!newKeyName.trim()) return;

    const response = await fetch("/api/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newKeyName,
        rate_limit_rpm: newKeyRpm,
        rate_limit_rpd: newKeyRpd,
        rate_limit_tpm: newKeyTpm,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      setNewKeyRevealed(data.key);
      setShowCreateDialog(false);
      setNewKeyName("");
      loadKeys();
    }
  };

  const toggleKey = async (id: string, isActive: boolean) => {
    await supabase.from("api_keys").update({ is_active: !isActive }).eq("id", id);
    setKeys((prev) =>
      prev.map((k) => (k.id === id ? { ...k, is_active: !isActive } : k))
    );
  };

  const deleteKey = async (id: string) => {
    await supabase.from("api_keys").delete().eq("id", id);
    setKeys((prev) => prev.filter((k) => k.id !== id));
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Key className="h-6 w-6 text-primary" />
            API Keys
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Generate and manage API keys for programmatic access
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create API Key</DialogTitle>
              <DialogDescription>
                Generate a new API key with custom rate limits
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g., Production Backend"
                  className="mt-1.5"
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label>Requests per minute</Label>
                  <span className="text-sm text-muted-foreground">{newKeyRpm}</span>
                </div>
                <Slider
                  value={[newKeyRpm]}
                  onValueChange={([v]) => setNewKeyRpm(v)}
                  min={1}
                  max={600}
                  step={1}
                  className="mt-2"
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label>Requests per day</Label>
                  <span className="text-sm text-muted-foreground">{formatNumber(newKeyRpd)}</span>
                </div>
                <Slider
                  value={[newKeyRpd]}
                  onValueChange={([v]) => setNewKeyRpd(v)}
                  min={10}
                  max={100000}
                  step={10}
                  className="mt-2"
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label>Tokens per minute</Label>
                  <span className="text-sm text-muted-foreground">{formatNumber(newKeyTpm)}</span>
                </div>
                <Slider
                  value={[newKeyTpm]}
                  onValueChange={([v]) => setNewKeyTpm(v)}
                  min={1000}
                  max={10000000}
                  step={1000}
                  className="mt-2"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={createKey} disabled={!newKeyName.trim()}>
                Create Key
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Revealed key banner */}
      {newKeyRevealed && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">
                Copy your API key now. It will not be shown again.
              </p>
              <div className="flex items-center gap-2 mt-2">
                <code className="flex-1 rounded bg-muted px-3 py-2 text-sm font-mono break-all">
                  {newKeyRevealed}
                </code>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(newKeyRevealed);
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => setNewKeyRevealed(null)}
              >
                I have copied the key
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Keys list */}
      <div className="space-y-3">
        {keys.map((key) => (
          <Card key={key.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "h-2 w-2 rounded-full",
                    key.is_active ? "bg-emerald-500" : "bg-muted-foreground"
                  )}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{key.name}</span>
                    <Badge variant={key.is_active ? "success" : "secondary"}>
                      {key.is_active ? "Active" : "Disabled"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <code>{maskApiKey(key.key_prefix)}</code>
                    <span>Created {formatRelativeTime(key.created_at)}</span>
                    {key.last_used_at && (
                      <span>Last used {formatRelativeTime(key.last_used_at)}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right text-xs text-muted-foreground hidden sm:block">
                  <div className="flex items-center gap-1">
                    <Activity className="h-3 w-3" />
                    {formatNumber(key.total_requests)} requests
                  </div>
                  <div>{formatNumber(key.total_tokens)} tokens</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>{key.rate_limit_rpm} rpm</span>
                  </div>
                  <Switch
                    checked={key.is_active}
                    onCheckedChange={() => toggleKey(key.id, key.is_active)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => deleteKey(key.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {!loading && keys.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Key className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-sm text-muted-foreground">No API keys yet</p>
              <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create your first key
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
