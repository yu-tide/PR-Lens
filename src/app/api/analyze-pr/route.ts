import { NextResponse } from "next/server";
import type { AnalyzePrRequest, AnalyzePrResponse, AppError, AppErrorCode, ChangedFile, ReviewResult, ReviewerPersona } from "@/types";
import { mockPr, getMockReviewByPersona } from "@/mocks";
import { parsePrUrl, ParsePrUrlError } from "@/services/github/parsePrUrl";
import {
  getPullRequestMeta,
  getChangedFiles,
  GitHubApiError,
} from "@/services/github/githubClient";
import { runRiskRules } from "@/services/review/riskRules";
import { mergeReviewResults } from "@/services/review/mergeReviewResults";
import { buildMarkdownReport } from "@/services/review/reportBuilder";
import { analyzePrWithAI } from "@/services/ai/analyzePr";
import { createAppError } from "@/services/errors/appErrors";

// ============================================================
// POST /api/analyze-pr
// ============================================================

const TOTAL_STEPS = 6;

/** 进度事件 */
interface ProgressEvent {
  type: "step";
  stepId: string;
  stepIndex: number;
  totalSteps: number;
}

/** 完成事件 */
interface DoneEvent {
  type: "done";
  data: AnalyzePrResponse;
}

/** 错误事件 */
interface ErrorEvent {
  type: "error";
  code: string;
  message: string;
}

type StreamEvent = ProgressEvent | DoneEvent | ErrorEvent;

// ============================================================
// Mock 变更文件
// ============================================================

const mockChangedFiles: ChangedFile[] = [
  {
    filename: "src/services/auth/session.ts",
    status: "modified",
    additions: 12,
    deletions: 3,
    changes: 15,
    patch: '+import { getSessionToken } from "./token";\n+const token = getSessionToken();\n+await fetch("/api/validate", { headers: { Authorization: `Bearer ${token}` } });',
    rawUrl: "",
    blobUrl: "",
    isBinary: false,
    isTooLarge: false,
  },
  {
    filename: "src/config/app.config.ts",
    status: "modified",
    additions: 5,
    deletions: 2,
    changes: 7,
    patch: "+export const apiConfig = {\n+  baseUrl: process.env.SECRET_API_URL,\n+};",
    rawUrl: "",
    blobUrl: "",
    isBinary: false,
    isTooLarge: false,
  },
  {
    filename: "package.json",
    status: "modified",
    additions: 1,
    deletions: 1,
    changes: 2,
    patch: '-    "next": "14.0.0",\n+    "next": "16.2.6",',
    rawUrl: "",
    blobUrl: "",
    isBinary: false,
    isTooLarge: false,
  },
  {
    filename: "src/utils/helpers.ts",
    status: "modified",
    additions: 2,
    deletions: 91,
    changes: 93,
    patch: "+// Rewritten helpers\n+export const format = (x: string) => x.trim();\n" + "-".repeat(91),
    rawUrl: "",
    blobUrl: "",
    isBinary: false,
    isTooLarge: false,
  },
];

// ============================================================
// 工具
// ============================================================

function buildReportSafely(params: Parameters<typeof buildMarkdownReport>[0]): {
  markdownReport: string;
  mergedRisks: typeof params.mergedRisks;
  warning?: ReturnType<typeof createAppError>;
} {
  const mergedRisks = mergeReviewResults(params.reviewResult, params.ruleCheckResults);
  try {
    const markdownReport = buildMarkdownReport({ ...params, mergedRisks });
    return { markdownReport, mergedRisks };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      markdownReport: "# PR Review 报告\n\n报告生成失败，请查看页面结构化分析结果。\n",
      mergedRisks,
      warning: createAppError("REPORT_BUILD_ERROR", msg),
    };
  }
}

const VALID_PERSONAS: readonly ReviewerPersona[] = [
  "security",
  "performance",
  "testing",
  "maintainability",
];

const DEFAULT_PERSONA: ReviewerPersona = "security";

function parseReviewerPersona(raw: unknown): ReviewerPersona {
  if (typeof raw === "string" && (VALID_PERSONAS as readonly string[]).includes(raw)) {
    return raw as ReviewerPersona;
  }
  return DEFAULT_PERSONA;
}

/**
 * 当 AI 不可用时，根据规则检查结果构建降级 ReviewResult。
 * 确保用户至少能看到规则引擎的分析，而不是白屏报错。
 */
