"use client";

import { useEffect, useState } from "react";
import type { AnalysisStatus, AnalysisStep, AppErrorCode } from "@/types";
import { SpinnerIcon, CheckIcon, CloseIcon, ChevronIcon } from "@/components/icons";

type AnalysisFloatingPanelProps = {
    open: boolean;
    status: AnalysisStatus;
    currentStep: number;
    steps: AnalysisStep[];
    prUrl: string;
    errorMessage?: string;
    errorCode?: AppErrorCode;
    errorAction?: string;
    onClose: () => void;
    onRetry: () => void;
    onViewResult: () => void;
};

/** 根据错误码返回用户可读标题 */
function getErrorTitle(errorCode?: AppErrorCode): string {
    switch (errorCode) {
        case "INVALID_PR_URL":
        case "EMPTY_PR_URL":
            return "PR 链接无效";
        case "REQUEST_INVALID_JSON":
            return "请求格式异常";
        case "GITHUB_PR_NOT_FOUND":
            return "未找到该 PR";
        case "GITHUB_RATE_LIMIT":
            return "GitHub API 暂时限流";
        case "GITHUB_TOKEN_MISSING":
            return "GitHub Token 未配置";
        case "GITHUB_TIMEOUT":
            return "GitHub 请求超时";
        case "GITHUB_API_ERROR":
            return "GitHub 数据获取异常";
        case "AI_TOKEN_MISSING":
            return "AI Key 未配置";
        case "AI_TIMEOUT":
            return "AI 分析超时";
        case "AI_RATE_LIMIT":
            return "AI 服务暂时限流";
        case "AI_API_ERROR":
            return "AI 服务异常";
        case "AI_INVALID_RESPONSE":
            return "AI 返回格式异常";
        case "NETWORK_ERROR":
            return "网络连接异常";
        case "REPORT_BUILD_ERROR":
            return "报告生成异常";
        default:
            return "分析失败";
    }
}

/** 根据错误码返回简要说明 */
function getErrorSubtitle(errorCode?: AppErrorCode): string {
    const v = [
        "INVALID_PR_URL", "EMPTY_PR_URL", "REQUEST_INVALID_JSON",
    ] as AppErrorCode[];
    if (errorCode && v.includes(errorCode)) {
        return "请检查链接格式后重试";
    }

    const g: AppErrorCode[] = [
        "GITHUB_PR_NOT_FOUND", "GITHUB_RATE_LIMIT",
        "GITHUB_TOKEN_MISSING", "GITHUB_TIMEOUT", "GITHUB_API_ERROR",
    ];
    if (errorCode && g.includes(errorCode)) {
        return "无法获取真实 GitHub 数据";
    }

    const a: AppErrorCode[] = [
        "AI_TOKEN_MISSING", "AI_TIMEOUT", "AI_RATE_LIMIT",
        "AI_INVALID_RESPONSE", "AI_API_ERROR",
    ];
    if (errorCode && a.includes(errorCode)) {
        return "AI 分析未能完成";
    }

    if (errorCode === "NETWORK_ERROR") return "请求未能完成";
    if (errorCode === "REPORT_BUILD_ERROR") return "分析完成但报告生成失败";
    return "分析任务中断，请稍后重试";
}

function getPrLabel(prUrl: string) {
    
    try {
        const url = new URL(prUrl);
        const parts = url.pathname.split("/").filter(Boolean);

        const owner = parts[0];
        const repo = parts[1];
        const number = parts[3];

        if (!owner || !repo || !number) return "GitHub Pull Request";

        return `${owner}/${repo} #${number}`;
    } catch {
        return "GitHub Pull Request";
    }
}

