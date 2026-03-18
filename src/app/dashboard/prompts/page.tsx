"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useSupabase } from "@/hooks/use-supabase";
import { PromptTemplate } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BookOpen,
  Plus,
  Search,
  Tag,
  Globe,
  Lock,
  Copy,
  Pencil,
  Trash2,
  GitFork,
  Hash,
  Eye,
  X,
} from "lucide-react";
import { formatRelativeTime, formatNumber } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export default function PromptsPage() {
  const supabase = useSupabase();
  const [myPrompts, setMyPrompts] = useState<PromptTemplate[]>([]);
  const [publicPrompts, setPublicPrompts] = useState<PromptTemplate[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingPrompt, setEditingPrompt] = useState<PromptTemplate | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  // Form state
  const [form, setForm] = useState({
    title: "",
    description: "",
    content: "",
    tags: [] as string[],
    category: "",
    is_public: false,
  });
  const [newTag, setNewTag] = useState("");

  const loadPrompts = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: mine } = await supabase
      .from("prompt_templates")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    const { data: pub } = await supabase
      .from("prompt_templates")
      .select("*")
      .eq("is_public", true)
      .neq("user_id", user.id)
      .order("use_count", { ascending: false })
      .limit(50);

    if (mine) setMyPrompts(mine);
    if (pub) setPublicPrompts(pub);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

  const openCreate = () => {
    setEditingPrompt(null);
    setForm({ title: "", description: "", content: "", tags: [], category: "", is_public: false });
    setShowDialog(true);
  };

  const openEdit = (prompt: PromptTemplate) => {
    setEditingPrompt(prompt);
    setForm({
      title: prompt.title,
      description: prompt.description || "",
      content: prompt.content,
      tags: prompt.tags,
      category: prompt.category || "",
      is_public: prompt.is_public,
    });
    setShowDialog(true);
  };

  const savePrompt = async () => {
    if (!form.title.trim() || !form.content.trim()) return;

    if (editingPrompt) {
      await supabase
        .from("prompt_templates")
        .update({
          title: form.title,
          description: form.description || null,
          content: form.content,
          tags: form.tags,
          category: form.category || null,
          is_public: form.is_public,
          version: editingPrompt.version + 1,
        })
        .eq("id", editingPrompt.id);
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("prompt_templates").insert({
        user_id: user.id,
        title: form.title,
        description: form.description || null,
        content: form.content,
        tags: form.tags,
        category: form.category || null,
        is_public: form.is_public,
      });
    }

    setShowDialog(false);
    loadPrompts();
  };

  const deletePrompt = async (id: string) => {
    await supabase.from("prompt_templates").delete().eq("id", id);
    loadPrompts();
  };

  const forkPrompt = async (prompt: PromptTemplate) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("prompt_templates").insert({
      user_id: user.id,
      title: `Fork of ${prompt.title}`,
      description: prompt.description,
      content: prompt.content,
      tags: prompt.tags,
      category: prompt.category,
      is_public: false,
      parent_id: prompt.id,
    });

    await supabase
      .from("prompt_templates")
      .update({ fork_count: prompt.fork_count + 1 })
      .eq("id", prompt.id);

    loadPrompts();
  };

  const addTag = () => {
    if (newTag && !form.tags.includes(newTag)) {
      setForm((f) => ({ ...f, tags: [...f.tags, newTag] }));
      setNewTag("");
    }
  };

  const filteredMyPrompts = myPrompts.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredPublicPrompts = publicPrompts.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Prompt Library
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create, version, and share prompt templates
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          New Prompt
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search prompts by title or tag..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Tabs defaultValue="my-prompts">
        <TabsList>
          <TabsTrigger value="my-prompts">
            My Prompts ({filteredMyPrompts.length})
          </TabsTrigger>
          <TabsTrigger value="community">
            Community ({filteredPublicPrompts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-prompts">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-4">
            {filteredMyPrompts.map((prompt) => (
              <PromptCard
                key={prompt.id}
                prompt={prompt}
                isOwner={true}
                onEdit={() => openEdit(prompt)}
                onDelete={() => deletePrompt(prompt.id)}
                onFork={() => forkPrompt(prompt)}
              />
            ))}
            {filteredMyPrompts.length === 0 && !loading && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>No prompts yet. Create your first prompt template.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="community">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-4">
            {filteredPublicPrompts.map((prompt) => (
              <PromptCard
                key={prompt.id}
                prompt={prompt}
                isOwner={false}
                onFork={() => forkPrompt(prompt)}
              />
            ))}
            {filteredPublicPrompts.length === 0 && !loading && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <Globe className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>No community prompts found.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingPrompt ? "Edit Prompt" : "Create Prompt"}
            </DialogTitle>
            <DialogDescription>
              {editingPrompt
                ? `Editing v${editingPrompt.version} - this will create v${editingPrompt.version + 1}`
                : "Create a reusable prompt template"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-auto">
            <div>
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g., Code Review Assistant"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Brief description of what this prompt does"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Prompt Content</Label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                placeholder="Write your prompt template here. Use {{variable}} for variables."
                rows={8}
                className="mt-1.5 font-mono text-sm"
              />
            </div>
            <div>
              <Label>Category</Label>
              <Input
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                placeholder="e.g., coding, writing, data"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Tags</Label>
              <div className="flex gap-2 mt-1.5">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add tag..."
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                />
                <Button size="icon" variant="outline" onClick={addTag}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {form.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {form.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button
                        onClick={() =>
                          setForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }))
                        }
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.is_public}
                onCheckedChange={(checked) =>
                  setForm((f) => ({ ...f, is_public: checked }))
                }
              />
              <div>
                <Label>Make public</Label>
                <p className="text-xs text-muted-foreground">
                  Public prompts can be viewed and forked by anyone
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={savePrompt} disabled={!form.title.trim() || !form.content.trim()}>
              {editingPrompt ? "Save Changes" : "Create Prompt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PromptCard({
  prompt,
  isOwner,
  onEdit,
  onDelete,
  onFork,
}: {
  prompt: PromptTemplate;
  isOwner: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onFork: () => void;
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-sm line-clamp-1">{prompt.title}</CardTitle>
          <div className="flex items-center gap-1 shrink-0">
            {prompt.is_public ? (
              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </div>
        </div>
        {prompt.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {prompt.description}
          </p>
        )}
      </CardHeader>

      <CardContent className="flex-1 pb-3">
        <pre className="text-xs bg-muted rounded-md p-2 max-h-24 overflow-hidden line-clamp-4 font-mono whitespace-pre-wrap">
          {prompt.content}
        </pre>
        {prompt.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {prompt.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px] py-0 px-1.5">
                <Tag className="h-2.5 w-2.5 mr-0.5" />
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="border-t pt-3 flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Hash className="h-3 w-3" />
            v{prompt.version}
          </span>
          <span className="flex items-center gap-1">
            <GitFork className="h-3 w-3" />
            {prompt.fork_count}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {formatNumber(prompt.use_count)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={onFork}>
            <GitFork className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => navigator.clipboard.writeText(prompt.content)}
          >
            <Copy className="h-3 w-3" />
          </Button>
          {isOwner && onEdit && (
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={onEdit}>
              <Pencil className="h-3 w-3" />
            </Button>
          )}
          {isOwner && onDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
