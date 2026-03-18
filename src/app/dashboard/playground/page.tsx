"use client";

import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModelSelector } from "@/components/chat/model-selector";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Play,
  Square,
  RotateCcw,
  Copy,
  Clock,
  Coins,
  X,
  Plus,
  Maximize2,
  Code2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { formatLatency, formatTokens, formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

interface PlaygroundState {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
  topP: number;
  maxTokens: number;
  stopSequences: string[];
}

interface CompletionResult {
  content: string;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  latency_ms: number;
  cost: number;
  model: string;
}

export default function PlaygroundPage() {
  const [state, setState] = useState<PlaygroundState>({
    model: "gpt-4o",
    systemPrompt: "You are a helpful AI assistant.",
    userPrompt: "",
    temperature: 0.7,
    topP: 1.0,
    maxTokens: 4096,
    stopSequences: [],
  });

  const [result, setResult] = useState<CompletionResult | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const [newStopSeq, setNewStopSeq] = useState("");
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const handleRun = useCallback(async () => {
    if (!state.userPrompt.trim() || isStreaming) return;

    setIsStreaming(true);
    setStreamContent("");
    setResult(null);

    const controller = new AbortController();
    setAbortController(controller);

    const messages = [];
    if (state.systemPrompt) {
      messages.push({ role: "system", content: state.systemPrompt });
    }
    messages.push({ role: "user", content: state.userPrompt });

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: state.model,
          messages,
          temperature: state.temperature,
          top_p: state.topP,
          max_tokens: state.maxTokens,
          stop: state.stopSequences.length > 0 ? state.stopSequences : undefined,
          stream: true,
        }),
        signal: controller.signal,
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;

      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "content") {
              fullContent += data.content;
              setStreamContent((prev) => prev + data.content);
            } else if (data.type === "done") {
              setResult({
                content: fullContent,
                usage: data.usage,
                latency_ms: data.latency_ms,
                cost: data.cost,
                model: state.model,
              });
            }
          } catch {}
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        console.error("Playground error:", err);
      }
    } finally {
      setIsStreaming(false);
      setAbortController(null);
    }
  }, [state, isStreaming]);

  const handleStop = () => {
    abortController?.abort();
    setIsStreaming(false);
  };

  const handleReset = () => {
    setResult(null);
    setStreamContent("");
    setState((s) => ({ ...s, userPrompt: "" }));
  };

  const addStopSequence = () => {
    if (newStopSeq && !state.stopSequences.includes(newStopSeq)) {
      setState((s) => ({ ...s, stopSequences: [...s.stopSequences, newStopSeq] }));
      setNewStopSeq("");
    }
  };

  const displayContent = result?.content || streamContent;

  return (
    <div className="flex h-full">
      {/* Left: Config Panel */}
      <div className="w-80 border-r overflow-auto p-4 space-y-6">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Code2 className="h-5 w-5 text-primary" />
            Playground
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Experiment with models and parameters
          </p>
        </div>

        <div>
          <Label>Model</Label>
          <div className="mt-1.5">
            <ModelSelector
              value={state.model}
              onChange={(model) => setState((s) => ({ ...s, model }))}
              disabled={isStreaming}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label>Temperature</Label>
            <span className="text-sm text-muted-foreground">{state.temperature}</span>
          </div>
          <Slider
            value={[state.temperature]}
            onValueChange={([v]) => setState((s) => ({ ...s, temperature: v }))}
            min={0}
            max={2}
            step={0.01}
            className="mt-2"
            disabled={isStreaming}
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Precise</span>
            <span>Creative</span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label>Top P</Label>
            <span className="text-sm text-muted-foreground">{state.topP}</span>
          </div>
          <Slider
            value={[state.topP]}
            onValueChange={([v]) => setState((s) => ({ ...s, topP: v }))}
            min={0}
            max={1}
            step={0.01}
            className="mt-2"
            disabled={isStreaming}
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label>Max Tokens</Label>
            <span className="text-sm text-muted-foreground">{state.maxTokens}</span>
          </div>
          <Slider
            value={[state.maxTokens]}
            onValueChange={([v]) => setState((s) => ({ ...s, maxTokens: v }))}
            min={1}
            max={32768}
            step={1}
            className="mt-2"
            disabled={isStreaming}
          />
        </div>

        <div>
          <Label>Stop Sequences</Label>
          <div className="flex gap-2 mt-1.5">
            <Input
              value={newStopSeq}
              onChange={(e) => setNewStopSeq(e.target.value)}
              placeholder="Add sequence..."
              disabled={isStreaming}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addStopSequence())}
            />
            <Button size="icon" variant="outline" onClick={addStopSequence} disabled={isStreaming}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {state.stopSequences.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {state.stopSequences.map((seq) => (
                <Badge key={seq} variant="secondary" className="gap-1">
                  <code className="text-xs">{JSON.stringify(seq)}</code>
                  <button onClick={() =>
                    setState((s) => ({
                      ...s,
                      stopSequences: s.stopSequences.filter((x) => x !== seq),
                    }))
                  }>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Result stats */}
        {result && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Coins className="h-3 w-3" /> Tokens
                </span>
                <span>{formatTokens(result.usage.total_tokens)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Prompt</span>
                <span>{formatTokens(result.usage.prompt_tokens)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Completion</span>
                <span>{formatTokens(result.usage.completion_tokens)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Latency
                </span>
                <span>{formatLatency(result.latency_ms)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cost</span>
                <Badge variant="outline">{formatCurrency(result.cost)}</Badge>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right: Prompt & Output */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between border-b px-4 h-14 shrink-0">
          <div className="flex items-center gap-2">
            {isStreaming ? (
              <Button variant="destructive" size="sm" onClick={handleStop}>
                <Square className="h-4 w-4 mr-1" />
                Stop
              </Button>
            ) : (
              <Button size="sm" onClick={handleRun} disabled={!state.userPrompt.trim()}>
                <Play className="h-4 w-4 mr-1" />
                Run
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
          </div>
          {displayContent && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigator.clipboard.writeText(displayContent)}
            >
              <Copy className="h-4 w-4 mr-1" />
              Copy Output
            </Button>
          )}
        </div>

        <div className="flex-1 flex flex-col lg:flex-row">
          {/* System + User prompt */}
          <div className="flex-1 flex flex-col border-r">
            <div className="p-4 border-b">
              <Label className="text-xs uppercase text-muted-foreground">System Prompt</Label>
              <Textarea
                value={state.systemPrompt}
                onChange={(e) => setState((s) => ({ ...s, systemPrompt: e.target.value }))}
                placeholder="You are a helpful AI assistant."
                rows={3}
                className="mt-1.5"
                disabled={isStreaming}
              />
            </div>
            <div className="flex-1 p-4">
              <Label className="text-xs uppercase text-muted-foreground">User Prompt</Label>
              <Textarea
                value={state.userPrompt}
                onChange={(e) => setState((s) => ({ ...s, userPrompt: e.target.value }))}
                placeholder="Type your prompt here..."
                className="mt-1.5 min-h-[200px] flex-1"
                disabled={isStreaming}
              />
            </div>
          </div>

          {/* Output */}
          <div className="flex-1 flex flex-col">
            <div className="p-4 flex-1">
              <Label className="text-xs uppercase text-muted-foreground">Output</Label>
              <ScrollArea className="mt-1.5 rounded-md border p-4 min-h-[300px] bg-muted/30">
                {displayContent ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {displayContent}
                    </ReactMarkdown>
                    {isStreaming && (
                      <span className="inline-block w-2 h-4 bg-foreground/70 animate-pulse ml-0.5" />
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Output will appear here after you run the prompt.
                  </p>
                )}
              </ScrollArea>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
