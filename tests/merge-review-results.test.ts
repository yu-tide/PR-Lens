import { describe, it, expect } from "vitest";
import { mergeReviewResults } from "../src/services/review/mergeReviewResults";
import type { ReviewResult, RuleCheckResult } from "../src/types";

// ---------------------------------------------------------------
// 辅助
// ---------------------------------------------------------------

function aiRisk(overrides: Record<string, unknown> = {}) {
  return {
    id: overrides.id as string ?? "ai-1",
    level: (overrides.level as "HIGH" | "MEDIUM" | "LOW") ?? "MEDIUM",
    title: (overrides.title as string) ?? "AI 风险",
    file: (overrides.file as string) ?? "src/app/page.tsx",
    reason: (overrides.reason as string) ?? "AI 发现的问题",
    suggestion: (overrides.suggestion as string) ?? "AI 建议修复",
    requiresHumanCheck: (overrides.requiresHumanCheck as boolean) ?? false,
  };
}

function reviewResult(risks: ReturnType<typeof aiRisk>[] = []): ReviewResult {
  return { summary: "测试摘要", risks, suggestions: [] };
}

function ruleCheck(overrides: Partial<RuleCheckResult> = {}): RuleCheckResult {
  return {
    id: overrides.id ?? "rule-1",
    title: overrides.title ?? "规则发现",
    message: overrides.message ?? "规则命中",
    severity: overrides.severity ?? "medium",
    file: overrides.file ?? "src/app/page.tsx",
    line: overrides.line,
  };
}

// ---------------------------------------------------------------
// 基础合并
// ---------------------------------------------------------------

describe("基础合并", () => {
  it("空输入 → 空输出", () => {
    expect(mergeReviewResults(reviewResult([]), [])).toEqual([]);
  });

  it("只有 AI 风险 → 全部保留", () => {
    const result = mergeReviewResults(reviewResult([
      aiRisk({ id: "ai-1", level: "HIGH", file: "a.ts" }),
      aiRisk({ id: "ai-2", level: "MEDIUM", file: "b.ts" }),
    ]), []);
    expect(result).toHaveLength(2);
    expect(result.map(r => r.source)).toEqual(["ai", "ai"]);
  });

  it("只有规则风险 → 全部保留", () => {
    const result = mergeReviewResults(reviewResult([]), [
      ruleCheck({ id: "r1", severity: "high", file: "a.ts" }),
      ruleCheck({ id: "r2", severity: "medium", file: "b.ts" }),
    ]);
    expect(result).toHaveLength(2);
    expect(result.map(r => r.source)).toEqual(["rule", "rule"]);
  });
});

// ---------------------------------------------------------------
// 同 key 合并（同文件 + 同 topic → 合并。topic 由关键词检测）
// ---------------------------------------------------------------

describe("同 key 合并", () => {
  // reason 含 "鉴权"、message 含 "鉴权" → 都命中 topic="auth" → 同 key 合并
  it("AI HIGH + 规则 HIGH 同文件同 topic → 合并为 ai_and_rule", () => {
    const result = mergeReviewResults(
      reviewResult([aiRisk({ id: "ai-1", level: "HIGH", file: "src/auth.ts", reason: "鉴权/权限变更可能引入安全漏洞" })]),
      [ruleCheck({ id: "r1", severity: "high", file: "src/auth.ts", message: "鉴权/权限相关变更" })],
    );
    expect(result).toHaveLength(1);
    expect(result[0].source).toBe("ai_and_rule");
    expect(result[0].level).toBe("HIGH");
  });

  it("AI MEDIUM + 规则 HIGH 同文件同 topic → pickHigherLevel = HIGH", () => {
    const result = mergeReviewResults(
      reviewResult([aiRisk({ id: "ai-1", level: "MEDIUM", file: "src/auth.ts", reason: "鉴权变更需要确认" })]),
      [ruleCheck({ id: "r1", severity: "high", file: "src/auth.ts", message: "鉴权/权限相关变更" })],
    );
    expect(result).toHaveLength(1);
    expect(result[0].level).toBe("HIGH");
    expect(result[0].source).toBe("ai_and_rule");
  });

  it("AI HIGH + 规则 MEDIUM 同文件同 topic → 保持 HIGH", () => {
    const result = mergeReviewResults(
      reviewResult([aiRisk({ id: "ai-1", level: "HIGH", file: "src/a.ts", reason: "Token 校验问题" })]),
      [ruleCheck({ id: "r1", severity: "medium", file: "src/a.ts", message: "鉴权/权限相关变更" })],
    );
    expect(result).toHaveLength(1);
    expect(result[0].level).toBe("HIGH");
  });

  it("AI LOW + 规则 LOW 同文件同 topic → 保持 LOW", () => {
    const result = mergeReviewResults(
      reviewResult([aiRisk({ id: "ai-1", level: "LOW", file: "src/config.ts", reason: "配置调整" })]),
      [ruleCheck({ id: "r1", severity: "low", file: "src/config.ts", message: "配置相关修改" })],
    );
    expect(result).toHaveLength(1);
    expect(result[0].level).toBe("LOW");
  });
});

