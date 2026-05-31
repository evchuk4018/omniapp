import { NextResponse } from "next/server";
import { z } from "zod";
import { modelService } from "@/features/ai/models/model-service";
import { apiError, readJson } from "@/lib/api";

const downloadSchema = z.object({
  provider: z.enum(["ollama", "openai-local"]).default("ollama"),
  tag: z.string().trim().min(1)
});

export async function POST(request: Request) {
  try {
    const input = downloadSchema.parse(await readJson<unknown>(request));
    await modelService.download(input.provider, input.tag);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, 400);
  }
}