export function AnalysisFloatingPanel({
    open,
    status,
    currentStep,
    steps,
    prUrl,
    errorMessage,
    errorCode,
    errorAction,
    onClose,
    onRetry,
    onViewResult,
}: AnalysisFloatingPanelProps) {
    const [entered, setEntered] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        if (!open) {
            const frame = requestAnimationFrame(() => {
                setEntered(false);
                setExpanded(false);
                setElapsed(0);
            });
            return () => cancelAnimationFrame(frame);
        }

        const frame = requestAnimationFrame(() => {
            setEntered(true);
        });

        return () => cancelAnimationFrame(frame);
    }, [open]);

    // 实时计时：分析中每秒递增，完成/出错时停止
    useEffect(() => {
        if (status !== "analyzing") return;
        const frame = requestAnimationFrame(() => setElapsed(0));
        const timer = setInterval(() => setElapsed((n) => n + 1), 100);
        return () => {
            cancelAnimationFrame(frame);
            clearInterval(timer);
        };
    }, [status, open]);

    const title =
        status === "success"
            ? "分析完成"
            : status === "error"
                ? getErrorTitle(errorCode)
                : "正在分析 PR";

    const subtitle =
        status === "success"
            ? "报告已生成，可以查看完整审查结果"
            : status === "error"
                ? getErrorSubtitle(errorCode)
                : "正在调用 GitHub API + AI 分析，请稍候";

    const detail =
        status === "success"
            ? "已生成摘要、风险提示和 Review 建议"
            : status === "error"
                ? errorMessage || "无法完成分析，请稍后重试"
            : `正在分析 ${steps.length} 个步骤，已用时 ${(elapsed / 10).toFixed(1)}s`;

    const elapsedDisplay = `${(elapsed / 10).toFixed(1)}s`;

    const statusDotClass =
        status === "success"
            ? "bg-emerald-500"
            : status === "error"
                ? "bg-red-500"
                : "bg-blue-500";

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 sm:px-6">
            <div
                className={`absolute inset-0 bg-slate-950/25 backdrop-blur-md transition-opacity duration-300 ${entered ? "opacity-100" : "opacity-0"
                    }`}
            />

            <div
                className={`relative flex max-h-[calc(100vh-64px)] w-full max-w-[560px] flex-col overflow-hidden rounded-[28px] border border-white/80 bg-white/95 shadow-2xl shadow-slate-950/20 backdrop-blur-xl transition-all duration-300 ease-out ${entered
                    ? "translate-y-0 scale-100 opacity-100"
                    : "translate-y-6 scale-95 opacity-0"
                    }`}
            >
                <div className="relative shrink-0 overflow-hidden border-b border-slate-100 px-6 py-5">
                    <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-blue-100 blur-3xl" />
                    <div className="pointer-events-none absolute -left-16 bottom-0 h-40 w-40 rounded-full bg-indigo-100 blur-3xl" />

                    <div className="relative flex items-start justify-between gap-5">
                        <div className="min-w-0">
                            <div className="flex items-center gap-3">
                                <span className={`relative h-3 w-3 rounded-full ${statusDotClass}`}>
                                    {status === "analyzing" && (
                                        <span className="absolute inset-0 animate-ping rounded-full bg-blue-500 opacity-40" />
                                    )}
                                </span>

                                <h3 className="text-xl font-semibold tracking-tight text-slate-950">
                                    {title}
                                </h3>
                            </div>

                            <p className="mt-2 text-sm font-medium text-slate-500">
                                {getPrLabel(prUrl)}
                            </p>
                        </div>

                        <button
                            onClick={onClose}
                            className="rounded-2xl p-2 text-slate-400 transition hover:bg-white/80 hover:text-slate-700"
                            aria-label="关闭"
                        >
                            <CloseIcon />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-5">
                    <div className="rounded-[22px] border border-slate-100 bg-slate-50/80 p-4">
                        <div className="flex items-center gap-5">
                            <div
                                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${status === "success"
                                    ? "bg-emerald-50 text-emerald-600"
                                    : status === "error"
                                        ? "bg-red-50 text-red-600"
                                        : "bg-blue-50 text-blue-600"
                                    }`}
                            >
                                {status === "success" ? (
                                    <CheckIcon className="h-7 w-7" />
                                ) : status === "error" ? (
                                    <span className="text-2xl font-semibold">!</span>
                                ) : (
                                    <SpinnerIcon className="h-6 w-6" />
                                )}
                            </div>

                            <div className="min-w-0 flex-1">
                                <p className="text-base font-semibold text-slate-900">
                                    {subtitle}
                                </p>
                                <p className="mt-1 text-sm leading-6 text-slate-500">
                                    {detail}
                                </p>
                                {status === "error" && errorAction && (
                                    <p className="mt-1.5 text-xs leading-5 text-red-500">
                                        {errorAction}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="mt-6">
                            {status === "analyzing" ? (
                                <>
                                    <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-500">
                                        <span>{currentStep > 0 ? `步骤 ${currentStep}/${steps.length}` : "已用时"}</span>
                                        <span className="tabular-nums">{elapsedDisplay}</span>
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                                        {currentStep > 0 ? (
                                            <div
                                                className="h-full rounded-full bg-blue-500 transition-all duration-700 ease-out"
                                                style={{ width: `${Math.round((currentStep / steps.length) * 100)}%` }}
                                            />
                                        ) : (
                                            <div className="h-full w-2/5 animate-shimmer rounded-full bg-gradient-to-r from-blue-400 via-blue-600 to-blue-400 bg-[length:200%_100%]" />
                                        )}
                                    </div>
                                </>
                            ) : status === "success" ? (
                                <>
                                    <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-500">
                                        <span>完成</span>
                                        <span className="tabular-nums text-emerald-600">用时 {elapsedDisplay}</span>
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-emerald-100">
                                        <div className="h-full w-full rounded-full bg-emerald-500" />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-500">
                                        <span>分析中断</span>
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-red-100">
                                        <div className="h-full w-1/4 rounded-full bg-red-400" />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={() => setExpanded((value) => !value)}
                        className="mt-5 flex w-full items-center justify-between rounded-2xl px-1 py-2 text-sm font-medium text-slate-500 transition hover:text-slate-800"
                    >
                        <span>{expanded ? "收起分析步骤" : "查看分析步骤"}</span>
                        <ChevronIcon className={`h-4 w-4 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`} />
                    </button>

                    <div
                        className={`grid transition-all duration-300 ease-out ${expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                            }`}
                    >
                        <div className="overflow-hidden">
                            <div className="mt-2 max-h-[260px] space-y-2 overflow-y-auto pr-1">
                                {steps.map((step, index) => {
                                    const isDone = status === "success" || (status === "analyzing" && index < currentStep);
                                    const isCurrent = status === "analyzing" && index === currentStep;

                                    return (
                                        <div
                                            key={step.id}
                                            className={`flex gap-3 rounded-2xl px-3.5 py-2.5 transition-colors duration-300 ${
                                                isCurrent ? "bg-blue-50" : isDone ? "bg-emerald-50/70" : "bg-slate-50/70"
                                            }`}
                                        >
                                            <div
                                                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors duration-300 ${
                                                    isDone ? "bg-emerald-500 text-white"
                                                    : isCurrent ? "bg-blue-600 text-white"
                                                    : "bg-slate-200 text-slate-400"
                                                }`}
                                            >
                                                {isDone ? (
                                                    <CheckIcon className="h-4 w-4" />
                                                ) : isCurrent ? (
                                                    <SpinnerIcon className="h-4 w-4" />
                                                ) : (
                                                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                                )}
                                            </div>

                                            <div className="min-w-0">
                                                <p className={`text-sm font-semibold ${
                                                    isCurrent || isDone ? "text-slate-900" : "text-slate-500"
                                                }`}>
                                                    {step.title}
                                                </p>
                                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                                    {step.description}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="shrink-0 flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/80 px-6 py-4">
                    {status === "error" && (
                        <button
                            onClick={onRetry}
                            className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:border-blue-200 hover:text-blue-600"
                        >
                            重新分析
                        </button>
                    )}

                    {status === "success" ? (
                        <button
                            onClick={onViewResult}
                            className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:-translate-y-0.5 hover:bg-blue-700 active:translate-y-0"
                        >
                            查看分析结果
                        </button>
                    ) : status === "analyzing" ? (
                        <button
                            disabled
                            className="rounded-2xl bg-slate-200 px-6 py-3 text-sm font-semibold text-slate-500"
                        >
                            分析中...
                        </button>
                    ) : null}
                </div>
            </div>
        </div>
    );
}