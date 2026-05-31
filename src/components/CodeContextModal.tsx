"use client";

import { useEffect, useState } from "react";
import { CloseIcon, FileIcon, SpinnerIcon } from "@/components/icons";
import { useCodeContext } from "@/hooks/useCodeContext";
import type { CodeContextResponse, CodeContextLine } from "@/app/api/code-context/route";

// ============================================================
// CodeContextModal — 从 GitHub API 获取代码上下文并展示
// ============================================================

const DEFAULT_CONTEXT = 10;

function LoadingView() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <SpinnerIcon className="h-8 w-8 text-blue-500" />
      <p className="text-sm text-slate-500">正在从 GitHub 获取代码上下文...</p>
    </div>
  );
}

function NoPrContextView() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-100 bg-amber-50 text-amber-400">
        <FileIcon className="h-5 w-5" />
      </div>
      <p className="text-sm font-medium text-amber-700">无法获取代码上下文</p>
      <p className="text-xs text-slate-400">当前为 Mock 模式或无 PR 仓库信息，代码上下文不可用。</p>
      <p className="text-xs text-slate-400">请使用真实的 GitHub PR 链接进行分析。</p>
    </div>
  );
}

function ErrorView({ code, message }: { code?: string; message: string }) {
  const hints: Record<string, { title: string; detail: string }> = {
    NO_GITHUB_TOKEN: {
      title: "未配置 GitHub Token",
      detail: "服务端未配置 GITHUB_TOKEN 环境变量，无法访问 GitHub API。请联系管理员配置。",
    },
    FILE_NOT_FOUND: {
      title: "GitHub 仓库中找不到该文件",
      detail: "该文件可能已被删除、重命名，或不在当前 PR 的 head commit 中。",
    },
    RATE_LIMITED: {
      title: "GitHub API 请求频率限制",
      detail: "请求次数已达上限，请稍后重试。",
    },
    ACCESS_DENIED: {
      title: "权限不足",
      detail: "没有 GitHub Token 或 Token 权限不足，无法访问该仓库。可能是私有仓库。",
    },
    GITHUB_TIMEOUT: {
      title: "GitHub API 请求超时",
      detail: "请求 GitHub API 超时，请检查网络连接后重试。",
    },
    GITHUB_API_ERROR: {
      title: "GitHub API 请求失败",
      detail: message,
    },
    MISSING_PARAMS: {
      title: "请求参数缺失",
      detail: message,
    },
  };

  const hint = code ? hints[code] : null;

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-100 bg-red-50 text-red-400">
        <CloseIcon className="h-5 w-5" />
      </div>
      <p className="text-sm font-medium text-red-600">
        {hint?.title ?? "获取代码上下文失败"}
      </p>
      <p className="max-w-sm text-center text-xs text-slate-400">
        {hint?.detail ?? message}
      </p>
    </div>
  );
}

