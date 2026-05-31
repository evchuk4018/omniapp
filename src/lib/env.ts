import { z } from "zod";
import type { ProviderId } from "@/features/ai/types";

const providerSchema = z.enum(["ollama", "openai-local"]);

export const env = {
  databaseUrl: process.env.DATABASE_URL ?? "file:./dev.db",
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434",
  openAiLocalBaseUrl: process.env.OPENAI_LOCAL_BASE_URL ?? "http://127.0.0.1:1234/v1",
  defaultProvider: providerSchema.catch("ollama").parse(process.env.DEFAULT_PROVIDER) as ProviderId
};
