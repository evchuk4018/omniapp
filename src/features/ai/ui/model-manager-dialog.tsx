"use client";

import type { ModelInfo, ProviderId } from "@/features/ai/types";

type Props = {
  open: boolean;
  provider: ProviderId;
  currentModel: string;
  defaultModel: string;
  search: string;
  installed: ModelInfo[];
  results: ModelInfo[];
  statusText: string;
  onClose: () => void;
  onProviderChange: (provider: ProviderId) => void;
  onSearchChange: (value: string) => void;
  onPickModel: (tag: string) => void;
  onSetDefault: () => void;
  onDownload: (tag: string) => void;
};

export function ModelManagerDialog({
  open,
  provider,
  currentModel,
  defaultModel,
  search,
  installed,
  results,
  statusText,
  onClose,
  onProviderChange,
  onSearchChange,
  onPickModel,
  onSetDefault,
  onDownload
}: Props) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="surface w-full max-w-2xl rounded-xl border border-[#1f252d] p-4" role="dialog" aria-modal="true">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-medium">Model manager</h2>
          <button
            className="rounded-md border border-[#2a2f36] bg-[#11141a] px-2 py-1 text-xs hover:bg-[#181c24]"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        <div className="mb-3 grid gap-2 md:grid-cols-[180px_1fr]">
          <select
            className="rounded-md border border-[#2a2f36] bg-[#11141a] px-2 py-2 text-sm"
            onChange={(event) => onProviderChange(event.target.value as ProviderId)}
            value={provider}
          >
            <option value="ollama">Ollama</option>
            <option value="openai-local">OpenAI Local</option>
          </select>
          <input
            className="w-full rounded-md border border-[#2a2f36] bg-[#0f1218] px-3 py-2 text-sm outline-none focus:border-[#1a73e8]"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search model tags..."
            value={search}
          />
        </div>

        <p className="mb-3 text-xs text-[#97a0ab]">{statusText}</p>

        <div className="grid gap-3 md:grid-cols-2">
          <section>
            <p className="mb-1 text-xs uppercase tracking-[0.14em] text-[#97a0ab]">Installed</p>
            <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-[#232a32] bg-[#0b1016] p-2">
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
              {installed.length === 0 ? <p className="text-xs text-[#97a0ab]">No installed models.</p> : null}
            </div>
          </section>

          <section>
            <p className="mb-1 text-xs uppercase tracking-[0.14em] text-[#97a0ab]">Search results</p>
            <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-[#232a32] bg-[#0b1016] p-2">
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
              {results.length === 0 ? <p className="text-xs text-[#97a0ab]">No matches.</p> : null}
            </div>
          </section>
        </div>

        <button
          className="mt-4 w-full rounded-md border border-[#2b3340] bg-[#141a22] px-3 py-2 text-xs hover:bg-[#1b2330]"
          onClick={onSetDefault}
          type="button"
        >
          Save "{currentModel || "none"}" as default (current: {defaultModel || "none"})
        </button>
      </div>
    </div>
  );
}
