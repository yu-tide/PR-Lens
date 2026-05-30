"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import {
  GithubIcon, CopyIcon, DownloadIcon, UserIcon, FolderIcon,
  PlusIcon, MinusIcon,
} from "@/components/icons";
import { ChangedFilesModal } from "@/components/result/ChangedFilesModal";
import { DraftTabSection } from "@/components/result/DraftTabSection";
import { MarkdownTabSection } from "@/components/result/MarkdownTabSection";
import { OrderTabSection } from "@/components/result/OrderTabSection";
import { ResultDashboard } from "@/components/result/ResultDashboard";
import { ResultTabs } from "@/components/result/ResultTabs";
import { RiskTabSection } from "@/components/result/RiskTabSection";
import { StatCard } from "@/components/result/StatCard";
import { SuggestionTabSection } from "@/components/result/SuggestionTabSection";
import { SummaryCard } from "@/components/result/SummaryCard";
import { TestGapTabSection } from "@/components/result/TestGapTabSection";
import { WarningsPanel } from "@/components/result/WarningsPanel";
import { PAGE_CARD_CLASS, OVERVIEW_CARD_CLASS } from "@/utils/result-fallbacks";
import { useResultData } from "@/hooks/useResultData";
import { useResultActions } from "@/hooks/useResultActions";

