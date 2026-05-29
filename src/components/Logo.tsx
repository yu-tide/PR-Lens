type LogoProps = {
  compact?: boolean;
};

export function Logo({ compact = false }: LogoProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25">
        <span className="text-lg font-bold text-white">&lt;/&gt;</span>
        <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-4 border-white bg-blue-500" />
      </div>

      {!compact && (
        <div>
          <div className="text-3xl font-semibold tracking-tight text-slate-950">
            PR Lens
          </div>
          <div className="mt-1 text-base text-slate-500">
            AI PR 代码审查助手
          </div>
        </div>
      )}
    </div>
  );
}