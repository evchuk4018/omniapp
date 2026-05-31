import { NextResponse } from "next/server";
import { modelService } from "@/features/ai/models/model-service";
import { parseProvider } from "@/features/ai/providers/provider-utils";
import { apiError } from "@/lib/api";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const provider = parseProvider(url.searchParams.get("provider"));
    return NextResponse.json({ models: await modelService.installed(provider) });
  } catch (error) {
    return apiError(error);
  }
}
