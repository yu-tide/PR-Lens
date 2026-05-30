"use client";

type MarkdownViewerProps = {
  content: string;
};

export function MarkdownViewer({ content }: MarkdownViewerProps) {
  return (
    <div className="grid grid-cols-[44px_1fr] text-xs leading-6">
      {content.split("\n").map((line, index) => (
        <div key={`${line}-${index}`} className="contents">
          <div className="border-r border-slate-300 bg-white/80 px-3 text-right font-mono text-slate-400">
            {index + 1}
          </div>
          <div className="px-4 font-mono text-slate-700">{line}</div>
        </div>
      ))}
    </div>
  );
}
