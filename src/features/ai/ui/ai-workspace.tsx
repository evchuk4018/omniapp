"use client";

import { useEffect, useMemo, useState } from "react";
import { ConversationList } from "@/features/ai/ui/conversation-list";
import { ModelPanel } from "@/features/ai/ui/model-panel";
import type { ConversationSummary, ModelInfo, ProviderId } from "@/features/ai/types";

type ChatMessage = { id: string; role: "user" | "assistant" | "system"; content: string };

const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

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

  const activeConversation = useMemo(
    () => conversations.find((item) => item.id === activeId) ?? null,
    [activeId, conversations]
  );

  const loadConversations = async () => {
    const response = await fetch("/api/ai/conversations");
    const data = await response.json();
    setConversations(data.conversations ?? []);
    if (!activeId && data.conversations?.length) {
      setActiveId(data.conversations[0].id);
    }
  };

  const loadMessages = async (conversationId: string) => {
    const response = await fetch(`/api/ai/conversations/${conversationId}/messages`);
    const data = await response.json();
    setMessages((data.messages ?? []).map((item: any) => ({ id: item.id, role: item.role, content: item.content })));
  };

  const loadInstalled = async (selectedProvider: ProviderId) => {
    const response = await fetch(`/api/ai/models/installed?provider=${selectedProvider}`);
    const data = await response.json();
    setInstalled(data.models ?? []);
  };

  const loadDefaults = async () => {
    const response = await fetch("/api/ai/settings/default-model");
    const data = await response.json();
    if (data.provider === "openai-local") {
      setProvider("openai-local");
    }
    if (data.modelTag) {
      setDefaultModel(data.modelTag);
      setCurrentModel(data.modelTag);
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
      const response = await fetch(`/api/ai/models/search?provider=${provider}&q=${encodeURIComponent(search)}`);
      const data = await response.json();
      setResults(data.models ?? []);
    }, 150);
    return () => clearTimeout(timeoutId);
  }, [provider, search]);

  const createConversation = async () => {
    const response = await fetch("/api/ai/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, activeModelTag: currentModel || null })
    });
    const data = await response.json();
    setConversations((prev) => [data.conversation, ...prev]);
    setActiveId(data.conversation.id);
    setMessages([]);
  };

  const renameConversation = async (item: ConversationSummary) => {
    const title = window.prompt("Rename conversation", item.title);
    if (!title?.trim()) return;
    await fetch(`/api/ai/conversations/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title })
    });
    void loadConversations();
  };

  const deleteConversation = async (item: ConversationSummary) => {
    if (!window.confirm(`Delete "${item.title}"?`)) return;
    await fetch(`/api/ai/conversations/${item.id}`, { method: "DELETE" });
    if (item.id === activeId) {
      setActiveId(null);
      setMessages([]);
    }
    void loadConversations();
  };

  const saveDefault = async () => {
    if (!currentModel) return;
    await fetch("/api/ai/settings/default-model", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, modelTag: currentModel })
    });
    setDefaultModel(currentModel);
    setStatusText("Default model saved.");
  };

  const pickModel = async (tag: string) => {
    setCurrentModel(tag);
    if (activeConversation) {
      await fetch(`/api/ai/conversations/${activeConversation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, activeModelTag: tag })
      });
      void loadConversations();
    }
  };

  const downloadModel = async (tag: string) => {
    setStatusText(`Downloading ${tag}...`);
    const response = await fetch("/api/ai/models/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, modelTag: tag })
    });
    const payload = await response.json();
    setStatusText(payload.ok ? `Downloaded ${tag}.` : payload.error || "Download failed.");
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

    if (!response.body) {
      setBusy(false);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let assistantText = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      assistantText += decoder.decode(value, { stream: true });
      setMessages((prev) => prev.map((entry) => (entry.id === assistantMessage.id ? { ...entry, content: assistantText } : entry)));
    }

    setBusy(false);
    await loadConversations();
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

      <div className="grid gap-4 md:grid-cols-[280px_1fr_300px]">
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
              <p className="text-sm text-[#97a0ab]">Start a conversation. If no model is installed, search and download one on the right.</p>
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

          <div className="mt-3 rounded-full border border-[#2a313a] bg-[#121820] px-3 py-2">
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
        </section>

        <ModelPanel
          currentModel={currentModel}
          defaultModel={defaultModel}
          installed={installed}
          onDownload={downloadModel}
          onPickModel={pickModel}
          onProviderChange={setProvider}
          onSearchChange={setSearch}
          onSetDefault={saveDefault}
          provider={provider}
          results={results}
          search={search}
          statusText={statusText}
        />
      </div>
    </main>
  );
}
