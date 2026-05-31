import { NextResponse } from "next/server";
import { z } from "zod";
import { conversationRepo } from "@/features/ai/data/conversation-repo";
import { chatService } from "@/features/ai/chat/chat-service";

const schema = z.object({
  conversationId: z.string().min(1),
  provider: z.enum(["ollama", "openai-local"]).optional(),
  modelTag: z.string().optional(),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: z.string().min(1)
    })
  )
});

export async function POST(request: Request) {
  const body = schema.parse(await request.json());
  const userMessage = body.messages[body.messages.length - 1];

  await conversationRepo.addMessage({
    conversationId: body.conversationId,
    role: "user",
    content: userMessage.content,
    provider: body.provider ?? "ollama",
    modelTag: body.modelTag ?? ""
  });

  let finalAssistant = "";

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        const selected = await chatService.streamReply({
          conversationId: body.conversationId,
          provider: body.provider,
          modelTag: body.modelTag,
          messages: body.messages,
          onToken: (token) => {
            finalAssistant += token;
            controller.enqueue(encoder.encode(token));
          }
        });

        if (finalAssistant.trim()) {
          await conversationRepo.addMessage({
            conversationId: body.conversationId,
            role: "assistant",
            content: finalAssistant,
            provider: selected.provider,
            modelTag: selected.modelTag
          });
          await conversationRepo.update(body.conversationId, {
            provider: selected.provider,
            activeModelTag: selected.modelTag
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to run model.";
        controller.enqueue(encoder.encode(`\n\n[error] ${message}`));
      } finally {
        controller.close();
      }
    }
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache"
    }
  });
}
