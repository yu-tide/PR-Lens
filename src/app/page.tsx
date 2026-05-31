"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnalysisFloatingPanel } from "@/components/AnalysisFloatingPanel";
import {
  GithubIcon,
  FlashIcon,
  ShieldCheckIcon,
  MessageDotsIcon,
} from "@/components/icons";
import { Logo } from "@/components/Logo";
import { LoginModal } from "@/components/home/LoginModal";
import { RegisterModal } from "@/components/home/RegisterModal";
import { analysisSteps } from "@/mocks";
import type { AnalysisStatus, AppError } from "@/types";
import { requestAnalyzePr } from "@/services/client/analyzePrClient";

const SESSION_KEY = "pr-lens:last-analysis";

type ReviewerPersona =
  | "security"
  | "performance"
  | "testing"
  | "maintainability";

type FeatureCard = {
  id: string;
  title: string;
  description: string;
  icon: "flash" | "shield" | "message";
  tone: "blue" | "green" | "purple";
};
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
const reviewerPersonas: {
  id: ReviewerPersona;
  title: string;
  description: string;
  badge: string;
}[] = [
  {
    id: "security",
    title: "安全审查员",
    description: "重点关注鉴权、权限、Token、敏感信息和配置泄露。",
    badge: "Security",
  },
  {
    id: "performance",
    title: "性能审查员",
    description: "重点关注循环、缓存、接口调用、资源释放和性能瓶颈。",
    badge: "Performance",
  },
  {
    id: "testing",
    title: "测试审查员",
    description: "重点关注测试缺口、边界条件、异常路径和回归风险。",
    badge: "Testing",
  },
  {
    id: "maintainability",
    title: "可维护性审查员",
    description: "重点关注代码结构、命名、重复逻辑和职责划分。",
    badge: "Maintainability",
  },
];

const homeFeatureCards: FeatureCard[] = [
  {
    id: "change-parse",
    title: "智能变更解析",
    description: "自动识别 PR 中的核心改动，提炼文件变化、代码意图和影响范围。",
    icon: "flash",
    tone: "blue",
  },
  {
    id: "risk-detect",
    title: "风险点检测",
    description: "分析权限、接口、边界条件、异常处理等潜在风险，提前发现隐患。",
    icon: "shield",
    tone: "green",
  },
  {
    id: "ai-review",
    title: "AI Review 建议",
    description: "结合上下文生成可执行的 Review 建议，帮助更快完成代码审查。",
    icon: "message",
    tone: "purple",
  },
];

