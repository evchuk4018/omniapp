"use client";

import type { ModelInfo, ProviderId } from "@/features/ai/types";

type Props = {
  provider: ProviderId;
  currentModel: string;
  installed: ModelInfo[];
  onProviderChange: (provider: ProviderId) => void;
  onModelChange: (model: string) => void;
  onOpenManager: () => void;
};

export function ModelPanel({ provider, currentModel, installed, onProviderChange, onModelChange, onOpenManager }: Props) {
  return (
    <div className="rounded-2xl border border-[#3a3a36] bg-[#242422] p-3 shadow-2xl shadow-black/30">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-[#d1ccc3]">Model</span>
        <button type="button" onClick={onOpenManager} className="text-xs text-[#d97745] hover:text-[#f28c5b]">
          Manage
        </button>
      </div>
      <select
        value={provider}
        onChange={(event) => onProviderChange(event.target.value as ProviderId)}
        className="mt-3 w-full rounded-lg border border-[#3a3a36] bg-[#1b1b1a] px-3 py-2 text-xs text-[#e7e1d7] outline-none"
      >
        <option value="ollama">Ollama</option>
        <option value="openai-local">Llama-compatible</option>
      </select>
      <select
        value={currentModel}
        onChange={(event) => onModelChange(event.target.value)}
        className="mt-2 w-full rounded-lg border border-[#3a3a36] bg-[#1b1b1a] px-3 py-2 text-xs text-[#e7e1d7] outline-none"
      >
        <option value="">Select installed model</option>
        {installed.map((model) => (
          <option key={model.id} value={model.id}>{model.id}</option>
        ))}
      </select>
    </div>
  );
}
