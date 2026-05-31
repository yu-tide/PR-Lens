"use client";

import { useCodeContext } from "@/hooks/useCodeContext";

// ============================================================
// CodeLocationLink — 可点击的文件路径+行号链接
// ============================================================

type CodeLocationLinkProps = {
  filePath: string;
  lineNumber?: number;
  /** 自定义显示文本，默认显示 filePath + 行号 */
  label?: string;
  className?: string;
};

export function CodeLocationLink({
  filePath,
  lineNumber,
  label,
  className = "",
}: CodeLocationLinkProps) {
  const { openCodeContext } = useCodeContext();

  const displayLabel =
    label ??
    `${filePath}${lineNumber ? ` · 第 ${lineNumber} 行` : ""}`;

  const handleClick = () => {
    openCodeContext({ filePath, lineNumber });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title={`点击查看源代码：${filePath}${lineNumber ? `#L${lineNumber}` : ""}`}
      className={`inline text-left font-mono text-xs font-medium text-slate-700 underline decoration-slate-300 underline-offset-2 transition hover:text-blue-600 hover:decoration-blue-300 ${className}`}
    >
      {displayLabel}
    </button>
  );
}
