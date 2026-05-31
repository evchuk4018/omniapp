"use client";

import type { DownloadProgress, ModelInfo, ProviderId } from "@/features/ai/types";

type Props = {
  open: boolean;
  provider: ProviderId;
  search: string;
  results: ModelInfo[];
  installed: ModelInfo[];
  downloadStatus: DownloadProgress | null;
  defaultModel: string;
  onClose: () => void;
  onSearchChange: (value: string) => void;
  onDownload: (tag: string) => void;
  onSetDefault: (model: string) => void;
  onSelectModel: (model: string) => void;
};

export function ModelManagerDialog({
  open,
  provider,
  search,
  results,
  installed,
  downloadStatus,
  defaultModel,
  onClose,
  onSearchChange,
  onDownload,
  onSetDefault,
  onSelectModel
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <section className="w-full max-w-2xl rounded-3xl border border-[#3a3a36] bg-[#222220] p-5 text-[#e7e1d7] shadow-2xl shadow-black/50">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[#78746d]">Local models</p>
            <h2 className="mt-1 text-xl font-medium">Model manager</h2>
            <p className="mt-1 text-sm text-[#a8a39a]">Search curated Ollama tags or installed local runtime models.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-[#30302e] px-3 py-1.5 text-sm text-[#d1ccc3] hover:bg-[#3a3a36]">
            Close
          </button>
        </div>

        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={provider === "ollama" ? "Search llama3.2, qwen, mistral..." : "Search installed models..."}
          className="mt-5 w-full rounded-xl border border-[#3a3a36] bg-[#1b1b1a] px-4 py-3 text-sm outline-none placeholder:text-[#78746d] focus:border-[#d97745]"
        />

        {downloadStatus ? (
          <p className={`mt-3 rounded-xl px-3 py-2 text-sm ${downloadStatus.status === "failed" ? "bg-red-950/40 text-red-200" : "bg-[#2b2b29] text-[#d1ccc3]"}`}>
            {downloadStatus.tag}: {downloadStatus.message}
          </p>
        ) : null}

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <ModelColumn
            title="Search results"
            models={results}
            defaultModel={defaultModel}
            empty="No models found."
            onDownload={onDownload}
            onSetDefault={onSetDefault}
            onSelectModel={onSelectModel}
          />
          <ModelColumn
            title="Installed"
            models={installed}
            defaultModel={defaultModel}
            empty="No installed models detected."
            onDownload={onDownload}
            onSetDefault={onSetDefault}
            onSelectModel={onSelectModel}
          />
        </div>
      </section>
    </div>
  );
}

function ModelColumn({
  title,
  models,
  defaultModel,
  empty,
  onDownload,
  onSetDefault,
  onSelectModel
}: {
  title: string;
  models: ModelInfo[];
  defaultModel: string;
  empty: string;
  onDownload: (tag: string) => void;
  onSetDefault: (model: string) => void;
  onSelectModel: (model: string) => void;
}) {
  return (
    <div>
      <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-[#78746d]">{title}</h3>
      <div className="mt-2 max-h-72 space-y-2 overflow-auto pr-1 scrollbar-thin">
        {models.map((model) => (
          <ModelRow
            key={`${model.provider}-${model.id}-${model.source}`}
            model={model}
            isDefault={defaultModel === model.id}
            onDownload={onDownload}
            onSetDefault={onSetDefault}
            onSelectModel={onSelectModel}
          />
        ))}
        {!models.length ? <p className="rounded-xl bg-[#292927] p-3 text-sm text-[#78746d]">{empty}</p> : null}
      </div>
    </div>
  );
}

function ModelRow({
  model,
  isDefault,
  onDownload,
  onSetDefault,
  onSelectModel
}: {
  model: ModelInfo;
  isDefault: boolean;
  onDownload: (tag: string) => void;
  onSetDefault: (model: string) => void;
  onSelectModel: (model: string) => void;
}) {
  return (
    <div className="rounded-xl border border-[#343431] bg-[#292927] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[#f0ede7]">{model.id}</p>
          <p className="mt-1 text-xs text-[#78746d]">{model.isInstalled ? "Installed" : "Not installed"} · {model.source}</p>
        </div>
        {isDefault ? <span className="rounded-full bg-[#3a3029] px-2 py-1 text-[11px] text-[#f28c5b]">Default</span> : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => onSelectModel(model.id)} className="rounded-full bg-[#30302e] px-3 py-1.5 text-xs text-[#d1ccc3] hover:bg-[#3a3a36]">
          Use
        </button>
        <button type="button" onClick={() => onSetDefault(model.id)} className="rounded-full bg-[#30302e] px-3 py-1.5 text-xs text-[#d1ccc3] hover:bg-[#3a3a36]">
          Set default
        </button>
        {!model.isInstalled && model.provider === "ollama" ? (
          <button type="button" onClick={() => onDownload(model.id)} className="rounded-full bg-[#d97745] px-3 py-1.5 text-xs font-medium text-[#1b1b1a] hover:bg-[#f28c5b]">
            Download
          </button>
        ) : null}
      </div>
    </div>
  );
}
