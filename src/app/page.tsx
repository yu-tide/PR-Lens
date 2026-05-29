"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnalysisFloatingPanel } from "@/components/AnalysisFloatingPanel";
import { AppHeader } from "@/components/AppHeader";
import { analysisSteps, examplePRs, featureCards } from "@/mocks";
import type { AnalysisStatus, AnalyzePrResponse, FeatureCard } from "@/types";

const SESSION_KEY = "pr-lens:last-analysis";

function GitHubIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M12 2C6.48 2 2 6.58 2 12.24c0 4.52 2.87 8.35 6.84 9.7.5.1.68-.22.68-.49 0-.24-.01-1.04-.01-1.89-2.78.62-3.37-1.21-3.37-1.21-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.9 1.57 2.36 1.12 2.93.86.09-.67.35-1.12.64-1.38-2.22-.26-4.55-1.14-4.55-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.35 9.35 0 0 1 12 6.95c.85 0 1.7.12 2.5.34 1.9-1.33 2.74-1.05 2.74-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.8-4.57 5.05.36.32.68.94.68 1.9 0 1.38-.01 2.49-.01 2.83 0 .27.18.59.69.49A10.05 10.05 0 0 0 22 12.24C22 6.58 17.52 2 12 2Z" />
    </svg>
  );
}

function FileIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <path
        d="M7 3h7l4 4v14H7V3Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M14 3v5h5M9 13h6M9 17h4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FlashIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <path d="M13 2 4 14h7l-1 8 10-13h-7V2Z" fill="currentColor" />
    </svg>
  );
}

function ShieldIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <path
        d="M12 3 5 6v5.5c0 4.2 2.9 8.1 7 9.5 4.1-1.4 7-5.3 7-9.5V6l-7-3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="m9 12 2 2 4-4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MessageIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <path
        d="M5 5h14v10H9l-4 4V5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M9 10h.01M12 10h.01M15 10h.01"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

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
      {feature.icon === "shield" && <ShieldIcon className="h-6 w-6" />}
      {feature.icon === "message" && <MessageIcon className="h-6 w-6" />}
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

    fetch("/api/analyze-pr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(async (res) => {
        const data = (await res.json()) as AnalyzePrResponse;
        clearAnalysisTimer();

        if (res.ok && data.success) {
          try {
            sessionStorage.setItem(
              SESSION_KEY,
              JSON.stringify({ data, inputUrl: inputUrlForStorage }),
            );
          } catch {
            /* sessionStorage 不可用时静默忽略 */
          }

          setCurrentStep(analysisSteps.length);
          setTimeout(() => setAnalysisStatus("success"), 400);
          return;
        }

        setAnalysisStatus("error");
        setErrorMessage(
          data.error?.message || "分析失败，请稍后重试",
        );
      })
      .catch(() => {
        clearAnalysisTimer();
        setAnalysisStatus("error");
        setErrorMessage("分析失败，请稍后重试");
      });
  };

  const startAnalyze = (targetUrl?: string) => {
    const nextUrl = targetUrl ?? prUrl.trim();

    setInputError("");
    clearAnalysisTimer();
    setErrorMessage("");

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
                <GitHubIcon className="pointer-events-none absolute left-6 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
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
        onClose={() => setPanelOpen(false)}
        onRetry={() => startAnalyze(prUrl)}
        onViewResult={handleViewResult}
      />
    </main>
  );
}