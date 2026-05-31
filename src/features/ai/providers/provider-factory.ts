import { OpenAiCompatibleLocalProvider } from "@/features/ai/providers/openai-local-provider";
import { OllamaProvider } from "@/features/ai/providers/ollama-provider";
import type { AiProvider } from "@/features/ai/providers/base";
import type { ProviderId } from "@/features/ai/types";

const providers: Record<ProviderId, AiProvider> = {
  ollama: new OllamaProvider(),
  "openai-local": new OpenAiCompatibleLocalProvider()
};

export const providerFactory = {
  get(provider: ProviderId) {
    return providers[provider] ?? providers.ollama;
  }
};
