"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AppHeader } from "@/components/AppHeader";
import { requestAnalyzePr } from "@/services/client/analyzePrClient";
import type { AnalyzePrResponse } from "@/types";

type RiskLevel = "high" | "medium" | "low";
type TabKey = "risk" | "suggestion" | "testGap" | "draft" | "order" | "markdown";

type EvidenceItem = {
    file: string;
    line?: number;
    code?: string;
    reason: string;
};

type ReviewFindingDisplay = {
    id: string;
    level: RiskLevel;
    label: string;
    title: string;
    description: string;
    suggestion: string;
    category: string;
    confidence: number;
    needsHumanCheck: boolean;
    evidence: EvidenceItem[];
};

type TestGapDisplay = {
    id: string;
    sourceFile: string;
    expectedTestFile: string;
    severity: RiskLevel;
    reason: string;
    suggestedTestCases: string[];
};

type DraftComment = {
    id: string;
    sourceFindingId?: string;
    title: string;
    body: string;
    severity: RiskLevel;
    selected: boolean;
    edited: boolean;
};

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

const fallbackChangedFileList = [
    "src/server/api/rate-limit.ts",
    "src/config/rate-limit.ts",
    "src/middleware/rate-limit.ts",
    "src/utils/redis-client.ts",
    "src/types/rate-limit.ts",
    "src/server/api/route-handler.ts",
    "tests/rate-limit.test.ts",
    "tests/rate-limit-config.test.ts",
    "docs/api-rate-limit.md",
    "package.json",
    "pnpm-lock.yaml",
    "README.md",
];

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

type OverviewDisplay = {
    riskScore: number;
    riskLevel: RiskLevel;
    riskLabel: string;
    highRiskCount: number;
    suggestionCount: number;
    confidence: number;
    conclusion: string[];
};

type DashboardData = {
    riskScore: number;
    riskLevel: RiskLevel;
    highRiskCount: number;
    mediumRiskCount: number;
    lowRiskCount: number;
    totalRiskCount: number;
    suggestionCount: number;
    testGapCount: number;
    draftCommentCount: number;
    evidenceCount: number;
    changedFileCount: number;
    additions: number;
    deletions: number;
    totalChanges: number;
    confidence: number;
};

