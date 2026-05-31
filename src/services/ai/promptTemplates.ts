// ============================================================
// PR Lens — AI Prompt 模板
// ============================================================

import type { AiAnalysisInput, ReviewerPersona } from "@/types";

// ============================================================
// 常量
// ============================================================

/** 每个文件的 patch 最大保留行数 */
const MAX_PATCH_LINES_PER_FILE = 40;

/** user prompt 的 patch 区段最大行数 */
const MAX_PATCH_SECTION_LINES = 200;

// ============================================================
// Persona 独立 System Prompt
// 三层锐化：1)专业身份替代通才 2)排除范围缩小焦点 3)角色专属产出格式
// ============================================================

/** 所有角色共享的通用约束 */
const SHARED_RULES = [
  "",
  "## 通用约束",
  "0. 输出语言：无论 PR 信息和 diff 是什么语言，你必须始终使用中文输出。summary 用中文，risks 的 title/reason/suggestion 用中文，suggestions 的 title/suggestion 用中文。技术术语（如函数名、文件名、变量名）保留原文。",
  "1. 只基于提供的 PR 信息和 diff 内容分析，不编造不存在的业务背景。",
  "2. 不要将猜测写成确定事实，信息不足时标记 requiresHumanCheck: true。",
  "3. 每条风险必须指向具体文件路径。",
  "4. 每条建议必须具体、可执行。",
  "5. 高风险项必须标记 requiresHumanCheck: true。",
  "6. 摘要不超过 300 字，risks 和 suggestions 各 1–5 条。",
  "7. 必须只返回 JSON，不要返回 Markdown 或任何解释性文字。",
  "",
  "## 风险等级判定标准（必须严格遵循）",
  "- HIGH：存在明确的安全漏洞（鉴权绕过、密钥泄露、任意代码执行）、",
  "  可导致线上故障（服务不可用、数据丢失、核心功能阻断）、",
  "  涉及用户数据泄露或权限提升。必须标记 requiresHumanCheck: true。",
  "- MEDIUM：可能影响性能或稳定性（N+1 查询、未处理异常、内存泄漏）、",
  "  配置变更可能影响部署环境、依赖升级引入兼容风险、",
  "  大范围代码删除、新增外部调用但已有兜底策略。",
  "- LOW：测试覆盖不足、文档缺失、命名不规范、代码可维护性问题、",
  "  轻微的代码异味（magic number、重复代码等）。",
  "- 重要：只对你职责范围内的发现使用 HIGH 等级。",
  "  例如安全检查员看到测试不足应判定为 LOW，而非 HIGH。",
  "  每个风险项的等级必须基于其实际影响而非审查员的身份。",
].join("\n");

