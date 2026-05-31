import { NextResponse } from "next/server";
import { z } from "zod";
import { conversationRepo } from "@/features/ai/data/conversation-repo";

const createSchema = z.object({
  title: z.string().optional(),
  provider: z.enum(["ollama", "openai-local"]).optional(),
  activeModelTag: z.string().optional()
});

export async function GET() {
  const conversations = await conversationRepo.list();
  return NextResponse.json({ conversations });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const input = createSchema.parse(body);
  const conversation = await conversationRepo.create(input);
  return NextResponse.json({ conversation }, { status: 201 });
}
