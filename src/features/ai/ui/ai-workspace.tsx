"use client";

import { useEffect, useMemo, useState } from "react";
import { ConversationList } from "@/features/ai/ui/conversation-list";
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

  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-[1500px] px-4 py-4 md:px-6">
      <div className="mb-3 flex items-center justify-between rounded-xl border border-[#1b2128] bg-[#0b0f14] px-4 py-3">
        <div>
          <p className="text-sm uppercase tracking-[0.16em] text-[#97a0ab]">name.com/ai</p>
          <h1 className="text-lg font-medium">Personal AI Command Layer</h1>
        </div>
        <p className="text-xs text-[#97a0ab]">Single-user local-first</p>
      </div>

      <div className="grid gap-4 md:grid-cols-[280px_1fr]">
        <ConversationList
          activeId={activeId}
          items={conversations}
          onCreate={createConversation}
          onDelete={deleteConversation}
          onRename={renameConversation}
          onSelect={setActiveId}
        />

        <section className="surface flex min-h-[72dvh] flex-col rounded-xl p-3">
          <div className="mb-2 flex-1 space-y-3 overflow-y-auto rounded-lg border border-[#232a32] bg-[#0b1016] p-3">
            {messages.length === 0 ? (
              <p className="text-sm text-[#97a0ab]">
                Start a conversation. Pick an installed model from the composer, or use Search models to download one.
              </p>
            ) : (
              messages.map((message) => (
                <article
                  className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                    message.role === "user"
                      ? "ml-auto bg-[#1a73e8] text-white"
                      : "mr-auto border border-[#2a313a] bg-[#131921]"
                  }`}
                  key={message.id}
                >
                  {message.content || "..."}
                </article>
              ))
            )}
          </div>

          <div className="mt-3 rounded-3xl border border-[#2a313a] bg-[#121820] px-3 py-2">
            <div className="mb-2 flex flex-wrap items-center gap-2 border-b border-[#232a32] pb-2">
              <select
                className="rounded-md border border-[#2a2f36] bg-[#11141a] px-2 py-1 text-xs"
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
                <option value="">Auto select model</option>
                {installed.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.id}
                  </option>
                ))}
              </select>
              <button
                className="rounded-md border border-[#2a2f36] bg-[#11141a] px-2 py-1 text-xs hover:bg-[#181c24]"
                onClick={() => setIsModelDialogOpen(true)}
                type="button"
              >
                Search models
              </button>
              <p className="text-xs text-[#97a0ab]">{currentModel ? `Current: ${currentModel}` : "Using auto model resolution."}</p>
            </div>

            <div className="flex items-end gap-2">
              <textarea
                className="max-h-36 min-h-[44px] flex-1 resize-y bg-transparent px-2 py-2 text-sm outline-none"
                onChange={(event) => setInput(event.target.value)}
                placeholder="Send a prompt..."
                value={input}
              />
              <button
                className="rounded-full bg-[#1a73e8] px-4 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:bg-[#33445e]"
                disabled={busy || !activeConversation}
                onClick={send}
                type="button"
              >
                {busy ? "Streaming..." : "Send"}
              </button>
            </div>
          </div>

          <p className="mt-2 text-xs text-[#97a0ab]">{statusText}</p>
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
