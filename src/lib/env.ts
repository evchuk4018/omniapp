export const env = {
  databaseUrl: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
  defaultProvider: process.env.DEFAULT_PROVIDER ?? "ollama",
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434",
  openAiLocalBaseUrl: process.env.OPENAI_LOCAL_BASE_URL ?? "http://127.0.0.1:1234/v1"
};
