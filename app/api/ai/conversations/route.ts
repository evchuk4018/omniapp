import { NextResponse } from "next/server";
import { z } from "zod";
import { conversationRepo } from "@/features/ai/data/conversation-repo";
import { apiError, readJson } from "@/lib/api";

const createSchema = z.object({
  provider: z.enum(["ollama", "openai-local"]).default("ollama"),
  activeModelTag: z.string().trim().min(1).nullable().optional()
});

export async function GET() {
  try {
    return NextResponse.json({ conversations: await conversationRepo.list() });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const input = createSchema.parse(await readJson<unknown>(request));
    const conversation = await conversationRepo.create(input);
    return NextResponse.json({ conversation });
  } catch (error) {
    return apiError(error, 400);
  }
}
