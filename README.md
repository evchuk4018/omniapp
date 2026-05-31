# OmniApp

OmniApp is a single-user, local-first AI command layer built with Next.js, TypeScript, Tailwind CSS, Prisma, SQLite, and local model runtimes.

## Routes
- `/` loads the app shell/home entry point.
- `/ai` loads the AI workspace.
- Future modules should follow `/{featureName}`.

## Stack
- Next.js App Router + React
- TypeScript
- Tailwind CSS
- Prisma + SQLite
- Ollama
- OpenAI-compatible local runtime adapter for Llama-compatible servers
- pnpm

## Local Setup
1. Install dependencies.
```bash
pnpm install
```
2. Create an environment file.
```bash
cp .env.example .env
```
3. Generate Prisma Client and create the local SQLite database.
```bash
pnpm prisma:generate
pnpm prisma:migrate
```
4. Start the app.
```bash
pnpm dev
```

## Environment Variables
- `DATABASE_URL` default: `file:./dev.db`
- `OLLAMA_BASE_URL` default: `http://127.0.0.1:11434`
- `OPENAI_LOCAL_BASE_URL` default: `http://127.0.0.1:1234/v1`
- `DEFAULT_PROVIDER` default: `ollama`

## AI Foundation
The AI foundation includes:
- Chat UI at `/ai` with Claude-like dark workspace styling.
- Conversation list with create, rename, delete, and persisted history.
- Local message storage in SQLite.
- Installed model selector.
- Default model persistence.
- Ollama model search using installed models plus curated/manual tags.
- Ollama model download and status reporting.
- Modular provider abstraction for Ollama and OpenAI-compatible local runtimes.

## Project Structure
- `app/` contains pages and API routes.
- `src/features/ai/ui/` contains React UI for the AI workspace.
- `src/features/ai/data/` contains Prisma-backed repositories.
- `src/features/ai/chat/` contains chat orchestration.
- `src/features/ai/models/` contains model-management service logic.
- `src/features/ai/providers/` contains isolated local runtime adapters.
- `src/lib/` contains shared environment, Prisma, and API helpers.
- `prisma/` contains the SQLite schema.

## Scope Guardrails
This implementation is single-user only. It intentionally does not include teams, roles, multi-tenant data, collaboration, external auth, cloud sync, payments, admin panels, web search, file uploads, notes, calendar, or tasks.
