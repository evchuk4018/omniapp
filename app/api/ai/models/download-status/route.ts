import { NextResponse } from "next/server";
import { modelService } from "@/features/ai/models/model-service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get("provider") === "openai-local" ? "openai-local" : "ollama";
  const tag = searchParams.get("tag") ?? "";
  const status = await modelService.status(provider, tag);
  return NextResponse.json({ status });
}
