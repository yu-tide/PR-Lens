"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Logo } from "./Logo";
import { LoginModal } from "@/components/home/LoginModal";
import { RegisterModal } from "@/components/home/RegisterModal";

interface UserInfo {
  id: string;
  username: string;
}

function HistoryLineIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M3.5 12A8.5 8.5 0 1 0 6 5.96"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.5 5.5v5h5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 7.75v4.75l3.25 1.95"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LogoutLineIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M10.5 6.25V5.5A2.5 2.5 0 0 1 13 3h4A2.5 2.5 0 0 1 19.5 5.5v13A2.5 2.5 0 0 1 17 21h-4a2.5 2.5 0 0 1-2.5-2.5v-.75"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 12h10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.75 8.25 4 12l3.75 3.75"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AppHeader() {
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [user, setUser] = useState<UserInfo | null | undefined>(undefined);
  const [menuOpen, setMenuOpen] = useState(false);

  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginPrefill, setLoginPrefill] = useState("");
  const [registerModalOpen, setRegisterModalOpen] = useState(false);

  const refreshUser = () => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUser(data?.user ?? null))
      .catch(() => setUser(null));
  };

  useEffect(() => {
    refreshUser();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current) return;

      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [menuOpen]);


  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } catch {
      /* 静默忽略 */
    }

    setUser(null);
    setMenuOpen(false);
  };

  return (
    <>
      {menuOpen && (
        <div className="pointer-events-none fixed inset-0 z-30 bg-white/35 backdrop-blur-[6px]" />
      )}

      <header className="relative z-40 h-[84px] shrink-0 border-b border-slate-100 bg-white">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-4">
            <Logo />
          </Link>

          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="打开菜单"
              className={`flex h-11 w-11 items-center justify-center rounded-xl border bg-white shadow-sm transition ${
                menuOpen
                  ? "border-blue-200 text-blue-600 ring-4 ring-blue-50"
                  : "border-slate-200 text-slate-800 hover:border-blue-200 hover:text-blue-600"
              }`}
            >
              <span className="flex flex-col gap-1.5">
                <span className="block h-0.5 w-5 rounded-full bg-current" />
                <span className="block h-0.5 w-5 rounded-full bg-current" />
                <span className="block h-0.5 w-5 rounded-full bg-current" />
              </span>
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-14 z-50 w-[286px] overflow-hidden rounded-[28px] border border-white/70 bg-white/95 p-3 text-left shadow-2xl shadow-slate-300/70 backdrop-blur-xl">
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-50/70 via-white to-indigo-50/60" />

                <div className="relative">
                  {user === undefined ? (
                    <div className="rounded-[22px] border border-slate-100 bg-white/85 p-4 text-sm text-slate-500 shadow-sm">
                      加载中...
                    </div>
                  ) : user ? (
                    <div className="space-y-3">
                      <div className="rounded-[22px] border border-slate-100 bg-white/85 p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-sm font-bold text-white shadow-lg shadow-blue-500/25">
                            {user.username.slice(0, 1).toUpperCase()}
                          </div>

                          <div className="min-w-0">
                            <div className="text-xs font-medium text-slate-400">
                              当前用户
                            </div>
                            <div className="mt-0.5 truncate text-sm font-semibold text-slate-900">
                              {user.username}
                            </div>
                          </div>
                        </div>
                      </div>

                      <Link
                        href="/history"
                        onClick={() => setMenuOpen(false)}
                        className="group flex items-center justify-between rounded-[20px] border border-slate-100 bg-white/85 px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-100 hover:bg-blue-50/90 hover:text-blue-700 hover:shadow-md"
                      >
                        <span className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-100/70">
                            <HistoryLineIcon className="h-5 w-5" />
                          </span>
                          历史分析
                        </span>

                        <span className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-500">
                          →
                        </span>
                      </Link>

                      <button
                        type="button"
                        onClick={handleLogout}
                        className="group flex w-full items-center justify-between rounded-[20px] border border-red-100 bg-white/85 px-4 py-3 text-sm font-medium text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-red-50 hover:text-red-600 hover:shadow-md"
                      >
                        <span className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-red-50 text-red-500 shadow-sm ring-1 ring-red-100/80">
                            <LogoutLineIcon className="h-5 w-5" />
                          </span>
                          退出登录
                        </span>

                        <span className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-red-400">
                          →
                        </span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="rounded-[22px] border border-slate-100 bg-white/85 p-4 shadow-sm">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-base font-bold text-white shadow-lg shadow-blue-500/25">
                          ✦
                        </div>

                        <h3 className="mt-4 text-base font-semibold tracking-tight text-slate-950">
                          欢迎使用 PR Lens
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          登录后可使用更多功能
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setLoginModalOpen(true);
                          setMenuOpen(false);
                        }}
                        className="flex h-12 w-full items-center justify-center rounded-[20px] bg-blue-600 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-500/30"
                      >
                        登录
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setRegisterModalOpen(true);
                          setMenuOpen(false);
                        }}
                        className="flex h-12 w-full items-center justify-center rounded-[20px] border border-slate-200 bg-white/85 text-sm font-medium text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-100 hover:bg-blue-50 hover:text-blue-700 hover:shadow-md"
                      >
                        没账号？去注册
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <LoginModal
        open={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onSwitchToRegister={() => {
          setLoginModalOpen(false);
          setRegisterModalOpen(true);
        }}
        onSuccess={() => {
          setLoginPrefill("");
          refreshUser();
        }}
        prefillUsername={loginPrefill}
      />

      <RegisterModal
        open={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
        onSwitchToLogin={(prefill) => {
          setRegisterModalOpen(false);
          setLoginPrefill(prefill ?? "");
          setLoginModalOpen(true);
        }}
      />
    </>
  );
}