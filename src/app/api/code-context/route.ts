import { NextRequest, NextResponse } from "next/server";
import { getFileContent, GitHubApiError } from "@/services/github/githubClient";

// ============================================================
// GET /api/code-context?owner=&repo=&ref=&file=&line=&context=
// ============================================================

export interface CodeContextLine {
  lineNumber: number;
  content: string;
  isTarget: boolean;
}

export interface CodeContextResponse {
  success: boolean;
  filePath?: string;
  targetLine?: number;
  startLine?: number;
  endLine?: number;
  lines?: CodeContextLine[];
  error?: string;
  errorCode?: string;
}

const MAX_CONTEXT = 50;
const DEFAULT_CONTEXT = 10;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const owner = searchParams.get("owner");
  const repo = searchParams.get("repo");
  const ref = searchParams.get("ref");
  const fileParam = searchParams.get("file");
  const lineParam = searchParams.get("line");
  const contextParam = searchParams.get("context");

  // ── 校验必填参数 ──
  if (!owner || !repo || !fileParam) {
    const missing: string[] = [];
    if (!owner) missing.push("owner");
    if (!repo) missing.push("repo");
    if (!fileParam) missing.push("file");

    return NextResponse.json<CodeContextResponse>(
      {
        success: false,
        error: `缺少必填参数：${missing.join(", ")}`,
        errorCode: "MISSING_PARAMS",
      },
      { status: 400 },
    );
  }

  // ── 校验 line 参数 ──
  const targetLine = lineParam ? parseInt(lineParam, 10) : 1;
  if (isNaN(targetLine) || targetLine < 1) {
    return NextResponse.json<CodeContextResponse>(
      {
        success: false,
        error: `无效的行号：${lineParam}`,
        errorCode: "INVALID_LINE",
      },
      { status: 400 },
    );
  }

  // ── 校验 context 参数 ──
  let contextLines = DEFAULT_CONTEXT;
  if (contextParam) {
    contextLines = parseInt(contextParam, 10);
    if (isNaN(contextLines) || contextLines < 0) {
      contextLines = DEFAULT_CONTEXT;
    }
    contextLines = Math.min(contextLines, MAX_CONTEXT);
  }

  // ── 通过 GitHub API 获取文件内容 ──
  try {
    const { content } = await getFileContent({
      owner,
      repo,
      path: fileParam,
      ref: ref ?? undefined,
    });

    const allLines = content.split("\n");
    const totalLines = allLines.length;

    // 行号超出文件范围 — 仍然返回文件内容上下文
    const clampedLine = Math.max(1, Math.min(targetLine, totalLines));

    const startLine = Math.max(1, clampedLine - contextLines);
    const endLine = Math.min(totalLines, clampedLine + contextLines);

    const lines: CodeContextLine[] = [];
    for (let i = startLine; i <= endLine; i++) {
      lines.push({
        lineNumber: i,
        content: allLines[i - 1],
        isTarget: i === targetLine && i === clampedLine,
      });
    }

    const warning =
      targetLine > totalLines
        ? `目标行 ${targetLine} 超出文件总行数 ${totalLines}，已回退到第 ${clampedLine} 行。`
        : undefined;

    return NextResponse.json<CodeContextResponse>({
      success: true,
      filePath: fileParam,
      targetLine,
      startLine,
      endLine,
      lines,
      error: warning,
    });
  } catch (err) {
    if (err instanceof GitHubApiError) {
      // 映射 GitHub 错误码到前端可识别的错误
      let errorCode = "GITHUB_API_ERROR";
      let status = 502;
      let message = err.message;

      switch (err.code) {
        case "GITHUB_TOKEN_MISSING":
          errorCode = "NO_GITHUB_TOKEN";
          status = 401;
          message = "未配置 GITHUB_TOKEN 环境变量，无法访问 GitHub API。";
          break;
        case "GITHUB_PR_NOT_FOUND":
          errorCode = "FILE_NOT_FOUND";
          status = 404;
          message = `文件不存在于 GitHub 仓库中：${fileParam}`;
          break;
        case "GITHUB_RATE_LIMIT":
          errorCode = "RATE_LIMITED";
          status = 429;
          message = "GitHub API 请求次数已达上限，请稍后重试。";
          break;
        case "GITHUB_TIMEOUT":
          errorCode = "GITHUB_TIMEOUT";
          status = 504;
          break;
        case "GITHUB_API_ERROR":
          if (err.status === 403) {
            errorCode = "ACCESS_DENIED";
            status = 403;
            message = "没有 GitHub Token 或权限不足，无法访问该仓库。";
          }
          break;
      }

      return NextResponse.json<CodeContextResponse>(
        {
          success: false,
          filePath: fileParam,
          error: message,
          errorCode,
        },
        { status },
      );
    }

    return NextResponse.json<CodeContextResponse>(
      {
        success: false,
        filePath: fileParam,
        error: `GitHub API 请求失败：${err instanceof Error ? err.message : String(err)}`,
        errorCode: "GITHUB_API_ERROR",
      },
      { status: 502 },
    );
  }
}