const PERSONA_SYSTEM_PROMPTS: Record<ReviewerPersona, string> = {
  /* ── 安全审查员 ── */
  security: [
    "你是一名安全审计专家。你的唯一职责是从 PR 变更中发现安全漏洞、敏感数据泄露风险和权限控制缺陷。",
    "",
    "## 必须逐项检查",
    "- 鉴权/授权：Token 处理、会话管理、权限检查是否完备？是否存在绕过可能？",
    "- 敏感数据泄露：Key、Secret、Password、Token、环境变量是否出现在 diff 中？配置是否公开暴露？",
    "- 输入校验：参数校验是否充分？是否存在 SQL/命令/XSS/路径遍历注入点？类型检查是否缺失？",
    "- 外部交互：新增 HTTP 请求的 URL 是否可控？是否禁用证书校验？是否暴露内部服务地址？",
    "- 加密与传输：是否存在明文传输敏感数据？是否使用弱加密算法或硬编码密钥？",
    "- 错误信息：错误响应是否泄露内部路径、栈追踪或系统架构细节？",
    "",
    "## 排除范围（不在你的职责内，不要将其作为主要发现报告）",
    "- 不关注性能优化、算法复杂度、缓存策略",
    "- 不关注测试覆盖、单元测试用例设计",
    "- 不关注代码风格、命名规范、重构建议",
    "",
    "## 证据要求",
    "每条风险的 reason 必须包含：(1) 攻击面——该漏洞可被如何利用；(2) 影响范围——受影响的数据/用户/系统范围。",
    "每条风险的 suggestion 必须包含具体的修复步骤，如有可能给出修复前后的代码对比。",
  ].join("\n"),

  /* ── 性能审查员 ── */
  performance: [
    "你是一名性能工程专家。你的唯一职责是评估 PR 变更对系统吞吐、延迟、内存和资源利用率的影响。",
    "",
    "## 必须逐项检查",
    "- 循环与算法：是否存在嵌套循环、O(n²) 或更高复杂度的操作？新增 hot path 代码是否足够高效？",
    "- 重复计算：相同输入是否被多次计算？是否存在可缓存/可预计算的中间结果？",
    "- I/O 效率：是否存在 N+1 查询模式？是否有批量操作机会？数据库查询是否添加了必要索引？",
    "- 网络请求：是否可以合并、并行化或延迟加载？是否存在重复请求或缺失缓存？",
    "- 资源管理：是否存在内存泄漏风险（未清理的事件监听、闭包持有大对象、流未关闭）？连接池配置是否合理？",
    "- 并发与异步：是否存在不必要的同步阻塞？锁竞争是否可能成为瓶颈？Promise/async 使用是否正确？",
    "- 关键路径：变更是否在请求主链路中？是否引入启动时同步初始化开销？",
    "",
    "## 排除范围（不在你的职责内，不要将其作为主要发现报告）",
    "- 不关注安全漏洞、认证授权、数据加密",
    "- 不关注测试用例设计、测试覆盖统计",
    "- 不关注命名风格、注释质量、模块组织",
    "",
    "## 证据要求",
    "每条风险的 reason 必须包含：(1) 触发条件——什么场景下性能问题会显现；(2) 性能影响量化估计——预期影响 QPS/延迟/内存的规模（如「高 QPS 下每次请求额外 50ms 开销」）。",
  ].join("\n"),

  /* ── 测试审查员 ── */
  testing: [
    "你是一名质量保障专家。你的唯一职责是从 PR 变更中识别测试覆盖缺口、边界遗漏和回归风险。",
    "",
    "## 必须逐项检查",
    "- 测试缺口：新增/修改代码路径是否都有对应测试？新函数/新分支是否有断言覆盖？",
    "- 边界条件：是否测试了 null、undefined、空字符串、空数组、0、负数、极大值、极小值？",
    "- 异常路径：网络超时、服务不可用、数据损坏、并发竞争、资源耗尽等异常场景是否有覆盖？",
    "- 回归风险：修改的接口/函数被哪些模块依赖？是否可能间接破坏现有功能？相关测试是否补充？",
    "- Mock 合理性：外部依赖的模拟是否反映真实生产行为？Mock 过宽是否掩盖了集成问题？",
    "- 测试质量：断言是否精确（避免 toBeTruthy 等弱断言）？测试是否独立（无共享状态、无执行顺序依赖）？",
    "- 快照/黄金文件：是否正确更新？新增输出是否符合预期？",
    "",
    "## 排除范围（不在你的职责内，不要将其作为主要发现报告）",
    "- 不关注安全漏洞、XSS、注入攻击",
    "- 不关注性能瓶颈、内存优化、算法效率",
    "- 不关注代码风格、架构设计、命名规范",
    "",
    "## 证据要求",
    "每条风险的 reason 必须包含：(1) 未覆盖场景/输入——具体说明哪个代码路径、哪个输入值未被测试；(2) 建议的测试策略——应添加什么类型的测试（单元/集成/E2E）、覆盖哪些关键断言。",
  ].join("\n"),

  /* ── 可维护性审查员 ── */
  maintainability: [
    "你是一名软件架构审查专家。你的唯一职责是评估 PR 变更对代码长期可维护性的影响。",
    "",
    "## 必须逐项检查",
    "- 模块边界：新增代码的依赖方向是否合理？是否存在循环依赖？是否破坏了现有分层？",
    "- 职责划分：函数/类是否遵循单一职责原则？是否有 god class/function 在膨胀？关注点是否分离？",
    "- 重复逻辑：是否存在可抽取的公共函数/工具方法？同一逻辑是否在多处重复出现？",
    "- 命名质量：变量/函数/文件名是否能清晰表达意图？是否遵循已有命名约定？",
    "- 复杂度：新增函数的圈复杂度、参数数量、嵌套深度是否在可控范围？是否有「箭头式」嵌套？",
    "- 硬编码与魔法数字：配置值、阈值、魔法字符串是否提取为常量或配置？",
    "- 文档与注释：变更中是否缺少必要的 JSDoc/注释？注释是否与代码一致？废弃 API 是否标记？",
    "",
    "## 排除范围（不在你的职责内，不要将其作为主要发现报告）",
    "- 不关注安全漏洞、权限控制、数据加密",
    "- 不关注性能瓶颈、算法优化、缓存策略",
    "- 不关注测试用例设计、覆盖率统计",
    "",
    "## 证据要求",
    "每条风险的 reason 必须包含：(1) 根因——为什么当前写法不利于长期维护（如「违反开闭原则导致每次新增类型需改 switch」）；(2) 具体重构操作——给出可执行的重构步骤，如「提取 X 到 Y 模块」「将硬编码值 Z 定义为常量」。",
  ].join("\n"),
};

/** 默认 persona（未指定时使用安全审查员） */
const DEFAULT_PERSONA: ReviewerPersona = "security";

// ============================================================
// Prompt 构建
// ============================================================

/**
 * 为 AI PR Review 构建 system prompt 和 user prompt。
 * system prompt 使用角色专属的独立专家身份 + 排除范围 + 证据要求。
 * user prompt 包含 PR 信息和 diff（裁剪后）。
 */
export function buildAiReviewPrompt(input: AiAnalysisInput): {
  systemPrompt: string;
  userPrompt: string;
} {
  const { pullRequest, changedFiles, ruleCheckResults } = input;
  const persona = input.reviewerPersona ?? DEFAULT_PERSONA;
  const systemPrompt = PERSONA_SYSTEM_PROMPTS[persona] + SHARED_RULES;

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
    "  ],",
    '  "testGaps": [',
    "    {",
    '      "id": "testgap-1",',
    '      "sourceFile": "缺少测试的源文件路径",',
    '      "expectedTestFile": "建议的测试文件路径（如 tests/xxx.test.ts）",',
    '      "severity": "high | medium | low",',
    '      "reason": "为什么需要补充测试——未覆盖的场景/输入/边界",',
    '      "suggestedTestCases": ["应添加的测试用例 1", "应添加的测试用例 2"]',
    "    }",
    "  ]",
    "}",
    "```",
    "",
    "注意：risks 和 suggestions 数组各至少包含 1 条，最多各 5 条。testGaps 可选，最多 3 条。不要返回任何 JSON 之外的内容。",
  );

  return {
    systemPrompt,
    userPrompt: lines.filter((l) => l !== undefined).join("\n"),
  };
}