function CodeLinesView({
  filePath,
  targetLine,
  startLine,
  endLine,
  lines,
  warning,
}: {
  filePath: string;
  targetLine: number;
  startLine: number;
  endLine: number;
  lines: CodeContextLine[];
  warning?: string;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-auto overscroll-contain">
      {warning && (
        <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-700">
          {warning}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950">
        {/* ── 文件头部 ── */}
        <div className="flex items-center gap-2 border-b border-slate-700 bg-slate-900 px-4 py-2.5">
          <FileIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <p className="min-w-0 break-all font-mono text-xs text-slate-300">{filePath}</p>
        </div>

        {/* ── 代码行 ── */}
        <div className="overflow-auto">
          <table className="w-full border-collapse">
            <tbody>
              {lines.map((line) => (
                <tr
                  key={line.lineNumber}
                  className={
                    line.isTarget
                      ? "bg-blue-500/15 ring-1 ring-inset ring-blue-400/30"
                      : "hover:bg-slate-800/50"
                  }
                >
                  {/* 行号 */}
                  <td
                    className={`sticky left-0 select-none px-3 py-px text-right font-mono text-xs tabular-nums ${
                      line.isTarget
                        ? "bg-blue-500/20 text-blue-300 font-semibold"
                        : "bg-slate-900 text-slate-500"
                    }`}
                    style={{ minWidth: "3.5rem" }}
                  >
                    {line.lineNumber}
                  </td>

                  {/* 代码内容 */}
                  <td className="px-3 py-px">
                    <pre
                      className={`font-mono text-xs leading-6 whitespace-pre ${
                        line.isTarget ? "text-blue-200" : "text-slate-200"
                      }`}
                    ><code>{line.content || " "}</code></pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 底部信息 ── */}
      <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
        <span>
          第{" "}
          <span className="font-semibold text-slate-600">{startLine}</span>{" "}
          至{" "}
          <span className="font-semibold text-slate-600">{endLine}</span>{" "}
          行（共 {lines.length} 行）
        </span>
        <span>
          目标行：<span className="font-semibold text-blue-600">L{targetLine}</span>
        </span>
      </div>
    </div>
  );
}

export function CodeContextModal() {
  const { open, filePath, lineNumber, prContext, closeCodeContext } = useCodeContext();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | undefined>();
  const [data, setData] = useState<CodeContextResponse | null>(null);

  useEffect(() => {
    if (!open || !filePath) return;

    // 没有 PR 上下文（mock 模式）时直接显示提示
    if (!prContext) {
      setLoading(false);
      setError(null);
      setErrorCode(undefined);
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);
    setErrorCode(undefined);
    setData(null);

    const targetLine = lineNumber > 0 ? lineNumber : 1;
    const params = new URLSearchParams({
      owner: prContext.owner,
      repo: prContext.repo,
      ref: prContext.ref,
      file: filePath,
      line: String(targetLine),
      context: String(DEFAULT_CONTEXT),
    });

    fetch(`/api/code-context?${params.toString()}`)
      .then(async (res) => {
        const json = (await res.json()) as CodeContextResponse;
        if (!res.ok || !json.success) {
          setError(json.error ?? `请求失败 (${res.status})`);
          setErrorCode(json.errorCode);
        } else {
          setData(json);
        }
      })
      .catch(() => {
        setError("网络请求失败，请检查网络连接后重试。");
        setErrorCode("NETWORK_ERROR");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [open, filePath, lineNumber, prContext]);

  // ── ESC 关闭 ──
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCodeContext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, closeCodeContext]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center px-4 py-6">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-md"
        onClick={closeCodeContext}
      />

      <section className="relative z-10 flex max-h-[85vh] w-full max-w-[840px] flex-col overflow-hidden rounded-[28px] border border-white/60 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.35)]">
        {/* ── Header ── */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-600 shadow-sm">
                <FileIcon className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                  代码上下文
                </h2>
                <p className="mt-1 max-w-md truncate font-mono text-sm text-slate-500">
                  {prContext ? `${prContext.owner}/${prContext.repo} · ` : ""}
                  {filePath}
                  {lineNumber > 0 ? ` · 第 ${lineNumber} 行` : ""}
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={closeCodeContext}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
            aria-label="关闭弹窗"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="min-h-0 flex-1 overflow-auto p-5">
          {!prContext && <NoPrContextView />}
          {prContext && loading && <LoadingView />}
          {prContext && !loading && error && (
            <ErrorView code={errorCode} message={error} />
          )}
          {prContext && !loading && !error && data?.lines && data.lines.length > 0 && (
            <CodeLinesView
              filePath={data.filePath ?? filePath}
              targetLine={data.targetLine ?? lineNumber}
              startLine={data.startLine ?? 0}
              endLine={data.endLine ?? 0}
              lines={data.lines}
              warning={data.error}
            />
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex shrink-0 justify-end border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={closeCodeContext}
            className="inline-flex h-10 items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-700"
          >
            关闭
          </button>
        </div>
      </section>
    </div>
  );
}
