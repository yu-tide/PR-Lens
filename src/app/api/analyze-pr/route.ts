import { NextResponse } from "next/server";
import type { AnalyzePrRequest, AnalyzePrResponse } from "@/types";
import { mockPr, mockReview } from "@/mocks";
import { parsePrUrl, ParsePrUrlError } from "@/services/github/parsePrUrl";

// ============================================================
// POST /api/analyze-pr
// PR4: Mock Analysis Flow — 不接入真实 GitHub / AI API
// ============================================================

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
 * - useMock!=true: 要求提供 url，解析校验后仍返回 mock 数据（PR4 不接真实 API）
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

  // 2. Mock 模式：无需 url，直接返回示例结果
  if (body.useMock === true) {
    return NextResponse.json<AnalyzePrResponse>({
      success: true,
      mode: "mock",
      pullRequest: mockPr,
      reviewResult: mockReview,
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

  // 4. 解析 PR URL
  try {
    parsePrUrl(body.url);
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

  // 5. PR4: URL 合法，但仍返回 mock 数据（mode 标记为 mock，不伪装真实分析）
  return NextResponse.json<AnalyzePrResponse>({
    success: true,
    mode: "mock",
    pullRequest: mockPr,
    reviewResult: mockReview,
  });
}
