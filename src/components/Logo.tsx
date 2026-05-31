type LogoProps = {
  compact?: boolean;
};

export function Logo({ compact = false }: LogoProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-lg font-bold text-white shadow-lg shadow-blue-500/25">✦<span className="absolute -right-1 -bottom-1 h-4 w-4 rounded-full border-2 border-white bg-blue-400" />
      </div>

      {!compact && (
        <div>
          <div className="text-3xl font-bold tracking-[-0.04em] text-slate-950">
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