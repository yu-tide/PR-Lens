import type { ParsedPullRequestUrl } from "@/types";

// ============================================================
// GitHub PR URL 解析
// ============================================================

/** GitHub PR 链接正则: https://github.com/{owner}/{repo}/pull/{number} */
const PR_URL_PATTERN = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)\/?$/;

/** PR URL 解析失败时抛出的错误 */
export class ParsePrUrlError extends Error {
  readonly code = "INVALID_PR_URL";

  constructor(message: string) {
    super(message);
    this.name = "ParsePrUrlError";
  }
}

/**
 * 解析 GitHub Pull Request 链接
 *
 * @param url - 用户输入的 PR 链接
 * @returns 解析结果 { owner, repo, pullNumber, url }
 * @throws ParsePrUrlError 当链接格式不合法时
 *
 * 合法示例:
 *   https://github.com/vercel/next.js/pull/12345
 *   https://github.com/owner/repo/pull/1
 *
 * 非法示例:
 *   abc
 *   https://github.com/owner/repo/issues/1
 *   https://gitlab.com/owner/repo/pull/1
 *   https://github.com/owner/repo/pull/test
 */
export function parsePrUrl(url: string): ParsedPullRequestUrl {
  const trimmed = url.trim();

  if (!trimmed) {
    throw new ParsePrUrlError("请输入有效的 GitHub PR 链接");
  }

  const match = trimmed.match(PR_URL_PATTERN);

  if (!match) {
    throw new ParsePrUrlError(
      "请输入有效的 GitHub PR 链接，例如：https://github.com/owner/repo/pull/123",
    );
  }

  const [, owner, repo, pullNumberStr] = match;
  const pullNumber = Number(pullNumberStr);

  // 防御性校验：pullNumber 必须是正整数
  if (pullNumber <= 0 || !Number.isInteger(pullNumber)) {
    throw new ParsePrUrlError("PR 编号必须是正整数");
  }

  return {
    owner,
    repo,
    pullNumber,
    url: trimmed,
  };
}
