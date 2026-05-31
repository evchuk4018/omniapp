import { NextResponse } from "next/server";
import { modelService } from "@/features/ai/models/model-service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get("provider") === "openai-local" ? "openai-local" : "ollama";
  const query = searchParams.get("q") ?? "";
  const models = await modelService.search(provider, query);
  return NextResponse.json({ models });
}
