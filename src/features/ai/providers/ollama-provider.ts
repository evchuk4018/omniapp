import { env } from "@/lib/env";
import type { ChatMessage, DownloadProgress, ModelInfo } from "@/features/ai/types";
import type { AiProvider } from "@/features/ai/providers/base";

type OllamaTagResponse = {
  models?: Array<{ model: string }>;
};

type OllamaStreamLine = {
  message?: { content?: string };
  done?: boolean;
  status?: string;
  error?: string;
};

const popularModels = [
  "llama3.2:3b",
  "qwen2.5:7b",
  "gemma3:4b",
  "mistral:7b",
  "codellama:7b",
  "deepseek-r1:8b"
];

const downloadState = new Map<string, DownloadProgress>();

export class OllamaProvider implements AiProvider {
  readonly id = "ollama" as const;

  private async fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${env.ollamaBaseUrl}${path}`, init);
    if (!response.ok) {
      throw new Error(`Ollama request failed: ${response.status}`);
    }
    return (await response.json()) as T;
  }

  async listInstalledModels(): Promise<ModelInfo[]> {
    const data = await this.fetchJson<OllamaTagResponse>("/api/tags");
    return (data.models ?? []).map((item) => ({
      id: item.model,
      provider: this.id,
      isInstalled: true,
      source: "installed" as const
    }));
  }

  async searchModels(query: string): Promise<ModelInfo[]> {
    const q = query.trim().toLowerCase();
    const installed = await this.listInstalledModels();
    const curated = popularModels
      .filter((model) => model.includes(q))
      .map((model) => ({
        id: model,
        provider: this.id,
        isInstalled: installed.some((entry) => entry.id === model),
        source: "registry" as const
      }));

    const installedMatches = installed.filter((entry) => entry.id.toLowerCase().includes(q));
    const combined = [...installedMatches, ...curated];
    const unique = new Map(combined.map((model) => [model.id, model]));

    if (!q && unique.size === 0) {
      for (const model of popularModels) {
        unique.set(model, {
          id: model,
          provider: this.id,
          isInstalled: installed.some((entry) => entry.id === model),
          source: "registry"
        });
      }
    }

    return Array.from(unique.values());
  }

  async downloadModel(tag: string): Promise<void> {
    const cleanTag = tag.trim();
    if (!cleanTag) {
      throw new Error("Model tag is required.");
    }

    downloadState.set(cleanTag, {
      tag: cleanTag,
      provider: this.id,
      status: "running",
      message: "Starting download"
    });

    const response = await fetch(`${env.ollamaBaseUrl}/api/pull`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: cleanTag, stream: false })
    });

    if (!response.ok) {
      downloadState.set(cleanTag, {
        tag: cleanTag,
        provider: this.id,
        status: "failed",
        message: `Download failed (${response.status})`
      });
      throw new Error(`Download failed (${response.status})`);
    }

    const payload = (await response.json()) as { status?: string; error?: string };
    if (payload.error) {
      downloadState.set(cleanTag, {
        tag: cleanTag,
        provider: this.id,
        status: "failed",
        message: payload.error
      });
      throw new Error(payload.error);
    }

    downloadState.set(cleanTag, {
      tag: cleanTag,
      provider: this.id,
      status: "success",
      message: payload.status ?? "Download complete"
    });
  }

  async getDownloadStatus(tag: string): Promise<DownloadProgress> {
    return (
      downloadState.get(tag) ?? {
        tag,
        provider: this.id,
        status: "idle",
        message: "No active download"
      }
    );
  }

  async streamChat(input: {
    modelTag: string;
    messages: ChatMessage[];
    callbacks: { onToken: (token: string) => void };
  }) {
    const response = await fetch(`${env.ollamaBaseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: input.modelTag,
        messages: input.messages.map((message) => ({
          role: message.role,
          content: message.content
        }))
      })
    });

    if (!response.ok || !response.body) {
      throw new Error(`Chat failed (${response.status})`);
    }

    const decoder = new TextDecoder();
    const reader = response.body.getReader();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
          continue;
        }
        let item: OllamaStreamLine | null = null;
        try {
          item = JSON.parse(trimmed) as OllamaStreamLine;
        } catch {
          continue;
        }
        const token = item.message?.content;
        if (token) {
          input.callbacks.onToken(token);
        }
        if (item.error) {
          throw new Error(item.error);
        }
      }
    }
  }
}
