// ============================================================
// PR Lens — AI Prompt 模板
// ============================================================

import type { AiAnalysisInput } from "@/types";

// ============================================================
// 常量
// ============================================================

/** 每个文件的 patch 最大保留行数 */
const MAX_PATCH_LINES_PER_FILE = 40;

/** user prompt 的 patch 区段最大行数 */
const MAX_PATCH_SECTION_LINES = 200;

// ============================================================
// Prompt 构建
// ============================================================

/**
 * 为 AI PR Review 构建 system prompt 和 user prompt。
 * user prompt 会限制每个文件的 patch 长度，防止超出模型上下文。
 */
export function buildAiReviewPrompt(input: AiAnalysisInput): {
  systemPrompt: string;
  userPrompt: string;
} {
  const { pullRequest, changedFiles, ruleCheckResults } = input;

  /* ── system prompt ── */
  const systemPrompt = [
    "你是一位资深代码审查助手。你的任务是基于提供的 PR 信息和代码变更，生成一份结构化的代码审查报告。",
    "",
    "要求：",
    "1. 只基于提供的 PR 信息和 diff 内容分析，不编造不存在的业务背景。",
    "2. 不要把猜测写成确定事实。",
    "3. 每条风险必须指向具体文件。",
    "4. 每条建议必须具体、可执行。",
    "5. 高风险项必须标记 requiresHumanCheck: true。",
    "6. 信息不足时标记 requiresHumanCheck: true。",
    "7. 必须只返回 JSON，不要返回 Markdown 或任何解释性文字。",
  ].join("\n");

  /* ── user prompt ── */
  const lines: string[] = [];

  /* PR 基本信息 */
  lines.push(
    "## PR 基本信息",
    `标题：${pullRequest.title}`,
    `仓库：${pullRequest.repository ?? `${pullRequest.owner ?? ""}/${pullRequest.repo ?? ""}`}`,
    `PR 编号：#${pullRequest.pullNumber ?? "N/A"}`,
    `作者：${pullRequest.author}`,
    `源分支：${pullRequest.headBranch ?? "N/A"} → 目标分支：${pullRequest.baseBranch ?? "N/A"}`,
    `变更文件数：${pullRequest.changedFiles}｜+${pullRequest.additions} −${pullRequest.deletions}`,
    pullRequest.description
      ? `PR 描述：${pullRequest.description}`
      : "",
    "",
  );

  /* 变更文件摘要 */
  lines.push("## 变更文件列表");
  for (const file of changedFiles) {
    const flags: string[] = [];
    if (file.isBinary) flags.push("[二进制]");
    if (file.isTooLarge) flags.push("[超大文件-已裁剪]");
    const flag = flags.length > 0 ? " " + flags.join("") : "";

    lines.push(
      `- ${file.filename}（${file.status}｜+${file.additions} −${file.deletions}）${flag}`,
    );
  }
  lines.push("");

  /* Patch 内容（裁剪） */
  lines.push("## 变更 Diff（每文件最多展示部分内容）");

  let patchLinesSoFar = 0;
  const patchLimitReached = false;

  for (const file of changedFiles) {
    if (patchLimitReached) break;
    if (!file.patch || file.isBinary) continue;

    const patchLines = file.patch.split("\n");
    const top = patchLines.slice(0, MAX_PATCH_LINES_PER_FILE);

    lines.push(`### ${file.filename}`);
    lines.push("```diff");
    lines.push(top.join("\n"));
    if (patchLines.length > MAX_PATCH_LINES_PER_FILE) {
      lines.push(`... 共 ${patchLines.length} 行，仅展示前 ${MAX_PATCH_LINES_PER_FILE} 行`);
    }
    lines.push("```");
    lines.push("");

    patchLinesSoFar += top.length;
    if (patchLinesSoFar >= MAX_PATCH_SECTION_LINES) break;
  }

  /* 规则预检查结果 */
  if (ruleCheckResults.length > 0) {
    lines.push("## 规则预检查命中的风险");
    for (const r of ruleCheckResults) {
      lines.push(
        `- [${r.severity.toUpperCase()}] ${r.title} — ${r.file ?? "未知文件"}`,
      );
      lines.push(`  ${r.message}`);
    }
    lines.push("");
  } else {
    lines.push("## 规则预检查");
    lines.push("未命中任何预定义规则。");
    lines.push("");
  }

  /* 输出要求 */
  lines.push(
    "## 输出要求",
    "请基于以上信息生成审查报告，以 JSON 格式返回，结构如下：",
    "```json",
    "{",
    '  "summary": "string（PR 变更摘要，不超过 300 字）",',
    '  "risks": [',
    "    {",
    '      "id": "risk-1",',
    '      "level": "HIGH | MEDIUM | LOW",',
    '      "title": "风险标题",',
    '      "file": "关联文件路径",',
    '      "reason": "风险原因说明",',
    '      "suggestion": "建议处理方式",',
    '      "requiresHumanCheck": true',
    "    }",
    "  ],",
    '  "suggestions": [',
    "    {",
    '      "id": "suggestion-1",',
    '      "title": "建议标题",',
    '      "category": "Correctness | Security | Maintainability | Testing | Documentation",',
    '      "suggestion": "具体可执行的建议"',
    "    }",
    "  ]",
    "}",
    "```",
    "",
    "注意：risks 和 suggestions 数组各至少包含 1 条，最多各 5 条。不要返回任何 JSON 之外的内容。",
  );

  return {
    systemPrompt,
    userPrompt: lines.filter((l) => l !== undefined).join("\n"),
  };
}
