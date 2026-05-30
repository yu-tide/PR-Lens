"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AppHeader } from "@/components/AppHeader";
import {
  GithubIcon, CopyIcon, DownloadIcon, UserIcon, FolderIcon,
  PlusIcon, MinusIcon, SparkIcon, ShieldIcon, MessageIcon,
  FileIcon, BeakerIcon, CheckIcon,
} from "@/components/icons";
import { ChangedFilesModal } from "@/components/result/ChangedFilesModal";
import { PriorityBadge } from "@/components/result/PriorityBadge";
import { ResultDashboard } from "@/components/result/ResultDashboard";
import { RiskCard } from "@/components/result/RiskCard";
import { StatCard } from "@/components/result/StatCard";
import { SuggestionIcon } from "@/components/result/SuggestionIcon";
import { SummaryCard } from "@/components/result/SummaryCard";
import { TabTooltip } from "@/components/result/TabTooltip";
import { requestAnalyzePr } from "@/services/client/analyzePrClient";
import {
  extractPrNumber, mapRiskLevel, mapCategoryToIcon, getRiskLabel,
  getRiskScoreLevel, normalizeRiskLevel, calculateRiskScore,
  parseSignedDisplayNumber, readNumberField, normalizePercent,
  readChangedFilesFromResponse, buildFallbackEvidence,
  getConfidenceByLevel, buildTestGaps,
} from "@/utils/review-helpers";
import type {
  AnalyzePrResponse, DashboardData, DraftComment,
  OverviewDisplay, ReviewFindingDisplay, TabKey,
} from "@/types";

type RiskLevel = "high" | "medium" | "low";

const PAGE_CARD_CLASS =
    "rounded-[28px] border border-slate-300 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.10)]";

const OVERVIEW_CARD_CLASS =
    "rounded-[24px] border border-slate-300 bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.09)]";

const INNER_CARD_CLASS =
    "rounded-2xl border border-slate-300 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.08)]";

const SUBTLE_PANEL_CLASS =
    "rounded-2xl border border-slate-200 bg-slate-50/80 shadow-inner";

const prInfo = {
    title: "为 API 路由添加限流支持",
    repo: "vercel/next.js",
    prNumber: "#57855",
    author: "leerob",
    changedFiles: "12 个文件",
    additions: "+324",
    deletions: "-97",
};


const summary = [
    "本次 PR 为 Next.js 添加了 API 路由限流能力，提供了灵活的限流配置与多种应用方式。",
    "实现基于 Redis 的分布式限流，支持多种响应头与客户端友好的错误提示，提升系统稳定性与安全性。",
    "整体代码结构清晰，建议在生产环境中关注 Redis 可用性与限流配置合理性。",
];

const risks: Array<{
    level: RiskLevel;
    label: string;
    title: string;
    description: string;
    suggestion: string;
}> = [
    {
        level: "high",
        label: "高风险",
        title: "潜在性能影响",
        description: "高流量下 Redis 调用可能成为瓶颈。",
        suggestion: "建议在生产环境中压测并监控 Redis 延迟。",
    },
    {
        level: "medium",
        label: "中风险",
        title: "限流配置不当",
        description: "过于严格或宽松的限流策略可能影响业务。",
        suggestion: "建议根据实际流量调优阈值与窗口设置。",
    },
    {
        level: "low",
        label: "低风险",
        title: "客户端兼容性",
        description: "部分代理或旧客户端可能不识别标准响应头。",
        suggestion: "建议提供降级处理与友好错误提示。",
    },
];

const suggestions = [
    {
        icon: "beaker",
        title: "补充压力测试用例",
        description: "验证不同并发下的限流效果与性能表现。",
    },
    {
        icon: "settings",
        title: "完善配置校验",
        description: "避免阈值、窗口期或 Redis 配置出现不合理值。",
    },
    {
        icon: "chart",
        title: "增加限流指标监控",
        description: "便于在生产环境中快速定位限流异常问题。",
    },
    {
        icon: "doc",
        title: "补充使用文档与示例",
        description: "降低团队接入成本，提高可维护性。",
    },
];

const markdownLines = [
    "# PR 审查报告：为 API 路由添加限流支持",
    "**仓库**：vercel/next.js",
    "**PR 编号**：#57855",
    "**作者**：leerob",
    "**状态**：分析完成",
];

