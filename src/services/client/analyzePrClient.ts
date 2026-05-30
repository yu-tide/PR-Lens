// ============================================================
// PR Lens — 客户端 API 请求封装
// ============================================================

import type { AnalyzePrRequest, AnalyzePrResponse, AppErrorCode } from "@/types";

// ============================================================
// 流式进度事件类型
// ============================================================

export interface StepProgress {
  stepId: string;
  stepIndex: number;
  totalSteps: number;
}

type ProgressCallback = (step: StepProgress) => void;

// ============================================================
// 请求（带进度回调）
// ============================================================

/**
 * 调用 POST /api/analyze-pr。
 *
 * - Mock 模式：服务端返回普通 JSON，直接解析
 * - 真实模式：服务端返回 SSE 流，逐条接收进度事件，最终返回完整分析结果
 * - 超时默认 60 秒（真实分析需要更长时间）
 */
export async function requestAnalyzePr(
  body: AnalyzePrRequest,
  timeoutMs = 60000,
  onProgress?: ProgressCallback,
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

    // Mock 模式或错误：普通 JSON 响应
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return (await res.json()) as AnalyzePrResponse;
    }

    // 真实模式：SSE 流
    if (!res.ok || !res.body) {
      return {
        success: false,
        mode: "mock",
        error: {
          code: "NETWORK_ERROR",
          message: `请求失败 (HTTP ${res.status})`,
          recoverable: true,
          stage: "client",
          action: "请稍后重试。",
        },
      };
    }

    return await readStreamResponse(res.body, onProgress);
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

// ============================================================
// SSE 流读取
// ============================================================

interface StreamEvent {
  type: "step" | "done" | "error";
  stepId?: string;
  stepIndex?: number;
  totalSteps?: number;
  code?: string;
  message?: string;
  data?: AnalyzePrResponse;
}

async function readStreamResponse(
  body: ReadableStream<Uint8Array>,
  onProgress?: ProgressCallback,
): Promise<AnalyzePrResponse> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      // 最后一个可能不完整，保留到下一次
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed.startsWith("data: ")) continue;

        try {
          const event = JSON.parse(trimmed.slice(6)) as StreamEvent;

          if (event.type === "step" && onProgress) {
            onProgress({
              stepId: event.stepId ?? "",
              stepIndex: event.stepIndex ?? 0,
              totalSteps: event.totalSteps ?? 6,
            });
          } else if (event.type === "done" && event.data) {
            return event.data;
          } else if (event.type === "error") {
            return {
              success: false,
              mode: "mock",
              error: {
                code: (event.code as AppErrorCode) ?? "UNKNOWN_ERROR",
                message: event.message ?? "分析失败",
                recoverable: true,
                stage: "unknown",
                action: "请稍后重试。",
              },
            };
          }
        } catch {
          /* 解析失败的 SSE 行 → 跳过 */
        }
      }
    }

    // 如果循环结束还没收到 done → 流意外关闭
    return {
      success: false,
      mode: "mock",
      error: {
        code: "NETWORK_ERROR",
        message: "服务端连接意外中断",
        recoverable: true,
        stage: "client",
        action: "请稍后重试。",
      },
    };
  } catch {
    return {
      success: false,
      mode: "mock",
      error: {
        code: "NETWORK_ERROR",
        message: "读取分析结果时网络中断",
        recoverable: true,
        stage: "client",
        action: "请检查网络连接。",
      },
    };
  }
}
