import Link from "next/link";
import type { ReactNode } from "react";
import { AppHeader } from "@/components/AppHeader";

type RiskLevel = "high" | "medium" | "low";

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
            <path
                d="M8 8h10v12H8V8Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
            />
            <path
                d="M6 16H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
        </svg>
    );
}

function DownloadIcon({ className = "" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
            <path
                d="M12 3v11m0 0 4-4m-4 4-4-4"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M5 20h14"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
        </svg>
    );
}

function UserIcon({ className = "" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
            <path
                d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
                stroke="currentColor"
                strokeWidth="1.8"
            />
            <path
                d="M5 21a7 7 0 0 1 14 0"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
        </svg>
    );
}

function FolderIcon({ className = "" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
            <path
                d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2h6.5A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-9Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function PlusIcon({ className = "" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
            <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth="2.1"
                strokeLinecap="round"
            />
        </svg>
    );
}

function MinusIcon({ className = "" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
            <path
                d="M5 12h14"
                stroke="currentColor"
                strokeWidth="2.1"
                strokeLinecap="round"
            />
        </svg>
    );
}

function SparkIcon({ className = "" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
            <path
                d="M12 3 13.8 9.2 20 11l-6.2 1.8L12 19l-1.8-6.2L4 11l6.2-1.8L12 3Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
            />
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

function BeakerIcon({ className = "" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
            <path
                d="M9 3h6M10 3v5l-5 9a3 3 0 0 0 2.6 4.5h8.8A3 3 0 0 0 19 17l-5-9V3"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function SettingsIcon({ className = "" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
            <path
                d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
                stroke="currentColor"
                strokeWidth="1.7"
            />
            <path
                d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14.2 3h-4.4l-.4 2.7a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.4-1a7 7 0 0 0 2 1.2l.4 2.7h4.4l.4-2.7a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2Z"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function ChartIcon({ className = "" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
            <path
                d="M5 19V5M5 19h14M9 16v-5M13 16V8M17 16v-7"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
        </svg>
    );
}

function SectionTitle({
    icon,
    title,
}: {
    icon: ReactNode;
    title: string;
}) {
    return (
        <div className="mb-4 flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                {icon}
            </span>
            <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                {title}
            </h2>
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
        <div className="flex items-center gap-3 border-r border-slate-100 last:border-r-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-blue-600">
                {icon}
            </div>
            <div>
                <p className="text-xs text-slate-400">{label}</p>
                <p className={`mt-1 text-base font-semibold ${valueClassName}`}>
                    {value}
                </p>
            </div>
        </div>
    );
}

function RiskCard({ risk }: { risk: (typeof risks)[number] }) {
    const styles = {
        high: {
            card: "border-red-200 bg-red-50/60",
            badge: "bg-red-100 text-red-700",
        },
        medium: {
            card: "border-amber-200 bg-amber-50/60",
            badge: "bg-amber-100 text-amber-700",
        },
        low: {
            card: "border-emerald-200 bg-emerald-50/60",
            badge: "bg-emerald-100 text-emerald-700",
        },
    }[risk.level];

    return (
        <article className={`rounded-2xl border p-4 ${styles.card}`}>
            <div className="flex items-center gap-3">
                <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${styles.badge}`}>
                    {risk.label}
                </span>
                <h3 className="text-sm font-semibold text-slate-950">{risk.title}</h3>
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
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
            {icon}
        </span>
    );
}

export default function ResultPage() {
    return (
        <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
            <div className="sticky top-0 z-40">
                <AppHeader />
            </div>

            <section className="relative mx-auto max-w-6xl px-6 py-6">
                <div className="pointer-events-none absolute -left-36 top-36 h-72 w-72 rounded-full bg-blue-100/50 blur-3xl" />
                <div className="pointer-events-none absolute -right-36 top-20 h-72 w-72 rounded-full bg-indigo-100/50 blur-3xl" />
                <div className="pointer-events-none absolute left-[-160px] top-32 h-3 w-40 rotate-[-30deg] rounded-full bg-slate-200/60" />
                <div className="pointer-events-none absolute right-[-150px] top-24 h-3 w-48 rotate-[-30deg] rounded-full bg-slate-200/60" />

                <div className="relative space-y-5">
                    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white/95 p-6 shadow-xl shadow-slate-200/70">
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                                <Link
                                    href="/"
                                    className="text-sm font-medium text-slate-500 transition hover:text-blue-600"
                                >
                                    ← 返回首页
                                </Link>

                                <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
                                    {prInfo.title}
                                </h1>

                                <div className="mt-3 flex flex-wrap items-center gap-2.5 text-sm text-slate-600">
                                    <GithubIcon className="h-4.5 w-4.5 text-slate-900" />
                                    <span>{prInfo.repo}</span>
                                    <span className="text-slate-300">·</span>
                                    <span>{prInfo.prNumber}</span>
                                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600">
                                        分析完成
                                    </span>
                                </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-3">
                                <button className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-600">
                                    <CopyIcon className="h-4 w-4" />
                                    复制报告
                                </button>

                                <button className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-700">
                                    <DownloadIcon className="h-4 w-4" />
                                    下载报告
                                </button>
                            </div>
                        </div>

                        <div className="mt-5 grid gap-4 rounded-2xl border border-slate-100 bg-white px-5 py-4 md:grid-cols-4">
                            <StatCard
                                icon={<UserIcon className="h-4.5 w-4.5" />}
                                label="作者"
                                value={prInfo.author}
                            />

                            <StatCard
                                icon={<FolderIcon className="h-4.5 w-4.5" />}
                                label="变更文件"
                                value={prInfo.changedFiles}
                            />

                            <StatCard
                                icon={<PlusIcon className="h-4.5 w-4.5 text-emerald-600" />}
                                label="新增"
                                value={prInfo.additions}
                                valueClassName="text-emerald-600"
                            />

                            <StatCard
                                icon={<MinusIcon className="h-4.5 w-4.5 text-red-500" />}
                                label="删除"
                                value={prInfo.deletions}
                                valueClassName="text-red-500"
                            />
                        </div>
                    </section>

                    <section className="rounded-[28px] border border-slate-200 bg-white/95 p-6 shadow-xl shadow-slate-200/70">
                        <SectionTitle
                            icon={<SparkIcon className="h-4.5 w-4.5" />}
                            title="AI 摘要"
                        />

                        <div className="space-y-2.5 text-sm leading-7 text-slate-600">
                            {summary.map((item) => (
                                <p key={item}>{item}</p>
                            ))}
                        </div>
                    </section>

                    <section className="rounded-[28px] border border-slate-200 bg-white/95 p-6 shadow-xl shadow-slate-200/70">
                        <SectionTitle
                            icon={<ShieldIcon className="h-4.5 w-4.5" />}
                            title="风险分析"
                        />

                        <div className="grid gap-4 md:grid-cols-3">
                            {risks.map((risk) => (
                                <RiskCard key={risk.title} risk={risk} />
                            ))}
                        </div>
                    </section>

                    <section className="rounded-[28px] border border-slate-200 bg-white/95 p-6 shadow-xl shadow-slate-200/70">
                        <SectionTitle
                            icon={<MessageIcon className="h-4.5 w-4.5" />}
                            title="Review 建议"
                        />

                        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
                            {suggestions.map((suggestion) => (
                                <div
                                    key={suggestion.title}
                                    className="flex items-center gap-4 border-b border-slate-100 px-4 py-3 last:border-b-0"
                                >
                                    <SuggestionIcon name={suggestion.icon} />

                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-slate-900">
                                            {suggestion.title}
                                        </p>
                                        <p className="mt-1 text-xs leading-5 text-slate-500">
                                            {suggestion.description}
                                        </p>
                                    </div>

                                    <span className="text-lg text-slate-300">›</span>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="rounded-[28px] border border-slate-200 bg-white/95 p-6 shadow-xl shadow-slate-200/70">
                        <div className="mb-4 flex items-center justify-between gap-4">
                            <SectionTitle
                                icon={<FileIcon className="h-4.5 w-4.5" />}
                                title="Markdown 审查报告预览"
                            />

                            <button className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-600">
                                <CopyIcon className="h-3.5 w-3.5" />
                                复制 Markdown
                            </button>
                        </div>

                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                            <div className="grid grid-cols-[44px_1fr] text-xs leading-6">
                                {markdownLines.map((line, index) => (
                                    <div key={line} className="contents">
                                        <div className="border-r border-slate-200 bg-white/60 px-3 text-right font-mono text-slate-400">
                                            {index + 1}
                                        </div>
                                        <div className="px-4 font-mono text-slate-700">
                                            {line}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                </div>
            </section>
        </main>
    );
}