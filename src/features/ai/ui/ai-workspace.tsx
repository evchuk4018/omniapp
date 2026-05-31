"use client";

import { useEffect, useMemo, useState } from "react";
import { ConversationList } from "@/features/ai/ui/conversation-list";
import { ModelManagerDialog } from "@/features/ai/ui/model-manager-dialog";
import { ModelPanel } from "@/features/ai/ui/model-panel";
import type { ConversationSummary, DownloadProgress, ModelInfo, ProviderId, StoredMessage } from "@/features/ai/types";

type LocalMessage = Pick<StoredMessage, "id" | "role" | "content">;
type ApiResult<T> = { ok: boolean; data: T | null; error: string | null };
type ConversationsPayload = { conversations?: ConversationSummary[] };
type ConversationPayload = { conversation?: ConversationSummary };
type MessagesPayload = { messages?: StoredMessage[] };
type ModelsPayload = { models?: ModelInfo[] };
type DefaultsPayload = { provider?: ProviderId; modelTag?: string | null };
type DownloadStatusPayload = { status?: DownloadProgress };

const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

async function fetchJsonSafe<T>(input: RequestInfo | URL, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const response = await fetch(input, init);
    const raw = await response.text();
    const parsed = raw ? (JSON.parse(raw) as T & { error?: string }) : null;
    if (!response.ok) {
      return { ok: false, data: parsed, error: parsed?.error ?? `Request failed (${response.status}).` };
    }
    return { ok: true, data: parsed, error: null };
  } catch (error) {
    return { ok: false, data: null, error: error instanceof Error ? error.message : "Network request failed." };
  }
}

