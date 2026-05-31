"use client";

import { useEffect, useMemo, useState } from "react";
import { ModelManagerDialog } from "@/features/ai/ui/model-manager-dialog";
import type { ConversationSummary, ModelInfo, ProviderId } from "@/features/ai/types";

type ChatMessage = { id: string; role: "user" | "assistant" | "system"; content: string };

type ApiResult<T> = {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
};

type ConversationsPayload = { conversations?: ConversationSummary[] };
type MessagesPayload = { messages?: Array<{ id: string; role: ChatMessage["role"]; content: string }> };
type ConversationPayload = { conversation?: ConversationSummary };
type ModelsPayload = { models?: ModelInfo[] };
type DefaultsPayload = { provider?: ProviderId; modelTag?: string | null };
type DownloadPayload = { ok?: boolean; error?: string };
type OkPayload = { ok?: boolean };

const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

function normalizeError(status: number, payload: unknown): string {
  if (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string" && payload.error) {
    return payload.error;
  }
  if (status > 0) {
    return `Request failed (${status}).`;
  }
  return "Network request failed.";
}

async function fetchJsonSafe<T>(input: RequestInfo | URL, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const response = await fetch(input, init);
    const raw = await response.text();
    const hasBody = raw.trim().length > 0;
    let parsed: T | null = null;

    if (hasBody) {
      try {
        parsed = JSON.parse(raw) as T;
      } catch {
        return {
          ok: false,
          status: response.status,
          data: null,
          error: response.ok ? "Invalid response payload." : `Request failed (${response.status}).`
        };
      }
    }

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        data: parsed,
        error: normalizeError(response.status, parsed)
      };
    }

    return { ok: true, status: response.status, data: parsed, error: null };
  } catch {
    return {
      ok: false,
      status: 0,
      data: null,
      error: "Network request failed."
    };
  }
}

