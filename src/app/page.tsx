"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnalysisFloatingPanel } from "@/components/AnalysisFloatingPanel";
import { AppHeader } from "@/components/AppHeader";
import {
  GithubIcon,
  FileIcon,
  FlashIcon,
  ShieldCheckIcon,
  MessageDotsIcon,
} from "@/components/icons";
import { analysisSteps, examplePRs, featureCards } from "@/mocks";
import type { AnalysisStatus, AppError, FeatureCard } from "@/types";
import { requestAnalyzePr } from "@/services/client/analyzePrClient";

const SESSION_KEY = "pr-lens:last-analysis";

type ReviewerPersona =
  | "security"
  | "performance"
  | "testing"
  | "maintainability";

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

export default function HomePage() {
  const router = useRouter();

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
  const [user, setUser] = useState<{ id: string; username: string } | null | undefined>(undefined);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUser(data?.user ?? null))
      .catch(() => setUser(null));
  }, []);

  const canSubmit = useMemo(() => prUrl.trim().length > 0, [prUrl]);

  const validatePRUrl = (url: string) => {
    return /^https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+\/?$/.test(url);
  };

  /* 调用 API 分析，通过 onProgress 回调接收实时进度 */
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
      isMockCall
        ? undefined
        : (step) => setCurrentStep(step.stepIndex),
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
              body: JSON.stringify({ prUrl: inputUrlForStorage, response: data }),
            });
          } catch { /* 静默忽略 */ }

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

  const handleUseExample = () => {
    const exampleUrl = examplePRs[0]?.url;

    if (!exampleUrl) return;

    setInputError("");
    setErrorMessage("");
    setAppError(null);

    setPrUrl(exampleUrl);
    setPanelOpen(true);
    setAnalysisStatus("analyzing");

    runAnalysis(
      {
        useMock: true,
        reviewerPersona,
      },
      exampleUrl,
    );
  };

  const handleViewResult = () => {
    router.push("/result");
  };

  useEffect(() => {
    return () => {};
  }, []);

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-[#f6f8fb] text-slate-950">
      <div className="shrink-0">
        <AppHeader />
      </div>

      <section className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 px-6 py-5">
        <div className="relative flex min-h-0 w-full items-center overflow-hidden rounded-[32px] border border-slate-200 bg-white px-8 py-8 shadow-xl shadow-slate-200/70">
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

            <button
              onClick={handleUseExample}
              disabled={analysisStatus === "analyzing"}
              className="mt-6 inline-flex h-11 items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 text-sm font-medium text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FileIcon className="h-[18px] w-[18px]" />
              使用示例 PR 快速体验
            </button>

            <div className="mt-9 grid gap-5 text-left md:grid-cols-3">
              {featureCards.map((feature) => (
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
              {user === null && (
                <>
                  <span className="text-slate-300">·</span>
                  <Link href="/login" className="text-blue-600 hover:underline">登录</Link>
                  <span className="text-slate-500">后可查看历史分析记录</span>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

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