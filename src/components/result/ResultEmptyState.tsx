"use client";

import Link from "next/link";

export function ResultEmptyState() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f8fb] text-slate-950">
      <div className="text-center">
        <p className="text-lg font-semibold text-slate-700">
          暂无分析结果
        </p>
        <p className="mt-2 text-sm text-slate-500">
          请返回首页输入 PR 链接进行分析
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-10 items-center justify-center rounded-2xl bg-blue-600 px-6 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-700"
        >
          返回首页
        </Link>
      </div>
    </main>
  );
}
