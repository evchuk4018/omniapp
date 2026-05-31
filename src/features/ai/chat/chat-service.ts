import { conversationRepo } from "@/features/ai/data/conversation-repo";
import { settingRepo } from "@/features/ai/data/setting-repo";
import { providerFactory } from "@/features/ai/providers/provider-factory";
import type { ChatMessage, ProviderId } from "@/features/ai/types";

type ModelSelection = {
  provider: ProviderId;
  modelTag: string;
};

const normalizeProvider = (value: string | null | undefined): ProviderId => {
  return value === "openai-local" ? "openai-local" : "ollama";
};

export const chatService = {
  async resolveModel(
    conversationId: string,
    providerInput?: ProviderId,
    modelInput?: string
  ): Promise<ModelSelection> {
    const conversation = await conversationRepo.get(conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    if (modelInput && providerInput) {
      return { provider: providerInput, modelTag: modelInput };
    }

    if (conversation.activeModelTag) {
      return {
        provider: normalizeProvider(conversation.provider),
        modelTag: conversation.activeModelTag
      };
    }

    const defaults = await settingRepo.getDefaultModel();
    if (defaults.modelTag) {
      return {
        provider: normalizeProvider(defaults.provider),
        modelTag: defaults.modelTag
      };
    }

    const installed = await providerFactory.get("ollama").listInstalledModels();
    if (installed[0]) {
      return { provider: "ollama", modelTag: installed[0].id };
    }

    throw new Error("No model installed. Download a model first.");
  },

  async streamReply(input: {
    conversationId: string;
    messages: ChatMessage[];
    provider?: ProviderId;
    modelTag?: string;
    onToken: (token: string) => void;
  }): Promise<ModelSelection> {
    const selected = await this.resolveModel(input.conversationId, input.provider, input.modelTag);
    await providerFactory.get(selected.provider).streamChat({
      modelTag: selected.modelTag,
      messages: input.messages,
      callbacks: { onToken: input.onToken }
    });
    return selected;
  }
};
