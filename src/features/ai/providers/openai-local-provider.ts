import { env } from "@/lib/env";
import type { ChatMessage, DownloadProgress, ModelInfo } from "@/features/ai/types";
import type { AiProvider } from "@/features/ai/providers/base";

type ModelListResponse = {
  data?: Array<{ id: string }>;
};

type ChatChunk = {
  choices?: Array<{ delta?: { content?: string }; message?: { content?: string } }>;
  error?: { message?: string };
};

export class OpenAiLocalProvider implements AiProvider {
  readonly id = "openai-local" as const;

  async listInstalledModels(): Promise<ModelInfo[]> {
    const response = await fetch(`${env.openAiLocalBaseUrl}/models`);
    if (!response.ok) {
      throw new Error(`Local Llama runtime request failed (${response.status}).`);
    }
    const data = (await response.json()) as ModelListResponse;
    return (data.data ?? []).map((model) => ({
      id: model.id,
      provider: this.id,
      isInstalled: true,
      source: "installed" as const
    }));
  }

  async searchModels(query: string): Promise<ModelInfo[]> {
    const q = query.trim().toLowerCase();
    const installed = await this.listInstalledModels();
    return installed.filter((model) => model.id.toLowerCase().includes(q));
  }

  async downloadModel(): Promise<void> {
    throw new Error("Downloads are not supported by the OpenAI-compatible local runtime.");
  }

  async getDownloadStatus(tag: string): Promise<DownloadProgress> {
    return { tag, provider: this.id, status: "idle", message: "Downloads are managed by the local runtime." };
  }

  async streamChat(input: { modelTag: string; messages: ChatMessage[]; callbacks: { onToken: (token: string) => void } }) {
    const response = await fetch(`${env.openAiLocalBaseUrl}/chat/completions`, {
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
      const chunks = buffer.split("\n\n");
      buffer = chunks.pop() ?? "";

      for (const chunk of chunks) {
        const line = chunk.split("\n").find((part) => part.startsWith("data:"));
        if (!line) continue;
        const payload = line.replace(/^data:\s*/, "").trim();
        if (!payload || payload === "[DONE]") continue;
        const parsed = JSON.parse(payload) as ChatChunk;
        if (parsed.error?.message) throw new Error(parsed.error.message);
        const token = parsed.choices?.[0]?.delta?.content ?? parsed.choices?.[0]?.message?.content ?? "";
        if (token) input.callbacks.onToken(token);
      }
    }
  }
}