export default function ResultPage() {
    const router = useRouter();
    const [user, setUser] = useState<{ id: string; username: string } | null | undefined>(undefined);

    useEffect(() => {
        fetch("/api/auth/me")
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => setUser(data?.user ?? null))
            .catch(() => setUser(null));
    }, []);

    const {
        setAnalysisData, inputUrl,
        showChangedFilesModal, setShowChangedFilesModal,
        retrying, setRetrying, retryError, setRetryError,
        copyStatus, setCopyStatus, draftCopyStatus, setDraftCopyStatus,
        activeTab, setActiveTab, draftComments, setDraftComments,
        isMock, displayChangedFiles, displayPrInfo,
        displayReviewFindings, displaySuggestions,
        displayRuleCheckResults, displayTestGaps, displayReviewOrder,
        selectedDraftText, markdownReport, displayWarnings,
        displayOverview, displayDashboard,
        reviewerPersona,
    } = useResultData();

    const {
        handleRetryAnalysis, handleCopyReport, handleDownloadReport,
        handleAddFindingToDraft, handleUpdateDraftBody,
        handleToggleDraft, handleDeleteDraft, handleCopyDraft,
    } = useResultActions({
        inputUrl,
        setAnalysisData,
        setRetrying,
        setRetryError,
        setCopyStatus,
        setDraftCopyStatus,
        setActiveTab,
        setDraftComments,
        displayPrInfo,
        markdownReport,
        selectedDraftText,
        reviewerPersona,
    });

    return (
        <main className="fixed inset-0 flex min-h-0 flex-col overflow-hidden overscroll-none bg-[#f3f6fb] text-slate-950">
            <ChangedFilesModal
                open={showChangedFilesModal}
                files={displayChangedFiles}
                onClose={() => setShowChangedFilesModal(false)}
            />

            <div className="shrink-0">
                <AppHeader />
            </div>

            <section className="relative mx-auto flex min-h-0 w-full max-w-[1440px] flex-1 overflow-hidden px-6 pt-3 pb-5">
                <div className="pointer-events-none absolute -left-36 top-36 h-72 w-72 rounded-full bg-blue-100/50 blur-3xl" />
                <div className="pointer-events-none absolute -right-36 top-20 h-72 w-72 rounded-full bg-indigo-100/50 blur-3xl" />
                <div className="pointer-events-none absolute left-[-160px] top-32 h-3 w-40 rotate-[-30deg] rounded-full bg-slate-200/60" />
                <div className="pointer-events-none absolute right-[-150px] top-24 h-3 w-48 rotate-[-30deg] rounded-full bg-slate-200/60" />

                <div className="relative grid min-h-0 w-full gap-6 xl:grid-cols-[430px_minmax(0,1fr)]">
                    <aside className="min-h-0 overflow-hidden">
                        <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
                            <section className={`${PAGE_CARD_CLASS} shrink-0`}>
                                <div className="flex flex-col gap-5">
                                    <div>
                                        <button
                                            onClick={() => router.back()}
                                            className="text-sm font-medium text-slate-500 transition hover:text-blue-600"
                                        >
                                            ← 返回上一页
                                        </button>
                                        {user && (
                                            <>
                                                <span className="text-sm text-slate-300">·</span>
                                                <Link href="/history" className="text-sm font-medium text-slate-500 transition hover:text-blue-600">分析历史</Link>
                                            </>
                                        )}

                                        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
                                            {displayPrInfo.title}
                                        </h1>

                                        <div className="mt-3 flex flex-wrap items-center gap-2.5 text-sm text-slate-600">
                                            <GithubIcon className="h-4.5 w-4.5 text-slate-900" />
                                            <span>{displayPrInfo.repo}</span>
                                            <span className="text-slate-300">·</span>
                                            <span>{displayPrInfo.prNumber}</span>
                                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600 ring-1 ring-emerald-200">
                                                分析完成
                                            </span>
                                            {reviewerPersona && (
                                                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                                                    {
                                                        security: "bg-red-50 text-red-600 ring-red-200",
                                                        performance: "bg-blue-50 text-blue-600 ring-blue-200",
                                                        testing: "bg-purple-50 text-purple-600 ring-purple-200",
                                                        maintainability: "bg-teal-50 text-teal-600 ring-teal-200",
                                                    }[reviewerPersona]
                                                }`}>
                                                    {{
                                                        security: "🛡 安全审查员",
                                                        performance: "⚡ 性能审查员",
                                                        testing: "🧪 测试审查员",
                                                        maintainability: "🧩 可维护性审查员",
                                                    }[reviewerPersona]}
                                                </span>
                                            )}
                                            {isMock && (
                                                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-600 ring-1 ring-amber-200">
                                                    当前为 Mock API 模式
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3">
                                        <button
                                            onClick={handleRetryAnalysis}
                                            disabled={retrying}
                                            className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-600 disabled:opacity-50"
                                        >
                                            {retrying ? "重新分析中..." : "重新分析"}
                                        </button>

                                        <button
                                            onClick={handleCopyReport}
                                            className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-600"
                                        >
                                            <CopyIcon className="h-4 w-4" />
                                            {copyStatus === "success"
                                                ? "已复制"
                                                : copyStatus === "error"
                                                    ? "复制失败"
                                                    : "复制报告"}
                                        </button>

                                        <button
                                            onClick={handleDownloadReport}
                                            className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-700"
                                        >
                                            <DownloadIcon className="h-4 w-4" />
                                            下载报告
                                        </button>
                                    </div>

                                    <div className="grid gap-4">
                                        <StatCard
                                            icon={<UserIcon className="h-4.5 w-4.5" />}
                                            label="作者"
                                            value={displayPrInfo.author}
                                        />

                                        <StatCard
                                            icon={<FolderIcon className="h-4.5 w-4.5" />}
                                            label="变更文件"
                                            value={displayPrInfo.changedFiles}
                                            hint="点击查看文件列表"
                                            onClick={() => setShowChangedFilesModal(true)}
                                        />

                                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                                            <StatCard
                                                icon={<PlusIcon className="h-4.5 w-4.5 text-emerald-600" />}
                                                label="新增"
                                                value={displayPrInfo.additions}
                                                valueClassName="text-emerald-600"
                                            />

                                            <StatCard
                                                icon={<MinusIcon className="h-4.5 w-4.5 text-red-500" />}
                                                label="删除"
                                                value={displayPrInfo.deletions}
                                                valueClassName="text-red-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <SummaryCard summary={displayOverview.conclusion} />

                            {(displayWarnings.length > 0 || retryError) && (
                                <div className="min-h-0 flex-1 space-y-4 overflow-auto pr-1">
                                    <WarningsPanel warnings={displayWarnings} />
                                    {retryError && (
                                        <section className="rounded-[28px] border border-red-300 bg-red-50 p-4 shadow-[0_16px_38px_rgba(239,68,68,0.14)]">
                                            <p className="text-sm text-red-600">
                                                重新分析失败：{retryError}
                                            </p>
                                        </section>
                                    )}
                                </div>
                            )}
                        </div>
                    </aside>

                    <section className="min-h-0 min-w-0 overflow-visible">
                        <div className="flex h-full min-h-0 flex-col gap-3 overflow-visible">
                            <section className={`${OVERVIEW_CARD_CLASS} relative z-20 shrink-0 overflow-visible p-3`}>
                                <ResultDashboard
                                    data={displayDashboard}
                                    overview={displayOverview}
                                    onNavigate={setActiveTab}
                                />
                            </section>

                            <section className="relative z-10 flex min-h-0 flex-1 flex-col overflow-visible rounded-[28px] border border-slate-300 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.10)]">
                                <div className="relative z-20 shrink-0 overflow-visible border-b border-slate-200 p-3">
                                    <ResultTabs activeTab={activeTab} onTabChange={setActiveTab} />
                                </div>

                                <div className="min-h-0 flex-1 overflow-hidden p-4 overscroll-contain">
                                    {activeTab === "risk" && (
                                        <RiskTabSection findings={displayReviewFindings} onAddToDraft={handleAddFindingToDraft} />
                                    )}

                                    {activeTab === "suggestion" && (
                                        <SuggestionTabSection suggestions={displaySuggestions} />
                                    )}

                                    {activeTab === "testGap" && (
                                        <TestGapTabSection gaps={displayTestGaps} />
                                    )}

                                    {activeTab === "draft" && (
                                        <DraftTabSection
                                            draftComments={draftComments}
                                            draftCopyStatus={draftCopyStatus}
                                            onToggleDraft={handleToggleDraft}
                                            onDeleteDraft={handleDeleteDraft}
                                            onUpdateDraftBody={handleUpdateDraftBody}
                                            onCopyDraft={handleCopyDraft}
                                        />
                                    )}

                                    {activeTab === "order" && (
                                        <OrderTabSection ruleCheckResults={displayRuleCheckResults} reviewOrder={displayReviewOrder} />
                                    )}

                                    {activeTab === "markdown" && (
                                        <MarkdownTabSection
                                            markdownReport={markdownReport}
                                            copyStatus={copyStatus}
                                            onCopy={handleCopyReport}
                                        />
                                    )}
                                </div>
                            </section>
                        </div>
                    </section>
                </div>
            </section>
        </main>
    );
}