import { env } from "@/lib/env";
import type { ChatMessage, DownloadProgress, ModelInfo } from "@/features/ai/types";
import type { AiProvider } from "@/features/ai/providers/base";

type OpenAiModelResponse = {
  data?: Array<{ id: string }>;
};

const state = new Map<string, DownloadProgress>();

export class OpenAiCompatibleLocalProvider implements AiProvider {
  readonly id = "openai-local" as const;

  private async fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${env.openAiLocalBaseUrl}${path}`, init);
    if (!response.ok) {
      throw new Error(`OpenAI-compatible runtime request failed: ${response.status}`);
    }
    return (await response.json()) as T;
  }

  async listInstalledModels(): Promise<ModelInfo[]> {
    const data = await this.fetchJson<OpenAiModelResponse>("/models");
    return (data.data ?? []).map((item) => ({
      id: item.id,
      provider: this.id,
      isInstalled: true,
      source: "installed"
    }));
  }

  async searchModels(query: string): Promise<ModelInfo[]> {
    const installed = await this.listInstalledModels();
    const q = query.trim().toLowerCase();
    return installed.filter((item) => item.id.toLowerCase().includes(q));
  }

  async downloadModel(tag: string): Promise<void> {
    state.set(tag, {
      tag,
      provider: this.id,
      status: "failed",
      message: "This runtime does not manage downloads. Install models in the runtime first."
    });
    throw new Error("Install models in your local OpenAI-compatible runtime first.");
  }

  async getDownloadStatus(tag: string): Promise<DownloadProgress> {
    return (
      state.get(tag) ?? {
        tag,
        provider: this.id,
        status: "idle",
        message: "No download support on this runtime"
      }
    );
  }

  async streamChat(input: {
    modelTag: string;
    messages: ChatMessage[];
    callbacks: { onToken: (token: string) => void };
  }): Promise<void> {
    const response = await fetch(`${env.openAiLocalBaseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: input.modelTag,
        stream: true,
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
      const segments = buffer.split("\n\n");
      buffer = segments.pop() ?? "";

      for (const chunk of segments) {
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data:")) {
            continue;
          }
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") {
            return;
          }
          const json = JSON.parse(payload) as {
            choices?: Array<{ delta?: { content?: string } }>;
          };
          const token = json.choices?.[0]?.delta?.content;
          if (token) {
            input.callbacks.onToken(token);
          }
        }
      }
    }
  }
}
