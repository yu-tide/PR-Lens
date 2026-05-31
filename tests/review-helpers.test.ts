import { describe, it, expect } from "vitest";
import {
  calculateRiskScore,
  calculateAnchoredRiskScore,
} from "../src/utils/review-helpers";
import type { RuleCheckResult } from "../src/types";

// ---------------------------------------------------------------
// 辅助：快速构造 RiskDisplay
// ---------------------------------------------------------------

function risk(
  level: "high" | "medium" | "low",
  label?: string,
) {
  return {
    level,
    label: label ?? (level === "high" ? "高风险" : level === "medium" ? "中风险" : "低风险"),
    title: "测试风险",
    description: "测试描述",
    suggestion: "测试建议",
  };
}

function rule(
  severity: "high" | "medium" | "low",
  id?: string,
): RuleCheckResult {
  return {
    id: id ?? `rule-${severity}-${Math.random()}`,
    title: "测试规则",
    message: "测试消息",
    severity,
    file: "src/test.ts",
  };
}

// ---------------------------------------------------------------
// calculateRiskScore
// ---------------------------------------------------------------

describe("calculateRiskScore", () => {
  it("空数组返回 18（保底分）", () => {
    expect(calculateRiskScore([])).toBe(18);
  });

  it("全 HIGH → 满分附近", () => {
    expect(calculateRiskScore([risk("high"), risk("high"), risk("high")])).toBe(100);
  });

  it("全 MEDIUM → 62", () => {
    expect(calculateRiskScore([risk("medium"), risk("medium")])).toBe(62);
  });

  it("全 LOW → 28", () => {
    expect(calculateRiskScore([risk("low"), risk("low"), risk("low")])).toBe(28);
  });

  it("1 HIGH + 2 MEDIUM", () => {
    const score = calculateRiskScore([risk("high"), risk("medium"), risk("medium")]);
    expect(score).toBe(81);
  });

  it("0 HIGH + 3 MEDIUM（模拟 AI 少判一条 HIGH 的情况）", () => {
    const score = calculateRiskScore([risk("medium"), risk("medium"), risk("medium")]);
    expect(score).toBe(62);
  });

  it("1H+2M 比 0H+3M 高 19 分（验证 AI 一条等级变化造成 ~20 分波动）", () => {
    const a = calculateRiskScore([risk("high"), risk("medium"), risk("medium")]);
    const b = calculateRiskScore([risk("medium"), risk("medium"), risk("medium")]);
    expect(a - b).toBe(19);
  });

  it("分数始终在 0-100 范围", () => {
    for (const items of [
      [risk("high")],
      [risk("medium")],
      [risk("low")],
      [risk("high"), risk("high"), risk("high"), risk("high"), risk("high")],
      [risk("low"), risk("low"), risk("low"), risk("low"), risk("low")],
      [risk("high"), risk("medium"), risk("low")],
    ]) {
      const s = calculateRiskScore(items);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    }
  });
});

// ---------------------------------------------------------------
// calculateAnchoredRiskScore
// ---------------------------------------------------------------

describe("calculateAnchoredRiskScore", () => {
  it("空规则时退化为纯 AI 分", () => {
    const aiRisks = [risk("high"), risk("medium")];
    const score = calculateAnchoredRiskScore(aiRisks, []);
    expect(score).toBe(calculateRiskScore(aiRisks));
  });

  it("规则全 HIGH + AI 全 LOW → 锚定分被规则拉高", () => {
    const aiRisks = [risk("low"), risk("low")];
    const rules = [rule("high"), rule("high")];
    const aiOnly = calculateRiskScore(aiRisks);   // 28
    const anchored = calculateAnchoredRiskScore(aiRisks, rules);
    expect(anchored).toBeGreaterThan(aiOnly);
    // 规则分=(100+100)/2=100, AI分=28, 锚定=100*0.3+28*0.7=49.6→50
    expect(anchored).toBe(50);
  });

  it("1H+2M vs 0H+3M 锚定后差距缩小", () => {
    // 模拟规则命中 1 HIGH + 2 MEDIUM（确定性）
    const rules: RuleCheckResult[] = [rule("high"), rule("medium"), rule("medium")];

    const a = calculateAnchoredRiskScore(
      [risk("high"), risk("medium"), risk("medium")],
      rules,
    );
    const b = calculateAnchoredRiskScore(
      [risk("medium"), risk("medium"), risk("medium")],
      rules,
    );

    // 纯 AI 差距 19 分，锚定后应 < 15 分
    const aiDiff = Math.abs(
      calculateRiskScore([risk("high"), risk("medium"), risk("medium")]) -
      calculateRiskScore([risk("medium"), risk("medium"), risk("medium")]),
    );
    expect(aiDiff).toBe(19);

    const anchoredDiff = Math.abs(a - b);
    expect(anchoredDiff).toBeLessThan(aiDiff);
    expect(anchoredDiff).toBe(13); // 81→77, 62→64, diff=13
  });

  it("确定性验证：相同输入必得相同输出", () => {
    const aiRisks = [risk("high"), risk("medium"), risk("low")];
    const rules: RuleCheckResult[] = [rule("high"), rule("medium")];

    const results = Array.from({ length: 10 }, () =>
      calculateAnchoredRiskScore(aiRisks, rules),
    );

    // 10 次调用全部相同
    expect(new Set(results).size).toBe(1);
  });

  it("确定性验证：calculateRiskScore 也是纯函数", () => {
    const items = [risk("high"), risk("medium"), risk("low")];
    const results = Array.from({ length: 10 }, () => calculateRiskScore(items));
    expect(new Set(results).size).toBe(1);
  });

  it("全 LOW 规则 + 全 LOW AI → 分数接近 28", () => {
    const aiRisks = [risk("low"), risk("low"), risk("low")];
    const rules: RuleCheckResult[] = [rule("low"), rule("low")];
    const score = calculateAnchoredRiskScore(aiRisks, rules);
    expect(score).toBe(28); // 规则分=(28+28)/2=28, AI分=28, 锚定=28
  });

  it("0 AI 风险 + 0 规则 → 返回 18（双重保底）", () => {
    const score = calculateAnchoredRiskScore([], []);
    expect(score).toBe(18); // 空 AI → 18, 空规则 → 退化到纯 AI 分
  });
});

