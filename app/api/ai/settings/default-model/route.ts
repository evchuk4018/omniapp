import { NextResponse } from "next/server";
import { z } from "zod";
import { settingRepo } from "@/features/ai/data/setting-repo";
import { apiError, readJson } from "@/lib/api";

const defaultModelSchema = z.object({
  provider: z.enum(["ollama", "openai-local"]),
  modelTag: z.string().trim().min(1).nullable()
});

export async function GET() {
  try {
    return NextResponse.json(await settingRepo.getDefaultModel());
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const input = defaultModelSchema.parse(await readJson<unknown>(request));
    await settingRepo.setDefaultModel(input.provider, input.modelTag);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, 400);
  }
}
