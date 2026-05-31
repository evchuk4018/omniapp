import { NextResponse } from "next/server";
import { conversationRepo } from "@/features/ai/data/conversation-repo";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const messages = await conversationRepo.listMessages(id);
  return NextResponse.json({ messages });
}