const fallbackReviewOrder = [
    {
        file: "src/server/api/rate-limit.ts",
        title: "Redis 调用 / 高流量路径",
        severity: "high" as RiskLevel,
        description: "该文件位于限流核心链路，应优先确认 Redis 访问、异常处理与性能边界。",
    },
    {
        file: "src/config/rate-limit.ts",
        title: "限流阈值与窗口配置",
        severity: "high" as RiskLevel,
        description: "配置项会直接影响线上请求体验，需要重点检查默认值、边界值与覆盖策略。",
    },
    {
        file: "tests/rate-limit.test.ts",
        title: "测试覆盖与异常场景",
        severity: "medium" as RiskLevel,
        description: "建议确认并发、Redis 失败、超限响应与恢复场景是否已有测试覆盖。",
    },
    {
        file: "docs/api-rate-limit.md",
        title: "使用说明与接入约束",
        severity: "low" as RiskLevel,
        description: "文档应说明响应头、错误码、配置示例与生产环境注意事项。",
    },
];

const SESSION_KEY = "pr-lens:last-analysis";

type RiskDisplay = {
    level: RiskLevel;
    label: string;
    title: string;
    description: string;
    suggestion: string;
};

type ReviewOrderItem = {
    file: string;
    title: string;
    severity: RiskLevel;
    description: string;
};


const FALLBACK = {
    prInfo,
    summary,
    risks,
    suggestions,
    markdownLines,
};

