"use client";

import { CloseIcon, FileIcon, FolderIcon } from "@/components/icons";

type ChangedFilesModalProps = {
  open: boolean;
  files: string[];
  onClose: () => void;
};

export function ChangedFilesModal({ open, files, onClose }: ChangedFilesModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-6">
      <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-md" onClick={onClose} />
      <section className="relative z-10 flex max-h-[82vh] w-full max-w-[680px] flex-col overflow-hidden rounded-[28px] border border-white/60 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.35)]">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-600 shadow-sm">
                <FolderIcon className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-950">变更文件列表</h2>
                <p className="mt-1 text-sm text-slate-500">共 {files.length} 个文件，建议按风险优先级逐项审查。</p>
              </div>
            </div>
          </div>
          <button type="button" onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
            aria-label="关闭弹窗">
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-4 overscroll-contain">
          <div className="space-y-2">
            {files.map((file, index) => (
              <article key={`${file}-${index}`}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 transition hover:border-blue-200 hover:bg-blue-50/70">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-xs font-semibold text-slate-500 shadow-sm ring-1 ring-slate-200">
                  {index + 1}
                </span>
                <FileIcon className="h-4.5 w-4.5 shrink-0 text-slate-500" />
                <p className="min-w-0 flex-1 break-all font-mono text-sm text-slate-700">{file}</p>
              </article>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 justify-end border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button type="button" onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-700">
            关闭
          </button>
        </div>
      </section>
    </div>
  );
}