export function AiWorkspace() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [input, setInput] = useState("");
  const [provider, setProvider] = useState<ProviderId>("ollama");
  const [currentModel, setCurrentModel] = useState("");
  const [defaultModel, setDefaultModel] = useState("");
  const [installed, setInstalled] = useState<ModelInfo[]>([]);
  const [results, setResults] = useState<ModelInfo[]>([]);
  const [search, setSearch] = useState("");
  const [statusText, setStatusText] = useState("Ready");
  const [busy, setBusy] = useState(false);
  const [isModelPanelOpen, setIsModelPanelOpen] = useState(false);
  const [isModelDialogOpen, setIsModelDialogOpen] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<DownloadProgress | null>(null);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeId) ?? null,
    [activeId, conversations]
  );

  async function loadConversations() {
    const result = await fetchJsonSafe<ConversationsPayload>("/api/ai/conversations");
    if (!result.ok || !result.data) {
      setStatusText(result.error ?? "Failed to load conversations.");
      return;
    }
    const list = result.data.conversations ?? [];
    setConversations(list);
    if (!activeId && list.length) setActiveId(list[0].id);
  }

  async function loadMessages(conversationId: string) {
    const result = await fetchJsonSafe<MessagesPayload>(`/api/ai/conversations/${conversationId}/messages`);
    if (!result.ok || !result.data) {
      setStatusText(result.error ?? "Failed to load messages.");
      return;
    }
    setMessages((result.data.messages ?? []).map((message) => ({ id: message.id, role: message.role, content: message.content })));
  }

  async function loadInstalled(selectedProvider: ProviderId) {
    const result = await fetchJsonSafe<ModelsPayload>(`/api/ai/models/installed?provider=${selectedProvider}`);
    if (!result.ok || !result.data) {
      setInstalled([]);
      setStatusText(result.error ?? "Failed to load installed models.");
      return;
    }
    const models = result.data.models ?? [];
    setInstalled(models);
    if (!currentModel && models[0]) setCurrentModel(models[0].id);
  }

  async function loadDefaults() {
    const result = await fetchJsonSafe<DefaultsPayload>("/api/ai/settings/default-model");
    if (!result.ok || !result.data) return;
    if (result.data.provider) setProvider(result.data.provider);
    if (result.data.modelTag) {
      setDefaultModel(result.data.modelTag);
      setCurrentModel(result.data.modelTag);
    }
  }

  useEffect(() => {
    void loadConversations();
    void loadDefaults();
  }, []);

  useEffect(() => {
    if (!activeId) return;
    void loadMessages(activeId);
    const selected = conversations.find((conversation) => conversation.id === activeId);
    if (selected?.provider) setProvider(selected.provider);
    if (selected?.activeModelTag) setCurrentModel(selected.activeModelTag);
  }, [activeId, conversations]);

  useEffect(() => {
    void loadInstalled(provider);
  }, [provider]);

  useEffect(() => {
    const timeoutId = window.setTimeout(async () => {
      const result = await fetchJsonSafe<ModelsPayload>(`/api/ai/models/search?provider=${provider}&q=${encodeURIComponent(search)}`);
      setResults(result.ok && result.data ? result.data.models ?? [] : []);
    }, 180);
    return () => window.clearTimeout(timeoutId);
  }, [provider, search]);

  async function createConversation() {
    const result = await fetchJsonSafe<ConversationPayload>("/api/ai/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, activeModelTag: currentModel || null })
    });
    if (!result.ok || !result.data?.conversation) {
      setStatusText(result.error ?? "Failed to create conversation.");
      return;
    }
    setConversations((previous) => [result.data!.conversation!, ...previous]);
    setActiveId(result.data.conversation.id);
    setMessages([]);
  }

  async function renameConversation(conversation: ConversationSummary) {
    const title = window.prompt("Rename conversation", conversation.title);
    if (!title?.trim()) return;
    const result = await fetchJsonSafe<ConversationPayload>(`/api/ai/conversations/${conversation.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title })
    });
    if (!result.ok) {
      setStatusText(result.error ?? "Failed to rename conversation.");
      return;
    }
    void loadConversations();
  }

  async function deleteConversation(conversation: ConversationSummary) {
    if (!window.confirm(`Delete "${conversation.title}"?`)) return;
    const result = await fetchJsonSafe<{ ok?: boolean }>(`/api/ai/conversations/${conversation.id}`, { method: "DELETE" });
    if (!result.ok) {
      setStatusText(result.error ?? "Failed to delete conversation.");
      return;
    }
    if (conversation.id === activeId) {
      setActiveId(null);
      setMessages([]);
    }
    await loadConversations();
  }

  async function patchActiveModel(modelTag: string, selectedProvider = provider) {
    setCurrentModel(modelTag);
    setIsModelPanelOpen(false);
    if (!activeId) return;
    await fetchJsonSafe<ConversationPayload>(`/api/ai/conversations/${activeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: selectedProvider, activeModelTag: modelTag })
    });
    void loadConversations();
  }

  async function setDefault(modelTag: string) {
    const result = await fetchJsonSafe<{ ok?: boolean }>("/api/ai/settings/default-model", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, modelTag })
    });
    if (!result.ok) {
      setStatusText(result.error ?? "Failed to save default model.");
      return;
    }
    setDefaultModel(modelTag);
    setStatusText("Default model saved.");
  }

  async function downloadModel(tag: string) {
    setDownloadStatus({ tag, provider, status: "running", message: "Download started" });
    const result = await fetchJsonSafe<{ ok?: boolean }>("/api/ai/models/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, tag })
    });
    const statusResult = await fetchJsonSafe<DownloadStatusPayload>(`/api/ai/models/download-status?provider=${provider}&tag=${encodeURIComponent(tag)}`);
    if (statusResult.data?.status) setDownloadStatus(statusResult.data.status);
    if (!result.ok) {
      setStatusText(result.error ?? "Download failed.");
      return;
    }
    setStatusText("Download complete.");
    await loadInstalled(provider);
  }

  async function submitMessage() {
    const content = input.trim();
    if (!content || busy) return;
    let conversationId = activeId;
    if (!conversationId) {
      const created = await fetchJsonSafe<ConversationPayload>("/api/ai/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, activeModelTag: currentModel || null })
      });
      if (!created.ok || !created.data?.conversation) {
        setStatusText(created.error ?? "Failed to create conversation.");
        return;
      }
      conversationId = created.data.conversation.id;
      setConversations((previous) => [created.data!.conversation!, ...previous]);
      setActiveId(conversationId);
    }

    const userMessage: LocalMessage = { id: uid(), role: "user", content };
    const assistantId = uid();
    setInput("");
    setBusy(true);
    setMessages((previous) => [...previous, userMessage, { id: assistantId, role: "assistant", content: "" }]);
    setStatusText("Thinking...");

    try {
      const response = await fetch("/api/ai/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, content, provider, modelTag: currentModel || undefined })
      });
      if (!response.ok || !response.body) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? `Chat failed (${response.status}).`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const token = decoder.decode(value, { stream: true });
        setMessages((previous) => previous.map((message) => message.id === assistantId ? { ...message, content: message.content + token } : message));
      }
      setStatusText("Ready");
      await loadConversations();
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "Chat failed.");
      setMessages((previous) => previous.map((message) => message.id === assistantId ? { ...message, content: "I could not reach the selected local model. Check Ollama/runtime status and try again." } : message));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-[100dvh] bg-[#1b1b1a] text-[#e7e1d7]">
      <aside className="hidden h-[100dvh] w-[236px] shrink-0 flex-col border-r border-[#343431] bg-[#20201f] md:flex">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between px-2 py-1">
            <div className="claude-serif text-xl text-[#f0ede7]">Claude</div>
            <div className="flex gap-2 text-[#c8c2b8]"><span>⌕</span><span>▯</span></div>
          </div>
          <nav className="px-2 pt-5 text-[13px] text-[#d1ccc3]">
            <SidebarButton icon="+" label="New chat" onClick={createConversation} />
            <SidebarButton icon="◔" label="Chats" />
            <SidebarButton icon="▱" label="Projects" />
            <SidebarButton icon="⌘" label="Artifacts" />
            <SidebarButton icon="▣" label="Customize" />
            <p className="px-1 pb-2 pt-5 text-[11px] text-[#78746d]">Products</p>
            <SidebarButton icon="☷" label="Cowork" />
            <SidebarButton icon="〈〉" label="Code" />
          </nav>
          <div className="min-h-0 flex-1 overflow-auto px-2 pt-4 scrollbar-thin">
            <div className="flex items-center justify-between px-1 text-[11px] text-[#78746d]"><span>Recents</span><span>⇅</span></div>
            <ConversationList conversations={conversations} activeId={activeId} onSelect={setActiveId} onRename={renameConversation} onDelete={deleteConversation} />
          </div>
          <div className="border-t border-[#343431] p-2">
            <div className="flex items-center gap-3 rounded-lg p-1.5 hover:bg-[#292927]">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d9d5ca] text-sm font-semibold text-[#1b1b1a]">JS</div>
              <div className="min-w-0 flex-1"><p className="truncate text-[13px] text-[#f0ede7]">john skibidi</p><p className="text-[11px] text-[#a8a39a]">Free plan</p></div>
              <button className="rounded-lg border border-[#484842] px-2 py-1 text-[#c8c2b8]">⇩</button>
            </div>
          </div>
        </div>
      </aside>

      <section className="relative flex min-w-0 flex-1 flex-col">
        <header className="flex h-8 items-center justify-center px-4 text-xs text-[#a8a39a]">
          <span className="rounded-md bg-[#151514] px-2 py-1">Free plan · <span className="underline">Upgrade</span></span>
          <span className="absolute right-4 text-[#c8c2b8]">♙</span>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center px-4 pb-24">
          <div className="w-full max-w-[660px]">
            {messages.length ? (
              <div className="mb-6 max-h-[52vh] space-y-4 overflow-auto pr-2 scrollbar-thin">
                {messages.map((message) => (
                  <article key={message.id} className={`rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === "user" ? "ml-auto max-w-[78%] bg-[#2f2f2d] text-[#f0ede7]" : "mr-auto max-w-[88%] text-[#e7e1d7]"}`}>
                    {message.content || "..."}
                  </article>
                ))}
              </div>
            ) : (
              <h1 className="claude-serif mb-8 flex items-center justify-center gap-4 text-center text-4xl tracking-[-0.04em] text-[#d8d2c8]">
                <span className="text-4xl text-[#d97745]">✺</span>
                john skibidi returns!
              </h1>
            )}

            <div className="relative rounded-2xl bg-[#2b2b29] p-4 shadow-2xl shadow-black/25">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void submitMessage();
                  }
                }}
                placeholder="How can I help you today?"
                className="min-h-14 w-full resize-none bg-transparent text-sm text-[#e7e1d7] outline-none placeholder:text-[#9a958d]"
              />
              <div className="flex items-center justify-between pt-2">
                <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full text-2xl text-[#f0ede7] hover:bg-[#383834]">+</button>
                <div className="flex items-center gap-3 text-xs text-[#a8a39a]">
                  <div className="relative">
                    <button type="button" onClick={() => setIsModelPanelOpen((open) => !open)} className="rounded-lg px-2 py-1 hover:bg-[#383834]">
                      {currentModel || "Haiku 4.5"} <span className="text-[#78746d]">Extended⌄</span>
                    </button>
                    {isModelPanelOpen ? (
                      <div className="absolute bottom-9 right-0 w-72">
                        <ModelPanel
                          provider={provider}
                          currentModel={currentModel}
                          installed={installed}
                          onProviderChange={(nextProvider) => { setProvider(nextProvider); setCurrentModel(""); }}
                          onModelChange={(model) => void patchActiveModel(model)}
                          onOpenManager={() => { setIsModelPanelOpen(false); setIsModelDialogOpen(true); }}
                        />
                      </div>
                    ) : null}
                  </div>
                  <span>⌕</span>
                  <button type="button" disabled={busy} onClick={() => void submitMessage()} className="rounded-full px-2 py-1 text-lg hover:bg-[#383834] disabled:opacity-50">⌁</button>
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {[
                ["〈/〉", "Code"],
                ["◈", "Learn"],
                ["✐", "Write"],
                ["☕", "Life stuff"],
                ["◌", "Claude's choice"]
              ].map(([icon, label]) => (
                <button key={label} className="rounded-lg bg-[#30302e] px-3 py-1.5 text-xs text-[#f0ede7] hover:bg-[#3a3a36]">
                  <span className="text-[#a8a39a]">{icon}</span> {label}
                </button>
              ))}
            </div>
            <p className="mt-4 text-center text-xs text-[#78746d]">{activeConversation?.title ?? statusText} · {statusText}</p>
          </div>
        </div>
      </section>

      <ModelManagerDialog
        open={isModelDialogOpen}
        provider={provider}
        search={search}
        results={results}
        installed={installed}
        downloadStatus={downloadStatus}
        defaultModel={defaultModel}
        onClose={() => setIsModelDialogOpen(false)}
        onSearchChange={setSearch}
        onDownload={(tag) => void downloadModel(tag)}
        onSetDefault={(model) => void setDefault(model)}
        onSelectModel={(model) => void patchActiveModel(model)}
      />
    </main>
  );
}

function SidebarButton({ icon, label, onClick }: { icon: string; label: string; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-md px-1.5 py-2 text-left hover:bg-[#292927]">
      <span className="flex h-4 w-4 items-center justify-center text-sm text-[#f0ede7]">{icon}</span>
      <span>{label}</span>
    </button>
  );
}
