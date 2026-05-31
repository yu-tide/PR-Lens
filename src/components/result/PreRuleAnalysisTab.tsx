"use client";

import { useState } from "react";
import type { RuleCheckResult } from "@/types";
import { PriorityBadge } from "@/components/result/PriorityBadge";
import { CodeLocationLink } from "@/components/CodeLocationLink";
import { getRiskLabel, normalizeRiskLevel } from "@/utils/review-helpers";

// ── 左侧规则列表项 ──────────────────────────────────────

function RuleListItem({ rule, selected, onClick }: { rule: RuleCheckResult; selected: boolean; onClick: () => void }) {
  const level = normalizeRiskLevel(rule.severity);
  const levelColors = {
    high: "border-red-200 bg-red-50 text-red-700",
    medium: "border-amber-200 bg-amber-50 text-amber-700",
    low: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };

  return (
    <button type="button" onClick={onClick} className={`w-full rounded-2xl border p-3.5 text-left transition shadow-sm ${selected ? "border-blue-400 bg-blue-50 shadow-md shadow-blue-100" : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <PriorityBadge level={level} label={getRiskLabel(level)} />
        <h3 className="text-sm font-semibold text-slate-950">{rule.title}</h3>
      </div>
      {rule.file && <p className="mt-1.5 break-all font-mono text-[11px] font-medium text-slate-500">{rule.file}</p>}
      <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-slate-500">{rule.message}</p>
    </button>
  );
}

// ── 右侧详情 ──────────────────────────────────────────

function RuleDetail({ rule }: { rule: RuleCheckResult }) {
  const level = normalizeRiskLevel(rule.severity);
  const conclusion = getConclusion(rule, level);
  const impacts = getImpacts(rule, level);

  return (
    <div className="space-y-4">
      {/* 规则结论 */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
          规则结论
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">{conclusion}</p>
      </section>

      {/* 命中依据 */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          命中依据
        </h3>
        <div className="mt-2 space-y-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-xs font-medium text-slate-500">检测到的行为</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">{rule.message}</p>
          </div>
          {rule.file && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs font-medium text-slate-500">命中文件</p>
              <div className="mt-1">
                <CodeLocationLink filePath={rule.file} lineNumber={rule.line} />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 潜在影响 */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
          潜在影响
        </h3>
        <ul className="mt-2 space-y-1.5">
          {impacts.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm leading-6 text-slate-600">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-300" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* 建议动作 */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          建议动作
        </h3>
        <ul className="mt-2 space-y-1.5">
          {getActions(rule, level).map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm leading-6 text-slate-600">
              <span className="mt-1.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[10px] font-semibold text-emerald-600">{i + 1}</span>
              {item}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

// ── 规则内容生成器 ──────────────────────────────────────

function getConclusion(rule: RuleCheckResult, level: string): string {
  const map: Record<string, string> = {
    "依赖文件变更": `该文件命中了"${rule.title}"规则。依赖文件的变更可能引入新的版本、依赖冲突或安全漏洞，${
      level === "high" ? "属于高风险变更，必须人工审核确认。" : level === "medium" ? "建议仔细检查变更内容的兼容性和必要性。" : "通常风险较低，但仍需留意变更是否会影响构建或运行时行为。"}`,
    "配置文件变更": `该文件命中了"${rule.title}"规则。配置文件变更可能影响部署环境、运行参数或服务行为，${level === "high" ? "可能造成线上配置异常，需要重点确认。" : "建议确认变更后的配置在生产环境中是否达到预期效果。"}`,
    "鉴权/权限相关变更": `该文件命中了"${rule.title}"规则。鉴权和权限相关代码是系统的安全边界，${level === "high" ? "任何错误都可能导致未授权访问或权限提升，必须由安全 reviewer 确认。" : "变更可能影响认证或授权流程，建议补充安全测试。"}`,
    "疑似硬编码敏感信息": `该文件命中了"${rule.title}"规则。变更内容中检测到潜在的敏感信息关键词，${level === "high" ? "如果确认为真实密钥或凭证泄露，属于严重安全事件。" : "需要人工确认是否为误报，切勿将真实密钥提交到仓库。"}`,
    "大量代码删除": `该文件命中了"${rule.title}"规则。大量代码的删除可能影响现有功能、移除关键逻辑或留下未引用的死代码引用，${level === "high" ? "需要确认删除的代码是否包含核心业务逻辑。" : "建议确认删除范围是否合理，相关引用是否已清理。"}`,
    "新增外部调用": `该文件命中了"${rule.title}"规则。新增的外部调用可能引入新的依赖方、网络延迟和故障点，${level === "high" ? "需要重点确认调用的安全性、超时策略和降级方案。" : "建议确认外部调用的可靠性和错误处理。"}`,
    "Diff 不可完整获取": `该文件命中了"${rule.title}"规则。无法获取完整的 diff 内容进行自动化分析，${level === "high" ? "这意味着高风险代码可能被遗漏，必须人工审查。" : "建议人工确认该文件的变更内容。"}`,
  };
  return map[rule.title] ?? `该文件命中了"${rule.title}"规则，建议人工确认该变更是否会对功能、安全性或发布稳定性产生影响。`;
}

function getImpacts(rule: RuleCheckResult, _level: string): string[] {
  const map: Record<string, string[]> = {
    "依赖文件变更": ["依赖版本兼容性", "构建与打包流程", "第三方库安全性", "项目运行时依赖树"],
    "配置文件变更": ["部署环境变量", "服务启动参数", "运行环境行为", "与其他配置项的联动"],
    "鉴权/权限相关变更": ["用户认证流程", "权限校验逻辑", "会话管理", "API 访问控制"],
    "疑似硬编码敏感信息": ["密钥泄露风险", "仓库安全合规", "生产环境凭证安全"],
    "大量代码删除": ["现有功能完整性", "死代码引用", "模块间耦合", "回归测试覆盖"],
    "新增外部调用": ["网络请求稳定性", "超时与重试机制", "第三方服务可用性", "错误降级处理"],
    "Diff 不可完整获取": ["自动化审查完整性", "潜在的高风险遗漏", "二进制文件安全性"],
  };
  return map[rule.title] ?? ["代码质量", "功能稳定性", "安全性", "可维护性"];
}

function getActions(rule: RuleCheckResult, _level: string): string[] {
  const map: Record<string, string[]> = {
    "依赖文件变更": ["检查新增依赖的来源可信度和社区活跃度", "确认版本号是否为稳定版本而非预发布版", "运行 npm audit 或同等检查确认无已知漏洞", "验证本地构建和测试均通过"],
    "配置文件变更": ["确认配置项在开发 / 预发布 / 生产环境的值是否一致", "检查是否引入了硬编码的敏感信息", "验证配置变更后服务正常启动"],
    "鉴权/权限相关变更": ["Review 所有新增和修改的鉴权逻辑分支", "补充鉴权失败场景的单元测试", "确认错误返回信息不会泄露内部细节"],
    "疑似硬编码敏感信息": ["立即确认是否为真实密钥", "如果是真实密钥，立即轮换并在代码中替换为环境变量", "检查 commit 历史确认密钥是否已存在于仓库中"],
    "大量代码删除": ["确认删除的代码是否仍有引用方", "检查是否有依赖该代码的测试用例需要同步清理", "验证删除后项目编译和测试均通过"],
    "新增外部调用": ["确认外部 API/服务的 SLA 和可用性", "检查是否设置了合理的超时和重试策略", "补充外部调用失败时的降级和兜底逻辑", "验证错误处理是否正确覆盖所有异常分支"],
    "Diff 不可完整获取": ["直接查看 GitHub 上该文件的完整 diff", "如果文件过大，分模块逐段审查", "确认二进制文件的变更是否需要额外关注"],
  };
  return map[rule.title] ?? ["人工审查该文件变更", "确认变更对系统的影响范围"];
}

// ── 主组件 ─────────────────────────────────────────────

type Props = { ruleCheckResults: RuleCheckResult[] };

export function PreRuleAnalysisTab({ ruleCheckResults }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = ruleCheckResults.find((r) => r.id === selectedId) ?? ruleCheckResults[0] ?? null;

  if (ruleCheckResults.length === 0) {
    return (
      <section className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-300">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none"><path d="M9 12h6M12 9v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          </div>
          <p className="mt-4 text-sm font-medium text-slate-600">暂无预规则命中</p>
          <p className="mt-1 text-xs text-slate-400">当前变更未触发明显的预审查规则，可继续查看风险分析和审查建议。</p>
        </div>
      </section>
    );
  }

  return (
    <section className="flex h-full min-h-0 gap-4">
      {/* 左侧规则列表 */}
      <div className="w-[320px] shrink-0 space-y-3 overflow-auto pr-1">
        {ruleCheckResults.map((rule) => (
          <RuleListItem key={rule.id} rule={rule} selected={selected?.id === rule.id} onClick={() => setSelectedId(rule.id)} />
        ))}
      </div>

      {/* 右侧规则详情 */}
      <div className="min-w-0 flex-1 overflow-auto pr-1">
        {selected && <RuleDetail rule={selected} />}
      </div>
    </section>
  );
}
