import { NextResponse } from "next/server";
import { z } from "zod";
import { settingRepo } from "@/features/ai/data/setting-repo";

const schema = z.object({
  provider: z.enum(["ollama", "openai-local"]),
  modelTag: z.string().min(1)
});

export async function GET() {
  const defaults = await settingRepo.getDefaultModel();
  return NextResponse.json(defaults);
}

export async function PUT(request: Request) {
  const body = schema.parse(await request.json());
  await settingRepo.setDefaultModel(body);
  return NextResponse.json({ ok: true });
}
