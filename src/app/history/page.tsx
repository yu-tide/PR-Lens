"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { GithubIcon, ShieldIcon, MessageIcon, FileIcon } from "@/components/icons";

const SESSION_KEY = "pr-lens:last-analysis";

interface HistoryEntry {
  id: string;
  repo: string;
  prNumber: string;
  prTitle: string;
  author: string;
  riskScore: number;
  riskLevel: "high" | "medium" | "low";
  data: Record<string, unknown>;
  createdAt: string;
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <path d="M4 6h16M6 6v13a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RiskBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    high: "border-red-200 bg-red-50 text-red-700",
    medium: "border-amber-200 bg-amber-50 text-amber-700",
    low: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };
  const labels: Record<string, string> = { high: "高风险", medium: "中风险", low: "低风险" };
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${colors[level] ?? colors.low}`}>
      {labels[level] ?? level}
    </span>
  );
}

export default function HistoryPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/history")
      .then(async (res) => {
        if (res.status === 401) { router.push("/login"); return; }
        if (!res.ok) throw new Error("加载失败");
        return res.json();
      })
      .then((data) => setEntries(data?.entries ?? []))
      .catch((err) => setError(err instanceof Error ? err.message : "加载失败"))
      .finally(() => setLoading(false));
  }, [router]);

  function handleView(entry: HistoryEntry) {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ data: entry.data, inputUrl: "" }));
    } catch { /* ignore */ }
    router.push("/result");
  }

  async function handleDelete(id: string) {
    await fetch(`/api/history/${id}`, { method: "DELETE" });
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  async function handleClearAll() {
    if (!confirm("确定清空所有历史记录？")) return;
    await fetch("/api/history", { method: "DELETE" });
    setEntries([]);
  }

  function formatDate(iso: string): string {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-[#f6f8fb] text-slate-950">
      <div className="shrink-0"><AppHeader /></div>
      <section className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col px-6 py-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Link href="/" className="text-sm font-medium text-slate-500 transition hover:text-blue-600">← 返回首页</Link>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">分析历史</h1>
            <p className="mt-1 text-sm text-slate-500">已保存的分析结果，点击可重新查看完整报告。</p>
          </div>
          {entries.length > 0 && (
            <button onClick={handleClearAll} className="inline-flex h-9 items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-600 transition hover:bg-red-100">
              <TrashIcon className="h-3.5 w-3.5" />清空全部
            </button>
          )}
        </div>

        {loading && (
          <div className="mt-12 flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
            <p className="text-sm text-slate-500">加载历史记录...</p>
          </div>
        )}

        {error && <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">{error}</div>}

        {!loading && !error && entries.length === 0 && (
          <div className="mt-20 flex flex-col items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-300"><FileIcon className="h-8 w-8" /></div>
            <p className="text-base font-medium text-slate-600">暂无分析历史</p>
            <p className="text-sm text-slate-400">分析 PR 后，结果会自动保存在这里。需要登录才会保存。</p>
            <Link href="/" className="mt-2 inline-flex h-10 items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-700">去分析一个 PR</Link>
          </div>
        )}

        {!loading && entries.length > 0 && (
          <div className="mt-6 min-h-0 flex-1 overflow-auto pr-1">
            <div className="grid gap-3 md:grid-cols-2">
              {entries.map((entry) => (
                <article key={entry.id} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <GithubIcon className="h-3.5 w-3.5" />
                        <span className="truncate font-medium">{entry.repo}</span>
                        <span className="text-slate-300">{entry.prNumber}</span>
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-sm font-semibold text-slate-900 leading-5">{entry.prTitle}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><ShieldIcon className="h-3 w-3" />{entry.riskScore} 分</span>
                        <RiskBadge level={entry.riskLevel} />
                      </div>
                      <p className="mt-2 text-xs text-slate-400">{formatDate(entry.createdAt)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <button onClick={() => handleView(entry)} className="rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700">查看</button>
                      <button onClick={() => handleDelete(entry.id)} className="rounded-xl p-1.5 text-slate-300 transition hover:text-red-500" title="删除记录"><TrashIcon className="h-4 w-4" /></button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
