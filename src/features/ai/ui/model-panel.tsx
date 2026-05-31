"use client";

import type { ModelInfo, ProviderId } from "@/features/ai/types";

type Props = {
  provider: ProviderId;
  currentModel: string;
  defaultModel: string;
  search: string;
  installed: ModelInfo[];
  results: ModelInfo[];
  statusText: string;
  onProviderChange: (provider: ProviderId) => void;
  onSearchChange: (value: string) => void;
  onPickModel: (tag: string) => void;
  onSetDefault: () => void;
  onDownload: (tag: string) => void;
};

export function ModelPanel({
  provider,
  currentModel,
  defaultModel,
  search,
  installed,
  results,
  statusText,
  onProviderChange,
  onSearchChange,
  onPickModel,
  onSetDefault,
  onDownload
}: Props) {
  return (
    <aside className="surface w-full rounded-xl p-3 md:w-[300px]">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium">Model Selector</p>
        <select
          className="rounded-md border border-[#2a2f36] bg-[#11141a] px-2 py-1 text-xs"
          onChange={(event) => onProviderChange(event.target.value as ProviderId)}
          value={provider}
        >
          <option value="ollama">Ollama</option>
          <option value="openai-local">OpenAI Local</option>
        </select>
      </div>

      <label className="mb-2 block text-xs text-[#97a0ab]" htmlFor="model-search">
        Search / download
      </label>
      <input
        className="mb-2 w-full rounded-lg border border-[#2a2f36] bg-[#0f1218] px-3 py-2 text-sm outline-none focus:border-[#1a73e8]"
        id="model-search"
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="qwen2.5, llama3.2..."
        value={search}
      />
      <p className="mb-3 text-xs text-[#97a0ab]">{statusText}</p>

      <div className="mb-3">
        <p className="mb-1 text-xs uppercase tracking-[0.14em] text-[#97a0ab]">Installed</p>
        <div className="space-y-1">
          {installed.map((model) => (
            <button
              className={`w-full rounded-md border px-2 py-2 text-left text-sm ${
                currentModel === model.id
                  ? "border-[#1a73e8] bg-[#16243f]"
                  : "border-[#282d35] bg-[#12161d] hover:bg-[#191e27]"
              }`}
              key={model.id}
              onClick={() => onPickModel(model.id)}
              type="button"
            >
              {model.id}
            </button>
          ))}
          {installed.length === 0 ? <p className="text-xs text-[#97a0ab]">No installed models</p> : null}
        </div>
      </div>

      <div>
        <p className="mb-1 text-xs uppercase tracking-[0.14em] text-[#97a0ab]">Search Results</p>
        <div className="space-y-1">
          {results.map((model) => (
            <div className="flex items-center gap-2 rounded-md border border-[#282d35] bg-[#12161d] p-2" key={model.id}>
              <p className="min-w-0 flex-1 truncate text-sm">{model.id}</p>
              {model.isInstalled ? (
                <button
                  className="rounded bg-[#1a73e8] px-2 py-1 text-xs"
                  onClick={() => onPickModel(model.id)}
                  type="button"
                >
                  Use
                </button>
              ) : (
                <button
                  className="rounded bg-[#10a37f] px-2 py-1 text-xs"
                  onClick={() => onDownload(model.id)}
                  type="button"
                >
                  Download
                </button>
              )}
            </div>
          ))}
          {results.length === 0 ? <p className="text-xs text-[#97a0ab]">No matches</p> : null}
        </div>
      </div>

      <button
        className="mt-4 w-full rounded-md border border-[#2b3340] bg-[#141a22] px-3 py-2 text-xs hover:bg-[#1b2330]"
        onClick={onSetDefault}
        type="button"
      >
        Save "{currentModel || "none"}" as default (current: {defaultModel || "none"})
      </button>
    </aside>
  );
}
