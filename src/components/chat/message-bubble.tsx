"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Message } from "@/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Copy,
  GitBranch,
  RotateCcw,
  Bot,
  User,
  Clock,
  Coins,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import { formatLatency, formatTokens, formatCurrency } from "@/lib/utils/format";

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
  streamingContent?: string;
  onFork?: (messageId: string) => void;
  onRegenerate?: (messageId: string) => void;
  onCopy?: (content: string) => void;
}

export function MessageBubble({
  message,
  isStreaming,
  streamingContent,
  onFork,
  onRegenerate,
  onCopy,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";
  const content = isStreaming ? streamingContent || "" : message.content;

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    onCopy?.(message.content);
  };

  return (
    <div
      className={cn(
        "group flex gap-3 px-4 py-4 hover:bg-muted/30 transition-colors",
        isUser && "bg-muted/20"
      )}
    >
      <Avatar className="h-8 w-8 shrink-0 mt-0.5">
        <AvatarFallback
          className={cn(
            "text-xs",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white"
          )}
        >
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium">
            {isUser ? "You" : message.model || "Assistant"}
          </span>
          {isStreaming && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse-glow" />
              Generating...
            </span>
          )}
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          {isStreaming && (
            <span className="inline-block w-2 h-4 bg-foreground/70 animate-pulse ml-0.5" />
          )}
        </div>

        {/* Metadata for assistant messages */}
        {isAssistant && !isStreaming && message.tokens_total > 0 && (
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            {message.tokens_total > 0 && (
              <span className="flex items-center gap-1">
                <Coins className="h-3 w-3" />
                {formatTokens(message.tokens_total)} tokens
              </span>
            )}
            {message.latency_ms && message.latency_ms > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatLatency(message.latency_ms)}
              </span>
            )}
            {message.cost > 0 && (
              <Badge variant="outline" className="text-xs py-0">
                {formatCurrency(message.cost)}
              </Badge>
            )}
          </div>
        )}

        {/* Action buttons */}
        {!isStreaming && (
          <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={handleCopy}>
              <Copy className="h-3 w-3 mr-1" />
              Copy
            </Button>
            {isAssistant && onFork && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => onFork(message.id)}
              >
                <GitBranch className="h-3 w-3 mr-1" />
                Fork
              </Button>
            )}
            {isAssistant && onRegenerate && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => onRegenerate(message.id)}
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Regenerate
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
