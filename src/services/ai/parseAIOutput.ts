// ============================================================
// PR Lens — AI 输出解析与清洗
// ============================================================

import type { AiTestGap, ReviewResult, ReviewRisk, ReviewSuggestion } from "@/types";

// ============================================================
// 类型守卫工具
// ============================================================

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

// ============================================================
// 解析入口
// ============================================================

/**
 * 解析 AI 返回的原始文本，提取并校验为 ReviewResult。
 *
 * 支持：
 * - 纯 JSON 字符串
 * - ```json ... ``` 包裹的代码块
 *
 * 缺失字段会做安全 fallback，确保返回值始终符合 ReviewResult 类型。
 */
export function parseAIOutput(content: string): ReviewResult {
  /* 提取 JSON 文本 */
  const jsonText = extractJsonText(content);

  /* 解析为 unknown */
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("AI 返回内容不是合法的 JSON 格式，请检查提示词或重试");
  }

  if (!isObject(parsed)) {
    throw new Error("AI 返回的 JSON 不是一个有效的对象");
  }

  /* 映射到 ReviewResult */
  return buildReviewResult(parsed);
}

// ============================================================
// 内部辅助
// ============================================================

/** 从 AI 原始输出中提取 JSON 文本 */
function extractJsonText(content: string): string {
  const trimmed = content.trim();

  /* 尝试匹配 ```json ... ``` 包裹 */
  const codeBlockMatch = trimmed.match(
    /```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/,
  );
  if (codeBlockMatch?.[1]) {
    return codeBlockMatch[1].trim();
  }

  /* 尝试匹配以 { 开头的纯 JSON */
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");

  if (start !== -1 && end !== -1 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  /* 无法提取，返回原文本让 JSON.parse 报错 */
  return trimmed;
}

/** 从 object 构建安全的 ReviewResult */
function buildReviewResult(obj: Record<string, unknown>): ReviewResult {
  return {
    summary: extractSummary(obj),
    risks: extractRisks(obj),
    suggestions: extractSuggestions(obj),
    testGaps: extractTestGaps(obj),
  };
}

function extractSummary(obj: Record<string, unknown>): string {
  const summary = obj.summary;
  if (isString(summary) && summary.trim().length > 0) {
    return summary.trim();
  }
  return "AI 分析未能生成有效摘要，请人工查看变更内容。";
}

function extractRisks(obj: Record<string, unknown>): ReviewRisk[] {
  const risks = obj.risks;
  if (!isArray(risks)) return [];

  return risks
    .filter(isObject)
    .map((r, index) => {
      const id = isString(r.id) && r.id.trim()
        ? r.id.trim()
        : `ai-risk-${index + 1}`;

      const level = sanitizeRiskLevel(r.level);

      const title = isString(r.title) && r.title.trim()
        ? r.title.trim()
        : `风险 #${index + 1}`;

      const file = isString(r.file)
        ? r.file.trim()
        : "未知文件";

      const reason = isString(r.reason) && r.reason.trim()
        ? r.reason.trim()
        : "未提供原因说明";

      const suggestion = isString(r.suggestion) && r.suggestion.trim()
        ? r.suggestion.trim()
        : "请人工审查";

      const requiresHumanCheck =
        level === "HIGH" || (r.requiresHumanCheck === true);

      return { id, level, title, file, reason, suggestion, requiresHumanCheck };
    });
}

function extractSuggestions(
  obj: Record<string, unknown>,
): ReviewSuggestion[] {
  const suggestions = obj.suggestions;
  if (!isArray(suggestions)) return [];

  return suggestions
    .filter(isObject)
    .map((s, index) => {
      const id = isString(s.id) && s.id.trim()
        ? s.id.trim()
        : `ai-suggestion-${index + 1}`;

      const title = isString(s.title) && s.title.trim()
        ? s.title.trim()
        : `建议 #${index + 1}`;

      const suggestion = isString(s.suggestion) && s.suggestion.trim()
        ? s.suggestion.trim()
        : "请人工审查";

      return {
        id,
        title,
        category: sanitizeCategory(s.category),
        suggestion,
      };
    });
}

function extractTestGaps(
  obj: Record<string, unknown>,
): AiTestGap[] | undefined {
  const testGaps = obj.testGaps;
  if (!isArray(testGaps) || testGaps.length === 0) return undefined;

  const gaps = testGaps
    .filter(isObject)
    .map((g, index) => {
      const id = isString(g.id) && g.id.trim()
        ? g.id.trim()
        : `ai-testgap-${index + 1}`;

      const sourceFile = isString(g.sourceFile)
        ? g.sourceFile.trim()
        : "未知文件";

      const expectedTestFile = isString(g.expectedTestFile)
        ? g.expectedTestFile.trim()
        : undefined;

      const severity = sanitizeRiskLevel(g.severity).toLowerCase() as "high" | "medium" | "low";

      const reason = isString(g.reason) && g.reason.trim()
        ? g.reason.trim()
        : "需要补充测试覆盖";

      const suggestedTestCases = isArray(g.suggestedTestCases)
        ? g.suggestedTestCases.filter(isString).map((s) => (s as string).trim())
        : [];

      return {
        id,
        sourceFile,
        expectedTestFile,
        severity,
        reason,
        suggestedTestCases,
      };
    });

  return gaps.length > 0 ? gaps : undefined;
}

/** 校验并标准化 risk level */
function sanitizeRiskLevel(
  level: unknown,
): "HIGH" | "MEDIUM" | "LOW" {
  if (isString(level)) {
    const upper = level.toUpperCase();
    if (upper === "HIGH" || upper === "MEDIUM" || upper === "LOW") {
      return upper;
    }
  }
  return "MEDIUM"; /* 默认中风险 */
}

/** 校验并标准化 category */
function sanitizeCategory(
  category: unknown,
): "Correctness" | "Security" | "Maintainability" | "Testing" | "Documentation" {
  if (isString(category)) {
    const lower = category.toLowerCase();
    if (lower.includes("correct") || lower === "correctness") return "Correctness";
    if (lower.includes("secur")) return "Security";
    if (lower.includes("maintain")) return "Maintainability";
    if (lower.includes("test")) return "Testing";
    if (lower.includes("doc")) return "Documentation";
  }
  return "Maintainability"; /* 默认 */
}
