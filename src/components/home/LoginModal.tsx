"use client";

import { useState } from "react";

type Props = { open: boolean; onClose: () => void; onSwitchToRegister: () => void; onSuccess: () => void; prefillUsername?: string };

export function LoginModal({ open, onClose, onSwitchToRegister, onSuccess, prefillUsername = "" }: Props) {
  const [username, setUsername] = useState(prefillUsername);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
      const data = await res.json().catch(() => null);
      if (!res.ok) { setError(data?.error ?? "登录失败"); return; }
      setUsername(""); setPassword(""); onClose(); onSuccess();
    } catch { setError("网络异常"); } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/30 px-6 backdrop-blur-[6px]">
      <div className="relative w-full max-w-sm overflow-hidden rounded-[28px] border border-white/60 bg-white p-6 shadow-2xl shadow-slate-400/50">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-50/70 via-white to-indigo-50/60" />
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-blue-100 blur-3xl" />
        <div className="relative">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-base font-bold text-white shadow-lg shadow-blue-500/25">✦</div>
              <h2 className="mt-4 text-xl font-semibold tracking-tight text-slate-950">登录 PR Lens</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">登录后可使用更多功能</p>
            </div>
            <button type="button" onClick={() => { onClose(); setError(""); }} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/80 text-lg text-slate-400 shadow-sm transition hover:bg-slate-100 hover:text-slate-700" aria-label="关闭">×</button>
          </div>
          <form onSubmit={handleSubmit} className="mt-5 space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-500">用户名</label>
              <input value={username} onChange={(e) => { setUsername(e.target.value); setError(""); }} className="mt-1 h-11 w-full rounded-2xl border border-slate-200 bg-white/90 px-4 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100" placeholder="请输入用户名" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">密码</label>
              <input type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} className="mt-1 h-11 w-full rounded-2xl border border-slate-200 bg-white/90 px-4 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100" placeholder="请输入密码" />
            </div>
            {error && <div className="rounded-2xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm leading-6 text-red-600">{error}</div>}
            <button type="submit" disabled={loading || !username || !password} className="h-11 w-full rounded-2xl bg-blue-600 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-500/25 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none">{loading ? "登录中..." : "登录"}</button>
          </form>
          <div className="mt-4 rounded-2xl border border-slate-100 bg-white/75 px-4 py-3 text-center text-sm text-slate-500 shadow-sm">没账号？ <button type="button" onClick={() => { onClose(); setError(""); onSwitchToRegister(); }} className="font-medium text-blue-600 transition hover:text-blue-700 hover:underline">去注册</button></div>
        </div>
      </div>
    </div>
  );
}
