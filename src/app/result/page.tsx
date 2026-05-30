"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AppHeader } from "@/components/AppHeader";
import { requestAnalyzePr } from "@/services/client/analyzePrClient";
import type { AnalyzePrResponse } from "@/types";

type RiskLevel = "high" | "medium" | "low";
type TabKey = "risk" | "suggestion" | "order" | "markdown";

const PAGE_CARD_CLASS =
    "rounded-[32px] border border-white/80 bg-white/95 p-7 shadow-[0_24px_70px_rgba(15,23,42,0.10)] ring-1 ring-slate-200/60 backdrop-blur";

const INNER_CARD_CLASS =
    "rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.08)]";

const SUBTLE_PANEL_CLASS =
    "rounded-[24px] border border-slate-200 bg-slate-50/90 shadow-inner";

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
    "仓库：vercel/next.js",
    "PR 编号：#57855",
    "作者：leerob",
    "状态：分析完成",
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

type OverviewDisplay = {
    riskScore: number;
    riskLevel: RiskLevel;
    riskLabel: string;
    highRiskCount: number;
    suggestionCount: number;
    confidence: number;
    conclusion: string[];
};

function extractPrNumber(url: string): string {
    try {
        const match = url.match(/github\.com\/[^/]+\/[^/]+\/pull\/(\d+)/);
        if (match?.[1]) return `#${match[1]}`;
    } catch {
        /* ignore */
    }
    return "#57855";
}

function mapRiskLevel(level: string): {
    level: RiskLevel;
    label: string;
} {
    switch (level) {
        case "HIGH":
            return { level: "high", label: "高风险" };
        case "MEDIUM":
            return { level: "medium", label: "中风险" };
        case "LOW":
            return { level: "low", label: "低风险" };
        default:
            return { level: "low", label: "未知风险" };
    }
}

function mapCategoryToIcon(category: string): string {
    switch (category) {
        case "Correctness":
            return "beaker";
        case "Security":
            return "chart";
        case "Maintainability":
            return "settings";
        case "Testing":
            return "beaker";
        case "Documentation":
            return "doc";
        default:
            return "doc";
    }
}

function normalizeRiskLevel(level: string): RiskLevel {
    if (level === "high" || level === "HIGH") return "high";
    if (level === "medium" || level === "MEDIUM") return "medium";
    return "low";
}

function getRiskLabel(level: RiskLevel): string {
    if (level === "high") return "高风险";
    if (level === "medium") return "中风险";
    return "低风险";
}

function getRiskScoreLevel(score: number): RiskLevel {
    if (score >= 70) return "high";
    if (score >= 40) return "medium";
    return "low";
}

function calculateRiskScore(items: RiskDisplay[]): number {
    if (items.length === 0) return 18;

    const base = items.reduce((total, item) => {
        if (item.level === "high") return total + 100;
        if (item.level === "medium") return total + 62;
        return total + 28;
    }, 0);

    const highCount = items.filter((item) => item.level === "high").length;
    const boost = Math.min(highCount * 6, 18);
    const score = Math.round(base / items.length + boost);

    return Math.min(100, Math.max(0, score));
}

function readNumberField(source: unknown, keys: string[]): number | null {
    if (!source || typeof source !== "object") return null;

    const record = source as Record<string, unknown>;

    for (const key of keys) {
        const value = record[key];

        if (typeof value === "number" && Number.isFinite(value)) {
            return value;
        }

        if (typeof value === "string" && value.trim() !== "") {
            const parsed = Number(value);
            if (Number.isFinite(parsed)) return parsed;
        }
    }
    return null;
}

function normalizePercent(value: number): number {
    const percent = value <= 1 ? value * 100 : value;
    return Math.min(100, Math.max(0, Math.round(percent)));
}

const FALLBACK = {
    prInfo,
    summary,
    risks,
    suggestions,
    markdownLines,
};

