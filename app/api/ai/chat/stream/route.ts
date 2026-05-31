import { z } from "zod";
import { chatService } from "@/features/ai/chat/chat-service";
import { conversationRepo } from "@/features/ai/data/conversation-repo";
import { apiError, readJson } from "@/lib/api";
import type { ChatMessage } from "@/features/ai/types";

const streamSchema = z.object({
  conversationId: z.string().min(1),
  content: z.string().trim().min(1),
  provider: z.enum(["ollama", "openai-local"]).optional(),
  modelTag: z.string().trim().min(1).optional()
});

export async function POST(request: Request) {
  try {
    const input = streamSchema.parse(await readJson<unknown>(request));
    const selected = await chatService.resolveModel(input.conversationId, input.provider, input.modelTag);
    const beforeMessages = await conversationRepo.listMessages(input.conversationId);
    const userMessageCount = beforeMessages.filter((message) => message.role === "user").length;

    await conversationRepo.addMessage({
      conversationId: input.conversationId,
      role: "user",
      content: input.content,
      provider: selected.provider,
      modelTag: selected.modelTag
    });

    if (userMessageCount === 0) {
      await conversationRepo.renameFromFirstMessage(input.conversationId, input.content);
    }

    await conversationRepo.update(input.conversationId, {
      provider: selected.provider,
      activeModelTag: selected.modelTag
    });

    const history: ChatMessage[] = [
      ...beforeMessages.map((message) => ({ role: message.role, content: message.content })),
      { role: "user", content: input.content }
    ];
    const encoder = new TextEncoder();
    let assistantContent = "";

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          await chatService.streamReply({
            conversationId: input.conversationId,
            messages: history,
            provider: selected.provider,
            modelTag: selected.modelTag,
            onToken(token) {
              assistantContent += token;
              controller.enqueue(encoder.encode(token));
            }
          });

          await conversationRepo.addMessage({
            conversationId: input.conversationId,
            role: "assistant",
            content: assistantContent || " ",
            provider: selected.provider,
            modelTag: selected.modelTag
          });
          controller.close();
        } catch (error) {
          const message = error instanceof Error ? error.message : "Chat failed.";
          controller.error(new Error(message));
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no"
      }
    });
  } catch (error) {
    return apiError(error, 400);
  }
}
