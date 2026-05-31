import { NextResponse } from "next/server";
import { modelService } from "@/features/ai/models/model-service";
import { parseProvider } from "@/features/ai/providers/provider-utils";
import { apiError } from "@/lib/api";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const provider = parseProvider(url.searchParams.get("provider"));
    const tag = url.searchParams.get("tag") ?? "";
    return NextResponse.json({ status: await modelService.status(provider, tag) });
  } catch (error) {
    return apiError(error);
  }
}
