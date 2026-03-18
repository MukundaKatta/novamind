"use client";

import React, { useState } from "react";
import { Conversation } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  MoreVertical,
  Trash2,
  Archive,
  Pin,
  GitBranch,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatRelativeTime, formatTokens } from "@/lib/utils/format";
import { getModelConfig } from "@/lib/llm/models";

interface ConversationListProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onArchive?: (id: string) => void;
  onPin?: (id: string) => void;
}

export function ConversationList({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onArchive,
  onPin,
}: ConversationListProps) {
  const [search, setSearch] = useState("");

  const filtered = conversations.filter(
    (c) =>
      !c.is_archived &&
      (c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())))
  );

  const pinned = filtered.filter((c) => c.pinned);
  const unpinned = filtered.filter((c) => !c.pinned);

  return (
    <div className="flex h-full flex-col">
      <div className="p-3 space-y-2">
        <Button onClick={onNew} className="w-full gap-2" size="sm">
          <Plus className="h-4 w-4" />
          New Conversation
        </Button>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {pinned.length > 0 && (
          <div className="px-3 py-1">
            <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
              <Pin className="h-3 w-3" /> Pinned
            </p>
            {pinned.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={conv.id === activeId}
                onSelect={onSelect}
                onDelete={onDelete}
                onArchive={onArchive}
                onPin={onPin}
              />
            ))}
          </div>
        )}

        <div className="px-3 py-1">
          {unpinned.map((conv) => (
            <ConversationItem
              key={conv.id}
              conversation={conv}
              isActive={conv.id === activeId}
              onSelect={onSelect}
              onDelete={onDelete}
              onArchive={onArchive}
              onPin={onPin}
            />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="px-3 py-8 text-center text-sm text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No conversations found</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function ConversationItem({
  conversation: conv,
  isActive,
  onSelect,
  onDelete,
  onArchive,
  onPin,
}: {
  conversation: Conversation;
  isActive: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onArchive?: (id: string) => void;
  onPin?: (id: string) => void;
}) {
  const modelConfig = getModelConfig(conv.model);

  return (
    <div
      className={cn(
        "group flex items-start gap-2 rounded-lg px-3 py-2 mb-1 cursor-pointer transition-colors",
        isActive ? "bg-accent text-accent-foreground" : "hover:bg-muted/50"
      )}
      onClick={() => onSelect(conv.id)}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium truncate">{conv.title}</p>
          {conv.parent_conversation_id && (
            <GitBranch className="h-3 w-3 text-muted-foreground shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground">
            {modelConfig?.name || conv.model}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(conv.updated_at)}
          </span>
        </div>
        {conv.tags.length > 0 && (
          <div className="flex gap-1 mt-1">
            {conv.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px] py-0 px-1">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
          >
            <MoreVertical className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {onPin && (
            <DropdownMenuItem onClick={() => onPin(conv.id)}>
              <Pin className="mr-2 h-4 w-4" />
              {conv.pinned ? "Unpin" : "Pin"}
            </DropdownMenuItem>
          )}
          {onArchive && (
            <DropdownMenuItem onClick={() => onArchive(conv.id)}>
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={() => onDelete(conv.id)}
            className="text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
