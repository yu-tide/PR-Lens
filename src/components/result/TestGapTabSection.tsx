"use client";

import { useState } from "react";
import type { TestGapDisplay } from "@/types";
import { CheckIcon, BeakerIcon } from "@/components/icons";
import { PriorityBadge } from "@/components/result/PriorityBadge";
import { getRiskLabel } from "@/utils/review-helpers";

// ── 左侧列表卡片 ────────────────────────────────────────

function GapListItem({ gap, selected, onClick }: { gap: TestGapDisplay; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`w-full rounded-2xl border p-4 text-left transition shadow-sm ${selected ? "border-blue-400 bg-blue-50 shadow-md shadow-blue-100" : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <PriorityBadge level={gap.severity} label={getRiskLabel(gap.severity)} />
        <p className="text-sm font-semibold text-slate-950">{gap.sourceFile.split("/").pop()}</p>
        {gap.source === "ai" ? (
          <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-600 ring-1 ring-purple-200"></span>
        ) : (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 ring-1 ring-slate-200">📋 规则推断</span>
        )}
      </div>
      <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{gap.reason}</p>
    </button>
  );
}

// ── 右侧详情 ──────────────────────────────────────────

function GapDetail({ gap }: { gap: TestGapDisplay }) {
  return (
    <div className="space-y-4">
      {/* 1. 发现的问题 */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800">发现的问题</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">{gap.reason || "暂无详细说明"}</p>
      </section>

      {/* 2. 影响范围 */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800">影响范围</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {getImpactDescription(gap)}
        </p>
      </section>

      {/* 3. 涉及文件与代码位置 */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800">涉及文件与代码位置</h3>
        <div className="mt-2 space-y-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-xs font-medium text-slate-500">源文件</p>
            <p className="break-all font-mono text-xs font-bold text-slate-800">{gap.sourceFile}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-xs font-medium text-slate-500">建议测试文件</p>
            <p className="mt-1 break-all font-mono text-xs font-bold text-slate-800">{gap.expectedTestFile}</p>
          </div>
        </div>
      </section>

      {/* 4. 建议测试文件 */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800">建议测试文件</h3>
        <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="break-all font-mono text-sm font-bold text-slate-800">{gap.expectedTestFile}</p>
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          建议在该文件中添加对应测试用例以覆盖此测试缺口。
        </p>
      </section>

      {/* 5. 建议测试用例 */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800">建议测试用例</h3>
        {gap.suggestedTestCases.length > 0 ? (
          <div className="mt-2 overflow-hidden rounded-xl border border-slate-200">
            {gap.suggestedTestCases.map((item, i) => (
              <div key={i} className={`flex gap-3 px-4 py-3 ${i > 0 ? "border-t border-slate-100" : ""}`}>
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[11px] font-semibold text-slate-500">{i + 1}</span>
                <p className="text-sm leading-6 text-slate-600">{item}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-400">暂无建议测试用例</p>
        )}
      </section>
    </div>
  );
}

function getImpactDescription(gap: TestGapDisplay): string {
  if (gap.severity === "high") return "核心逻辑文件缺少对应测试覆盖，线上变更存在回归风险，可能导致关键功能异常未被及时发现。";
  if (gap.severity === "medium") return "该文件包含了重要的业务逻辑或中间件，缺少测试覆盖可能在中长期影响代码质量和重构效率。";
  return "该文件测试覆盖不足，虽然影响范围有限，但仍建议补充基础测试以减少未来维护成本。";
}

// ── 主组件 ─────────────────────────────────────────────

type Props = { gaps: TestGapDisplay[] };

export function TestGapTabSection({ gaps }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = gaps.find((g) => g.id === selectedId) ?? gaps[0] ?? null;

  if (gaps.length === 0) {
    return (
      <section className="flex h-full items-center justify-center">
        <div className="text-center">
          <BeakerIcon className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-4 text-sm font-medium text-slate-600">未检测到测试缺口</p>
          <p className="mt-1 text-xs text-slate-400">当前 PR 变更中未发现明显的测试覆盖缺失。</p>
          <p className="mt-3 text-xs text-slate-400">
            如需更详细的测试缺口检测，请使用
            <span className="mx-1 inline-block rounded-full bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-600 ring-1 ring-purple-200">🧪 测试审查员</span>
            角色重新分析。
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="flex h-full min-h-0 gap-4">
      {/* 左侧列表 */}
      <div className="w-[320px] shrink-0 overflow-auto pr-1 space-y-3">
        {gaps.map((gap) => (
          <GapListItem key={gap.id} gap={gap} selected={selected?.id === gap.id} onClick={() => setSelectedId(gap.id)} />
        ))}
      </div>

      {/* 右侧详情 */}
      <div className="min-w-0 flex-1 overflow-auto pr-1">
        {selected && <GapDetail gap={selected} />}
      </div>
    </section>
  );
}
