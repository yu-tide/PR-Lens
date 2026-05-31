import type { AnalyzePrResponse, EvidenceItem, ReviewFindingDisplay, RuleCheckResult, TestGapDisplay } from "@/types";

type RiskLevel = "high" | "medium" | "low";

type RiskDisplay = {
    level: RiskLevel;
    label: string;
    title: string;
    description: string;
    suggestion: string;
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

export function extractPrNumber(url: string): string {
    try {
        const match = url.match(/github\.com\/[^/]+\/[^/]+\/pull\/(\d+)/);
        if (match?.[1]) return `#${match[1]}`;
    } catch {
        /* 解析失败 */
    }

    return "#57855";
}

export function mapRiskLevel(level: string): {
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

export function mapCategoryToIcon(category: string): string {
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

export function normalizeRiskLevel(level: string): RiskLevel {
    if (level === "high" || level === "HIGH") return "high";
    if (level === "medium" || level === "MEDIUM") return "medium";
    return "low";
}

export function getRiskLabel(level: RiskLevel): string {
    if (level === "high") return "高风险";
    if (level === "medium") return "中风险";
    return "低风险";
}

export function getRiskScoreLevel(score: number): RiskLevel {
    if (score >= 70) return "high";
    if (score >= 40) return "medium";
    return "low";
}

export function calculateRiskScore(items: RiskDisplay[]): number {
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

/**
 * 规则锚定风险评分：确定性规则引擎分占 30%，AI 分占 70%。
 * 规则引擎分对同一 PR 的同一 diff 是确定性的，起锚定作用。
 */
export function calculateAnchoredRiskScore(
    aiRisks: RiskDisplay[],
    ruleCheckResults: RuleCheckResult[],
): number {
    const aiScore = calculateRiskScore(aiRisks);

    if (ruleCheckResults.length === 0) return aiScore;

    const highCount = ruleCheckResults.filter((r) => r.severity === "high").length;
    const mediumCount = ruleCheckResults.filter((r) => r.severity === "medium").length;
    const lowCount = ruleCheckResults.filter((r) => r.severity === "low").length;

    const ruleScore = Math.round(
        (highCount * 100 + mediumCount * 62 + lowCount * 28) / ruleCheckResults.length,
    ) || 18;

    return Math.round(ruleScore * 0.3 + aiScore * 0.7);
}

export function parseSignedDisplayNumber(value: string): number {
    const parsed = Number(value.replace(/[^0-9-]+/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
}


export function readNumberField(source: unknown, keys: string[]): number | null {
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

export function normalizePercent(value: number): number {
    const percent = value <= 1 ? value * 100 : value;
    return Math.min(100, Math.max(0, Math.round(percent)));
}

export function readChangedFilesFromResponse(data: AnalyzePrResponse | null): string[] {
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

export function buildFallbackEvidence(index: number): EvidenceItem[] {
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

export function getConfidenceByLevel(level: RiskLevel, index: number): number {
    if (level === "high") return Math.max(82, 91 - index * 3);
    if (level === "medium") return Math.max(72, 84 - index * 3);
    return Math.max(62, 76 - index * 2);
}

export function normalizeDraftBody(body: string): string {
    return body
        .replace(/\r\n/g, "\n")
        .replace(/\n{2,}/g, "\n")
        .trim();
}

export function buildDraftCommentBody(finding: ReviewFindingDisplay): string {
    const evidence = finding.evidence?.[0];

    const lines = [
        `**${finding.title}**`,
        finding.description,
        `建议：${finding.suggestion}`,
    ];

    if (evidence?.file) {
        lines.push(
            `证据：${evidence.file}${evidence.line ? ` · 第 ${evidence.line} 行` : ""}`,
        );
    } else {
        lines.push("证据：建议结合相关 diff 人工复核。");
    }

    if (finding.confidence) {
        lines.push(`置信度：${finding.confidence}%`);
    }

    return normalizeDraftBody(lines.join("\n"));
}

export function buildTestGaps(files: string[]): TestGapDisplay[] {
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

        const fileName = file.split("/").pop() ?? file;

        return {
            id: `test-gap-${index}`,
            sourceFile: file,
            expectedTestFile: file
                .replace(/^src\//, "tests/")
                .replace(/\.(ts|tsx|js|jsx)$/i, ".test.ts"),
            severity,
            reason: hasRelatedTest
                ? `已检测到相关测试文件，但仍建议确认 \`${fileName}\` 的异常路径、边界条件与关键分支是否全部被覆盖。`
                : `该 PR 修改了 \`${fileName}\`，但未检测到对应的测试文件变更，存在回归风险。`,
            suggestedTestCases: [
                `补充 \`${fileName}\` 核心逻辑的正常路径测试，确认主要功能按预期执行。`,
                `补充异常路径测试，覆盖网络超时、服务不可用、数据异常等错误场景。`,
                "补充边界值测试，确认 null、undefined、空集合、0、负数等边界输入的安全性。",
                `补充集成测试，确认 \`${fileName}\` 与其依赖模块的交互行为正确。`,
            ],
            source: "rule",
        };
    });
}
