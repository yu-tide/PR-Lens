// ============================================================
// PR Lens — 百炼 OpenAI‑compatible Chat Completions 客户端
// ============================================================

import type { AiClientConfig, AiClientErrorCode } from "@/types";

// ============================================================
// 内部类型：OpenAI Chat Completions 响应
// ============================================================

type OpenAiChatMessageResponse = {
  role: string;
  content?: string;
};

type OpenAiChoiceResponse = {
  index: number;
  message?: OpenAiChatMessageResponse;
  finish_reason?: string;
};

type OpenAiChatCompletionResponse = {
  id?: string;
  object?: string;
  created?: number;
  model?: string;
  choices?: OpenAiChoiceResponse[];
};

// ============================================================
// 自定义错误
// ============================================================

export class AiClientError extends Error {
  code: AiClientErrorCode;
  status?: number;

  constructor(params: {
    code: AiClientErrorCode;
    message: string;
    status?: number;
  }) {
    super(params.message);
    this.name = "AiClientError";
    this.code = params.code;
    this.status = params.status;
  }
}

// ============================================================
// 环境变量读取
// ============================================================

/** 从环境变量读取百炼配置 */
export function getAiClientConfigFromEnv(): AiClientConfig {
  const apiKey = process.env.BAILIAN_API_KEY;

  if (!apiKey) {
    throw new AiClientError({
      code: "AI_TOKEN_MISSING",
      message: "未配置 BAILIAN_API_KEY 环境变量，无法调用 AI 服务",
    });
  }

  return {
    apiKey,
    baseUrl:
      process.env.BAILIAN_BASE_URL ||
      "https://dashscope.aliyuncs.com/compatible-mode/v1",
    model: process.env.BAILIAN_MODEL || "qwen-plus",
  };
}

// ============================================================
// API 调用
// ============================================================

/**
 * 带超时的 AI fetch 封装。
 * AbortError 映射为 AiClientError(code: "AI_TIMEOUT")。
 */
async function fetchAiWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = 120000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return res;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new AiClientError({
        code: "AI_TIMEOUT",
        message: "AI 分析超时，请稍后重试",
      });
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 调用百炼 Chat Completions API 并返回模型生成的文本内容。
 *
 * @throws AiClientError 当 API Key 缺失、请求失败或响应格式异常时
 */
export async function callAiChatCompletion(params: {
  systemPrompt: string;
  userPrompt: string;
}): Promise<string> {
  const { apiKey, baseUrl, model } = getAiClientConfigFromEnv();
  const { systemPrompt, userPrompt } = params;

  const url = `${baseUrl}/chat/completions`;

  const body = JSON.stringify({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0,
  });

  console.log(`  [ai] calling ${model} @ ${baseUrl}...`);

  let res: Response;
  const fetchStart = Date.now();
  try {
    res = await fetchAiWithTimeout(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body,
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new AiClientError({
      code: "AI_API_ERROR",
      message: `无法连接到 AI 服务：${detail}`,
    });
  }

  /* 429 → 限流 */
  if (res.status === 429) {
    throw new AiClientError({
      code: "AI_RATE_LIMIT",
      message: "AI 服务请求频率已达上限，请稍后重试",
      status: 429,
    });
  }

  /* 其他非 2xx */
  if (!res.ok) {
    throw new AiClientError({
      code: "AI_API_ERROR",
      message: `AI 服务请求失败 (HTTP ${res.status})`,
      status: res.status,
    });
  }

  const data = (await res.json()) as OpenAiChatCompletionResponse;

  const content = data.choices?.[0]?.message?.content;

  console.log(
    `  [ai] response received in ${((Date.now() - fetchStart) / 1000).toFixed(1)}s`,
  );

  if (!content || typeof content !== "string") {
    throw new AiClientError({
      code: "AI_INVALID_RESPONSE",
      message: "AI 服务返回了无效的响应格式，无法提取文本内容",
    });
  }

  return content;
}
