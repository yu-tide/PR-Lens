"use client";

import { CopyIcon } from "@/components/icons";
import { MarkdownViewer } from "@/components/result/MarkdownViewer";

type MarkdownTabSectionProps = {
  markdownReport: string;
  copyStatus: "idle" | "success" | "error";
  onCopy: () => void;
};

export function MarkdownTabSection({ markdownReport, copyStatus, onCopy }: MarkdownTabSectionProps) {
  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-slate-300 bg-slate-50 shadow-inner">
        <MarkdownViewer content={markdownReport} />
      </div>
      <div className="mt-3 shrink-0 flex items-center justify-between gap-3 border-t border-slate-200 bg-white/95 pt-3 backdrop-blur">
        <p className="text-xs font-medium text-slate-500">
          Markdown 报告共 {markdownReport.split("\n").length} 行，可直接复制到 PR 评论或项目文档。
        </p>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(15,23,42,0.22)] transition hover:-translate-y-0.5 hover:bg-slate-800"
        >
          <CopyIcon className="h-4 w-4" />
          {copyStatus === "success"
            ? "已复制 Markdown"
            : copyStatus === "error"
              ? "复制失败"
              : "复制 Markdown"}
        </button>
      </div>
    </section>
  );
}
