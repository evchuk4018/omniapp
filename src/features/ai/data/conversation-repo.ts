import { prisma } from "@/lib/prisma";
import { normalizeProvider } from "@/features/ai/providers/provider-utils";
import type { ConversationSummary, ProviderId, StoredMessage } from "@/features/ai/types";

function toSummary(conversation: {
  id: string;
  title: string;
  provider: string | null;
  activeModelTag: string | null;
  updatedAt: Date;
}): ConversationSummary {
  return {
    id: conversation.id,
    title: conversation.title,
    provider: normalizeProvider(conversation.provider),
    activeModelTag: conversation.activeModelTag,
    updatedAt: conversation.updatedAt.toISOString()
  };
}

function toMessage(message: {
  id: string;
  role: string;
  content: string;
  provider: string;
  modelTag: string;
  createdAt: Date;
}): StoredMessage {
  return {
    id: message.id,
    role: message.role === "system" || message.role === "assistant" ? message.role : "user",
    content: message.content,
    provider: normalizeProvider(message.provider),
    modelTag: message.modelTag,
    createdAt: message.createdAt.toISOString()
  };
}

export const conversationRepo = {
  async list(): Promise<ConversationSummary[]> {
    const conversations = await prisma.conversation.findMany({ orderBy: { updatedAt: "desc" } });
    return conversations.map(toSummary);
  },

  async get(id: string): Promise<ConversationSummary | null> {
    const conversation = await prisma.conversation.findUnique({ where: { id } });
    return conversation ? toSummary(conversation) : null;
  },

  async create(input: { provider: ProviderId; activeModelTag?: string | null }): Promise<ConversationSummary> {
    const conversation = await prisma.conversation.create({
      data: { title: "Greeting", provider: input.provider, activeModelTag: input.activeModelTag ?? null }
    });
    return toSummary(conversation);
  },

  async update(id: string, input: { title?: string; provider?: ProviderId; activeModelTag?: string | null }) {
    const conversation = await prisma.conversation.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.provider !== undefined ? { provider: input.provider } : {}),
        ...(input.activeModelTag !== undefined ? { activeModelTag: input.activeModelTag } : {})
      }
    });
    return toSummary(conversation);
  },

  async delete(id: string): Promise<void> {
    await prisma.conversation.delete({ where: { id } });
  },

  async listMessages(conversationId: string): Promise<StoredMessage[]> {
    const messages = await prisma.message.findMany({ where: { conversationId }, orderBy: { createdAt: "asc" } });
    return messages.map(toMessage);
  },

  async addMessage(input: {
    conversationId: string;
    role: "user" | "assistant" | "system";
    content: string;
    provider: ProviderId;
    modelTag: string;
  }): Promise<StoredMessage> {
    const message = await prisma.message.create({ data: input });
    return toMessage(message);
  },

  async renameFromFirstMessage(conversationId: string, content: string): Promise<void> {
    const title = content.trim().replace(/\s+/g, " ").slice(0, 54) || "Greeting";
    await prisma.conversation.update({ where: { id: conversationId }, data: { title } });
  }
};
