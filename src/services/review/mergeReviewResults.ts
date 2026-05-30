// ============================================================
// PR Lens — 风险合并服务
// ============================================================

import type {
  MergedReviewRisk,
  ReviewResult,
  ReviewRisk,
  ReviewRiskSource,
  RiskLevel,
  RuleCheckResult,
  RuleCheckSeverity,
} from "@/types";

// ============================================================
// 内部工具
// ============================================================

const SEVERITY_TO_RISK_LEVEL: Record<RuleCheckSeverity, RiskLevel> = {
  low: "LOW",
  medium: "MEDIUM",
  high: "HIGH",
};

function mapSeverityToRiskLevel(severity: RuleCheckSeverity): RiskLevel {
  return SEVERITY_TO_RISK_LEVEL[severity];
}

function getRiskPriority(level: RiskLevel): number {
  if (level === "HIGH") return 0;
  if (level === "MEDIUM") return 1;
  return 2;
}

function getSourcePriority(source: ReviewRiskSource): number {
  if (source === "ai_and_rule") return 0;
  if (source === "rule") return 1;
  return 2;
}

function normalizeFile(file?: string): string {
  return (file ?? "全局").trim().replace(/\\/g, "/");
}

const TOPIC_KEYWORDS: Array<[string, string[]]> = [
  ["dependency", ["package", "lock", "dependency", "依赖", "go.mod", "pom.xml", "requirements", "cargo"]],
  ["config", ["config", "env", "配置", "setting", "docker", "workflow", "ci"]],
  ["auth", ["auth", "token", "permission", "session", "鉴权", "权限", "login", "oauth", "jwt"]],
  ["secret", ["secret", "key", "password", "密钥", "敏感", "api_key", "access_token", "private_key"]],
  ["deletion", ["delete", "删除", "大量删除", "大量移"]],
  ["external", ["fetch", "axios", "http", "external", "外部调用", "request", "query", "database"]],
  ["binary", ["binary", "二进制", "patch", "裁剪", "diff", "large"]],
];

function detectRiskTopic(text: string): string {
  const lower = text.toLowerCase();
  for (const [topic, keywords] of TOPIC_KEYWORDS) {
    if (keywords.some((kw) => lower.includes(kw))) return topic;
  }
  return "general";
}

function buildMergeKey(file: string, topic: string): string {
  return `${normalizeFile(file)}::${topic}`;
}

function pickHigherLevel(a: RiskLevel, b: RiskLevel): RiskLevel {
  if (a === "HIGH" || b === "HIGH") return "HIGH";
  if (a === "MEDIUM" || b === "MEDIUM") return "MEDIUM";
  return "LOW";
}

// ============================================================
// 转换函数
// ============================================================

function ruleToMergedRisk(rule: RuleCheckResult): MergedReviewRisk {
  return {
    id: `rule-${rule.id}`,
    level: mapSeverityToRiskLevel(rule.severity),
    title: rule.title,
    file: normalizeFile(rule.file),
    reason: rule.message,
    suggestion: "请人工确认该规则命中项是否会影响功能、安全性或发布稳定性。",
    requiresHumanCheck: rule.severity === "high",
    source: "rule",
    ruleIds: [rule.id],
    ruleMessages: [rule.message],
  };
}

function aiRiskToMergedRisk(risk: ReviewRisk): MergedReviewRisk {
  return {
    id: risk.id,
    level: risk.level,
    title: risk.title,
    file: normalizeFile(risk.file),
    reason: risk.reason,
    suggestion: risk.suggestion,
    requiresHumanCheck: risk.requiresHumanCheck,
    source: "ai",
    aiRiskIds: [risk.id],
  };
}

// ============================================================
// 主入口
// ============================================================

export function mergeReviewResults(
  reviewResult: ReviewResult,
  ruleCheckResults: RuleCheckResult[],
): MergedReviewRisk[] {
  const merged = new Map<string, MergedReviewRisk>();

  // 1. 规则风险先入池
  for (const rule of ruleCheckResults) {
    const key = buildMergeKey(normalizeFile(rule.file), detectRiskTopic(rule.message));
    merged.set(key, ruleToMergedRisk(rule));
  }

  // 2. AI 风险入池：同 key 则合并
  for (const ai of reviewResult.risks) {
    const key = buildMergeKey(normalizeFile(ai.file), detectRiskTopic(ai.reason));
    const existing = merged.get(key);

    if (existing) {
      // 合并
      existing.source = "ai_and_rule";
      existing.level = pickHigherLevel(existing.level, ai.level);
      existing.title = existing.title || ai.title;
      existing.reason = `${existing.reason} | AI: ${ai.reason}`;
      existing.suggestion = `${existing.suggestion} | AI: ${ai.suggestion}`;
      existing.aiRiskIds = [ai.id];
      existing.requiresHumanCheck =
        existing.requiresHumanCheck || ai.requiresHumanCheck || existing.level === "HIGH";
    } else {
      merged.set(key, aiRiskToMergedRisk(ai));
    }
  }

  // 3. 排序
  const result = Array.from(merged.values());
  result.sort((a, b) => {
    const pa = getRiskPriority(a.level);
    const pb = getRiskPriority(b.level);
    if (pa !== pb) return pa - pb;
    return getSourcePriority(a.source) - getSourcePriority(b.source);
  });

  return result;
}
