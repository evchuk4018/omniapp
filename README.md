# OmniApp

OmniApp is a single-user local-first AI command layer built with Next.js, TypeScript, Tailwind, Prisma, and SQLite.

## Routes
- `/` home shell.
- `/ai` AI foundation workspace.

## Stack
- Next.js App Router + React
- Tailwind CSS
- Prisma + SQLite
- Local AI runtimes
  - Ollama
  - OpenAI-compatible local endpoint (LM Studio/llama.cpp style)

## Local Setup
1. Install dependencies.
```bash
pnpm install
```
2. Create env file.
```bash
cp .env.example .env
```
3. Generate Prisma client and migrate SQLite.
```bash
pnpm prisma:generate
pnpm prisma:migrate
```
4. Start dev server.
```bash
pnpm dev
```

## Environment Variables
- `DATABASE_URL` default: `file:./prisma/dev.db`
- `OLLAMA_BASE_URL` default: `http://127.0.0.1:11434`
- `OPENAI_LOCAL_BASE_URL` default: `http://127.0.0.1:1234/v1`
- `DEFAULT_PROVIDER` default: `ollama`

## AI Foundation Capabilities
- Conversation list with create/rename/delete.
- Local message history per conversation.
- Provider abstraction for local runtimes.
- Composer model dropdown for installed models.
- Model manager popup for provider switching, search/download, and default model persistence.
- Streaming chat responses in UI.

## Folder Notes
- `app/` Next.js routes and API handlers.
- `src/features/ai/` AI domain modules:
  - `data/` repositories
  - `providers/` runtime adapters
  - `models/` model-management service
  - `chat/` chat orchestration
  - `ui/` React UI components
- `prisma/` SQLite schema.

## Scope Guardrails
- Single-user only.
- No teams, roles, multi-tenant logic, payments, or cloud sync.
