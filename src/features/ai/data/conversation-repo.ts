import { prisma } from "@/lib/prisma";
import type { ConversationSummary, ProviderId } from "@/features/ai/types";

const mapProvider = (value: string | null): ProviderId => {
  return value === "openai-local" ? "openai-local" : "ollama";
};

export const conversationRepo = {
  async list(): Promise<ConversationSummary[]> {
    const rows = await prisma.conversation.findMany({ orderBy: { updatedAt: "desc" } });
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      activeModelTag: row.activeModelTag,
      provider: mapProvider(row.provider),
      updatedAt: row.updatedAt.toISOString()
    }));
  },

  async create(input?: { title?: string; provider?: ProviderId; activeModelTag?: string }) {
    return prisma.conversation.create({
      data: {
        title: input?.title?.trim() || "New Conversation",
        provider: input?.provider ?? "ollama",
        activeModelTag: input?.activeModelTag ?? null
      }
    });
  },

  async update(id: string, input: { title?: string; provider?: ProviderId; activeModelTag?: string | null }) {
    return prisma.conversation.update({
      where: { id },
      data: {
        title: input.title?.trim(),
        provider: input.provider,
        activeModelTag: input.activeModelTag
      }
    });
  },

  async remove(id: string) {
    return prisma.conversation.delete({ where: { id } });
  },

  async get(id: string) {
    return prisma.conversation.findUnique({ where: { id } });
  },

  async listMessages(conversationId: string) {
    const rows = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" }
    });
    return rows.map((row) => ({
      id: row.id,
      role: row.role,
      content: row.content,
      provider: row.provider,
      modelTag: row.modelTag,
      createdAt: row.createdAt.toISOString()
    }));
  },

  async addMessage(input: {
    conversationId: string;
    role: "user" | "assistant" | "system";
    content: string;
    provider: ProviderId;
    modelTag: string;
  }) {
    return prisma.message.create({
      data: {
        conversationId: input.conversationId,
        role: input.role,
        content: input.content,
        provider: input.provider,
        modelTag: input.modelTag
      }
    });
  }
};
