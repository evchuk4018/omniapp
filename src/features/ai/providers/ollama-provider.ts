import { env } from "@/lib/env";
import type { ChatMessage, DownloadProgress, ModelInfo } from "@/features/ai/types";
import type { AiProvider } from "@/features/ai/providers/base";

type OllamaTagsResponse = {
  models?: Array<{ model?: string; name?: string }>;
};

type OllamaStreamLine = {
  message?: { content?: string };
  response?: string;
  error?: string;
};

const curatedModels = [
  "llama3.2:3b",
  "llama3.1:8b",
  "qwen2.5:7b",
  "gemma3:4b",
  "mistral:7b",
  "codellama:7b",
  "deepseek-r1:8b"
];

const downloadState = new Map<string, DownloadProgress>();
const modelKey = (tag: string) => tag.trim().toLowerCase();

export class OllamaProvider implements AiProvider {
  readonly id = "ollama" as const;

  private async fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${env.ollamaBaseUrl}${path}`, init);
    if (!response.ok) {
      throw new Error(`Ollama request failed (${response.status}). Is Ollama running?`);
    }
    return (await response.json()) as T;
  }

  async listInstalledModels(): Promise<ModelInfo[]> {
    const data = await this.fetchJson<OllamaTagsResponse>("/api/tags");
    return (data.models ?? [])
      .map((item) => item.model ?? item.name ?? "")
      .filter(Boolean)
      .map((id) => ({ id, provider: this.id, isInstalled: true, source: "installed" as const }));
  }

  async searchModels(query: string): Promise<ModelInfo[]> {
    const q = query.trim().toLowerCase();
    const installed = await this.listInstalledModels();
    const installedMatches = installed.filter((model) => model.id.toLowerCase().includes(q));
    const registryMatches = curatedModels
      .filter((model) => !q || model.toLowerCase().includes(q))
      .map((id) => ({
        id,
        provider: this.id,
        isInstalled: installed.some((model) => model.id === id),
        source: "registry" as const
      }));

    const manual = q && !registryMatches.some((model) => model.id === query.trim())
      ? [{ id: query.trim(), provider: this.id, isInstalled: installed.some((model) => model.id === query.trim()), source: "manual" as const }]
      : [];

    return Array.from(new Map([...installedMatches, ...registryMatches, ...manual].map((model) => [model.id, model])).values());
  }

  async downloadModel(tag: string): Promise<void> {
    const cleanTag = tag.trim();
    if (!cleanTag) throw new Error("Model tag is required.");

    downloadState.set(modelKey(cleanTag), { tag: cleanTag, provider: this.id, status: "running", message: "Starting download" });

    try {
      const response = await fetch(`${env.ollamaBaseUrl}/api/pull`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: cleanTag, stream: false })
      });
      if (!response.ok) throw new Error(`Download failed (${response.status}).`);
      const payload = (await response.json()) as { status?: string; error?: string };
      if (payload.error) throw new Error(payload.error);
      downloadState.set(modelKey(cleanTag), { tag: cleanTag, provider: this.id, status: "success", message: payload.status ?? "Download complete" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Download failed.";
      downloadState.set(modelKey(cleanTag), { tag: cleanTag, provider: this.id, status: "failed", message });
      throw error;
    }
  }

  async getDownloadStatus(tag: string): Promise<DownloadProgress> {
    return downloadState.get(modelKey(tag)) ?? { tag, provider: this.id, status: "idle", message: "No active download" };
  }

  async streamChat(input: { modelTag: string; messages: ChatMessage[]; callbacks: { onToken: (token: string) => void } }) {
    const response = await fetch(`${env.ollamaBaseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: input.modelTag, messages: input.messages, stream: true })
    });

    if (!response.ok || !response.body) throw new Error(`Chat failed (${response.status}).`);

    const decoder = new TextDecoder();
    const reader = response.body.getReader();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const item = JSON.parse(trimmed) as OllamaStreamLine;
        if (item.error) throw new Error(item.error);
        const token = item.message?.content ?? item.response ?? "";
        if (token) input.callbacks.onToken(token);
      }
    }
  }
}
