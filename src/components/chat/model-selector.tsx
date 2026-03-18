"use client";

import React from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from "@/components/ui/select";
import { AVAILABLE_MODELS, PROVIDER_LABELS } from "@/lib/llm/models";
import { LLMProvider } from "@/types";
import { formatCurrency } from "@/lib/utils/format";

interface ModelSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function ModelSelector({ value, onChange, disabled }: ModelSelectorProps) {
  const providers: LLMProvider[] = ["openai", "anthropic", "google", "opensource"];

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-[240px]">
        <SelectValue placeholder="Select a model" />
      </SelectTrigger>
      <SelectContent>
        {providers.map((provider, idx) => {
          const models = AVAILABLE_MODELS.filter((m) => m.provider === provider);
          if (models.length === 0) return null;
          return (
            <React.Fragment key={provider}>
              {idx > 0 && <SelectSeparator />}
              <SelectGroup>
                <SelectLabel>{PROVIDER_LABELS[provider]}</SelectLabel>
                {models.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{model.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {formatCurrency(model.inputCostPer1k)}/1K
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectGroup>
            </React.Fragment>
          );
        })}
      </SelectContent>
    </Select>
  );
}
