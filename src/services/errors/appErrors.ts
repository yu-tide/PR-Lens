// ============================================================
// PR Lens — 统一错误构造
// ============================================================

import type { AppError, AppErrorCode } from "@/types";

const ERROR_MAP: Record<
  AppErrorCode,
  {
    message: string;
    recoverable: boolean;
    stage: AppError["stage"];
    action: string;
  }
> = {
  REQUEST_INVALID_JSON: {
    message: "请求格式无效，请发送 JSON 格式的请求体",
    recoverable: true,
    stage: "request",
    action: "请刷新页面后重试，或检查请求体格式。",
  },
  EMPTY_PR_URL: {
    message: "请输入 GitHub Pull Request 链接",
    recoverable: true,
    stage: "validation",
    action:
      "请输入形如 https://github.com/owner/repo/pull/123 的链接。",
  },
  INVALID_PR_URL: {
    message: "请输入有效的 GitHub PR 链接",
    recoverable: true,
    stage: "validation",
    action: "请检查链接是否为公开 GitHub Pull Request 地址。",
  },
  GITHUB_TOKEN_MISSING: {
    message: "当前未配置 GitHub Token，已切换到 Mock 演示数据",
    recoverable: true,
    stage: "github",
    action: "如需分析真实 PR，请配置 GITHUB_TOKEN。",
  },
  GITHUB_PR_NOT_FOUND: {
    message: "PR 不存在或仓库不可访问",
    recoverable: true,
    stage: "github",
    action: "请确认仓库为公开仓库，且 PR 编号正确。",
  },
  GITHUB_RATE_LIMIT: {
    message: "GitHub API 请求次数已达上限",
    recoverable: true,
    stage: "github",
    action: "请稍后重试，或更换 GitHub Token。",
  },
  GITHUB_TIMEOUT: {
    message: "GitHub API 请求超时",
    recoverable: true,
    stage: "github",
    action: "请稍后重试。",
  },
  GITHUB_API_ERROR: {
    message: "GitHub 数据获取失败，已尝试使用 Mock 数据兜底",
    recoverable: true,
    stage: "github",
    action: "请检查仓库访问权限或稍后重试。",
  },
  AI_TOKEN_MISSING: {
    message: "当前未配置 AI Key，已使用 Mock Review 兜底",
    recoverable: true,
    stage: "ai",
    action: "如需真实 AI 分析，请配置 BAILIAN_API_KEY。",
  },
  AI_RATE_LIMIT: {
    message: "AI 服务请求频率已达上限，已使用 Mock Review 兜底",
    recoverable: true,
    stage: "ai",
    action: "请稍后重试。",
  },
  AI_TIMEOUT: {
    message: "AI 分析超时，已使用 Mock Review 兜底",
    recoverable: true,
    stage: "ai",
    action: "请稍后重试，或减少 PR 变更规模。",
  },
  AI_INVALID_RESPONSE: {
    message: "AI 返回格式异常，已使用 Mock Review 兜底",
    recoverable: true,
    stage: "ai",
    action: "请重新分析，或稍后重试。",
  },
  AI_API_ERROR: {
    message: "AI 分析失败，已使用 Mock Review 兜底",
    recoverable: true,
    stage: "ai",
    action: "请检查百炼配置或稍后重试。",
  },
  REPORT_BUILD_ERROR: {
    message: "Markdown 报告生成失败，已使用简化报告兜底",
    recoverable: true,
    stage: "report",
    action: "可以查看页面结构化结果，或点击重新分析。",
  },
  NETWORK_ERROR: {
    message: "网络连接异常，请检查网络后重试",
    recoverable: true,
    stage: "client",
    action: "请检查本地网络连接。",
  },
  MOCK_MODE: {
    message: "当前使用 Mock 演示数据",
    recoverable: true,
    stage: "unknown",
    action: "如需真实分析，请输入公开 GitHub PR 链接。",
  },
  UNKNOWN_ERROR: {
    message: "服务器内部错误，请稍后重试",
    recoverable: false,
    stage: "unknown",
    action: "请稍后重试。",
  },
};

/**
 * 创建结构化 AppError。
 * @param code 错误码
 * @param detail 可选额外详情（放入 detail 字段）
 */
export function createAppError(
  code: AppErrorCode,
  detail?: string,
): AppError {
  const entry = ERROR_MAP[code];
  return {
    code,
    message: entry.message,
    recoverable: entry.recoverable,
    stage: entry.stage,
    action: entry.action,
    ...(detail ? { detail } : {}),
  };
}
