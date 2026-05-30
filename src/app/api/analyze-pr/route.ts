import { NextResponse } from "next/server";
import type { AnalyzePrRequest, AnalyzePrResponse, ChangedFile } from "@/types";
import { mockPr, mockReview } from "@/mocks";
import { parsePrUrl, ParsePrUrlError } from "@/services/github/parsePrUrl";
import {
  getPullRequestMeta,
  getChangedFiles,
  GitHubApiError,
} from "@/services/github/githubClient";
import { runRiskRules } from "@/services/review/riskRules";
import { analyzePrWithAI } from "@/services/ai/analyzePr";

// ============================================================
// POST /api/analyze-pr
// PR6: 接入规则预检查
// ============================================================

/** Mock 变更文件（用于 Mock 模式和 GitHub API fallback 时演示规则命中） */
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

/** 500 响应 */
const unknownErrorResponse: AnalyzePrResponse = {
  success: false,
  mode: "mock",
  error: {
    code: "UNKNOWN_ERROR",
    message: "服务器内部错误，请稍后重试",
    recoverable: false,
  },
};

/**
 * 分析 Pull Request
 *
 * - useMock=true: 直接返回 mockPr + mockReview
 * - useMock!=true: 解析 url → 调用 GitHub API → 成功返回真实数据，失败 fallback 到 mock
 */
export async function POST(request: Request) {
  // 1. 解析 JSON body
  let body: AnalyzePrRequest;

  try {
    body = (await request.json()) as AnalyzePrRequest;
  } catch {
    return NextResponse.json<AnalyzePrResponse>(
      {
        success: false,
        mode: "mock",
        error: {
          code: "UNKNOWN_ERROR",
          message: "请求格式无效，请发送 JSON 格式的请求体",
          recoverable: true,
        },
      },
      { status: 400 },
    );
  }

  // 2. Mock 模式：无需 url，直接返回示例结果（含规则检查）
  if (body.useMock === true) {
    console.log("[analyze-pr] mock mode — skipping GitHub & AI");

    const ruleCheckResults = runRiskRules(mockChangedFiles);

    return NextResponse.json<AnalyzePrResponse>({
      success: true,
      mode: "mock",
      pullRequest: mockPr,
      reviewResult: mockReview,
      changedFiles: mockChangedFiles,
      ruleCheckResults,
      source: "mock",
    });
  }

  // 3. 非 Mock 模式：url 必填
  if (!body.url) {
    return NextResponse.json<AnalyzePrResponse>(
      {
        success: false,
        mode: "mock",
        error: {
          code: "INVALID_PR_URL",
          message: "请输入有效的 GitHub PR 链接",
          detail:
            "在非 Mock 模式下必须提供 PR 链接，或使用 useMock=true 进入示例模式",
          recoverable: true,
        },
      },
      { status: 400 },
    );
  }

  // 4. 解析 PR URL（保存解析结果供步骤 5 使用）
  let parsed;

  try {
    parsed = parsePrUrl(body.url);
  } catch (error) {
    if (error instanceof ParsePrUrlError) {
      return NextResponse.json<AnalyzePrResponse>(
        {
          success: false,
          mode: "mock",
          error: {
            code: "INVALID_PR_URL",
            message: error.message,
            recoverable: true,
          },
        },
        { status: 400 },
      );
    }

    return NextResponse.json<AnalyzePrResponse>(unknownErrorResponse, {
      status: 500,
    });
  }

  // 5. 调用真实 GitHub API；失败时 fallback 到 mock
  try {
    console.log("[analyze-pr] [1/5] fetching GitHub data...");

    const [pr, changedFiles] = await Promise.all([
      getPullRequestMeta(parsed),
      getChangedFiles(parsed),
    ]);

    console.log(
      `[analyze-pr] [2/5] GitHub data OK — ${changedFiles.length} files, PR: ${pr.title}`,
    );

    const ruleCheckResults = runRiskRules(changedFiles);

    console.log(
      `[analyze-pr] [3/5] rule check done — ${ruleCheckResults.length} hits`,
    );

    /* 调用 AI 分析；失败时 fallback 到 mockReview */
    let reviewResult = mockReview;
    let aiSource: "bailian" | "mock" = "mock";
    let aiWarning: string | undefined;

    console.log("[analyze-pr] [4/5] calling AI analysis...");

    const aiStart = Date.now();
    try {
      const aiResult = await analyzePrWithAI({
        pullRequest: pr,
        changedFiles,
        ruleCheckResults,
      });
      reviewResult = aiResult.reviewResult;
      aiSource = aiResult.source;
      console.log(
        `[analyze-pr] [4/5] AI done — ${((Date.now() - aiStart) / 1000).toFixed(1)}s, ${reviewResult.risks.length} risks, ${reviewResult.suggestions.length} suggestions`,
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(`[analyze-pr] [4/5] AI failed: ${msg}`);
      aiSource = "mock";
      aiWarning = `AI analysis failed, fallback to mock review: ${msg}`;
    }

    console.log("[analyze-pr] [5/5] response ready");

    return NextResponse.json<AnalyzePrResponse>({
      success: true,
      mode: "mock",
      pullRequest: pr,
      reviewResult,
      changedFiles,
      ruleCheckResults,
      source: "github",
      aiSource,
      warning: aiWarning,
    });
  } catch (error) {
    console.warn(`[analyze-pr] GitHub API failed: ${error instanceof Error ? error.message : String(error)}`);

    if (error instanceof GitHubApiError) {
      const ruleCheckResults = runRiskRules(mockChangedFiles);

      return NextResponse.json<AnalyzePrResponse>({
        success: true,
        mode: "mock",
        pullRequest: mockPr,
        reviewResult: mockReview,
        changedFiles: mockChangedFiles,
        ruleCheckResults,
        source: "mock",
        warning: error.message,
      });
    }

    return NextResponse.json<AnalyzePrResponse>(unknownErrorResponse, {
      status: 500,
    });
  }
}