function buildFallbackReviewResult(
  prTitle: string,
  changedFiles: ChangedFile[],
  ruleCheckResults: ReturnType<typeof runRiskRules>,
): ReviewResult {
  const fileList = changedFiles.map((f) => f.filename).join("、");

  const summary = ruleCheckResults.length > 0
    ? `[AI 暂不可用] 本次 PR "${prTitle}" 变更了 ${changedFiles.length} 个文件（${fileList}）。规则引擎命中 ${ruleCheckResults.length} 条风险，请人工审查。`
    : `[AI 暂不可用] 本次 PR "${prTitle}" 变更了 ${changedFiles.length} 个文件（${fileList}）。规则引擎未命中已知风险模式，建议人工审查。`;

  const risks = ruleCheckResults.map((r, i) => ({
    id: `fallback-risk-${i + 1}`,
    level: (r.severity.toUpperCase() as "HIGH" | "MEDIUM" | "LOW"),
    title: r.title,
    file: r.file ?? "未知文件",
    reason: r.message,
    suggestion: "请人工审查该变更的安全性与正确性。",
    requiresHumanCheck: r.severity === "high",
    confidence: 85,
  }));

  const suggestions = [
    {
      id: "fallback-suggestion-1",
      title: "人工审查高风险项",
      category: "Security" as const,
      suggestion: "当前 AI 分析不可用，请根据规则引擎命中的风险项逐项人工审查。",
    },
    {
      id: "fallback-suggestion-2",
      title: "稍后重试 AI 分析",
      category: "Maintainability" as const,
      suggestion: "AI 服务恢复后，建议重新触发分析以获取更全面的审查结果。",
    },
  ];

  return { summary, risks, suggestions, testGaps: undefined };
}

// ============================================================
// 流式响应
// ============================================================

