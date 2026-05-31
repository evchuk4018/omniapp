import type { AiProvider } from "@/features/ai/providers/base";
import { OllamaProvider } from "@/features/ai/providers/ollama-provider";
import { OpenAiLocalProvider } from "@/features/ai/providers/openai-local-provider";
import type { ProviderId } from "@/features/ai/types";

const providers: Record<ProviderId, AiProvider> = {
  ollama: new OllamaProvider(),
  "openai-local": new OpenAiLocalProvider()
};

export const providerFactory = {
  get(provider: ProviderId): AiProvider {
    return providers[provider];
  },
  all(): AiProvider[] {
    return Object.values(providers);
  }
};