export function AiWorkspace() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [provider, setProvider] = useState<ProviderId>("ollama");
  const [currentModel, setCurrentModel] = useState("");
  const [defaultModel, setDefaultModel] = useState("");
  const [installed, setInstalled] = useState<ModelInfo[]>([]);
  const [results, setResults] = useState<ModelInfo[]>([]);
  const [search, setSearch] = useState("");
  const [statusText, setStatusText] = useState("Ready");
  const [busy, setBusy] = useState(false);
  const [isModelDialogOpen, setIsModelDialogOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const activeConversation = useMemo(
    () => conversations.find((item) => item.id === activeId) ?? null,
    [activeId, conversations]
  );

  const loadConversations = async () => {
    const result = await fetchJsonSafe<ConversationsPayload>("/api/ai/conversations");
    if (!result.ok || !result.data) {
      setStatusText(result.error ?? "Failed to load conversations.");
      return;
    }
    const list = result.data.conversations ?? [];
    setConversations(list);
    if (!activeId && list.length) {
      setActiveId(list[0].id);
    }
  };

  const loadMessages = async (conversationId: string) => {
    const result = await fetchJsonSafe<MessagesPayload>(`/api/ai/conversations/${conversationId}/messages`);
    if (!result.ok || !result.data) {
      setStatusText(result.error ?? "Failed to load messages.");
      return;
    }
    setMessages((result.data.messages ?? []).map((item) => ({ id: item.id, role: item.role, content: item.content })));
  };

  const loadInstalled = async (selectedProvider: ProviderId) => {
    const result = await fetchJsonSafe<ModelsPayload>(`/api/ai/models/installed?provider=${selectedProvider}`);
    if (!result.ok || !result.data) {
      setInstalled([]);
      setStatusText(result.error ?? "Failed to load installed models.");
      return;
    }
    setInstalled(result.data.models ?? []);
  };

  const loadDefaults = async () => {
    const result = await fetchJsonSafe<DefaultsPayload>("/api/ai/settings/default-model");
    if (!result.ok || !result.data) {
      setStatusText(result.error ?? "Failed to load defaults.");
      return;
    }
    if (result.data.provider === "openai-local") {
      setProvider("openai-local");
    }
    if (result.data.modelTag) {
      setDefaultModel(result.data.modelTag);
      setCurrentModel(result.data.modelTag);
    }
  };

  useEffect(() => {
    void loadConversations();
    void loadDefaults();
  }, []);

  useEffect(() => {
    if (activeId) {
      void loadMessages(activeId);
      const selected = conversations.find((item) => item.id === activeId);
      if (selected?.provider) {
        setProvider(selected.provider);
      }
      if (selected?.activeModelTag) {
        setCurrentModel(selected.activeModelTag);
      }
    }
  }, [activeId, conversations]);

  useEffect(() => {
    void loadInstalled(provider);
  }, [provider]);

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      const result = await fetchJsonSafe<ModelsPayload>(
        `/api/ai/models/search?provider=${provider}&q=${encodeURIComponent(search)}`
      );
      if (!result.ok || !result.data) {
        setResults([]);
        return;
      }
      setResults(result.data.models ?? []);
    }, 150);
    return () => clearTimeout(timeoutId);
  }, [provider, search]);

  const createConversation = async () => {
    const result = await fetchJsonSafe<ConversationPayload>("/api/ai/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, activeModelTag: currentModel || null })
    });
    if (!result.ok || !result.data?.conversation) {
      setStatusText(result.error ?? "Failed to create conversation.");
      return;
    }
    const conversation = result.data.conversation;
    setConversations((prev) => [conversation, ...prev]);
    setActiveId(conversation.id);
    setMessages([]);
  };

  const renameConversation = async (item: ConversationSummary) => {
    const title = window.prompt("Rename conversation", item.title);
    if (!title?.trim()) return;
    const result = await fetchJsonSafe<ConversationPayload>(`/api/ai/conversations/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title })
    });
    if (!result.ok) {
      setStatusText(result.error ?? "Failed to rename conversation.");
      return;
    }
    void loadConversations();
  };

  const deleteConversation = async (item: ConversationSummary) => {
    if (!window.confirm(`Delete "${item.title}"?`)) return;
    const result = await fetchJsonSafe<OkPayload>(`/api/ai/conversations/${item.id}`, { method: "DELETE" });
    if (!result.ok) {
      setStatusText(result.error ?? "Failed to delete conversation.");
      return;
    }
    if (item.id === activeId) {
      setActiveId(null);
      setMessages([]);
    }
    void loadConversations();
  };

  const saveDefault = async () => {
    if (!currentModel) return;
    const result = await fetchJsonSafe<OkPayload>("/api/ai/settings/default-model", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, modelTag: currentModel })
    });
    if (!result.ok) {
      setStatusText(result.error ?? "Failed to save default model.");
      return;
    }
    setDefaultModel(currentModel);
    setStatusText("Default model saved.");
  };

  const setConversationModel = async (tag: string | null) => {
    if (!activeConversation) {
      return;
    }
    const result = await fetchJsonSafe<ConversationPayload>(`/api/ai/conversations/${activeConversation.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, activeModelTag: tag })
    });
    if (!result.ok) {
      setStatusText(result.error ?? "Failed to set conversation model.");
      return;
    }
    void loadConversations();
  };

  const pickModel = async (tag: string) => {
    setCurrentModel(tag);
    await setConversationModel(tag);
  };

  const clearModel = async () => {
    setCurrentModel("");
    await setConversationModel(null);
  };

  const changeProvider = (nextProvider: ProviderId) => {
    setProvider(nextProvider);
    setStatusText(`Provider set to ${nextProvider}.`);
  };

  const downloadModel = async (tag: string) => {
    setStatusText(`Downloading ${tag}...`);
    const result = await fetchJsonSafe<DownloadPayload>("/api/ai/models/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, modelTag: tag })
    });
    const payload = result.data;
    if (!result.ok || !payload?.ok) {
      setStatusText(payload?.error || result.error || "Download failed.");
      return;
    }
    setStatusText(`Downloaded ${tag}.`);
    await loadInstalled(provider);
  };

  const send = async () => {
    if (!activeConversation || !input.trim() || busy) return;
    if (!currentModel && installed.length === 0) {
      setStatusText("Download a model first, then send your prompt.");
      return;
    }

    setBusy(true);
    const text = input.trim();
    setInput("");

    const userMessage: ChatMessage = { id: uid(), role: "user", content: text };
    const assistantMessage: ChatMessage = { id: uid(), role: "assistant", content: "" };
    const draft = [...messages, userMessage, assistantMessage];
    setMessages(draft);

    try {
      const response = await fetch("/api/ai/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeConversation.id,
          provider,
          modelTag: currentModel || undefined,
          messages: draft.map((message) => ({ role: message.role, content: message.content }))
        })
      });

      if (!response.ok) {
        setStatusText(`Chat request failed (${response.status}).`);
        return;
      }

      if (!response.body) {
        setStatusText("Model response stream is unavailable.");
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        assistantText += decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((entry) => (entry.id === assistantMessage.id ? { ...entry, content: assistantText } : entry))
        );
      }
    } catch {
      setStatusText("Network request failed.");
    } finally {
      setBusy(false);
      await loadConversations();
    }
  };

  const openConversation = (conversationId: string) => {
    setActiveId(conversationId);
    setIsSidebarOpen(false);
  };

  const createFromSidebar = async () => {
    await createConversation();
    setIsSidebarOpen(false);
  };

  return (
    <main className="relative min-h-[100dvh] bg-[var(--bg)] text-[var(--text)]">
      {isSidebarOpen ? (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
          type="button"
        />
      ) : null}

      <div className="mx-auto grid min-h-[100dvh] w-full max-w-[1919px] md:grid-cols-[236px_1fr]">
        <aside
          className={`fixed inset-y-0 left-0 z-30 w-[236px] border-r border-[var(--line)] bg-[var(--rail)] px-2 pb-2 pt-3 transition-transform duration-200 md:static md:translate-x-0 ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="mb-2 flex items-center justify-between px-2">
            <h1 className="text-[30px] font-medium leading-none tracking-tight text-[#f2f3f6] [font-family:Georgia,'Times_New_Roman',serif]">
              OmniApp
            </h1>
            <button
              aria-label="Collapse sidebar"
              className="hidden h-7 w-7 rounded-md border border-[var(--line)] text-xs text-[var(--text-muted)] md:inline-flex md:items-center md:justify-center"
              disabled
              type="button"
            >
              []
            </button>
          </div>

          <div className="space-y-0.5 px-1">
            <button
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-[var(--text-soft)] transition hover:bg-[var(--panel)] hover:text-[var(--text)]"
              onClick={() => void createFromSidebar()}
              type="button"
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[var(--line)] text-xs">+</span>
              <span>New chat</span>
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-[var(--text-soft)] transition hover:bg-[var(--panel)] hover:text-[var(--text)]"
              disabled
              type="button"
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-[var(--line)] text-[10px]">C</span>
              <span>Chats</span>
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-[var(--text-soft)] transition hover:bg-[var(--panel)] hover:text-[var(--text)]"
              disabled
              type="button"
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-[var(--line)] text-[10px]">P</span>
              <span>Projects</span>
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-[var(--text-soft)] transition hover:bg-[var(--panel)] hover:text-[var(--text)]"
              disabled
              type="button"
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-[var(--line)] text-[10px]">A</span>
              <span>Artifacts</span>
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-[var(--text-soft)] transition hover:bg-[var(--panel)] hover:text-[var(--text)]"
              disabled
              type="button"
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-[var(--line)] text-[10px]">U</span>
              <span>Customize</span>
            </button>
          </div>

          <div className="mt-3 px-2">
            <p className="text-xs text-[var(--text-muted)]">Products</p>
            <div className="mt-1 space-y-0.5">
              <button
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-[var(--text-soft)] transition hover:bg-[var(--panel)] hover:text-[var(--text)]"
                disabled
                type="button"
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-[var(--line)] text-[10px]">W</span>
                <span>Cowork</span>
              </button>
              <button
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-[var(--text-soft)] transition hover:bg-[var(--panel)] hover:text-[var(--text)]"
                disabled
                type="button"
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-[var(--line)] text-[10px]">{`</>`}</span>
                <span>Code</span>
              </button>
            </div>
          </div>

          <div className="mt-3 min-h-0 border-t border-[var(--line)] px-2 pt-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs text-[var(--text-muted)]">Recents</p>
              <button
                className="rounded-md px-1 text-xs text-[var(--text-muted)] hover:bg-[var(--panel)] hover:text-[var(--text)]"
                onClick={() => void loadConversations()}
                type="button"
              >
                Refresh
              </button>
            </div>
            <div className="max-h-[calc(100dvh-365px)] space-y-1 overflow-y-auto pr-1">
              {conversations.length === 0 ? <p className="px-1 text-xs text-[var(--text-muted)]">No conversations yet.</p> : null}
              {conversations.map((item) => {
                const isActive = item.id === activeId;
                return (
                  <div
                    className={`group rounded-lg border px-2 py-2 ${
                      isActive ? "border-[var(--line-strong)] bg-[var(--panel-strong)]" : "border-transparent hover:bg-[var(--panel)]"
                    }`}
                    key={item.id}
                  >
                    <button className="w-full text-left" onClick={() => openConversation(item.id)} title={item.title} type="button">
                      <p className="truncate text-sm text-[var(--text)]">{item.title}</p>
                      <p className="truncate text-[11px] text-[var(--text-muted)]">{item.provider}</p>
                    </button>
                    <div className="mt-1 hidden gap-1 group-hover:flex">
                      <button
                        className="rounded-md border border-[var(--line)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)] hover:text-[var(--text)]"
                        onClick={() => void renameConversation(item)}
                        type="button"
                      >
                        Rename
                      </button>
                      <button
                        className="rounded-md border border-[var(--line)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)] hover:text-[var(--text)]"
                        onClick={() => void deleteConversation(item)}
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 border-t border-[var(--line)] bg-[var(--rail)] px-2 py-2">
            <div className="flex items-center justify-between rounded-xl px-1 py-1">
              <div className="flex min-w-0 items-center gap-2">
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#d1cec3] text-xs font-semibold text-[#222]">
                  JS
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm text-[var(--text)]">john skibidi</p>
                  <p className="truncate text-xs text-[var(--text-muted)]">Free plan</p>
                </div>
              </div>
              <button className="h-7 w-7 rounded-md border border-[var(--line)] text-[var(--text-muted)]" disabled type="button">
                v
              </button>
            </div>
          </div>
        </aside>

        <section className="relative flex min-h-[100dvh] flex-col bg-[var(--bg)] px-4 py-4 md:px-8">
          <div className="mb-2 flex items-center justify-between">
            <button
              aria-label="Open navigation"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--line)] text-sm text-[var(--text-muted)] md:hidden"
              onClick={() => setIsSidebarOpen(true)}
              type="button"
            >
              =
            </button>
            <div className="mx-auto rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-1 text-xs text-[var(--text-muted)]">
              Free plan · Upgrade
            </div>
            <button
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--line)] text-xs text-[var(--text-muted)]"
              disabled
              type="button"
            >
              O
            </button>
          </div>

          <div className="mx-auto flex w-full max-w-[900px] flex-1 flex-col">
            <div className={`${messages.length === 0 ? "flex-1" : ""} flex flex-col justify-end pb-4 pt-10`}>
              {messages.length > 0 ? (
                <div className="mb-6 max-h-[48dvh] space-y-3 overflow-y-auto pr-1">
                  {messages.map((message) => (
                    <article
                      className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                        message.role === "user"
                          ? "ml-auto bg-[var(--accent)] text-white"
                          : "mr-auto border border-[var(--line)] bg-[var(--panel)] text-[var(--text)]"
                      }`}
                      key={message.id}
                    >
                      {message.content || "..."}
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mb-7 text-center">
                  <h2 className="text-[49px] font-medium leading-[1.1] text-[#cfccc2] [font-family:Georgia,'Times_New_Roman',serif]">
                    <span className="mr-3 align-middle text-[34px] text-[#dc7d4f]">*</span>
                    <span className="align-middle">how can omniapp help?</span>
                  </h2>
                </div>
              )}

              <div className="mx-auto w-full max-w-[780px]">
                <div className="rounded-[20px] border border-[var(--line)] bg-[var(--composer)] px-4 pb-3 pt-4 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
                  <textarea
                    className="min-h-[80px] w-full resize-none bg-transparent text-[28px] leading-[1.25] text-[var(--text)] outline-none placeholder:text-[#858071] md:text-[33px]"
                    onChange={(event) => setInput(event.target.value)}
                    placeholder="How can I help you today?"
                    value={input}
                  />

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] pt-2">
                    <button
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--line)] text-lg text-[var(--text-muted)] hover:text-[var(--text)]"
                      disabled
                      type="button"
                    >
                      +
                    </button>

                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        className="h-8 rounded-md border border-[var(--line)] bg-[var(--panel)] px-2 text-xs text-[var(--text-muted)]"
                        onChange={(event) => {
                          const nextTag = event.target.value;
                          if (!nextTag) {
                            void clearModel();
                            return;
                          }
                          void pickModel(nextTag);
                        }}
                        value={currentModel}
                      >
                        <option value="">Auto model</option>
                        {installed.map((model) => (
                          <option key={model.id} value={model.id}>
                            {model.id}
                          </option>
                        ))}
                      </select>
                      <button
                        className="h-8 rounded-md border border-[var(--line)] bg-[var(--panel)] px-2 text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
                        onClick={() => setIsModelDialogOpen(true)}
                        type="button"
                      >
                        Manage
                      </button>
                      <button
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--line)] text-xs text-[var(--text-muted)]"
                        disabled
                        type="button"
                      >
                        Mic
                      </button>
                      <button
                        className="inline-flex h-8 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 text-xs font-medium text-[var(--text)] transition hover:bg-[var(--panel-strong)] disabled:cursor-not-allowed disabled:opacity-45"
                        disabled={busy || !activeConversation}
                        onClick={() => void send()}
                        type="button"
                      >
                        {busy ? "Streaming..." : "Send"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                  {["Code", "Learn", "Write", "Life stuff", "OmniApp's choice"].map((chip) => (
                    <button
                      className="rounded-lg border border-[var(--line)] bg-[var(--chip)] px-3 py-1 text-sm text-[var(--text-soft)] transition hover:text-[var(--text)]"
                      disabled
                      key={chip}
                      type="button"
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                <p className="mt-3 text-center text-xs text-[var(--text-muted)]">{statusText}</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <ModelManagerDialog
        currentModel={currentModel}
        defaultModel={defaultModel}
        installed={installed}
        onClose={() => setIsModelDialogOpen(false)}
        onDownload={downloadModel}
        onPickModel={(tag) => void pickModel(tag)}
        onProviderChange={changeProvider}
        onSearchChange={setSearch}
        onSetDefault={saveDefault}
        open={isModelDialogOpen}
        provider={provider}
        results={results}
        search={search}
        statusText={statusText}
      />
    </main>
  );
}