export default function ResultPage() {
    const [analysisData, setAnalysisData] = useState<AnalyzePrResponse | null>(null);
    const [inputUrl, setInputUrl] = useState("");
    const [showChangedFilesModal, setShowChangedFilesModal] = useState(false);
    const router = useRouter();
    const [retrying, setRetrying] = useState(false);
    const [retryError, setRetryError] = useState("");
    const [copyStatus, setCopyStatus] = useState<"idle" | "success" | "error">("idle");
    const [draftCopyStatus, setDraftCopyStatus] = useState<"idle" | "success" | "error">("idle");
    const [activeTab, setActiveTab] = useState<TabKey>("risk");
    const [draftComments, setDraftComments] = useState<DraftComment[]>([]);

    useEffect(() => {
        const frame = requestAnimationFrame(() => {
            try {
                const raw = sessionStorage.getItem(SESSION_KEY);
                if (!raw) return;

                const parsed = JSON.parse(raw);

                if (parsed?.data) {
                    setAnalysisData(parsed.data as AnalyzePrResponse);
                    setInputUrl(parsed.inputUrl ?? "");
                }
            } catch {
                /* JSON 解析失败 → 静默走 FALLBACK */
            }
        });

        return () => cancelAnimationFrame(frame);
    }, []);

    const isMock = analysisData?.mode === "mock";

    const displayChangedFiles = useMemo(() => {
        return readChangedFilesFromResponse(analysisData);
    }, [analysisData]);

    const displayPrInfo = useMemo(() => {
        const pr = analysisData?.pullRequest;
        if (!pr) return FALLBACK.prInfo;

        return {
            title: pr.title,
            repo: pr.repository,
            prNumber: extractPrNumber(inputUrl),
            author: pr.author,
            changedFiles: `${displayChangedFiles.length} 个文件`,
            additions: `+${pr.additions}`,
            deletions: `-${pr.deletions}`,
        };
    }, [analysisData, inputUrl, displayChangedFiles.length]);

    const displaySummary = useMemo(() => {
        const text = analysisData?.reviewResult?.summary;
        if (!text) return FALLBACK.summary;

        const lines = text
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean);

        return lines.length > 0 ? lines : [text];
    }, [analysisData]);

    const displayRisks: RiskDisplay[] = useMemo(() => {
        const apiRisks = analysisData?.reviewResult?.risks;
        if (!apiRisks || apiRisks.length === 0) return FALLBACK.risks;

        return apiRisks.map((r) => {
            const mapped = mapRiskLevel(r.level);
            return {
                level: mapped.level,
                label: mapped.label,
                title: r.title,
                description: r.reason,
                suggestion: r.suggestion,
            };
        });
    }, [analysisData]);

    const displayReviewFindings: ReviewFindingDisplay[] = useMemo(() => {
        return displayRisks.map((risk, index) => ({
            id: `finding-${index}`,
            level: risk.level,
            label: risk.label,
            title: risk.title,
            description: risk.description,
            suggestion: risk.suggestion,
            category:
                index === 0
                    ? "Performance"
                    : index === 1
                        ? "Configuration"
                        : "Compatibility",
            confidence: getConfidenceByLevel(risk.level, index),
            needsHumanCheck: risk.level !== "low",
            evidence: buildFallbackEvidence(index),
        }));
    }, [displayRisks]);

    const displaySuggestions = useMemo(() => {
        const apiSuggestions = analysisData?.reviewResult?.suggestions;
        if (!apiSuggestions || apiSuggestions.length === 0) return FALLBACK.suggestions;

        return apiSuggestions.map((s) => ({
            icon: mapCategoryToIcon(s.category),
            title: s.title,
            description: s.suggestion,
        }));
    }, [analysisData]);

    const displayRuleCheckResults = useMemo(() => {
        return analysisData?.ruleCheckResults ?? [];
    }, [analysisData]);

    const displayTestGaps = useMemo(() => {
        return buildTestGaps(displayChangedFiles);
    }, [displayChangedFiles]);

    const displayReviewOrder: ReviewOrderItem[] = useMemo(() => {
        if (displayRuleCheckResults.length === 0) {
            return fallbackReviewOrder;
        }

        return displayRuleCheckResults.map((rule) => {
            const fileText = rule.file
                ? `${rule.file}${rule.line ? ` · 第 ${rule.line} 行` : ""}`
                : "规则预检查";

            return {
                file: fileText,
                title: rule.title,
                severity: normalizeRiskLevel(rule.severity),
                description: rule.message,
            };
        });
    }, [displayRuleCheckResults]);

    useEffect(() => {
        const frame = requestAnimationFrame(() => {
            setDraftComments((prev) => {
                if (prev.length > 0) return prev;

                return displayReviewFindings.slice(0, 2).map((finding) => ({
                id: `draft-${finding.id}`,
                sourceFindingId: finding.id,
                title: finding.title,
                severity: finding.level,
                selected: true,
                edited: false,
                body: `**${finding.title}**\n\n${finding.description}\n\n建议：${finding.suggestion}\n\n证据：${finding.evidence[0]?.file ?? "暂无"}${finding.evidence[0]?.line ? ` · 第 ${finding.evidence[0].line} 行` : ""}\n\n置信度：${finding.confidence}%`,
            }));
            });
        });
        return () => cancelAnimationFrame(frame);
    }, [displayReviewFindings]);

    const selectedDraftText = useMemo(() => {
        return draftComments
            .filter((item) => item.selected)
            .map((item) => item.body)
            .join("\n\n---\n\n");
    }, [draftComments]);

    const displayMarkdownLines = useMemo(() => {
        if (!analysisData?.reviewResult) return FALLBACK.markdownLines;

        const p = displayPrInfo;
        const s = displaySummary;
        const r = displayRisks;
        const sg = displaySuggestions;

        const lines: string[] = [
            `# PR 审查报告：${p.title}`,
            `**仓库**：${p.repo}`,
            `**PR 编号**：${p.prNumber}`,
            `**作者**：${p.author}`,
            "**状态**：分析完成",
            "",
            "## 摘要",
            ...s,
            "",
            "## 变更文件",
            ...displayChangedFiles.map((file) => `- ${file}`),
            "",
            "## 风险分析",
        ];

        r.forEach((risk) => {
            lines.push(`- **${risk.label}**（${risk.title}）：${risk.description}`);
            lines.push(`  建议：${risk.suggestion}`);
        });

        lines.push("", "## Evidence & Confidence");
        displayReviewFindings.forEach((finding) => {
            lines.push(`- **${finding.title}**：置信度 ${finding.confidence}%`);
            finding.evidence.forEach((evidence) => {
                lines.push(`  - ${evidence.file}${evidence.line ? ` · 第 ${evidence.line} 行` : ""}：${evidence.reason}`);
            });
        });

        lines.push("", "## 测试缺口");
        displayTestGaps.forEach((gap) => {
            lines.push(`- **${gap.sourceFile}**：${gap.reason}`);
            lines.push(`  建议测试文件：${gap.expectedTestFile}`);
        });

        if (displayRuleCheckResults.length > 0) {
            lines.push("", "## 规则预检查");
            displayRuleCheckResults.forEach((rule) => {
                lines.push(`- **${rule.title}**：${rule.message}`);
                if (rule.file || rule.line) {
                    lines.push(`  位置：${rule.file ?? "未知文件"}${rule.line ? ` · 第 ${rule.line} 行` : ""}`);
                }
            });
        }

        lines.push("", "## Review 建议");

        sg.forEach((sgItem) => {
            lines.push(`- **${sgItem.title}**：${sgItem.description}`);
        });

        if (draftComments.length > 0) {
            lines.push("", "## 评论草稿箱");
            draftComments
                .filter((item) => item.selected)
                .forEach((draft) => {
                    lines.push(`### ${draft.title}`);
                    lines.push(draft.body);
                    lines.push("");
                });
        }

        return lines;
    }, [
        analysisData,
        displayPrInfo,
        displaySummary,
        displayRisks,
        displaySuggestions,
        displayRuleCheckResults,
        displayChangedFiles,
        displayReviewFindings,
        displayTestGaps,
        draftComments,
    ]);

    const markdownReport = useMemo(() => {
        return analysisData?.markdownReport ?? displayMarkdownLines.join("\n");
    }, [analysisData, displayMarkdownLines]);

    const displayWarnings = useMemo(() => {
        return analysisData?.warnings ?? [];
    }, [analysisData]);

    const displayOverview: OverviewDisplay = useMemo(() => {
        if (!analysisData?.reviewResult) {
            return {
                riskScore: 78,
                riskLevel: "high",
                riskLabel: "高风险",
                highRiskCount: 3,
                suggestionCount: 4,
                confidence: 82,
                conclusion: [
                    "本次 PR 重点涉及 API 路由限流能力、Redis 分布式调用和错误响应策略。",
                    "建议优先审查高流量场景下的 Redis 性能、限流配置边界以及测试覆盖缺口。",
                ],
            };
        }

        const reviewResult = analysisData.reviewResult as unknown as Record<string, unknown>;
        const explicitScore = readNumberField(reviewResult, [
            "riskScore",
            "risk_score",
            "overallRiskScore",
            "overall_risk_score",
            "score",
        ]);

        const rawRisks = Array.isArray(reviewResult.risks) ? reviewResult.risks : [];
        const rawSuggestions = Array.isArray(reviewResult.suggestions)
            ? reviewResult.suggestions
            : [];

        const explicitConfidence = readNumberField(reviewResult, [
            "averageConfidence",
            "average_confidence",
            "confidence",
            "confidenceScore",
        ]);

        const confidenceValues = [...rawRisks, ...rawSuggestions]
            .map((item) =>
                readNumberField(item, [
                    "confidence",
                    "confidenceScore",
                    "confidence_score",
                ]),
            )
            .filter((value): value is number => value !== null);

        const riskScore = explicitScore !== null
            ? normalizePercent(explicitScore)
            : calculateRiskScore(displayRisks);

        const confidence = explicitConfidence !== null
            ? normalizePercent(explicitConfidence)
            : confidenceValues.length > 0
                ? normalizePercent(
                    confidenceValues.reduce((sum, value) => sum + value, 0) /
                    confidenceValues.length,
                )
                : 82;

        const riskLevel = getRiskScoreLevel(riskScore);

        return {
            riskScore,
            riskLevel,
            riskLabel: getRiskLabel(riskLevel),
            highRiskCount: displayRisks.filter((risk) => risk.level === "high").length,
            suggestionCount: displaySuggestions.length,
            confidence,
            conclusion: displaySummary.slice(0, 2),
        };
    }, [analysisData, displayRisks, displaySuggestions, displaySummary]);

    const displayDashboard: DashboardData = useMemo(() => {
        const additions = Math.max(0, parseSignedDisplayNumber(displayPrInfo.additions));
        const deletions = Math.abs(parseSignedDisplayNumber(displayPrInfo.deletions));
        const highRiskCount = displayRisks.filter((risk) => risk.level === "high").length;
        const mediumRiskCount = displayRisks.filter((risk) => risk.level === "medium").length;
        const lowRiskCount = displayRisks.filter((risk) => risk.level === "low").length;
        const evidenceCount = displayReviewFindings.reduce(
            (total, finding) => total + finding.evidence.length,
            0,
        );

        return {
            riskScore: displayOverview.riskScore,
            riskLevel: displayOverview.riskLevel,
            highRiskCount,
            mediumRiskCount,
            lowRiskCount,
            totalRiskCount: displayRisks.length,
            suggestionCount: displaySuggestions.length,
            testGapCount: displayTestGaps.length,
            draftCommentCount: draftComments.length,
            evidenceCount,
            changedFileCount: displayChangedFiles.length,
            additions,
            deletions,
            totalChanges: additions + deletions,
            confidence: displayOverview.confidence,
        };
    }, [
        displayPrInfo.additions,
        displayPrInfo.deletions,
        displayRisks,
        displaySuggestions.length,
        displayTestGaps.length,
        draftComments.length,
        displayReviewFindings,
        displayChangedFiles.length,
        displayOverview,
    ]);

    const tabs: Array<{
        key: TabKey;
        label: string;
        icon: ReactNode;
        description: string;
    }> = [
        {
            key: "risk",
            label: "风险分析",
            icon: <ShieldIcon className="h-4 w-4" />,
            description: "按风险类型聚合规则与 AI 发现，并展示证据与置信度。",
        },
        {
            key: "suggestion",
            label: "审查建议",
            icon: <MessageIcon className="h-4 w-4" />,
            description: "AI 建议先进入草稿，由人工确认后再复制使用。",
        },
        {
            key: "testGap",
            label: "测试缺口",
            icon: <BeakerIcon className="h-4 w-4" />,
            description: "根据变更文件识别潜在测试覆盖缺口。",
        },
        {
            key: "draft",
            label: "评论草稿箱",
            icon: <FileIcon className="h-4 w-4" />,
            description: "将风险发现整理成可编辑、可筛选、可复制的 Review 评论草稿。",
        },
        {
            key: "order",
            label: "智能审查顺序",
            icon: <SparkIcon className="h-4 w-4" />,
            description: "根据风险等级、审查依据与潜在影响面生成优先级。",
        },
        {
            key: "markdown",
            label: "Markdown 报告",
            icon: <FileIcon className="h-4 w-4" />,
            description: "预览可复制、可下载的 Markdown 审查报告。",
        },
    ];

    async function handleRetryAnalysis() {
        if (!inputUrl) {
            router.push("/");
            return;
        }

        setRetrying(true);
        setRetryError("");

        try {
            const data = await requestAnalyzePr({
                url: inputUrl,
                useMock: false,
            });

            if (!data.success) {
                setRetryError(data.error?.message ?? "重新分析失败，请稍后重试");
                return;
            }

            try {
                sessionStorage.setItem(
                    SESSION_KEY,
                    JSON.stringify({ data, inputUrl }),
                );
            } catch {
                /* sessionStorage 不可用时忽略 */
            }

            setAnalysisData(data);
        } catch {
            setRetryError("网络异常，请稍后重试");
        } finally {
            setRetrying(false);
        }
    }

    function buildReportFilename(info: typeof displayPrInfo): string {
        const repo = info.repo.replace(/[^a-zA-Z0-9_-]+/g, "-");
        const prNumber = info.prNumber.replace(/[^0-9]+/g, "") || "unknown";
        return `${repo}-pr-${prNumber}-review.md`;
    }

    async function handleCopyReport() {
        try {
            await navigator.clipboard.writeText(markdownReport);
            setCopyStatus("success");
            window.setTimeout(() => setCopyStatus("idle"), 1600);
        } catch {
            setCopyStatus("error");
            window.setTimeout(() => setCopyStatus("idle"), 1600);
        }
    }

    async function handleCopyDraft() {
        try {
            await navigator.clipboard.writeText(selectedDraftText || "暂无选中的评论草稿");
            setDraftCopyStatus("success");
            window.setTimeout(() => setDraftCopyStatus("idle"), 1600);
        } catch {
            setDraftCopyStatus("error");
            window.setTimeout(() => setDraftCopyStatus("idle"), 1600);
        }
    }

    function handleDownloadReport() {
        const blob = new Blob([markdownReport], {
            type: "text/markdown;charset=utf-8",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = buildReportFilename(displayPrInfo);
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }

    function handleAddFindingToDraft(finding: ReviewFindingDisplay) {
        setDraftComments((prev) => {
            const existed = prev.some((item) => item.sourceFindingId === finding.id);
            if (existed) return prev;

            return [
                ...prev,
                {
                    id: `draft-${finding.id}`,
                    sourceFindingId: finding.id,
                    title: finding.title,
                    severity: finding.level,
                    selected: true,
                    edited: false,
                    body: `**${finding.title}**\n\n${finding.description}\n\n建议：${finding.suggestion}\n\n证据：${finding.evidence[0]?.file ?? "暂无"}${finding.evidence[0]?.line ? ` · 第 ${finding.evidence[0].line} 行` : ""}\n\n置信度：${finding.confidence}%`,
                },
            ];
        });

        setActiveTab("draft");
    }

    function handleUpdateDraftBody(id: string, body: string) {
        setDraftComments((prev) =>
            prev.map((item) =>
                item.id === id
                    ? {
                        ...item,
                        body,
                        edited: true,
                    }
                    : item,
            ),
        );
    }

    function handleToggleDraft(id: string) {
        setDraftComments((prev) =>
            prev.map((item) =>
                item.id === id
                    ? {
                        ...item,
                        selected: !item.selected,
                    }
                    : item,
            ),
        );
    }

    function handleDeleteDraft(id: string) {
        setDraftComments((prev) => prev.filter((item) => item.id !== id));
    }

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
                                        <Link
                                            href="/"
                                            className="text-sm font-medium text-slate-500 transition hover:text-blue-600"
                                        >
                                            ← 返回首页
                                        </Link>

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
                                    {displayWarnings.length > 0 && (
                                        <section className="rounded-[28px] border border-amber-300 bg-amber-50 p-5 shadow-[0_16px_38px_rgba(245,158,11,0.16)]">
                                            <p className="text-sm font-semibold text-amber-800">
                                                当前结果包含降级提示
                                            </p>
                                            <ul className="mt-1.5 space-y-1">
                                                {displayWarnings.map((w, i) => (
                                                    <li
                                                        key={`${w.message}-${i}`}
                                                        className="text-sm leading-6 text-amber-700"
                                                    >
                                                        {w.message}
                                                        {w.action && (
                                                            <span className="ml-2 text-xs text-amber-600">
                                                                — {w.action}
                                                            </span>
                                                        )}
                                                    </li>
                                                ))}
                                            </ul>
                                        </section>
                                    )}

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
                                    <div className="flex flex-wrap items-center gap-2 overflow-visible">
                                        {tabs.map((tab, index) => {
                                            const active = activeTab === tab.key;

                                            return (
                                                <button
                                                    key={tab.key}
                                                    onClick={() => setActiveTab(tab.key)}
                                                    className={`group relative inline-flex h-10 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-semibold transition ${
                                                        active
                                                            ? "border-blue-300 bg-blue-50 text-blue-600 shadow-md shadow-blue-100/70"
                                                            : "border-slate-200 bg-slate-50 text-slate-500 shadow-sm hover:border-slate-300 hover:bg-white hover:text-slate-700"
                                                    }`}
                                                >
                                                    {tab.icon}
                                                    {tab.label}
                                                    <TabTooltip
                                                        align={
                                                            index === 0
                                                                ? "left"
                                                                : index >= tabs.length - 2
                                                                    ? "right"
                                                                    : "center"
                                                        }
                                                    >
                                                        {tab.description}
                                                    </TabTooltip>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="min-h-0 flex-1 overflow-hidden p-4 overscroll-contain">
                                    {activeTab === "risk" && (
                                        <section className="h-full overflow-auto pr-1">
                                            <div className="grid gap-4 2xl:grid-cols-3">
                                                {displayReviewFindings.map((risk) => (
                                                    <RiskCard
                                                        key={risk.id}
                                                        risk={risk}
                                                        onAddToDraft={handleAddFindingToDraft}
                                                    />
                                                ))}
                                            </div>
                                        </section>
                                    )}

                                    {activeTab === "suggestion" && (
                                        <section className="h-full overflow-auto pr-1">
                                            <div className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-md">
                                                {displaySuggestions.map((suggestion, index) => (
                                                    <div
                                                        key={suggestion.title}
                                                        className="flex items-center gap-4 border-b border-slate-200 px-4 py-3 last:border-b-0 hover:bg-slate-50"
                                                    >
                                                        <SuggestionIcon name={suggestion.icon} />

                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <p className="text-sm font-medium text-slate-900">
                                                                    {suggestion.title}
                                                                </p>
                                                                <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
                                                                    Confidence {Math.max(66, 88 - index * 5)}%
                                                                </span>
                                                            </div>
                                                            <p className="mt-1 text-xs leading-5 text-slate-500">
                                                                {suggestion.description}
                                                            </p>
                                                        </div>

                                                        <span className="text-lg text-slate-300">›</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>
                                    )}

                                    {activeTab === "testGap" && (
                                        <section className="h-full overflow-auto pr-1">
                                            <div className="grid gap-4 2xl:grid-cols-2">
                                                {displayTestGaps.map((gap) => (
                                                    <article
                                                        key={gap.id}
                                                        className="rounded-2xl border border-slate-300 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.08)]"
                                                    >
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <PriorityBadge level={gap.severity} label={getRiskLabel(gap.severity)} />
                                                            <p className="text-sm font-semibold text-slate-950">
                                                                潜在测试缺口
                                                            </p>
                                                        </div>

                                                        <p className="mt-3 break-all font-mono text-sm text-slate-700">
                                                            {gap.sourceFile}
                                                        </p>

                                                        <p className="mt-2 text-sm leading-6 text-slate-600">
                                                            {gap.reason}
                                                        </p>

                                                        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                                            <p className="text-xs font-semibold text-slate-600">
                                                                建议测试文件
                                                            </p>
                                                            <p className="mt-1 break-all font-mono text-xs text-slate-500">
                                                                {gap.expectedTestFile}
                                                            </p>
                                                        </div>

                                                        <div className="mt-3">
                                                            <p className="text-xs font-semibold text-slate-700">
                                                                建议补充用例
                                                            </p>
                                                            <ul className="mt-1.5 space-y-1">
                                                                {gap.suggestedTestCases.map((item) => (
                                                                    <li
                                                                        key={item}
                                                                        className="flex gap-2 text-xs leading-5 text-slate-500"
                                                                    >
                                                                        <CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                                                                        <span>{item}</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    </article>
                                                ))}
                                            </div>
                                        </section>
                                    )}

                                    {activeTab === "draft" && (
                                        <section className="flex h-full min-h-0 flex-col overflow-hidden">
                                            {draftComments.length === 0 ? (
                                                <div className={`${SUBTLE_PANEL_CLASS} px-5 py-8 text-center`}>
                                                    <p className="text-sm font-medium text-slate-600">
                                                        暂无评论草稿
                                                    </p>
                                                    <p className="mt-1 text-xs leading-5 text-slate-500">
                                                        可从风险卡片中点击“加入草稿箱”。
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="flex h-full min-h-0 flex-col overflow-hidden">
                                                    <div className="min-h-0 flex-1 space-y-3 overflow-auto pr-1 pb-3">
                                                        {draftComments.map((draft) => (
                                                            <article
                                                                key={draft.id}
                                                                className="rounded-2xl border border-slate-300 bg-white p-3.5 shadow-[0_8px_22px_rgba(15,23,42,0.07)]"
                                                            >
                                                                <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2.5">
                                                                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleToggleDraft(draft.id)}
                                                                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border shadow-sm transition ${
                                                                                draft.selected
                                                                                    ? "border-blue-300 bg-blue-50 text-blue-600"
                                                                                    : "border-slate-300 bg-white text-slate-300"
                                                                            }`}
                                                                        >
                                                                            {draft.selected && <CheckIcon className="h-4 w-4" />}
                                                                        </button>

                                                                        <PriorityBadge level={draft.severity} label={getRiskLabel(draft.severity)} />

                                                                        <p className="min-w-0 max-w-[560px] truncate text-sm font-semibold text-slate-950">
                                                                            {draft.title}
                                                                        </p>

                                                                        {draft.edited && (
                                                                            <span className="rounded-lg bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-600 ring-1 ring-indigo-200">
                                                                                已编辑
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleDeleteDraft(draft.id)}
                                                                        className="inline-flex h-8 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-600 transition hover:bg-red-100"
                                                                    >
                                                                        删除
                                                                    </button>
                                                                </div>

                                                                <textarea
                                                                    value={draft.body}
                                                                    onChange={(event) =>
                                                                        handleUpdateDraftBody(draft.id, event.target.value)
                                                                    }
                                                                    className="h-[112px] min-h-[96px] w-full resize-y rounded-2xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 font-mono text-sm leading-6 text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
                                                                />
                                                            </article>
                                                        ))}
                                                    </div>

                                                    <div className="shrink-0 flex items-center justify-between gap-3 border-t border-slate-200 bg-white/95 pt-3 backdrop-blur">
                                                        <p className="text-xs font-medium text-slate-500">
                                                            已选择 {draftComments.filter((item) => item.selected).length} 条评论草稿
                                                        </p>
                                                        <button
                                                            type="button"
                                                            onClick={handleCopyDraft}
                                                            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(15,23,42,0.22)] transition hover:-translate-y-0.5 hover:bg-slate-800"
                                                        >
                                                            <CopyIcon className="h-4 w-4" />
                                                            {draftCopyStatus === "success"
                                                                ? "已复制草稿"
                                                                : draftCopyStatus === "error"
                                                                    ? "复制失败"
                                                                    : "复制选中草稿"}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </section>
                                    )}

                                    {activeTab === "order" && (
                                        <section className="h-full overflow-auto pr-1">
                                            <div className="grid gap-4 2xl:grid-cols-[0.9fr_1.1fr]">
                                                <div className={INNER_CARD_CLASS}>
                                                    <div className="mb-4 flex items-start justify-between gap-3">
                                                        <div>
                                                            <p className="text-sm font-semibold text-slate-950">
                                                                审查依据
                                                            </p>
                                                            <p className="mt-1 text-xs leading-5 text-slate-500">
                                                                汇总基础规则命中结果，用于解释为什么这些文件需要优先审查。
                                                            </p>
                                                        </div>

                                                        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
                                                            {displayRuleCheckResults.length} 项
                                                        </span>
                                                    </div>

                                                    {displayRuleCheckResults.length === 0 ? (
                                                        <div className={`${SUBTLE_PANEL_CLASS} px-5 py-5 text-center`}>
                                                            <p className="text-sm font-medium text-slate-600">
                                                                未发现明显基础规则风险
                                                            </p>
                                                            <p className="mt-1 text-xs leading-5 text-slate-500">
                                                                当前优先级将根据默认风险路径、影响范围与建议项生成。
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-3">
                                                            {displayRuleCheckResults.map((rule) => {
                                                                const level = normalizeRiskLevel(rule.severity);
                                                                const severityStyle = {
                                                                    high: "border-red-300 bg-red-50 shadow-red-100/80",
                                                                    medium: "border-amber-300 bg-amber-50 shadow-amber-100/80",
                                                                    low: "border-emerald-300 bg-emerald-50 shadow-emerald-100/80",
                                                                }[level];

                                                                return (
                                                                    <article
                                                                        key={rule.id}
                                                                        className={`rounded-2xl border p-4 shadow-sm ${severityStyle}`}
                                                                    >
                                                                        <div className="flex flex-wrap items-center gap-2">
                                                                            <PriorityBadge level={level} label={getRiskLabel(level)} />
                                                                            <h3 className="text-sm font-semibold text-slate-950">
                                                                                {rule.title}
                                                                            </h3>
                                                                        </div>

                                                                        <p className="mt-2 text-sm leading-6 text-slate-600">
                                                                            {rule.message}
                                                                        </p>

                                                                        {(rule.file || rule.line) && (
                                                                            <p className="mt-2 rounded-xl bg-white/70 px-3 py-2 text-xs text-slate-500 ring-1 ring-slate-200">
                                                                                {rule.file ?? ""}
                                                                                {rule.file && rule.line ? " · " : ""}
                                                                                {rule.line ? `第 ${rule.line} 行` : ""}
                                                                            </p>
                                                                        )}
                                                                    </article>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className={INNER_CARD_CLASS}>
                                                    <div className="mb-4 flex items-start justify-between gap-3">
                                                        <div>
                                                            <p className="text-sm font-semibold text-slate-950">
                                                                优先审查顺序
                                                            </p>
                                                            <p className="mt-1 text-xs leading-5 text-slate-500">
                                                                建议从高风险、高影响面的文件开始 Review，降低遗漏关键问题的概率。
                                                            </p>
                                                        </div>

                                                        <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600 ring-1 ring-blue-200">
                                                            {displayReviewOrder.length} 个文件
                                                        </span>
                                                    </div>

                                                    <div className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
                                                        {displayReviewOrder.map((item, index) => (
                                                            <div
                                                                key={`${item.file}-${item.title}`}
                                                                className="flex items-start gap-4 border-b border-slate-200 px-4 py-4 last:border-b-0 hover:bg-slate-50"
                                                            >
                                                                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white shadow-md shadow-blue-200">
                                                                    {index + 1}
                                                                </span>

                                                                <div className="min-w-0 flex-1">
                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                        <p className="truncate text-sm font-semibold text-slate-950">
                                                                            {item.file}
                                                                        </p>
                                                                        <PriorityBadge level={item.severity} label={getRiskLabel(item.severity)} />
                                                                    </div>

                                                                    <p className="mt-1 text-xs font-medium text-slate-600">
                                                                        {item.title}
                                                                    </p>

                                                                    <p className="mt-1 text-xs leading-5 text-slate-500">
                                                                        {item.description}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </section>
                                    )}

                                    {activeTab === "markdown" && (
                                        <section className="flex h-full min-h-0 flex-col overflow-hidden">
                                            <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-slate-300 bg-slate-50 shadow-inner">
                                                <div className="grid grid-cols-[44px_1fr] text-xs leading-6">
                                                    {markdownReport.split("\n").map((line, index) => (
                                                        <div key={`${line}-${index}`} className="contents">
                                                            <div className="border-r border-slate-300 bg-white/80 px-3 text-right font-mono text-slate-400">
                                                                {index + 1}
                                                            </div>
                                                            <div className="px-4 font-mono text-slate-700">
                                                                {line}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="mt-3 shrink-0 flex items-center justify-between gap-3 border-t border-slate-200 bg-white/95 pt-3 backdrop-blur">
                                                <p className="text-xs font-medium text-slate-500">
                                                    Markdown 报告共 {markdownReport.split("\n").length} 行，可直接复制到 PR 评论或项目文档。
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={handleCopyReport}
                                                    className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(15,23,42,0.22)] transition hover:-translate-y-0.5 hover:bg-slate-800"
                                                >
                                                    <CopyIcon className="h-4 w-4" />
                                                    {copyStatus === "success"
                                                        ? "已复制 Markdown"
                                                        : copyStatus === "error"
                                                            ? "复制失败"
                                                            : "复制 Markdown"}
                                                </button>
                                            </div>
                                        </section>
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