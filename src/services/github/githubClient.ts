// ============================================================
// PR Lens — GitHub REST API 客户端
// ============================================================

import { normalizePatch } from "./diffParser";
import type {
  ChangedFile,
  GitHubApiErrorCode,
  PullRequestMeta,
} from "@/types";

// ============================================================
// 内部类型：GitHub API 原始响应（不导出，避免 any）
// ============================================================

type GitHubPullRequestResponse = {
  title: string;
  body: string | null;
  html_url: string;
  additions: number;
  deletions: number;
  changed_files: number;
  user: { login: string } | null;
  base: { ref: string };
  head: { ref: string };
};

type GitHubChangedFileResponse = {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  raw_url?: string;
  blob_url?: string;
};

// ============================================================
// 自定义错误
// ============================================================

export class GitHubApiError extends Error {
  code: GitHubApiErrorCode;
  status?: number;

  constructor(params: {
    code: GitHubApiErrorCode;
    message: string;
    status?: number;
  }) {
    super(params.message);
    this.name = "GitHubApiError";
    this.code = params.code;
    this.status = params.status;
  }
}

// ============================================================
// 内部工具
// ============================================================

/** GitHub API base URL */
const API_BASE = "https://api.github.com";

/**
 * 组装通用请求头
 */
function buildHeaders(): HeadersInit {
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    throw new GitHubApiError({
      code: "GITHUB_TOKEN_MISSING",
      message: "未配置 GITHUB_TOKEN 环境变量，无法访问 GitHub API",
    });
  }

  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

/**
 * 处理非 2xx 响应
 */
async function handleErrorResponse(
  res: Response,
): Promise<never> {
  /* 404 → PR 不存在或仓库不存在 */
  if (res.status === 404) {
    throw new GitHubApiError({
      code: "GITHUB_PR_NOT_FOUND",
      message: "PR 不存在或该仓库不是公开仓库",
      status: 404,
    });
  }

  /* 403 并且包含 rate limit 相关信息 */
  if (res.status === 403) {
    const remaining = res.headers.get("x-ratelimit-remaining");
    if (remaining === "0") {
      throw new GitHubApiError({
        code: "GITHUB_RATE_LIMIT",
        message: "GitHub API 请求次数已达上限，请稍后重试",
        status: 403,
      });
    }

    throw new GitHubApiError({
      code: "GITHUB_API_ERROR",
      message: "无权访问该 PR，请确认仓库为公开仓库",
      status: 403,
    });
  }

  /* 其他非 2xx */
  throw new GitHubApiError({
    code: "GITHUB_API_ERROR",
    message: `GitHub API 请求失败 (HTTP ${res.status})`,
    status: res.status,
  });
}

// ============================================================
// 公开 API
// ============================================================

/**
 * 获取 PR 基本信息
 *
 * 调用: GET /repos/{owner}/{repo}/pulls/{pullNumber}
 */
export async function getPullRequestMeta(params: {
  owner: string;
  repo: string;
  pullNumber: number;
}): Promise<PullRequestMeta> {
  const { owner, repo, pullNumber } = params;
  const headers = buildHeaders();

  const url = `${API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${pullNumber}`;

  let res: Response;
  try {
    res = await fetch(url, { headers });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new GitHubApiError({
      code: "GITHUB_API_ERROR",
      message: `无法连接到 GitHub API：${detail}`,
    });
  }

  if (!res.ok) {
    await handleErrorResponse(res);
  }

  const data = (await res.json()) as GitHubPullRequestResponse;

  return {
    owner,
    repo,
    pullNumber,
    title: data.title,
    author: data.user?.login ?? "unknown",
    repository: `${owner}/${repo}`,
    description: data.body ?? undefined,
    baseBranch: data.base.ref,
    headBranch: data.head.ref,
    url: data.html_url,
    additions: data.additions ?? 0,
    deletions: data.deletions ?? 0,
    changedFiles: data.changed_files ?? 0,
  };
}

/**
 * 获取 PR 变更文件列表
 *
 * 调用: GET /repos/{owner}/{repo}/pulls/{pullNumber}/files?per_page=100
 */
export async function getChangedFiles(params: {
  owner: string;
  repo: string;
  pullNumber: number;
}): Promise<ChangedFile[]> {
  const { owner, repo, pullNumber } = params;
  const headers = buildHeaders();

  const url = `${API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${pullNumber}/files?per_page=100`;

  let res: Response;
  try {
    res = await fetch(url, { headers });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new GitHubApiError({
      code: "GITHUB_API_ERROR",
      message: `无法连接到 GitHub API：${detail}`,
    });
  }

  if (!res.ok) {
    await handleErrorResponse(res);
  }

  const data = (await res.json()) as GitHubChangedFileResponse[];

  return data.map((file) => {
    const { patch, isBinary, isTooLarge } = normalizePatch(file.patch);

    return {
      filename: file.filename,
      status: file.status,
      additions: file.additions ?? 0,
      deletions: file.deletions ?? 0,
      changes: file.changes ?? 0,
      patch,
      rawUrl: file.raw_url,
      blobUrl: file.blob_url,
      isBinary,
      isTooLarge,
    };
  });
}
