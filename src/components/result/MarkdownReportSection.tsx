"use client";

type MarkdownReportSectionProps = {
  markdownReport: string;
  copyStatus: "idle" | "success" | "error";
  onCopy: () => void;
  onDownload: () => void;
};

export function MarkdownReportSection({
  markdownReport,
  copyStatus,
  onCopy,
  onDownload,
}: MarkdownReportSectionProps) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white/95 p-6 shadow-xl shadow-slate-200/70">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none">
              <path
                d="M7 3h7l4 4v14H7V3Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
              <path
                d="M14 3v5h5M9 13h6M9 17h4"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <h2 className="text-lg font-semibold tracking-tight text-slate-950">
            Markdown 审查报告预览
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onCopy}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-600"
          >
            {copyStatus === "success" ? "已复制" : "复制 Markdown"}
          </button>
          <button
            onClick={onDownload}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3.5 text-xs font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-700"
          >
            下载 Markdown
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
        <div className="grid grid-cols-[44px_1fr] text-xs leading-6">
          {markdownReport.split("\n").map((line, index) => (
            <div key={index} className="contents">
              <div className="border-r border-slate-200 bg-white/60 px-3 text-right font-mono text-slate-400">
                {index + 1}
              </div>
              <div className="px-4 font-mono text-slate-700">{line}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
