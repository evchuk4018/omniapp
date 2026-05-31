import type { ProviderId } from "@/features/ai/types";

export function normalizeProvider(value: string | null | undefined): ProviderId {
  return value === "openai-local" ? "openai-local" : "ollama";
}

export function parseProvider(value: string | null): ProviderId {
  return normalizeProvider(value);
}
