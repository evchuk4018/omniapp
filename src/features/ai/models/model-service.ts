import { providerFactory } from "@/features/ai/providers/provider-factory";
import type { DownloadProgress, ModelInfo, ProviderId } from "@/features/ai/types";

export const modelService = {
  async installed(provider: ProviderId): Promise<ModelInfo[]> {
    return providerFactory.get(provider).listInstalledModels();
  },

  async search(provider: ProviderId, query: string): Promise<ModelInfo[]> {
    return providerFactory.get(provider).searchModels(query);
  },

  async download(provider: ProviderId, tag: string): Promise<void> {
    return providerFactory.get(provider).downloadModel(tag);
  },

  async status(provider: ProviderId, tag: string): Promise<DownloadProgress> {
    return providerFactory.get(provider).getDownloadStatus(tag);
  }
};
