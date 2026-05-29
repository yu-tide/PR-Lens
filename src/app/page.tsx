export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
      <main className="flex max-w-2xl flex-col items-center gap-8 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-zinc-900">
          PR Lens
        </h1>

        <p className="text-xl text-zinc-500">
          AI PR Review Assistant
        </p>

        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-6 py-4">
          <p className="text-sm font-medium text-zinc-700">
            PR3 — Mock Review Flow 开发阶段
          </p>
        </div>

        <div className="space-y-2 text-sm leading-relaxed text-zinc-500">
          <p>
            当前版本已完成项目骨架初始化。
          </p>
          <p>
            后续将接入 Mock Review UI，实现完整的 Review 流程演示。
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-zinc-400">
          <span>Next.js</span>
          <span className="text-zinc-300">·</span>
          <span>React</span>
          <span className="text-zinc-300">·</span>
          <span>TypeScript</span>
          <span className="text-zinc-300">·</span>
          <span>Tailwind CSS</span>
        </div>
      </main>
    </div>
  );
}
