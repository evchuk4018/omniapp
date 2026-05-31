import { NextResponse } from "next/server";
import { conversationRepo } from "@/features/ai/data/conversation-repo";
import { apiError } from "@/lib/api";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    return NextResponse.json({ messages: await conversationRepo.listMessages(id) });
  } catch (error) {
    return apiError(error);
  }
}
