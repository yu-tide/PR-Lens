"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "./Logo";

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
      <path
        d="M12 4V2M12 22v-2M4.93 4.93 3.52 3.52M20.48 20.48l-1.41-1.41M4 12H2M22 12h-2M4.93 19.07l-1.41 1.41M20.48 3.52l-1.41 1.41"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

interface UserInfo {
  id: string;
  username: string;
}

export function AppHeader() {
  const [user, setUser] = useState<UserInfo | null | undefined>(undefined);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUser(data?.user ?? null))
      .catch(() => setUser(null));
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    window.location.href = "/";
  }

  return (
    <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <Link href="/">
          <Logo />
        </Link>

        <nav className="flex items-center gap-4 text-sm font-medium text-slate-700">
          {user === undefined ? null : user ? (
            <>
              <Link href="/history" className="transition hover:text-blue-600">历史分析</Link>
              <span className="text-slate-500">{user.username}</span>
              <button
                onClick={handleLogout}
                className="text-slate-400 transition hover:text-red-500"
              >
                退出
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="transition hover:text-blue-600">
                登录
              </Link>
              <Link
                href="/register"
                className="rounded-xl bg-blue-600 px-3 py-1.5 text-white transition hover:bg-blue-700"
              >
                注册
              </Link>
            </>
          )}
          <button
            aria-label="切换主题"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-600"
          >
            <SunIcon />
          </button>
        </nav>
      </div>
    </header>
  );
}