// 图标组件
function GithubIcon({ className = "" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor">
            <path d="M12 2C6.48 2 2 6.58 2 12.24c0 4.52 2.87 8.35 6.84 9.7.5.1.68-.22.68-.49 0-.24-.01-1.04-.01-1.89-2.78.62-3.37-1.21-3.37-1.21-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.9 1.57 2.36 1.12 2.93.86.09-.67.35-1.12.64-1.38-2.22-.26-4.55-1.14-4.55-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.35 9.35 0 0 1 12 6.95c.85 0 1.7.12 2.5.34 1.9-1.33 2.74-1.05 2.74-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.8-4.57 5.05.36.32.68.94.68 1.9 0 1.38-.01 2.49-.01 2.83 0 .27.18.59.69.49A10.05 10.05 0 0 0 22 12.24C22 6.58 17.52 2 12 2Z" />
        </svg>
    );
}

function CopyIcon({ className = "" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
            <path d="M8 8h10v12H8V8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M6 16H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
    );
}

function DownloadIcon({ className = "" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
            <path d="M12 3v11m0 0 4-4m-4 4-4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M5 20h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
    );
}

function UserIcon({ className = "" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
            <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="1.8" />
            <path d="M5 21a7 7 0 0 1 14 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
    );
}

function FolderIcon({ className = "" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
            <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2h6.5A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-9Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
    );
}

function PlusIcon({ className = "" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
        </svg>
    );
}

function MinusIcon({ className = "" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
            <path d="M5 12h14" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
        </svg>
    );
}

function SparkIcon({ className = "" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
            <path d="M12 3 13.8 9.2 20 11l-6.2 1.8L12 19l-1.8-6.2L4 11l6.2-1.8L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
    );
}

function ShieldIcon({ className = "" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
            <path d="M12 3 5 6v5.5c0 4.2 2.9 8.1 7 9.5 4.1-1.4 7-5.3 7-9.5V6l-7-3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
    );
}

function MessageIcon({ className = "" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
            <path d="M5 5h14v10H9l-4 4V5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
    );
}

function FileIcon({ className = "" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
            <path d="M7 3h7l4 4v14H7V3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
            <path d="M14 3v5h5M9 13h6M9 17h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
    );
}

function BeakerIcon({ className = "" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
            <path d="M9 3h6M10 3v5l-5 9a3 3 0 0 0 2.6 4.5h8.8A3 3 0 0 0 19 17l-5-9V3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function SettingsIcon({ className = "" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
            <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke="currentColor" strokeWidth="1.7" />
            <path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14.2 3h-4.4l-.4 2.7a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.4-1a7 7 0 0 0 2 1.2l.4 2.7h4.4l.4-2.7a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
        </svg>
    );
}

function ChartIcon({ className = "" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
            <path d="M5 19V5M5 19h14M9 16v-5M13 16V8M17 16v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
    );
}

// 业务组件
function SectionTitle({
    icon,
    title,
    description,
}: {
    icon: ReactNode;
    title: string;
    description?: string;
}) {
    return (
        <div className="mb-5 flex items-start gap-3.5">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-600 shadow-[0_8px_20px_rgba(37,99,235,0.12)]">
                {icon}
            </span>
            <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                    {title}
                </h2>
                {description && (
                    <p className="mt-1.5 text-xs leading-5 text-slate-500">
                        {description}
                    </p>
                )}
            </div>
        </div>
    );
}

function StatCard({
    icon,
    label,
    value,
    valueClassName = "text-slate-950",
}: {
    icon: ReactNode;
    label: string;
    value: string;
    valueClassName?: string;
}) {
    return (
        <div className="group flex min-h-[78px] items-center gap-3.5 rounded-[24px] border border-slate-200 bg-white px-4 py-3.5 shadow-[0_10px_28px_rgba(15,23,42,0.07)] transition hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-[0_16px_36px_rgba(15,23,42,0.10)]">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-600 shadow-sm transition group-hover:bg-blue-600 group-hover:text-white">
                {icon}
            </div>
            <div>
                <p className="text-xs font-medium text-slate-400">{label}</p>
                <p className={`mt-1 text-base font-semibold ${valueClassName}`}>
                    {value}
                </p>
            </div>
        </div>
    );
}

