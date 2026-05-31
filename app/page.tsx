import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-6xl items-center px-6 py-16">
      <section className="surface w-full rounded-2xl p-8 md:p-12">
        <p className="text-sm uppercase tracking-[0.18em] text-[#97a0ab]">OmniApp</p>
        <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight md:text-5xl">
          Local-first AI command layer for your personal workflow.
        </h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-[#97a0ab]">
          Foundation shell is active. The AI module lives at <code>/ai</code> and is designed for one
          user, local runtime models, and persistent local history.
        </p>
        <div className="mt-8 flex items-center gap-3">
          <Link
            className="rounded-full bg-[#1a73e8] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#2e80ee]"
            href="/ai"
          >
            Open AI Workspace
          </Link>
        </div>
      </section>
    </main>
  );
}