// ---------------------------------------------------------------
// 不同 key 各自独立
// ---------------------------------------------------------------

describe("不同 key 各自独立", () => {
  it("不同文件 → 不合并，各自保留（HIGH 优先于 MEDIUM）", () => {
    const result = mergeReviewResults(
      reviewResult([aiRisk({ id: "ai-1", level: "HIGH", file: "src/a.ts" })]),
      [ruleCheck({ id: "r1", severity: "medium", file: "src/b.ts" })],
    );
    expect(result).toHaveLength(2);
    // HIGH 排前面，MEDIUM 排后面
    expect(result[0].level).toBe("HIGH");
    expect(result[1].level).toBe("MEDIUM");
  });

  it("同文件不同 topic → 不合并", () => {
    const result = mergeReviewResults(
      reviewResult([aiRisk({ id: "ai-1", level: "HIGH", file: "src/a.ts", reason: "安全漏洞需要修复" })]),
      [ruleCheck({ id: "r1", severity: "low", file: "src/a.ts", message: "依赖文件变更" })],
    );
    // 安全 vs 依赖 → topic 不同 → 不合并
    expect(result).toHaveLength(2);
  });
});

// ---------------------------------------------------------------
// 排序
// ---------------------------------------------------------------

describe("排序", () => {
  it("按 level 降序排列：HIGH → MEDIUM → LOW", () => {
    const result = mergeReviewResults(
      reviewResult([
        aiRisk({ id: "ai-l", level: "LOW", file: "low.ts" }),
        aiRisk({ id: "ai-h", level: "HIGH", file: "high.ts" }),
        aiRisk({ id: "ai-m", level: "MEDIUM", file: "mid.ts" }),
      ]),
      [],
    );
    expect(result.map(r => r.level)).toEqual(["HIGH", "MEDIUM", "LOW"]);
  });

  it("同 level 按 source 排列：ai_and_rule → rule → ai", () => {
    const result = mergeReviewResults(
      reviewResult([
        aiRisk({ id: "ai1", level: "MEDIUM", file: "a.ts", reason: "依赖版本升级" }),
      ]),
      [
        ruleCheck({ id: "r1", severity: "medium", file: "a.ts", message: "依赖文件变更" }),
        ruleCheck({ id: "r2", severity: "medium", file: "b.ts" }),
      ],
    );
    // a.ts: ai+rule 同 topic "dependency" → ai_and_rule
    expect(result[0].source).toBe("ai_and_rule");
    expect(result[1].source).toBe("rule");
  });
});

// ---------------------------------------------------------------
// 文件路径归一化
// ---------------------------------------------------------------

describe("文件路径归一化", () => {
  it("反斜杠归一化为正斜杠 → 视为同文件合并", () => {
    const result = mergeReviewResults(
      reviewResult([aiRisk({ id: "ai-1", level: "HIGH", file: "src\\app\\auth.ts", reason: "鉴权变更" })]),
      [ruleCheck({ id: "r1", severity: "high", file: "src/app/auth.ts", message: "鉴权/权限相关变更" })],
    );
    // 路径归一化后相同 + 同 topic="auth" → 合并
    expect(result).toHaveLength(1);
    expect(result[0].source).toBe("ai_and_rule");
  });

  it("空 file 兜底为 '全局'", () => {
    // normalizeFile(undefined) → "全局"
    const result = mergeReviewResults(
      reviewResult([{
        id: "ai-1", level: "MEDIUM" as const, title: "t", file: undefined as unknown as string,
        reason: "r", suggestion: "s", requiresHumanCheck: false,
      }]),
      [],
    );
    expect(result[0].file).toBe("全局");
  });
});

// ---------------------------------------------------------------
// 确定性验证
// ---------------------------------------------------------------

describe("确定性", () => {
  it("相同输入跑 10 次得相同输出", () => {
    const review = reviewResult([
      aiRisk({ id: "ai-1", level: "HIGH", file: "src/auth.ts", reason: "鉴权变更可能带来安全风险" }),
      aiRisk({ id: "ai-2", level: "MEDIUM", file: "src/db.ts", reason: "新增外部数据库调用" }),
    ]);
    const rules: RuleCheckResult[] = [
      ruleCheck({ id: "r1", severity: "high", file: "src/auth.ts", message: "鉴权/权限相关变更" }),
      ruleCheck({ id: "r2", severity: "medium", file: "src/other.ts", message: "依赖文件变更" }),
    ];

    const results = Array.from({ length: 10 }, () => mergeReviewResults(review, rules));
    const hashes = results.map(r => JSON.stringify(r));
    expect(new Set(hashes).size).toBe(1);
  });
});