function OverviewMetricCard({
    label,
    value,
    description,
    tone = "blue",
}: {
    label: string;
    value: ReactNode;
    description: string;
    tone?: "red" | "amber" | "emerald" | "blue";
}) {
    const toneStyles = {
        red: "border-red-200 bg-gradient-to-br from-red-50 to-white text-red-600 shadow-red-100/70",
        amber: "border-amber-200 bg-gradient-to-br from-amber-50 to-white text-amber-600 shadow-amber-100/70",
        emerald: "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white text-emerald-600 shadow-emerald-100/70",
        blue: "border-blue-200 bg-gradient-to-br from-blue-50 to-white text-blue-600 shadow-blue-100/70",
    }[tone];

    return (
        <article className={`rounded-[24px] border p-5 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl ${toneStyles}`}>
            <p className="text-sm font-medium text-slate-600">{label}</p>
            <div className="mt-3 text-3xl font-semibold tracking-tight">
                {value}
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">
                {description}
            </p>
        </article>
    );
}

function RiskCard({ risk }: { risk: RiskDisplay }) {
    const styles = {
        high: {
            card: "border-red-200 bg-gradient-to-br from-red-50 to-white shadow-red-100/80",
            badge: "bg-red-100 text-red-700 ring-red-200",
        },
        medium: {
            card: "border-amber-200 bg-gradient-to-br from-amber-50 to-white shadow-amber-100/80",
            badge: "bg-amber-100 text-amber-700 ring-amber-200",
        },
        low: {
            card: "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white shadow-emerald-100/80",
            badge: "bg-emerald-100 text-emerald-700 ring-emerald-200",
        },
    }[risk.level];

    return (
        <article className={`rounded-[24px] border p-5 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg ${styles.card}`}>
            <div className="flex items-center gap-3">
                <span className={`rounded-xl px-2.5 py-1 text-xs font-semibold ring-1 ${styles.badge}`}>
                    {risk.label}
                </span>
                <h3 className="text-sm font-semibold text-slate-950">
                    {risk.title}
                </h3>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">
                {risk.description}
            </p>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-700">
                {risk.suggestion}
            </p>
        </article>
    );
}

function SuggestionIcon({ name }: { name: string }) {
    const className = "h-4.5 w-4.5";
    const icon =
        name === "beaker" ? (
            <BeakerIcon className={className} />
        ) : name === "settings" ? (
            <SettingsIcon className={className} />
        ) : name === "chart" ? (
            <ChartIcon className={className} />
        ) : (
            <FileIcon className={className} />
        );

    return (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-600 shadow-sm">
            {icon}
        </span>
    );
}

function PriorityBadge({ level }: { level: RiskLevel }) {
    const styles = {
        high: "bg-red-100 text-red-700 ring-red-200",
        medium: "bg-amber-100 text-amber-700 ring-amber-200",
        low: "bg-emerald-100 text-emerald-700 ring-emerald-200",
    }[level];

    return (
        <span className={`rounded-xl px-2.5 py-1 text-xs font-semibold ring-1 ${styles}`}>
            {getRiskLabel(level)}
        </span>
    );
}

