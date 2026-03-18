"use client";

import React, { useState } from "react";
import { Conversation, SystemPreset } from "@/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ModelSelector } from "./model-selector";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";

interface ConversationSettingsProps {
  conversation: Conversation;
  presets: SystemPreset[];
  onUpdate: (updates: Partial<Conversation>) => void;
}

export function ConversationSettings({
  conversation,
  presets,
  onUpdate,
}: ConversationSettingsProps) {
  const [newStopSeq, setNewStopSeq] = useState("");

  const addStopSequence = () => {
    if (newStopSeq && !conversation.stop_sequences.includes(newStopSeq)) {
      onUpdate({
        stop_sequences: [...conversation.stop_sequences, newStopSeq],
      });
      setNewStopSeq("");
    }
  };

  const removeStopSequence = (seq: string) => {
    onUpdate({
      stop_sequences: conversation.stop_sequences.filter((s) => s !== seq),
    });
  };

  return (
    <div className="space-y-6 p-4">
      <div>
        <Label className="text-sm font-medium">Model</Label>
        <div className="mt-1.5">
          <ModelSelector
            value={conversation.model}
            onChange={(model) => onUpdate({ model })}
          />
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">System Prompt</Label>
        {presets.length > 0 && (
          <Select
            onValueChange={(value) => {
              const preset = presets.find((p) => p.id === value);
              if (preset) onUpdate({ system_prompt: preset.content });
            }}
          >
            <SelectTrigger className="mt-1.5 mb-2">
              <SelectValue placeholder="Load a preset..." />
            </SelectTrigger>
            <SelectContent>
              {presets.map((preset) => (
                <SelectItem key={preset.id} value={preset.id}>
                  {preset.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Textarea
          value={conversation.system_prompt || ""}
          onChange={(e) => onUpdate({ system_prompt: e.target.value })}
          placeholder="You are a helpful AI assistant..."
          rows={4}
          className="mt-1.5"
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Temperature</Label>
          <span className="text-sm text-muted-foreground">
            {conversation.temperature}
          </span>
        </div>
        <Slider
          value={[conversation.temperature]}
          onValueChange={([val]) => onUpdate({ temperature: val })}
          min={0}
          max={2}
          step={0.01}
          className="mt-2"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>Precise</span>
          <span>Creative</span>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Top P</Label>
          <span className="text-sm text-muted-foreground">
            {conversation.top_p}
          </span>
        </div>
        <Slider
          value={[conversation.top_p]}
          onValueChange={([val]) => onUpdate({ top_p: val })}
          min={0}
          max={1}
          step={0.01}
          className="mt-2"
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Max Tokens</Label>
          <span className="text-sm text-muted-foreground">
            {conversation.max_tokens}
          </span>
        </div>
        <Slider
          value={[conversation.max_tokens]}
          onValueChange={([val]) => onUpdate({ max_tokens: val })}
          min={1}
          max={32768}
          step={1}
          className="mt-2"
        />
      </div>

      <div>
        <Label className="text-sm font-medium">Stop Sequences</Label>
        <div className="flex gap-2 mt-1.5">
          <Input
            value={newStopSeq}
            onChange={(e) => setNewStopSeq(e.target.value)}
            placeholder="Add stop sequence..."
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addStopSequence();
              }
            }}
          />
          <Button size="icon" variant="outline" onClick={addStopSequence}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {conversation.stop_sequences.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {conversation.stop_sequences.map((seq) => (
              <Badge key={seq} variant="secondary" className="gap-1">
                <code className="text-xs">{JSON.stringify(seq)}</code>
                <button onClick={() => removeStopSequence(seq)}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
