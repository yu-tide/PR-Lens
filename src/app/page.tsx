"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnalysisFloatingPanel } from "@/components/AnalysisFloatingPanel";
import { AppHeader } from "@/components/AppHeader";
import {
  GithubIcon, FileIcon, FlashIcon, ShieldCheckIcon, MessageDotsIcon,
} from "@/components/icons";
import { analysisSteps, examplePRs, featureCards } from "@/mocks";
import type { AnalysisStatus, AppError, FeatureCard } from "@/types";
import { requestAnalyzePr } from "@/services/client/analyzePrClient";

const SESSION_KEY = "pr-lens:last-analysis";

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
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [prUrl, setPrUrl] = useState("");
  const [inputError, setInputError] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>("idle");
  const [currentStep, setCurrentStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [appError, setAppError] = useState<AppError | null>(null);

  const canSubmit = useMemo(() => prUrl.trim().length > 0, [prUrl]);

  const validatePRUrl = (url: string) => {
    return /^https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+\/?$/.test(url);
  };

  const clearAnalysisTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  /* 共享分析流程：启动视觉进度动画 + 调用 API */
  const runAnalysis = (
    body: { url?: string; useMock?: boolean },
    inputUrlForStorage: string,
  ) => {
    /* 视觉进度动画（不决定最终结果，API 响应是唯一权威） */
    let stepIndex = 0;
    timerRef.current = setInterval(() => {
      stepIndex += 1;
      if (stepIndex >= analysisSteps.length) {
        clearAnalysisTimer();
        return;
      }
      setCurrentStep(stepIndex);
    }, 760);

    requestAnalyzePr(body)
      .then((data) => {
        clearAnalysisTimer();

        if (data.success) {
          try {
            sessionStorage.setItem(
              SESSION_KEY,
              JSON.stringify({ data, inputUrl: inputUrlForStorage }),
            );
          } catch {
            /* sessionStorage 不可用时静默忽略 */
          }

          setCurrentStep(analysisSteps.length);
          setAppError(null);
          setTimeout(() => setAnalysisStatus("success"), 400);
          return;
        }

        setAnalysisStatus("error");
        setAppError(data.error ?? null);
        setErrorMessage(
          data.error?.message || "分析失败，请稍后重试",
        );
      })
      .catch(() => {
        clearAnalysisTimer();
        setAnalysisStatus("error");
        setErrorMessage("网络异常，请稍后重试");
      });
  };

  const startAnalyze = (targetUrl?: string) => {
    const nextUrl = targetUrl ?? prUrl.trim();

    setInputError("");
    clearAnalysisTimer();
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
    setCurrentStep(0);

    runAnalysis({ url: nextUrl, useMock: false }, nextUrl);
  };

  const handleUseExample = () => {
    const exampleUrl = examplePRs[0]?.url;

    if (!exampleUrl) return;

    clearAnalysisTimer();
    setInputError("");
    setErrorMessage("");
    setAppError(null);

    setPrUrl(exampleUrl);
    setPanelOpen(true);
    setAnalysisStatus("analyzing");
    setCurrentStep(0);

    runAnalysis({ useMock: true }, exampleUrl);
  };

  const handleViewResult = () => {
    router.push("/result");
  };

  useEffect(() => {
    return () => {
      clearAnalysisTimer();
    };
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