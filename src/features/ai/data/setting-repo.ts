import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

const DEFAULT_MODEL_KEY = "default-model";
const DEFAULT_PROVIDER_KEY = "default-provider";

export const settingRepo = {
  async getDefaultModel() {
    const [model, provider] = await Promise.all([
      prisma.appSetting.findUnique({ where: { key: DEFAULT_MODEL_KEY } }),
      prisma.appSetting.findUnique({ where: { key: DEFAULT_PROVIDER_KEY } })
    ]);
    return {
      modelTag: model?.value ?? null,
      provider: provider?.value ?? env.defaultProvider
    };
  },

  async setDefaultModel(input: { modelTag: string; provider: string }) {
    await Promise.all([
      prisma.appSetting.upsert({
        where: { key: DEFAULT_MODEL_KEY },
        update: { value: input.modelTag },
        create: { key: DEFAULT_MODEL_KEY, value: input.modelTag }
      }),
      prisma.appSetting.upsert({
        where: { key: DEFAULT_PROVIDER_KEY },
        update: { value: input.provider },
        create: { key: DEFAULT_PROVIDER_KEY, value: input.provider }
      })
    ]);
  }
};
