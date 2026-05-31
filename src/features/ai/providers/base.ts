import type { ChatMessage, DownloadProgress, ModelInfo, ProviderId } from "@/features/ai/types";

export type StreamChatInput = {
  modelTag: string;
  messages: ChatMessage[];
  callbacks: {
    onToken: (token: string) => void;
  };
};

export interface AiProvider {
  readonly id: ProviderId;
  listInstalledModels(): Promise<ModelInfo[]>;
  searchModels(query: string): Promise<ModelInfo[]>;
  downloadModel(tag: string): Promise<void>;
  getDownloadStatus(tag: string): Promise<DownloadProgress>;
  streamChat(input: StreamChatInput): Promise<void>;
}
