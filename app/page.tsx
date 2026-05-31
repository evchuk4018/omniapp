import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-[100dvh] bg-[#1b1b1a] text-[#e7e1d7]">
      <section className="mx-auto flex min-h-[100dvh] w-full max-w-5xl flex-col justify-center px-6 py-16">
        <p className="text-sm uppercase tracking-[0.22em] text-[#a8a39a]">OmniApp</p>
        <h1 className="claude-serif mt-5 max-w-3xl text-5xl leading-[0.95] tracking-[-0.04em] text-[#e7e1d7] md:text-7xl">
          Personal AI command layer, running local-first.
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-[#a8a39a]">
          The foundation shell is active. Future modules follow <code className="rounded bg-[#2b2b29] px-1.5 py-0.5">/{"{featureName}"}</code>, and the AI workspace lives at <code className="rounded bg-[#2b2b29] px-1.5 py-0.5">/ai</code>.
        </p>
        <div className="mt-9">
          <Link href="/ai" className="inline-flex rounded-full bg-[#e7e1d7] px-5 py-2.5 text-sm font-medium text-[#1b1b1a] transition hover:bg-white">
            Open AI Workspace
          </Link>
        </div>
      </section>
    </main>
  );
}
