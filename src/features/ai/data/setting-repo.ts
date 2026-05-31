import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { normalizeProvider } from "@/features/ai/providers/provider-utils";
import type { ProviderId } from "@/features/ai/types";

const defaultModelKey = "ai.defaultModel";
const defaultProviderKey = "ai.defaultProvider";

export const settingRepo = {
  async getDefaultModel(): Promise<{ provider: ProviderId; modelTag: string | null }> {
    const rows = await prisma.appSetting.findMany({ where: { key: { in: [defaultModelKey, defaultProviderKey] } } });
    const values = new Map(rows.map((row) => [row.key, row.value]));
    const modelTag = values.get(defaultModelKey);
    return {
      provider: normalizeProvider(values.get(defaultProviderKey) ?? env.defaultProvider),
      modelTag: modelTag || null
    };
  },

  async setDefaultModel(provider: ProviderId, modelTag: string | null): Promise<void> {
    await prisma.$transaction([
      prisma.appSetting.upsert({
        where: { key: defaultProviderKey },
        create: { key: defaultProviderKey, value: provider },
        update: { value: provider }
      }),
      prisma.appSetting.upsert({
        where: { key: defaultModelKey },
        create: { key: defaultModelKey, value: modelTag ?? "" },
        update: { value: modelTag ?? "" }
      })
    ]);
  }
};
