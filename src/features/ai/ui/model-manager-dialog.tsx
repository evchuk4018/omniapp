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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div
        className="w-full max-w-2xl rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[0_20px_70px_rgba(0,0,0,0.55)]"
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-3 flex items-center justify-between border-b border-[var(--line)] pb-3">
          <h2 className="text-base font-medium text-[var(--text)]">Model manager</h2>
          <button
            className="rounded-md border border-[var(--line)] bg-[var(--panel-strong)] px-2 py-1 text-xs text-[var(--text-muted)] transition hover:text-[var(--text)]"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        <div className="mb-3 grid gap-2 md:grid-cols-[180px_1fr]">
          <select
            className="rounded-md border border-[var(--line)] bg-[var(--panel-strong)] px-2 py-2 text-sm"
            onChange={(event) => onProviderChange(event.target.value as ProviderId)}
            value={provider}
          >
            <option value="ollama">Ollama</option>
            <option value="openai-local">OpenAI Local</option>
          </select>
          <input
            className="w-full rounded-md border border-[var(--line)] bg-[var(--panel-strong)] px-3 py-2 text-sm outline-none focus:border-[var(--line-strong)]"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search model tags..."
            value={search}
          />
        </div>

        <p className="mb-3 text-xs text-[var(--text-muted)]">{statusText}</p>

        <div className="grid gap-3 md:grid-cols-2">
          <section>
            <p className="mb-1 text-xs text-[var(--text-muted)]">Installed</p>
            <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-[var(--line)] bg-[var(--panel-strong)] p-2">
              {installed.map((model) => (
                <button
                  className={`w-full rounded-md border px-2 py-2 text-left text-sm ${
                    currentModel === model.id
                      ? "border-[var(--line-strong)] bg-[var(--panel)] text-[var(--text)]"
                      : "border-[var(--line)] bg-[#212121] text-[var(--text-soft)] hover:text-[var(--text)]"
                  }`}
                  key={model.id}
                  onClick={() => onPickModel(model.id)}
                  type="button"
                >
                  {model.id}
                </button>
              ))}
              {installed.length === 0 ? <p className="text-xs text-[var(--text-muted)]">No installed models.</p> : null}
            </div>
          </section>

          <section>
            <p className="mb-1 text-xs text-[var(--text-muted)]">Search results</p>
            <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-[var(--line)] bg-[var(--panel-strong)] p-2">
              {results.map((model) => (
                <div className="flex items-center gap-2 rounded-md border border-[var(--line)] bg-[#212121] p-2" key={model.id}>
                  <p className="min-w-0 flex-1 truncate text-sm">{model.id}</p>
                  {model.isInstalled ? (
                    <button
                      className="rounded border border-[var(--line)] bg-[var(--panel)] px-2 py-1 text-xs text-[var(--text-soft)] hover:text-[var(--text)]"
                      onClick={() => onPickModel(model.id)}
                      type="button"
                    >
                      Use
                    </button>
                  ) : (
                    <button
                      className="rounded border border-[var(--line)] bg-[var(--panel)] px-2 py-1 text-xs text-[var(--text-soft)] hover:text-[var(--text)]"
                      onClick={() => onDownload(model.id)}
                      type="button"
                    >
                      Download
                    </button>
                  )}
                </div>
              ))}
              {results.length === 0 ? <p className="text-xs text-[var(--text-muted)]">No matches.</p> : null}
            </div>
          </section>
        </div>

        <button
          className="mt-4 w-full rounded-md border border-[var(--line)] bg-[var(--panel-strong)] px-3 py-2 text-xs text-[var(--text-soft)] transition hover:text-[var(--text)]"
          onClick={onSetDefault}
          type="button"
        >
          Save "{currentModel || "none"}" as default (current: {defaultModel || "none"})
        </button>
      </div>
    </div>
  );
}