function extractPrNumber(url: string): string {
    try {
        const match = url.match(/github\.com\/[^/]+\/[^/]+\/pull\/(\d+)/);
        if (match?.[1]) return `#${match[1]}`;
    } catch {
        /* 解析失败 */
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

function parseSignedDisplayNumber(value: string): number {
    const parsed = Number(value.replace(/[^0-9-]+/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
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

function readChangedFilesFromResponse(data: AnalyzePrResponse | null): string[] {
    if (!data || typeof data !== "object") return fallbackChangedFileList;

    const dataRecord = data as unknown as Record<string, unknown>;
    const pullRequest = dataRecord.pullRequest;

    if (!pullRequest || typeof pullRequest !== "object") {
        return fallbackChangedFileList;
    }

    const prRecord = pullRequest as Record<string, unknown>;

    const possibleFields = [
        prRecord.files,
        prRecord.changedFileList,
        prRecord.changedFilesList,
        prRecord.changedFiles,
    ];

    for (const field of possibleFields) {
        if (Array.isArray(field)) {
            const fileList = field
                .map((item) => {
                    if (typeof item === "string") return item;

                    if (item && typeof item === "object") {
                        const itemRecord = item as Record<string, unknown>;
                        const filename =
                            itemRecord.filename ??
                            itemRecord.file ??
                            itemRecord.path ??
                            itemRecord.name;

                        if (typeof filename === "string") return filename;
                    }

                    return null;
                })
                .filter((item): item is string => Boolean(item));

            if (fileList.length > 0) {
                return Array.from(new Set(fileList));
            }
        }
    }

    return fallbackChangedFileList;
}

function buildFallbackEvidence(index: number): EvidenceItem[] {
    const evidencePool: EvidenceItem[][] = [
        [
            {
                file: "src/server/api/rate-limit.ts",
                line: 42,
                code: "await redis.incr(key)",
                reason: "核心请求路径中引入 Redis 调用，高并发下可能增加接口延迟。",
            },
            {
                file: "src/utils/redis-client.ts",
                line: 18,
                code: "createRedisClient(config.redisUrl)",
                reason: "Redis 客户端可用性会直接影响限流判断结果。",
            },
        ],
        [
            {
                file: "src/config/rate-limit.ts",
                line: 24,
                code: "windowMs: 60_000",
                reason: "限流窗口与阈值配置会直接影响线上用户请求体验。",
            },
            {
                file: "src/types/rate-limit.ts",
                line: 9,
                code: "maxRequests?: number",
                reason: "可选配置需要明确默认值与边界校验策略。",
            },
        ],
        [
            {
                file: "src/middleware/rate-limit.ts",
                line: 31,
                code: "response.headers.set('X-RateLimit-Remaining', remaining)",
                reason: "响应头依赖客户端或代理正确透传，存在兼容性差异。",
            },
        ],
    ];

    return evidencePool[index % evidencePool.length];
}

function getConfidenceByLevel(level: RiskLevel, index: number): number {
    if (level === "high") return Math.max(82, 91 - index * 3);
    if (level === "medium") return Math.max(72, 84 - index * 3);
    return Math.max(62, 76 - index * 2);
}

function buildTestGaps(files: string[]): TestGapDisplay[] {
    const testFiles = files.filter((file) =>
        /(\.test\.|\.spec\.|__tests__|\/tests?\/)/i.test(file),
    );

    const sourceFiles = files.filter((file) =>
        /\.(ts|tsx|js|jsx)$/.test(file) &&
        !/(\.test\.|\.spec\.|__tests__|\/tests?\/)/i.test(file),
    );

    const importantSourceFiles = sourceFiles.filter((file) =>
        /api|server|middleware|config|auth|rate-limit|redis|route/i.test(file),
    );

    const targetFiles = importantSourceFiles.length > 0 ? importantSourceFiles : sourceFiles;

    return targetFiles.slice(0, 4).map((file, index) => {
        const hasRelatedTest = testFiles.some((testFile) => {
            const sourceBaseName = file
                .split("/")
                .pop()
                ?.replace(/\.(ts|tsx|js|jsx)$/i, "")
                .replace(/[-_.]?client$/i, "");

            if (!sourceBaseName) return false;

            return testFile.toLowerCase().includes(sourceBaseName.toLowerCase());
        });

        const severity: RiskLevel = hasRelatedTest ? "low" : index <= 1 ? "medium" : "low";

        return {
            id: `test-gap-${index}`,
            sourceFile: file,
            expectedTestFile: file
                .replace(/^src\//, "tests/")
                .replace(/\.(ts|tsx|js|jsx)$/i, ".test.ts"),
            severity,
            reason: hasRelatedTest
                ? "已检测到相关测试文件，但仍建议确认是否覆盖异常路径、边界值与高并发场景。"
                : "该 PR 修改了核心逻辑文件，但未明显检测到一一对应的测试文件变更。",
            suggestedTestCases: [
                "补充正常路径测试，确认限流未触发时请求可以正常通过。",
                "补充超限路径测试，确认状态码、错误信息与响应头符合预期。",
                "补充 Redis 失败或超时场景，确认系统具备合理降级策略。",
                "补充边界值测试，例如窗口期边界、阈值为 0 或极大值的情况。",
            ],
        };
    });
}

const FALLBACK = {
    prInfo,
    summary,
    risks,
    suggestions,
    markdownLines,
};

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

function CloseIcon({ className = "" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
            <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}

function CheckIcon({ className = "" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
            <path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

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
        <div className="mb-3 flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600 shadow-sm">
                {icon}
            </span>
            <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                    {title}
                </h2>
                {description && (
                    <p className="mt-1 text-xs leading-5 text-slate-500">
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
    onClick,
    hint,
}: {
    icon: ReactNode;
    label: string;
    value: string;
    valueClassName?: string;
    onClick?: () => void;
    hint?: string;
}) {
    const content = (
        <>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-blue-600 shadow-sm">
                {icon}
            </div>
            <div className="min-w-0 flex-1 text-left">
                <p className="text-xs text-slate-400">{label}</p>
                <p className={`mt-1 truncate text-base font-semibold ${valueClassName}`}>
                    {value}
                </p>
                {hint && (
                    <p className="mt-0.5 text-xs text-slate-400">
                        {hint}
                    </p>
                )}
            </div>
        </>
    );

    if (onClick) {
        return (
            <button
                type="button"
                onClick={onClick}
                className="flex min-h-[72px] w-full items-center gap-3 rounded-2xl border border-slate-300 bg-white px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.07)] transition hover:border-blue-300 hover:bg-blue-50/40 hover:shadow-[0_12px_28px_rgba(37,99,235,0.12)]"
            >
                {content}
                <span className="text-lg text-slate-300">›</span>
            </button>
        );
    }

    return (
        <div className="flex min-h-[72px] items-center gap-3 rounded-2xl border border-slate-300 bg-white px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.07)]">
            {content}
        </div>
    );
}

function ChangedFilesModal({
    open,
    files,
    onClose,
}: {
    open: boolean;
    files: string[];
    onClose: () => void;
}) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-6">
            <div
                className="absolute inset-0 bg-slate-950/45 backdrop-blur-md"
                onClick={onClose}
            />

            <section className="relative z-10 flex max-h-[82vh] w-full max-w-[680px] flex-col overflow-hidden rounded-[28px] border border-white/60 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.35)]">
                <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
                    <div>
                        <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-600 shadow-sm">
                                <FolderIcon className="h-5 w-5" />
                            </span>
                            <div>
                                <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                                    变更文件列表
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    共 {files.length} 个文件，建议按风险优先级逐项审查。
                                </p>
                            </div>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                        aria-label="关闭弹窗"
                    >
                        <CloseIcon className="h-4 w-4" />
                    </button>
                </div>

                <div className="min-h-0 flex-1 overflow-auto p-4 overscroll-contain">
                    <div className="space-y-2">
                        {files.map((file, index) => (
                            <article
                                key={`${file}-${index}`}
                                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 transition hover:border-blue-200 hover:bg-blue-50/70"
                            >
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-xs font-semibold text-slate-500 shadow-sm ring-1 ring-slate-200">
                                    {index + 1}
                                </span>

                                <FileIcon className="h-4.5 w-4.5 shrink-0 text-slate-500" />

                                <p className="min-w-0 flex-1 break-all font-mono text-sm text-slate-700">
                                    {file}
                                </p>
                            </article>
                        ))}
                    </div>
                </div>

                <div className="flex shrink-0 justify-end border-t border-slate-200 bg-slate-50 px-6 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex h-10 items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-700"
                    >
                        关闭
                    </button>
                </div>
            </section>
        </div>
    );
}

function SummaryCard({ summary }: { summary: string[] }) {
    const summaryText = summary.join("\n\n");

    return (
        <section className={`${PAGE_CARD_CLASS} group relative mt-auto flex min-h-[210px] flex-1 flex-col p-5`}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-600 shadow-sm">
                        <SparkIcon className="h-4.5 w-4.5" />
                    </span>
                    <div>
                        <h2 className="text-base font-semibold tracking-tight text-slate-950">
                            结论摘要
                        </h2>
                        <p className="mt-0.5 text-xs text-slate-400">
                            悬停查看完整内容
                        </p>
                    </div>
                </div>

                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600 ring-1 ring-blue-100">
                    完整摘要
                </span>
            </div>

            <div className="mt-5 flex min-h-0 flex-1 items-start">
                <p className="line-clamp-5 min-h-[120px] max-h-[120px] text-sm leading-6 text-slate-600">
                    {summaryText}
                </p>
            </div>

            <div className="pointer-events-none absolute left-0 bottom-[calc(100%+12px)] z-50 hidden w-full rounded-[24px] border border-blue-100 bg-white p-4 text-sm leading-6 text-slate-700 shadow-[0_22px_60px_rgba(15,23,42,0.22)] ring-1 ring-blue-50 group-hover:block">
                <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-950">完整结论摘要</p>
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600 ring-1 ring-blue-100">
                        悬停预览
                    </span>
                </div>
                <p className="whitespace-pre-line">{summaryText}</p>
            </div>
        </section>
    );
}

function DashboardTooltip({
    children,
    placement = "top",
}: {
    children: ReactNode;
    placement?: "top" | "bottom" | "left";
}) {
    const placementClass =
        placement === "left"
            ? "right-full top-1/2 mr-3 -translate-y-1/2"
            : placement === "bottom"
                ? "left-1/2 top-full mt-3 -translate-x-1/2"
                : "bottom-full left-1/2 mb-3 -translate-x-1/2";

    const arrowClass =
        placement === "left"
            ? "-right-1.5 top-1/2 -translate-y-1/2 rotate-45"
            : placement === "bottom"
                ? "-top-1.5 left-1/2 -translate-x-1/2 rotate-45"
                : "-bottom-1.5 left-1/2 -translate-x-1/2 rotate-45";

    return (
        <span
            className={`pointer-events-none absolute z-[120] w-64 rounded-[20px] border border-blue-100 bg-white px-3.5 py-3 text-left text-xs leading-5 text-slate-700 opacity-0 shadow-[0_22px_60px_rgba(15,23,42,0.20)] ring-1 ring-blue-50 transition duration-150 ease-out group-hover:opacity-100 group-focus-visible:opacity-100 ${placementClass}`}
        >
            <span className={`absolute h-3 w-3 border border-blue-100 bg-white shadow-sm ${arrowClass}`} />
            <span className="relative block">{children}</span>
        </span>
    );
}

function TabTooltip({
    children,
    align = "center",
}: {
    children: ReactNode;
    align?: "left" | "center" | "right";
}) {
    const alignClass =
        align === "left"
            ? "left-0"
            : align === "right"
                ? "right-0"
                : "left-1/2 -translate-x-1/2";

    const arrowClass =
        align === "left"
            ? "left-6"
            : align === "right"
                ? "right-6"
                : "left-1/2 -translate-x-1/2";

    return (
        <span
            className={`pointer-events-none absolute top-full z-[160] mt-2.5 w-56 rounded-2xl border border-blue-100 bg-white px-3 py-2.5 text-left text-xs leading-5 text-slate-700 opacity-0 shadow-[0_18px_46px_rgba(15,23,42,0.18)] ring-1 ring-blue-50 transition duration-150 ease-out group-hover:opacity-100 group-focus-visible:opacity-100 ${alignClass}`}
        >
            <span className={`absolute -top-1.5 h-3 w-3 rotate-45 border-l border-t border-blue-100 bg-white shadow-sm ${arrowClass}`} />
            <span className="relative block">{children}</span>
        </span>
    );
}

function DashboardKpiCard({
    label,
    value,
    description,
    tone = "blue",
    onClick,
}: {
    label: string;
    value: ReactNode;
    description: string;
    tone?: "red" | "amber" | "emerald" | "blue";
    onClick?: () => void;
}) {
    const toneStyles = {
        red: "border-red-200 bg-red-50 text-red-600 hover:border-red-300 hover:bg-red-50/80",
        amber: "border-amber-200 bg-amber-50 text-amber-600 hover:border-amber-300 hover:bg-amber-50/80",
        emerald: "border-emerald-200 bg-emerald-50 text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50/80",
        blue: "border-blue-200 bg-blue-50/70 text-blue-600 hover:border-blue-300 hover:bg-blue-50/90",
    }[tone];

    const content = (
        <>
            <span className="text-[11px] font-medium text-slate-500">{label}</span>
            <span className="mt-1 text-lg font-bold leading-none tracking-tight">
                {value}
            </span>
        </>
    );

    if (onClick) {
        return (
            <button
                type="button"
                onClick={onClick}
                className={`group relative z-0 flex min-h-[42px] flex-col rounded-xl border px-3 py-2 text-left shadow-sm transition hover:z-30 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(37,99,235,0.12)] focus-visible:z-30 ${toneStyles}`}
            >
                {content}
                <DashboardTooltip placement="bottom">{description}</DashboardTooltip>
            </button>
        );
    }

    return (
        <article className={`group relative z-0 flex min-h-[42px] flex-col rounded-xl border px-3 py-2 shadow-sm ${toneStyles}`}>
            {content}
        </article>
    );
}

function RiskDonutChart({
    data,
    onClick,
}: {
    data: DashboardData;
    onClick: () => void;
}) {
    const total = data.totalRiskCount;
    const highDeg = total > 0 ? (data.highRiskCount / total) * 360 : 0;
    const mediumDeg = total > 0 ? (data.mediumRiskCount / total) * 360 : 0;
    const chartBackground = total > 0
        ? `conic-gradient(#ef4444 0deg ${highDeg}deg, #f59e0b ${highDeg}deg ${highDeg + mediumDeg}deg, #10b981 ${highDeg + mediumDeg}deg 360deg)`
        : "conic-gradient(#e2e8f0 0deg 360deg)";

    return (
        <button
            type="button"
            onClick={onClick}
            className="group relative z-0 flex min-h-[76px] items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-left shadow-inner transition hover:z-30 hover:border-blue-300 hover:bg-blue-50/70 hover:shadow-[0_10px_24px_rgba(37,99,235,0.12)] focus-visible:z-30"
        >
            <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full p-1.5 shadow-sm"
                style={{ background: chartBackground }}
            >
                <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-white text-center shadow-inner">
                    <span className="text-sm font-bold text-slate-950">{total}</span>
                    <span className="text-[8px] font-semibold text-slate-400">风险项</span>
                </div>
            </div>

            <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-700">风险构成</p>
                <p className="mt-1 text-[11px] leading-4 text-slate-500">
                    高 {data.highRiskCount} · 中 {data.mediumRiskCount} · 低 {data.lowRiskCount}
                </p>
                <p className="mt-0.5 text-[10px] font-medium text-blue-600">
                    点击查看风险分析
                </p>
            </div>

            <DashboardTooltip placement="top">
                风险构成：高风险 {data.highRiskCount} 项，中风险 {data.mediumRiskCount} 项，低风险 {data.lowRiskCount} 项。点击查看风险分析。
            </DashboardTooltip>
        </button>
    );
}

function ChangeBarChart({
    additions,
    deletions,
    changedFileCount,
    totalChanges,
    onClick,
}: {
    additions: number;
    deletions: number;
    changedFileCount: number;
    totalChanges: number;
    onClick: () => void;
}) {
    const max = Math.max(additions, deletions, 1);
    const additionPercent = Math.max(8, Math.round((additions / max) * 100));
    const deletionPercent = Math.max(8, Math.round((deletions / max) * 100));

    return (
        <button
            type="button"
            onClick={onClick}
            className="group relative z-0 flex min-h-[76px] flex-col justify-center rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-left shadow-inner transition hover:z-30 hover:border-blue-300 hover:bg-blue-50/70 hover:shadow-[0_10px_24px_rgba(37,99,235,0.12)] focus-visible:z-30"
        >
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-xs font-semibold text-slate-700">代码变更</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                        {changedFileCount} 个文件 · 共 {totalChanges} 行
                    </p>
                </div>
                <ChartIcon className="h-4.5 w-4.5 text-blue-500" />
            </div>

            <div className="mt-1.5 space-y-1">
                <div>
                    <div className="mb-0.5 flex justify-between text-[11px] font-semibold text-emerald-600">
                        <span>新增</span>
                        <span>+{additions}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-emerald-100">
                        <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${additionPercent}%` }}
                        />
                    </div>
                </div>

                <div>
                    <div className="mb-0.5 flex justify-between text-[11px] font-semibold text-red-500">
                        <span>删除</span>
                        <span>-{deletions}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-red-100">
                        <div
                            className="h-full rounded-full bg-red-500"
                            style={{ width: `${deletionPercent}%` }}
                        />
                    </div>
                </div>
            </div>

            <DashboardTooltip placement="top">
                代码变更规模：{changedFileCount} 个文件，新增 {additions} 行，删除 {deletions} 行。点击查看智能审查顺序。
            </DashboardTooltip>
        </button>
    );
}

function DashboardMetricButton({
    label,
    value,
    description,
    onClick,
}: {
    label: string;
    value: ReactNode;
    description: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="group relative z-0 flex min-h-[36px] items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-left shadow-sm transition hover:z-30 hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50/60 hover:shadow-[0_10px_24px_rgba(37,99,235,0.12)] focus-visible:z-30"
        >
            <span className="text-[11px] font-medium text-slate-500">{label}</span>
            <span className="text-base font-semibold text-slate-950">{value}</span>
            <DashboardTooltip placement="left">{description}</DashboardTooltip>
        </button>
    );
}

function ResultDashboard({
    data,
    overview,
    onNavigate,
}: {
    data: DashboardData;
    overview: OverviewDisplay;
    onNavigate: (tab: TabKey) => void;
}) {
    return (
        <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-start gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600 shadow-sm">
                        <ShieldIcon className="h-4 w-4" />
                    </span>
                    <div>
                        <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                            审查数据看板
                        </h2>
                    </div>
                </div>
            </div>

            <div className="grid gap-3 2xl:grid-cols-[1.05fr_0.95fr_1.1fr_0.72fr]">
                <div className="grid gap-2 sm:grid-cols-2">
                    <DashboardKpiCard
                        label="风险评分"
                        value={
                            <span>
                                {overview.riskScore}
                                <span className="ml-1 text-xs font-semibold">/100</span>
                            </span>
                        }
                        description={overview.riskLabel}
                        tone={
                            overview.riskLevel === "high"
                                ? "red"
                                : overview.riskLevel === "medium"
                                    ? "amber"
                                    : "emerald"
                        }
                        onClick={() => onNavigate("risk")}
                    />

                    <DashboardKpiCard
                        label="高风险项"
                        value={overview.highRiskCount}
                        description="需人工确认"
                        tone={overview.highRiskCount > 0 ? "red" : "emerald"}
                        onClick={() => onNavigate("risk")}
                    />

                    <DashboardKpiCard
                        label="建议数量"
                        value={overview.suggestionCount}
                        description="可复制草稿"
                        tone="blue"
                        onClick={() => onNavigate("suggestion")}
                    />

                    <DashboardKpiCard
                        label="平均置信度"
                        value={`${overview.confidence}%`}
                        description="AI 建议均值"
                        tone="emerald"
                        onClick={() => onNavigate("risk")}
                    />
                </div>

                <RiskDonutChart
                    data={data}
                    onClick={() => onNavigate("risk")}
                />

                <ChangeBarChart
                    additions={data.additions}
                    deletions={data.deletions}
                    changedFileCount={data.changedFileCount}
                    totalChanges={data.totalChanges}
                    onClick={() => onNavigate("order")}
                />

                <div className="grid gap-2 sm:grid-cols-3 2xl:grid-cols-1">
                    <DashboardMetricButton
                        label="测试缺口"
                        value={data.testGapCount}
                        description={`识别到 ${data.testGapCount} 个潜在测试缺口。点击查看测试缺口。`}
                        onClick={() => onNavigate("testGap")}
                    />
                    <DashboardMetricButton
                        label="证据"
                        value={data.evidenceCount}
                        description={`共聚合 ${data.evidenceCount} 条 evidence。点击查看风险证据。`}
                        onClick={() => onNavigate("risk")}
                    />
                    <DashboardMetricButton
                        label="草稿"
                        value={data.draftCommentCount}
                        description={`草稿箱中有 ${data.draftCommentCount} 条评论草稿。点击查看草稿箱。`}
                        onClick={() => onNavigate("draft")}
                    />
                </div>
            </div>
        </div>
    );
}

function ConfidenceBar({ value }: { value: number }) {
    const tone =
        value >= 80
            ? "bg-emerald-500"
            : value >= 60
                ? "bg-amber-500"
                : "bg-red-500";

    return (
        <div className="flex items-center gap-2">
            <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-200">
                <div
                    className={`h-full rounded-full ${tone}`}
                    style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
                />
            </div>
            <span className="text-xs font-semibold text-slate-600">{value}%</span>
        </div>
    );
}

function PriorityBadge({ level }: { level: RiskLevel }) {
    const styles = {
        high: "bg-red-100 text-red-700 ring-red-200",
        medium: "bg-amber-100 text-amber-700 ring-amber-200",
        low: "bg-emerald-100 text-emerald-700 ring-emerald-200",
    }[level];

    return (
        <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ring-1 ${styles}`}>
            {getRiskLabel(level)}
        </span>
    );
}

function RiskCard({
    risk,
    onAddToDraft,
}: {
    risk: ReviewFindingDisplay;
    onAddToDraft: (finding: ReviewFindingDisplay) => void;
}) {
    const styles = {
        high: {
            card: "border-red-300 bg-red-50 shadow-red-100/80",
            badge: "bg-red-100 text-red-700 ring-red-200",
        },
        medium: {
            card: "border-amber-300 bg-amber-50 shadow-amber-100/80",
            badge: "bg-amber-100 text-amber-700 ring-amber-200",
        },
        low: {
            card: "border-emerald-300 bg-emerald-50 shadow-emerald-100/80",
            badge: "bg-emerald-100 text-emerald-700 ring-emerald-200",
        },
    }[risk.level];

    return (
        <article className={`rounded-2xl border p-4 shadow-md ${styles.card}`}>
            <div className="flex flex-wrap items-center gap-3">
                <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ring-1 ${styles.badge}`}>
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

            <div className="mt-4 rounded-2xl border border-white/70 bg-white/70 p-3 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-700">
                        Evidence & Confidence
                    </p>
                    <ConfidenceBar value={risk.confidence} />
                </div>

                <div className="mt-3 space-y-2">
                    {risk.evidence.map((item, index) => (
                        <div
                            key={`${item.file}-${item.line}-${index}`}
                            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                        >
                            <p className="break-all font-mono text-xs font-medium text-slate-700">
                                {item.file}
                                {item.line ? ` · 第 ${item.line} 行` : ""}
                            </p>
                            {item.code && (
                                <p className="mt-1 break-all rounded-lg bg-slate-900 px-2 py-1 font-mono text-xs text-slate-100">
                                    {item.code}
                                </p>
                            )}
                            <p className="mt-1 text-xs leading-5 text-slate-500">
                                {item.reason}
                            </p>
                        </div>
                    ))}
                </div>

                {risk.needsHumanCheck && (
                    <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
                        需要人工确认：该建议依赖上下文判断，合并前建议 reviewer 复核。
                    </p>
                )}

                <button
                    type="button"
                    onClick={() => onAddToDraft(risk)}
                    className="mt-3 inline-flex h-9 items-center justify-center rounded-xl bg-slate-950 px-3.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
                >
                    加入草稿箱
                </button>
            </div>
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
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 shadow-sm">
            {icon}
        </span>
    );
}

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
                                                            <PriorityBadge level={gap.severity} />
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

                                                                        <PriorityBadge level={draft.severity} />

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
                                                                            <PriorityBadge level={level} />
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
                                                                        <PriorityBadge level={item.severity} />
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