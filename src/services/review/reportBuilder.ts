// ============================================================
// PR Lens — Markdown 报告生成
// ============================================================

import type {
  ChangedFile,
  MergedReviewRisk,
  ReportBuilderInput,
  ReviewRisk,
} from "@/types";

// ============================================================
// 内部工具
// ============================================================

/** 转义表格中的 | 和换行，防止 Markdown 表格损坏 */
function escapeMarkdownTableCell(value: string): string {
  return value
    .replace(/\|/g, "\\|")
    .replace(/\n/g, " ")
    .replace(/\r/g, "");
}

function sourceLabel(source: string): string {
  if (source === "ai_and_rule") return "AI + 规则";
  if (source === "ai") return "AI";
  if (source === "rule") return "规则";
  return source;
}

function riskLevelLabel(level: string): string {
  if (level === "HIGH") return "🔴 高";
  if (level === "MEDIUM") return "🟡 中";
  if (level === "LOW") return "🟢 低";
  return level;
}

function fileStatusLabel(status: string): string {
  if (status === "added") return "新增";
  if (status === "removed") return "删除";
  if (status === "modified") return "修改";
  if (status === "renamed") return "重命名";
  return status;
}

function formatDate(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function changedFileNote(file: ChangedFile): string {
  if (file.isBinary) return "二进制或无 patch";
  if (file.isTooLarge) return "patch 已裁剪";
  return "-";
}

function makeRiskRow(risk: MergedReviewRisk | ReviewRisk): string {
  const level = riskLevelLabel(risk.level);
  const src =
    "source" in risk ? sourceLabel((risk as MergedReviewRisk).source) : "-";
  const file = escapeMarkdownTableCell(risk.file ?? "未知文件");
  const title = escapeMarkdownTableCell(risk.title);
  const suggestion = escapeMarkdownTableCell(
    risk.suggestion ?? "请人工审查",
  );
  const check =
    risk.requiresHumanCheck ?? risk.level === "HIGH" ? "⚠ 是" : "否";
  return `| ${level} | ${src} | ${file} | ${title} | ${suggestion} | ${check} |`;
}

// ============================================================
// Section 构建
// ============================================================

function buildHeader(input: ReportBuilderInput): string {
  const p = input.pullRequest;
  const dataSource = input.source === "mock" ? "Mock" : "GitHub";
  const aiSource = input.aiSource === "bailian" ? "bailian" : "mock";

  return [
    `# PR Review 报告：${p.title}`,
    "",
    `> 生成时间：${formatDate()}`,
    `> 数据来源：${dataSource}`,
    `> AI 来源：${aiSource}`,
    "",
  ].join("\n");
}

function buildPrInfo(input: ReportBuilderInput): string {
  const p = input.pullRequest;
  const url = p.url ?? "N/A";
  const branch =
    p.headBranch && p.baseBranch
      ? `${p.headBranch} → ${p.baseBranch}`
      : "N/A";

  return [
    "## 1. PR 基本信息",
    "",
    `| 项目 | 内容 |`,
    `| --- | --- |`,
    `| 仓库 | ${escapeMarkdownTableCell(p.repository)} |`,
    `| PR | #${p.pullNumber ?? "N/A"} |`,
    `| 作者 | ${escapeMarkdownTableCell(p.author)} |`,
    `| 分支 | ${escapeMarkdownTableCell(branch)} |`,
    `| 变更文件 | ${p.changedFiles} |`,
    `| 新增 / 删除 | +${p.additions} / −${p.deletions} |`,
    `| 链接 | [${escapeMarkdownTableCell(url)}](${url}) |`,
    "",
  ].join("\n");
}

function buildSummary(input: ReportBuilderInput): string {
  const summary = input.reviewResult.summary;
  return [
    "## 2. 变更摘要",
    "",
    summary && summary.trim()
      ? summary.trim()
      : "暂无 AI 摘要。",
    "",
  ].join("\n");
}

function buildChangedFiles(input: ReportBuilderInput): string {
  const files = input.changedFiles;
  const max = 20;
  const shown = files.slice(0, max);

  const lines = [
    "## 3. 重点变更文件",
    "",
    "| 文件 | 状态 | 新增 | 删除 | 说明 |",
    "| --- | --- | --- | --- | --- |",
  ];

  for (const f of shown) {
    lines.push(
      `| ${escapeMarkdownTableCell(f.filename)} | ${fileStatusLabel(f.status)} | +${f.additions} | −${f.deletions} | ${changedFileNote(f)} |`,
    );
  }

  if (files.length > max) {
    lines.push("");
    lines.push(
      `*仅展示前 ${max} 个文件，其余文件请在 GitHub PR 中查看。*`,
    );
  }

  lines.push("");
  return lines.join("\n");
}

function buildRisks(input: ReportBuilderInput): string {
  const lines = ["## 4. 风险列表", ""];
  const risks = input.mergedRisks ?? input.reviewResult.risks;

  if (!risks || risks.length === 0) {
    lines.push("未发现明显风险，但仍建议人工 Review。");
    lines.push("");
    return lines.join("\n");
  }

  lines.push("| 等级 | 来源 | 文件 | 风险 | 建议 | 人工确认 |");
  lines.push("| --- | --- | --- | --- | --- | --- |");

  for (const r of risks) {
    lines.push(makeRiskRow(r));
  }

  lines.push("");
  return lines.join("\n");
}

function buildRuleCheckResults(input: ReportBuilderInput): string {
  const lines = ["## 5. 规则预检查", ""];
  const rules = input.ruleCheckResults;

  if (!rules || rules.length === 0) {
    lines.push("未发现需要重点关注的基础规则风险。");
    lines.push("");
    return lines.join("\n");
  }

  for (const r of rules) {
    const sev =
      r.severity === "high"
        ? "高"
        : r.severity === "medium"
          ? "中"
          : "低";
    lines.push(
      `- **[${sev}] ${escapeMarkdownTableCell(r.title)}** — ${escapeMarkdownTableCell(r.file ?? "全局")}`,
    );
    lines.push(`  ${escapeMarkdownTableCell(r.message)}`);
    if (r.line) {
      lines.push(`  *第 ${r.line} 行*`);
    }
  }

  lines.push("");
  return lines.join("\n");
}

function buildSuggestions(input: ReportBuilderInput): string {
  const lines = ["## 6. Review 建议", ""];
  const suggestions = input.reviewResult.suggestions;

  if (!suggestions || suggestions.length === 0) {
    lines.push("暂无额外 Review 建议。");
    lines.push("");
    return lines.join("\n");
  }

  for (const s of suggestions) {
    const cat = s.category ?? "";
    lines.push(
      `- **${escapeMarkdownTableCell(s.title)}**（${escapeMarkdownTableCell(cat)}）：${escapeMarkdownTableCell(s.suggestion)}`,
    );
  }

  lines.push("");
  return lines.join("\n");
}

function buildHumanCheck(input: ReportBuilderInput): string {
  const lines = ["## 7. 需要人工确认的问题", ""];
  const risks = input.mergedRisks ?? [];
  const needCheck = risks.filter((r) => r.requiresHumanCheck);

  if (needCheck.length === 0) {
    lines.push("暂无明确需要人工确认的问题。");
    lines.push("");
    return lines.join("\n");
  }

  for (const r of needCheck) {
    lines.push(
      `- **${escapeMarkdownTableCell(r.title)}**（${escapeMarkdownTableCell(r.file ?? "未知文件")}）：${escapeMarkdownTableCell(r.reason)}`,
    );
  }

  lines.push("");
  return lines.join("\n");
}

function buildLimitations(input: ReportBuilderInput): string {
  const lines = [
    "## 8. 分析限制",
    "",
    "- 本报告基于公开 GitHub PR metadata、changed files 和 diff patch 生成。",
    "- 大文件 patch 可能已被裁剪。",
    "- AI Review 仅作为辅助参考，最终结论应由人工 Review 决定。",
  ];

  if (input.warning) {
    lines.push(`- ⚠️ 降级提示：${escapeMarkdownTableCell(input.warning)}`);
  }

  lines.push("");
  return lines.join("\n");
}

// ============================================================
// 主入口
// ============================================================

export function buildMarkdownReport(input: ReportBuilderInput): string {
  const sections = [
    buildHeader(input),
    buildPrInfo(input),
    buildSummary(input),
    buildChangedFiles(input),
    buildRisks(input),
    buildRuleCheckResults(input),
    buildSuggestions(input),
    buildHumanCheck(input),
    buildLimitations(input),
  ];

  return sections.join("\n") + "\n";
}