export async function POST(request: Request) {
  // 1. 解析 JSON body
  let body: AnalyzePrRequest;
  try {
    body = (await request.json()) as AnalyzePrRequest;
  } catch {
    return NextResponse.json<AnalyzePrResponse>(
      { success: false, mode: "mock", error: createAppError("REQUEST_INVALID_JSON") },
      { status: 400 },
    );
  }

  // 1.5 提取并校验 reviewerPersona
  const reviewerPersona = parseReviewerPersona(body.reviewerPersona);

  // 2. Mock 模式：直接返回 JSON（无进度）
  if (body.useMock === true) {
    console.log(`[analyze-pr] mock mode — instant JSON (persona: ${reviewerPersona})`);

    const personaMockReview = getMockReviewByPersona(reviewerPersona);
    const ruleCheckResults = runRiskRules(mockChangedFiles);
    const { mergedRisks, markdownReport, warning: reportWarning } =
      buildReportSafely({
        pullRequest: mockPr,
        changedFiles: mockChangedFiles,
        ruleCheckResults,
        reviewResult: personaMockReview,
        source: "mock",
        aiSource: "mock",
      });

    const warnings = [createAppError("MOCK_MODE")];
    if (reportWarning) warnings.push(reportWarning);

    return NextResponse.json<AnalyzePrResponse>({
      success: true,
      mode: "mock",
      pullRequest: mockPr,
      reviewResult: personaMockReview,
      changedFiles: mockChangedFiles,
      ruleCheckResults,
      mergedRisks,
      markdownReport,
      source: "mock",
      aiSource: "mock",
      warnings,
      reviewerPersona,
    });
  }

  // 3. 非 Mock 模式：url 必填
  if (!body.url) {
    return NextResponse.json<AnalyzePrResponse>(
      { success: false, mode: "mock", error: createAppError("EMPTY_PR_URL") },
      { status: 400 },
    );
  }

  // 4. 流式响应
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: StreamEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      // ── Step 1: 解析 PR URL ──
      send({ type: "step", stepId: "parse-url", stepIndex: 0, totalSteps: TOTAL_STEPS });

      let parsed;
      try {
        parsed = parsePrUrl(body.url!);
      } catch (error) {
        if (error instanceof ParsePrUrlError) {
          send({
            type: "error",
            code: "INVALID_PR_URL",
            message: error.message,
          });
        } else {
          send({
            type: "error",
            code: "UNKNOWN_ERROR",
            message: "服务器内部错误",
          });
        }
        controller.close();
        return;
      }

      // ── Step 2-3: 获取 PR 信息 + 变更文件 ──
      const stepStart = Date.now();

      try {
        send({ type: "step", stepId: "fetch-pr", stepIndex: 1, totalSteps: TOTAL_STEPS });

        const [pr, changedFiles] = await Promise.all([
          getPullRequestMeta(parsed),
          getChangedFiles(parsed),
        ]);

        console.log(
          `[analyze-pr] GitHub data OK — ${changedFiles.length} files, PR: ${pr.title} (${((Date.now() - stepStart) / 1000).toFixed(1)}s)`,
        );

        send({ type: "step", stepId: "fetch-files", stepIndex: 2, totalSteps: TOTAL_STEPS });

        // ── Step 4: 规则检查 ──
        send({ type: "step", stepId: "rule-check", stepIndex: 3, totalSteps: TOTAL_STEPS });

        const ruleCheckResults = runRiskRules(changedFiles);
        console.log(
          `[analyze-pr] rule check done — ${ruleCheckResults.length} hits`,
        );

        // ── Step 5: AI 分析（最多重试 3 次）──
        send({ type: "step", stepId: "ai-review", stepIndex: 4, totalSteps: TOTAL_STEPS });

        console.log("[analyze-pr] calling AI analysis...");
        const aiStart = Date.now();

        const MAX_AI_RETRIES = 3;
        let reviewResult!: Awaited<ReturnType<typeof analyzePrWithAI>>["reviewResult"];
        let aiSource!: "bailian" | "mock";
        let lastAiError: string | null = null;

        for (let attempt = 1; attempt <= MAX_AI_RETRIES; attempt++) {
          try {
            const aiResult = await analyzePrWithAI({
              pullRequest: pr,
              changedFiles,
              ruleCheckResults,
              reviewerPersona,
            });
            reviewResult = aiResult.reviewResult;
            aiSource = aiResult.source;
            lastAiError = null;
            console.log(
              `[analyze-pr] AI done — ${((Date.now() - aiStart) / 1000).toFixed(1)}s, ${reviewResult.risks.length} risks, ${reviewResult.suggestions.length} suggestions`,
            );
            break;
          } catch (error) {
            lastAiError = error instanceof Error ? error.message : String(error);
            console.warn(
              `[analyze-pr] AI attempt ${attempt}/${MAX_AI_RETRIES} failed: ${lastAiError}`,
            );
            if (attempt < MAX_AI_RETRIES) {
              await new Promise((r) => setTimeout(r, attempt * 1000));
            }
          }
        }

        if (lastAiError !== null) {
          /* AI 不可用时降级为规则检查模式，返回部分结果 */
          console.warn(`[analyze-pr] AI unavailable, falling back to rule-only mode`);
          reviewResult = buildFallbackReviewResult(pr.title, changedFiles, ruleCheckResults);
          aiSource = "mock";
        }

        const warnings: AppError[] = [];
        if (lastAiError !== null) {
          warnings.push(createAppError("AI_MOCK_FALLBACK", `AI 分析暂时不可用（${lastAiError}），当前展示规则检查结果。`));
        }

        // ── Step 6: 生成报告 ──
        send({ type: "step", stepId: "report", stepIndex: 5, totalSteps: TOTAL_STEPS });

        const { mergedRisks, markdownReport, warning: reportWarning } =
          buildReportSafely({
            pullRequest: pr,
            changedFiles,
            ruleCheckResults,
            reviewResult,
            source: "github",
            aiSource,
          });

        if (reportWarning) warnings.push(reportWarning);

        console.log("[analyze-pr] response ready (streaming)");

        send({
          type: "done",
          data: {
            success: true,
            mode: "real",
            pullRequest: pr,
            reviewResult,
            changedFiles,
            ruleCheckResults,
            mergedRisks,
            markdownReport,
            source: "github",
            aiSource,
            warnings: warnings.length > 0 ? warnings : undefined,
            reviewerPersona,
          },
        });
        controller.close();
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(`[analyze-pr] GitHub API failed: ${msg}`);

        const code =
          error instanceof GitHubApiError
            ? (error.code as AppErrorCode)
            : "GITHUB_API_ERROR";

        send({
          type: "error",
          code,
          message: `GitHub 数据获取失败：${msg}。请检查 PR 链接是否正确，或稍后重试。`,
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
