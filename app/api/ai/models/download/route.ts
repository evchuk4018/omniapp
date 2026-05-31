import { NextResponse } from "next/server";
import { z } from "zod";
import { modelService } from "@/features/ai/models/model-service";

const schema = z.object({
  provider: z.enum(["ollama", "openai-local"]),
  modelTag: z.string().min(1)
});

export async function POST(request: Request) {
  const body = schema.parse(await request.json());
  try {
    await modelService.download(body.provider, body.modelTag);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Download failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
