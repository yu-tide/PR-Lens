// ============================================================
// PR Lens — 规则预检查模块（主入口）
// ============================================================

import type { ChangedFile, RuleCheckResult } from "@/types";
import {
  checkDependencyFile,
  checkConfigFile,
  checkAuthPermission,
  checkHardcodedSecret,
  checkLargeDeletion,
  checkExternalCall,
  checkDiffAvailability,
} from "./riskRuleDefinitions";

// ============================================================
// 规则编排
// ============================================================

/** severity 排序权重 */
const SEVERITY_ORDER: Record<string, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

/** 所有规则（按执行顺序排列） */
const ALL_RULES = [
  checkDependencyFile,
  checkConfigFile,
  checkAuthPermission,
  checkHardcodedSecret,
  checkLargeDeletion,
  checkExternalCall,
  checkDiffAvailability,
];

/**
 * 对变更文件列表执行所有规则预检查。
 *
 * @param changedFiles - PR 变更文件列表（可为空数组）
 * @returns 规则命中的结果列表，按 severity 降序排列（high → medium → low）
 */
export function runRiskRules(
  changedFiles: ChangedFile[],
): RuleCheckResult[] {
  /* 空输入 → 空输出 */
  if (!changedFiles || changedFiles.length === 0) {
    return [];
  }

  const results: RuleCheckResult[] = [];
  const seen = new Set<string>();

  for (const file of changedFiles) {
    /* 跳过 filename 缺失或异常的文件 */
    if (!file.filename || typeof file.filename !== "string") {
      continue;
    }

    for (const rule of ALL_RULES) {
      try {
        const result = rule(file);
        if (result && !seen.has(result.id)) {
          seen.add(result.id);
          results.push(result);
        }
      } catch {
        /* 规则执行异常时静默跳过，不影响其他规则 */
      }
    }
  }

  /* 按 severity 排序：high → medium → low（同 severity 保持规则执行顺序） */
  results.sort(
    (a, b) =>
      (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3),
  );

  if (results.length > 0) {
    const bySeverity: Record<string, number> = {};
    for (const r of results) {
      bySeverity[r.severity] = (bySeverity[r.severity] ?? 0) + 1;
    }
    const summary = Object.entries(bySeverity)
      .map(([k, v]) => `${k}=${v}`)
      .join(", ");
    console.log(`  [risk] rules done — ${results.length} hits (${summary})`);
  } else {
    console.log("  [risk] rules done — 0 hits");
  }

  return results;
}
