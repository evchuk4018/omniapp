export type ChatRole = "user" | "assistant" | "system";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type ProviderId = "ollama" | "openai-local";

export type ModelInfo = {
  id: string;
  provider: ProviderId;
  isInstalled: boolean;
  source: "installed" | "registry";
};

export type DownloadProgress = {
  tag: string;
  provider: ProviderId;
  status: "idle" | "running" | "success" | "failed";
  message: string;
};

export type ConversationSummary = {
  id: string;
  title: string;
  provider: ProviderId;
  activeModelTag: string | null;
  updatedAt: string;
};
