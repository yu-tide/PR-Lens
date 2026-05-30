// ============================================================
// PR Lens — 客户端 API 请求封装
// ============================================================

import type { AnalyzePrRequest, AnalyzePrResponse } from "@/types";

/**
 * 调用 POST /api/analyze-pr 并返回结构化响应。
 *
 * - 网络超时或异常时返回 success:false + error（不抛异常）
 * - 超时默认 30 秒
 */
export async function requestAnalyzePr(
  body: AnalyzePrRequest,
  timeoutMs = 30000,
): Promise<AnalyzePrResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch("/api/analyze-pr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const data = (await res.json()) as AnalyzePrResponse;
    return data;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return {
        success: false,
        mode: "mock",
        error: {
          code: "NETWORK_ERROR",
          message: "网络请求超时，请稍后重试",
          recoverable: true,
          stage: "client",
          action: "请检查网络连接，或稍后重新分析。",
        },
      };
    }

    return {
      success: false,
      mode: "mock",
      error: {
        code: "NETWORK_ERROR",
        message: "网络连接异常，请检查网络后重试",
        recoverable: true,
        stage: "client",
        action: "请检查网络连接，或稍后重新分析。",
      },
    };
  } finally {
    clearTimeout(timer);
  }
}