function FeatureIcon({ feature }: { feature: FeatureCard }) {
  const toneClass = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    purple: "bg-violet-50 text-violet-600",
  }[feature.tone];

  return (
    <div
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${toneClass}`}
    >
      {feature.icon === "flash" && <FlashIcon className="h-6 w-6" />}
      {feature.icon === "shield" && <ShieldCheckIcon className="h-6 w-6" />}
      {feature.icon === "message" && <MessageDotsIcon className="h-6 w-6" />}
    </div>
  );
}

function HomeHeader({
  user,
  menuOpen,
  setMenuOpen,
  setLoginModalOpen,
  setRegisterModalOpen,
  handleLogout,
  menuRef,
}: {
  user: { id: string; username: string } | null | undefined;
  menuOpen: boolean;
  setMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setLoginModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setRegisterModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleLogout: () => void;
  menuRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <header className="relative z-40 h-[84px] shrink-0 border-b border-slate-100 bg-white">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
        <Link href="/">
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
                {user ? (
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
  );
}

export default function HomePage() {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [prUrl, setPrUrl] = useState("");
  const [inputError, setInputError] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [analysisStatus, setAnalysisStatus] =
    useState<AnalysisStatus>("idle");
  const [currentStep, setCurrentStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [appError, setAppError] = useState<AppError | null>(null);

  const [reviewerPersona, setReviewerPersona] =
    useState<ReviewerPersona>("security");

  const [user, setUser] = useState<
    { id: string; username: string } | null | undefined
  >(undefined);

  const [menuOpen, setMenuOpen] = useState(false);

  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginPrefill, setLoginPrefill] = useState("");
  const [registerModalOpen, setRegisterModalOpen] = useState(false);

  const canSubmit = useMemo(() => prUrl.trim().length > 0, [prUrl]);

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

  const validatePRUrl = (url: string) => {
    return /^https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+\/?$/.test(url);
  };

  const runAnalysis = (
    body: {
      url?: string;
      useMock?: boolean;
      reviewerPersona?: ReviewerPersona;
    },
    inputUrlForStorage: string,
  ) => {
    const isMockCall = body.useMock === true;

    requestAnalyzePr(
      body,
      isMockCall ? 30000 : 60000,
      isMockCall ? undefined : (step) => setCurrentStep(step.stepIndex),
    )
      .then((data) => {
        if (data.success) {
          try {
            sessionStorage.setItem(
              SESSION_KEY,
              JSON.stringify({
                data,
                inputUrl: inputUrlForStorage,
                reviewerPersona,
              }),
            );
          } catch {
            /* sessionStorage 不可用时静默忽略 */
          }

          setCurrentStep(6);
          setAppError(null);

          try {
            fetch("/api/history", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                prUrl: inputUrlForStorage,
                response: data,
              }),
            });
          } catch {
            /* 静默忽略 */
          }

          setTimeout(() => setAnalysisStatus("success"), 400);
          return;
        }

        setAnalysisStatus("error");
        setAppError(data.error ?? null);
        setErrorMessage(data.error?.message || "分析失败，请稍后重试");
      })
      .catch(() => {
        setAnalysisStatus("error");
        setErrorMessage("网络异常，请稍后重试");
      });
  };

  const startAnalyze = (targetUrl?: string) => {
    const nextUrl = targetUrl ?? prUrl.trim();

    setInputError("");
    setErrorMessage("");
    setAppError(null);

    if (!nextUrl) {
      setInputError("请输入 GitHub Pull Request 链接。");
      return;
    }

    if (!validatePRUrl(nextUrl)) {
      setInputError(
        "请输入有效的 GitHub PR 链接，例如：https://github.com/owner/repo/pull/123",
      );
      return;
    }

    setPrUrl(nextUrl);
    setPanelOpen(true);
    setAnalysisStatus("analyzing");

    runAnalysis(
      {
        url: nextUrl,
        useMock: false,
        reviewerPersona,
      },
      nextUrl,
    );
  };

  const handleViewResult = () => {
    router.push("/result");
  };


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
    <main className="relative flex h-screen flex-col overflow-hidden bg-[#f6f8fb] text-slate-950">
      {menuOpen && (
        <div className="pointer-events-none fixed inset-0 z-30 bg-white/35 backdrop-blur-[6px]" />
      )}

      <HomeHeader
        user={user}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        setLoginModalOpen={setLoginModalOpen}
        setRegisterModalOpen={setRegisterModalOpen}
        handleLogout={handleLogout}
        menuRef={menuRef}
      />

      <section className="relative mx-auto flex min-h-0 w-full max-w-7xl flex-1 px-6 py-5">
        <div
          className={`relative flex min-h-0 w-full items-center overflow-hidden rounded-[32px] border border-slate-200 bg-white px-8 py-8 shadow-xl shadow-slate-200/70 transition ${
            menuOpen ? "blur-[1.5px]" : ""
          }`}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(15,23,42,0.06)_1px,transparent_0)] [background-size:22px_22px]" />
          <div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-blue-50 blur-2xl" />
          <div className="pointer-events-none absolute -right-24 bottom-16 h-72 w-72 rounded-full bg-indigo-50 blur-2xl" />
          <div className="pointer-events-none absolute right-28 top-20 h-3 w-44 rotate-[-30deg] rounded-full bg-slate-100" />
          <div className="pointer-events-none absolute left-24 top-24 h-3 w-28 rotate-[-30deg] rounded-full bg-slate-100" />

          <div className="relative mx-auto w-full max-w-5xl text-center">
            <h1 className="text-5xl font-semibold tracking-[-0.06em] text-slate-950 md:text-6xl">
              PR Lens
            </h1>

            <p className="mt-4 text-xl font-medium tracking-wide text-slate-700">
              AI 驱动的 PR Review 助手
            </p>

            <p className="mt-4 text-base leading-7 text-slate-500">
              输入 GitHub PR 链接，自动分析变更，生成摘要、风险提示和 Review 建议
            </p>

            <div className="mx-auto mt-8 flex max-w-4xl flex-col gap-4 md:flex-row">
              <div className="relative flex-1">
                <GithubIcon className="pointer-events-none absolute left-6 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  value={prUrl}
                  onChange={(event) => {
                    setPrUrl(event.target.value);
                    setInputError("");
                  }}
                  placeholder="https://github.com/owner/repo/pull/123"
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-14 pr-5 text-base text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <button
                type="button"
                onClick={() => startAnalyze()}
                disabled={!canSubmit || analysisStatus === "analyzing"}
                className="flex h-14 items-center justify-center gap-3 rounded-2xl bg-blue-600 px-9 text-base font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
              >
                <span className="text-lg">✦</span>
                {analysisStatus === "analyzing" ? "分析中" : "开始分析"}
              </button>
            </div>

            <div className="mx-auto mt-5 max-w-4xl text-left">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-800">
                    选择审查角色
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    不同角色会影响 AI Review 的关注重点。
                  </p>
                </div>

                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600">
                  Reviewer Persona
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                {reviewerPersonas.map((persona) => {
                  const selected = reviewerPersona === persona.id;

                  return (
                    <button
                      key={persona.id}
                      type="button"
                      onClick={() => setReviewerPersona(persona.id)}
                      disabled={analysisStatus === "analyzing"}
                      className={`rounded-2xl border p-4 text-left transition ${
                        selected
                          ? "border-blue-400 bg-blue-50 shadow-md shadow-blue-100"
                          : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h3
                          className={`text-sm font-semibold ${
                            selected ? "text-blue-700" : "text-slate-800"
                          }`}
                        >
                          {persona.title}
                        </h3>

                        {selected && (
                          <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                            已选择
                          </span>
                        )}
                      </div>

                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        {persona.description}
                      </p>

                      <div
                        className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-[10px] font-medium ${
                          selected
                            ? "bg-white text-blue-600"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {persona.badge}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {inputError && (
              <div className="mx-auto mt-3 max-w-4xl rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-left text-sm text-red-600">
                {inputError}
              </div>
            )}

            <div className="mt-9 grid gap-5 text-left md:grid-cols-3">
              {homeFeatureCards.map((feature) => (
                <article
                  key={feature.id}
                  className="group flex gap-5 rounded-3xl border border-slate-100 bg-white/90 p-6 shadow-lg shadow-slate-200/60 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/80"
                >
                  <FeatureIcon feature={feature} />

                  <div>
                    <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                      {feature.title}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {feature.description}
                    </p>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-7 flex items-center justify-center gap-2 text-sm text-slate-500">
              <span className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-xs">
                i
              </span>
              <span>* 当前仅支持公开 GitHub PR</span>
            </div>
          </div>
        </div>
      </section>

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

      <AnalysisFloatingPanel
        open={panelOpen}
        status={analysisStatus}
        currentStep={currentStep}
        steps={analysisSteps}
        prUrl={prUrl}
        errorMessage={errorMessage}
        errorCode={appError?.code}
        errorAction={appError?.action}
        onClose={() => setPanelOpen(false)}
        onRetry={() => startAnalyze(prUrl)}
        onViewResult={handleViewResult}
      />
    </main>
  );
}