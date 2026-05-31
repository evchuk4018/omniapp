import { NextResponse } from "next/server";
import { z } from "zod";
import { conversationRepo } from "@/features/ai/data/conversation-repo";
import { apiError, readJson } from "@/lib/api";

type Context = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  provider: z.enum(["ollama", "openai-local"]).optional(),
  activeModelTag: z.string().trim().min(1).nullable().optional()
});

export async function PATCH(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const input = updateSchema.parse(await readJson<unknown>(request));
    const conversation = await conversationRepo.update(id, input);
    return NextResponse.json({ conversation });
  } catch (error) {
    return apiError(error, 400);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    await conversationRepo.delete(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, 400);
  }
}