// 主页面组件
export default function ResultPage() {
    const [analysisData, setAnalysisData] = useState<AnalyzePrResponse | null>(null);
    const [inputUrl, setInputUrl] = useState("");
    const router = useRouter();
    const [retrying, setRetrying] = useState(false);
    const [retryError, setRetryError] = useState("");
    const [copyStatus, setCopyStatus] = useState<"idle" | "success" | "error">("idle");
    const [activeTab, setActiveTab] = useState<TabKey>("risk");

    // 从sessionStorage读取数据
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
                // 解析失败使用默认数据
            }
        });
        return () => cancelAnimationFrame(frame);
    }, []);

    const isMock = analysisData?.mode === "mock";

    // 格式化PR信息
    const displayPrInfo = useMemo(() => {
        const pr = analysisData?.pullRequest;
        if (!pr) return FALLBACK.prInfo;

        return {
            title: pr.title,
            repo: pr.repository,
            prNumber: extractPrNumber(inputUrl),
            author: pr.author,
            changedFiles: `${pr.changedFiles} 个文件`,
            additions: `+${pr.additions}`,
            deletions: `-${pr.deletions}`,
        };
    }, [analysisData, inputUrl]);

    // 格式化摘要
    const displaySummary = useMemo(() => {
        const text = analysisData?.reviewResult?.summary;
        if (!text) return FALLBACK.summary;
        const lines = text
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean);
        return lines.length > 0 ? lines : [text];
    }, [analysisData]);

    // 格式化风险数据
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

    // 格式化建议
    const displaySuggestions = useMemo(() => {
        const apiSuggestions = analysisData?.reviewResult?.suggestions;
        if (!apiSuggestions || apiSuggestions.length === 0) return FALLBACK.suggestions;

        return apiSuggestions.map((s) => ({
            icon: mapCategoryToIcon(s.category),
            title: s.title,
            description: s.suggestion,
        }));
    }, [analysisData]);

    // 规则检查结果
    const displayRuleCheckResults = useMemo(() => {
        return analysisData?.ruleCheckResults ?? [];
    }, [analysisData]);

    // 审查顺序
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

    // Markdown报告
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
            "状态：分析完成",
            "",
            "## 摘要",
            ...s,
            "",
            "## 风险分析",
        ];

        r.forEach((risk) => {
            lines.push(`- **${risk.label}**（${risk.title}）：${risk.description}`);
            lines.push(`  建议：${risk.suggestion}`);
        });

        if (displayRuleCheckResults.length > 0) {
            lines.push("", "## 规则预检查");
            displayRuleCheckResults.forEach((rule) => {
                lines.push(`- **${rule.title}**：${rule.message}`);
                if (rule.file || rule.line) {
                    lines.push(` 位置：${rule.file ?? "未知文件"}${rule.line ? `· 第 ${rule.line} 行` : ""}`);
                }
            });
        }

        lines.push("", "## Review 建议");
        sg.forEach((sgItem) => {
            lines.push(`- **${sgItem.title}**：${sgItem.description}`);
        });

        return lines;
    }, [analysisData, displayPrInfo, displaySummary, displayRisks, displaySuggestions, displayRuleCheckResults]);

    const markdownReport = useMemo(() => {
        return analysisData?.markdownReport ?? displayMarkdownLines.join("\n");
    }, [analysisData, displayMarkdownLines]);

    // 警告信息
    const displayWarnings = useMemo(() => {
        return analysisData?.warnings ?? [];
    }, [analysisData]);

    // 总览数据
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
            "riskScore", "risk_score", "overallRiskScore", "overall_risk_score", "score",
        ]);

        const rawRisks = Array.isArray(reviewResult.risks) ? reviewResult.risks : [];
        const rawSuggestions = Array.isArray(reviewResult.suggestions) ? reviewResult.suggestions : [];

        const explicitConfidence = readNumberField(reviewResult, [
            "averageConfidence", "average_confidence", "confidence", "confidenceScore",
        ]);

        const confidenceValues = [...rawRisks, ...rawSuggestions]
            .map((item) => readNumberField(item, ["confidence", "confidenceScore", "confidence_score"]))
            .filter((value): value is number => value !== null);

        const riskScore = explicitScore !== null
            ? normalizePercent(explicitScore)
            : calculateRiskScore(displayRisks);

        const confidence = explicitConfidence !== null
            ? normalizePercent(explicitConfidence)
            : confidenceValues.length > 0
                ? normalizePercent(confidenceValues.reduce((sum, v) => sum + v, 0) / confidenceValues.length)
                : 82;

        const riskLevel = getRiskScoreLevel(riskScore);

        return {
            riskScore,
            riskLevel,
            riskLabel: getRiskLabel(riskLevel),
            highRiskCount: displayRisks.filter(i => i.level === "high").length,
            suggestionCount: displaySuggestions.length,
            confidence,
            conclusion: displaySummary.slice(0, 2),
        };
    }, [analysisData, displayRisks, displaySuggestions, displaySummary]);

    // 标签页配置
    const tabs = [
        { key: "risk" as TabKey, label: "风险分析", icon: <ShieldIcon className="h-4 w-4" /> },
        { key: "suggestion" as TabKey, label: "审查建议", icon: <MessageIcon className="h-4 w-4" /> },
        { key: "order" as TabKey, label: "智能审查顺序", icon: <SparkIcon className="h-4 w-4" /> },
        { key: "markdown" as TabKey, label: "Markdown 报告", icon: <FileIcon className="h-4 w-4" /> },
    ];

    // 重新分析
    const handleRetryAnalysis = async () => {
        if (!inputUrl) {
            router.push("/");
            return;
        }
        setRetrying(true);
        setRetryError("");
        try {
            const data = await requestAnalyzePr({ url: inputUrl, useMock: false });
            if (!data.success) {
                setRetryError(data.error?.message ?? "重新分析失败，请稍后重试");
                return;
            }
            sessionStorage.setItem(SESSION_KEY, JSON.stringify({ data, inputUrl }));
            setAnalysisData(data);
        } catch {
            setRetryError("网络异常，请稍后重试");
        } finally {
            setRetrying(false);
        }
    };

    // 生成文件名
    const buildReportFilename = () => {
        const repo = displayPrInfo.repo.replace(/[^a-zA-Z0-9_-]+/g, "-");
        const prNumber = displayPrInfo.prNumber.replace(/[^0-9]+/g, "") || "unknown";
        return `${repo}-pr-${prNumber}-review.md`;
    };

    // 复制报告
    const handleCopyReport = async () => {
        try {
            await navigator.clipboard.writeText(markdownReport);
            setCopyStatus("success");
            setTimeout(() => setCopyStatus("idle"), 1600);
        } catch {
            setCopyStatus("error");
            setTimeout(() => setCopyStatus("idle"), 1600);
        }
    };

    // 下载报告
    const handleDownloadReport = () => {
        const blob = new Blob([markdownReport], { type: "text/markdown;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = buildReportFilename();
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    };

    return (
        <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,#dbeafe_0,#f8fafc_34%,#f3f6fb_100%)] text-slate-950">
            <div className="sticky top-0 z-40 border-b border-white/60 bg-white/80 shadow-[0_8px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl">
                <AppHeader />
            </div>

            <section className="relative mx-auto max-w-[1520px] px-6 py-7 lg:px-10">
                <div className="pointer-events-none absolute -left-40 top-28 h-80 w-80 rounded-full bg-blue-200/35 blur-3xl" />
                <div className="pointer-events-none absolute -right-44 top-20 h-96 w-96 rounded-full bg-indigo-200/30 blur-3xl" />
                <div className="pointer-events-none absolute left-1/2 top-28 h-56 w-56 -translate-x-1/2 rounded-full bg-cyan-100/40 blur-3xl" />

                <div className="relative grid gap-7 xl:grid-cols-[440px_minmax(0,1fr)]">
                    {/* 左侧侧边栏 */}
                    <aside className="xl:sticky xl:top-[104px] xl:h-[calc(100vh-132px)] xl:overflow-hidden">
                        <div className="flex h-full flex-col gap-5">
                            <section className={PAGE_CARD_CLASS}>
                                <div className="flex flex-col gap-6">
                                    <div>
                                        <Link
                                            href="/"
                                            className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-500 transition hover:bg-blue-50 hover:text-blue-600"
                                        >
                                            ← 返回首页
                                        </Link>
                                        <h1 className="mt-5 text-2xl font-semibold leading-snug tracking-tight text-slate-950">
                                            {displayPrInfo.title}
                                        </h1>
                                        <div className="mt-4 flex flex-wrap items-center gap-2.5 text-sm text-slate-600">
                                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-950 text-white shadow-md shadow-slate-300">
                                                <GithubIcon className="h-4.5 w-4.5" />
                                            </span>
                                            <span className="font-medium text-slate-700">{displayPrInfo.repo}</span>
                                            <span className="text-slate-300">·</span>
                                            <span className="font-medium text-slate-700">{displayPrInfo.prNumber}</span>
                                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600 ring-1 ring-emerald-200">
                                                分析完成
                                            </span>
                                            {isMock && (
                                                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-600 ring-1 ring-amber-200">
                                                    Mock API
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* 操作按钮 */}
                                    <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
                                        <button
                                            onClick={handleRetryAnalysis}
                                            disabled={retrying}
                                            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 hover:shadow-md disabled:opacity-50"
                                        >
                                            {retrying ? "分析中..." : "重新分析"}
                                        </button>
                                        <button
                                            onClick={handleCopyReport}
                                            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 hover:shadow-md"
                                        >
                                            <CopyIcon className="h-4 w-4" />
                                            {copyStatus === "success" ? "已复制" : copyStatus === "error" ? "复制失败" : "复制报告"}
                                        </button>
                                        <button
                                            onClick={handleDownloadReport}
                                            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/30"
                                        >
                                            <DownloadIcon className="h-4 w-4" />
                                            下载报告
                                        </button>
                                    </div>

                                    {/* 统计卡片 */}
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
                                        />
                                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                                            <StatCard
                                                icon={<PlusIcon className="h-4.5 w-4.5" />}
                                                label="新增"
                                                value={displayPrInfo.additions}
                                                valueClassName="text-emerald-600"
                                            />
                                            <StatCard
                                                icon={<MinusIcon className="h-4.5 w-4.5" />}
                                                label="删除"
                                                value={displayPrInfo.deletions}
                                                valueClassName="text-red-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* 警告提示 */}
                            {(displayWarnings.length > 0 || retryError) && (
                                <div className="space-y-4 overflow-auto pr-1">
                                    {displayWarnings.length > 0 && (
                                        <section className="rounded-[28px] border border-amber-200 bg-amber-50/90 p-5 shadow-[0_16px_38px_rgba(245,158,11,0.14)]">
                                            <p className="text-sm font-semibold text-amber-800">当前结果包含降级提示</p>
                                            <ul className="mt-2 space-y-1.5">
                                                {displayWarnings.map((w, i) => (
                                                    <li key={`${w.message}-${i}`} className="text-sm leading-6 text-amber-700">
                                                        {w.message}
                                                        {w.action && <span className="ml-2 text-xs text-amber-600">— {w.action}</span>}
                                                    </li>
                                                ))}
                                            </ul>
                                        </section>
                                    )}
                                    {retryError && (
                                        <section className="rounded-[28px] border border-red-200 bg-red-50 p-4 shadow-[0_16px_38px_rgba(239,68,68,0.14)]">
                                            <p className="text-sm text-red-600">重新分析失败：{retryError}</p>
                                        </section>
                                    )}
                                </div>
                            )}
                        </div>
                    </aside>

                    {/* 右侧主内容 */}
                    <section className="min-w-0 xl:sticky xl:top-[104px] xl:h-[calc(100vh-132px)]">
                        <div className="flex h-full min-h-0 flex-col gap-5">
                            {/* 总览面板 */}
                            <section className={`${PAGE_CARD_CLASS} shrink-0`}>
                                <SectionTitle
                                    icon={<ShieldIcon className="h-4.5 w-4.5" />}
                                    title="审查总览"
                                    description="一屏决策面板：快速判断风险、优先级与建议数量"
                                />
                                <div className="grid gap-5 2xl:grid-cols-[1.35fr_1fr]">
                                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                        <OverviewMetricCard
                                            label="风险评分"
                                            value={<span>{displayOverview.riskScore}<span className="ml-1 text-xl">/ 100</span></span>}
                                            description={displayOverview.riskLabel}
                                            tone={displayOverview.riskLevel === "high" ? "red" : displayOverview.riskLevel === "medium" ? "amber" : "emerald"}
                                        />
                                        <OverviewMetricCard
                                            label="高风险项"
                                            value={displayOverview.highRiskCount}
                                            description="需要人工确认"
                                            tone={displayOverview.highRiskCount > 0 ? "red" : "emerald"}
                                        />
                                        <OverviewMetricCard
                                            label="建议数量"
                                            value={displayOverview.suggestionCount}
                                            description="可复制评论草稿"
                                            tone="blue"
                                        />
                                        <OverviewMetricCard
                                            label="平均置信度"
                                            value={`${displayOverview.confidence}%`}
                                            description="AI 建议平均置信度"
                                            tone="emerald"
                                        />
                                    </div>
                                    <article className={`${INNER_CARD_CLASS} bg-gradient-to-br from-slate-50 to-white`}>
                                        <p className="text-base font-semibold text-slate-950">结论摘要</p>
                                        <div className="mt-3 space-y-2 text-sm leading-7 text-slate-600">
                                            {displayOverview.conclusion.map((item, index) => (
                                                <p key={`${item}-${index}`}>{item}</p>
                                            ))}
                                        </div>
                                    </article>
                                </div>
                            </section>

                            {/* 标签页内容 */}
                            <section className="flex min-h-0 flex-1 flex-col rounded-[32px] border border-white/80 bg-white/95 shadow-[0_24px_70px_rgba(15,23,42,0.10)] ring-1 ring-slate-200/60 backdrop-blur">
                                <div className="shrink-0 border-b border-slate-200/80 p-3.5">
                                    <div className="flex flex-wrap items-center gap-2 rounded-[24px] bg-slate-100/80 p-1.5">
                                        {tabs.map((tab) => {
                                            const active = activeTab === tab.key;
                                            return (
                                                <button
                                                    key={tab.key}
                                                    onClick={() => setActiveTab(tab.key)}
                                                    className={`relative inline-flex h-11 items-center justify-center gap-2 rounded-[18px] px-4 text-sm font-semibold transition ${active
                                                        ? "bg-white text-blue-600 shadow-[0_10px_28px_rgba(37,99,235,0.16)]"
                                                        : "text-slate-500 hover:bg-white/70 hover:text-slate-700"
                                                        }`}
                                                >
                                                    {tab.icon}
                                                    {tab.label}
                                                    {active && <span className="absolute inset-x-5 -bottom-1 h-0.5 rounded-full bg-blue-500" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="min-h-0 flex-1 overflow-auto p-6">
                                    {/* 风险分析 */}
                                    {activeTab === "risk" && (
                                        <section>
                                            <SectionTitle
                                                icon={<ShieldIcon className="h-4.5 w-4.5" />}
                                                title="风险分析"
                                                description="按风险类型聚合规则与 AI 发现"
                                            />
                                            <div className="grid gap-4 2xl:grid-cols-3">
                                                {displayRisks.map((risk) => (
                                                    <RiskCard key={risk.title} risk={risk} />
                                                ))}
                                            </div>
                                        </section>
                                    )}

                                    {/* 审查建议 */}
                                    {activeTab === "suggestion" && (
                                        <section>
                                            <SectionTitle
                                                icon={<MessageIcon className="h-4.5 w-4.5" />}
                                                title="审查建议"
                                                description="AI 建议先进入草稿，由人工确认后再复制使用"
                                            />
                                            <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
                                                {displaySuggestions.map((suggestion) => (
                                                    <div
                                                        key={suggestion.title}
                                                        className="group flex items-center gap-4 border-b border-slate-100 px-5 py-4 transition last:border-b-0 hover:bg-blue-50/45"
                                                    >
                                                        <SuggestionIcon name={suggestion.icon} />
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-sm font-semibold text-slate-900">{suggestion.title}</p>
                                                            <p className="mt-1 text-xs leading-5 text-slate-500">{suggestion.description}</p>
                                                        </div>
                                                        <span className="text-lg text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-400">›</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>
                                    )}

                                    {/* 智能审查顺序 */}
                                    {activeTab === "order" && (
                                        <section>
                                            <SectionTitle
                                                icon={<SparkIcon className="h-4.5 w-4.5" />}
                                                title="智能审查顺序"
                                                description="根据风险等级、审查依据与潜在影响面生成优先级"
                                            />
                                            <div className="grid gap-4 2xl:grid-cols-[0.9fr_1.1fr]">
                                                <div className={INNER_CARD_CLASS}>
                                                    <div className="mb-4 flex items-start justify-between gap-3">
                                                        <div>
                                                            <p className="text-sm font-semibold text-slate-950">审查依据</p>
                                                            <p className="mt-1 text-xs leading-5 text-slate-500">汇总基础规则命中结果，用于解释为什么这些文件需要优先审查。</p>
                                                        </div>
                                                        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
                                                            {displayRuleCheckResults.length} 项
                                                        </span>
                                                    </div>
                                                    {displayRuleCheckResults.length === 0 ? (
                                                        <div className={`${SUBTLE_PANEL_CLASS} px-5 py-5 text-center`}>
                                                            <p className="text-sm font-medium text-slate-600">未发现明显基础规则风险</p>
                                                            <p className="mt-1 text-xs leading-5 text-slate-500">当前优先级将根据默认风险路径、影响范围与建议项生成。</p>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-3">
                                                            {displayRuleCheckResults.map((rule) => {
                                                                const level = normalizeRiskLevel(rule.severity);
                                                                const severityStyle = {
                                                                    high: "border-red-200 bg-gradient-to-br from-red-50 to-white shadow-red-100/80",
                                                                    medium: "border-amber-200 bg-gradient-to-br from-amber-50 to-white shadow-amber-100/80",
                                                                    low: "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white shadow-emerald-100/80",
                                                                }[level];
                                                                return (
                                                                    <article key={rule.id} className={`rounded-[22px] border p-4 shadow-sm ${severityStyle}`}>
                                                                        <div className="flex flex-wrap items-center gap-2">
                                                                            <PriorityBadge level={level} />
                                                                            <h3 className="text-sm font-semibold text-slate-950">{rule.title}</h3>
                                                                        </div>
                                                                        <p className="mt-2 text-sm leading-6 text-slate-600">{rule.message}</p>
                                                                        {(rule.file || rule.line) && (
                                                                            <p className="mt-2 rounded-xl bg-white/75 px-3 py-2 text-xs text-slate-500 ring-1 ring-slate-200">
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
                                                            <p className="text-sm font-semibold text-slate-950">优先审查顺序</p>
                                                            <p className="mt-1 text-xs leading-5 text-slate-500">建议从高风险、高影响面的文件开始 Review，降低遗漏关键问题的概率。</p>
                                                        </div>
                                                        <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600 ring-1 ring-blue-200">
                                                            {displayReviewOrder.length} 个文件
                                                        </span>
                                                    </div>
                                                    <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
                                                        {displayReviewOrder.map((item, index) => (
                                                            <div key={`${item.file}-${item.title}`} className="flex items-start gap-4 border-b border-slate-100 px-4 py-4 transition last:border-b-0 hover:bg-blue-50/45">
                                                                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-xs font-semibold text-white shadow-md shadow-blue-200">
                                                                    {index + 1}
                                                                </span>
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                        <p className="truncate text-sm font-semibold text-slate-950">{item.file}</p>
                                                                        <PriorityBadge level={item.severity} />
                                                                    </div>
                                                                    <p className="mt-1 text-xs font-medium text-slate-600">{item.title}</p>
                                                                    <p className="mt-1 text-xs leading-5 text-slate-500">{item.description}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </section>
                                    )}

                                    {/* Markdown报告 */}
                                    {activeTab === "markdown" && (
                                        <section>
                                            <div className="mb-4 flex items-center justify-between gap-4">
                                                <SectionTitle
                                                    icon={<FileIcon className="h-4.5 w-4.5" />}
                                                    title="Markdown 审查报告预览"
                                                    description="可直接复制或下载为 Markdown 文件"
                                                />
                                                <button
                                                    onClick={handleCopyReport}
                                                    className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                                                >
                                                    <CopyIcon className="h-3.5 w-3.5" />
                                                    {copyStatus === "success" ? "已复制" : "复制 Markdown"}
                                                </button>
                                            </div>
                                            <div className="max-h-[calc(100vh-380px)] overflow-auto rounded-[24px] border border-slate-200 bg-slate-950 shadow-inner">
                                                <div className="grid grid-cols-[52px_1fr] text-xs leading-6">
                                                    {markdownReport.split("\n").map((line, index) => (
                                                        <div key={`${line}-${index}`} className="contents">
                                                            <div className="border-r border-slate-800 bg-slate-900 px-3 text-right font-mono text-slate-500">
                                                                {index + 1}
                                                            </div>
                                                            <div className="px-4 font-mono text-slate-200">
                                                                {line || " "}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
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