import { NextResponse } from "next/server";
import { z } from "zod";
import { conversationRepo } from "@/features/ai/data/conversation-repo";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  provider: z.enum(["ollama", "openai-local"]).optional(),
  activeModelTag: z.string().nullable().optional()
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const input = updateSchema.parse(body);
  const conversation = await conversationRepo.update(id, input);
  return NextResponse.json({ conversation });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  await conversationRepo.remove(id);
  return NextResponse.json({ ok: true });
}
