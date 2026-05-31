import { describe, it, expect } from "vitest";
import { parseAIOutput } from "../src/services/ai/parseAIOutput";

// ---------------------------------------------------------------
// JSON 提取
// ---------------------------------------------------------------

describe("JSON 提取", () => {
  it("纯 JSON 直接解析", () => {
    const result = parseAIOutput(JSON.stringify({
      summary: "测试摘要",
      risks: [{ id: "r1", level: "HIGH", title: "风险1", file: "a.ts", reason: "原因", suggestion: "建议", requiresHumanCheck: true }],
      suggestions: [{ id: "s1", title: "建议1", category: "Security", suggestion: "修一下" }],
    }));
    expect(result.summary).toBe("测试摘要");
    expect(result.risks).toHaveLength(1);
    expect(result.risks[0].level).toBe("HIGH");
    expect(result.suggestions).toHaveLength(1);
  });

  it("```json 代码块包裹正确提取", () => {
    const raw = "```json\n" + JSON.stringify({
      summary: "代码块包裹",
      risks: [{ id: "r1", level: "LOW", title: "小风险", file: "b.ts", reason: "不算严重", suggestion: "看着改" }],
      suggestions: [],
    }) + "\n```";
    const result = parseAIOutput(raw);
    expect(result.summary).toBe("代码块包裹");
    expect(result.risks[0].level).toBe("LOW");
  });

  it("``` 无 json 标记也能提取", () => {
    const raw = "```\n" + JSON.stringify({
      summary: "无标记",
      risks: [],
      suggestions: [],
    }) + "\n```";
    const result = parseAIOutput(raw);
    expect(result.summary).toBe("无标记");
  });

  it("JSON 前后有解释文字也能提取（AI 常见输出模式）", () => {
    const raw = '好的，以下是分析结果：\n{"summary":"前后有文字","risks":[],"suggestions":[]}\n请审阅。';
    const result = parseAIOutput(raw);
    expect(result.summary).toBe("前后有文字");
  });
});

// ---------------------------------------------------------------
// 字段 fallback
// ---------------------------------------------------------------

describe("字段 fallback", () => {
  it("缺少 summary → fallback 文案", () => {
    const result = parseAIOutput(JSON.stringify({ risks: [], suggestions: [] }));
    expect(result.summary).toBe("AI 分析未能生成有效摘要，请人工查看变更内容。");
  });

  it("缺少 risks → 空数组", () => {
    const result = parseAIOutput(JSON.stringify({ summary: "a", suggestions: [] }));
    expect(result.risks).toEqual([]);
  });

  it("缺少 suggestions → 空数组", () => {
    const result = parseAIOutput(JSON.stringify({ summary: "a", risks: [] }));
    expect(result.suggestions).toEqual([]);
  });

  it("risk 缺 id → 自动生成", () => {
    const result = parseAIOutput(JSON.stringify({
      summary: "a",
      risks: [{ level: "HIGH", title: "无ID", file: "x.ts", reason: "r", suggestion: "s" }],
      suggestions: [],
    }));
    expect(result.risks[0].id).toMatch(/ai-risk-\d+/);
  });

  it("risk 缺 title → fallback", () => {
    const result = parseAIOutput(JSON.stringify({
      summary: "a",
      risks: [{ level: "LOW", file: "x.ts", reason: "r", suggestion: "s" }],
      suggestions: [],
    }));
    expect(result.risks[0].title).toBe("风险 #1");
  });

  it("risk 缺 file → '未知文件'", () => {
    const result = parseAIOutput(JSON.stringify({
      summary: "a",
      risks: [{ level: "HIGH", title: "t", reason: "r", suggestion: "s" }],
      suggestions: [],
    }));
    expect(result.risks[0].file).toBe("未知文件");
  });

  it("risk 缺 reason → fallback", () => {
    const result = parseAIOutput(JSON.stringify({
      summary: "a",
      risks: [{ level: "MEDIUM", title: "t", file: "x.ts", suggestion: "s" }],
      suggestions: [],
    }));
    expect(result.risks[0].reason).toBe("未提供原因说明");
  });

  it("risk 缺 suggestion → fallback", () => {
    const result = parseAIOutput(JSON.stringify({
      summary: "a",
      risks: [{ level: "HIGH", title: "t", file: "x.ts", reason: "r" }],
      suggestions: [],
    }));
    expect(result.risks[0].suggestion).toBe("请人工审查");
  });

  it("suggestion 缺字段 → fallback", () => {
    const result = parseAIOutput(JSON.stringify({
      summary: "a",
      risks: [],
      suggestions: [{}],
    }));
    expect(result.suggestions[0].id).toMatch(/ai-suggestion-\d+/);
    expect(result.suggestions[0].title).toBe("建议 #1");
    expect(result.suggestions[0].category).toBe("Maintainability");
  });
});

// ---------------------------------------------------------------
// Level 兜底
// ---------------------------------------------------------------

describe("Level 兜底", () => {
  it("HIGH / MEDIUM / LOW 正常通过", () => {
    const result = parseAIOutput(JSON.stringify({
      summary: "a",
      risks: [
        { level: "HIGH", title: "h", file: "a", reason: "r", suggestion: "s" },
        { level: "MEDIUM", title: "m", file: "b", reason: "r", suggestion: "s" },
        { level: "LOW", title: "l", file: "c", reason: "r", suggestion: "s" },
      ],
      suggestions: [],
    }));
    expect(result.risks.map(r => r.level)).toEqual(["HIGH", "MEDIUM", "LOW"]);
  });

  it("level 为小写 → 大写标准化", () => {
    const result = parseAIOutput(JSON.stringify({
      summary: "a",
      risks: [{ level: "high", title: "t", file: "x", reason: "r", suggestion: "s" }],
      suggestions: [],
    }));
    expect(result.risks[0].level).toBe("HIGH");
  });

  it("level 为非标准值（如 'CRITICAL'）→ 兜底 MEDIUM", () => {
    const result = parseAIOutput(JSON.stringify({
      summary: "a",
      risks: [{ level: "CRITICAL", title: "t", file: "x", reason: "r", suggestion: "s" }],
      suggestions: [],
    }));
    expect(result.risks[0].level).toBe("MEDIUM");
  });

  it("level 缺失 → 兜底 MEDIUM", () => {
    const result = parseAIOutput(JSON.stringify({
      summary: "a",
      risks: [{ title: "t", file: "x", reason: "r", suggestion: "s" }],
      suggestions: [],
    }));
    expect(result.risks[0].level).toBe("MEDIUM");
  });

  it("没有 requiresHumanCheck 但 level=HIGH → 自动设为 true", () => {
    const result = parseAIOutput(JSON.stringify({
      summary: "a",
      risks: [{ level: "HIGH", title: "t", file: "x", reason: "r", suggestion: "s" }],
      suggestions: [],
    }));
    expect(result.risks[0].requiresHumanCheck).toBe(true);
  });

  it("没有 requiresHumanCheck 且 level=LOW → 不设 true", () => {
    const result = parseAIOutput(JSON.stringify({
      summary: "a",
      risks: [{ level: "LOW", title: "t", file: "x", reason: "r", suggestion: "s" }],
      suggestions: [],
    }));
    expect(result.risks[0].requiresHumanCheck).toBe(false);
  });

  it("category 非标准 → 兜底 Maintainability", () => {
    const result = parseAIOutput(JSON.stringify({
      summary: "a",
      risks: [],
      suggestions: [{ title: "s", category: "UNKNOWN_CATEGORY", suggestion: "x" }],
    }));
    expect(result.suggestions[0].category).toBe("Maintainability");
  });

  it("category 大小写容错", () => {
    const result = parseAIOutput(JSON.stringify({
      summary: "a",
      risks: [],
      suggestions: [
        { title: "a", category: "Correctness", suggestion: "x" },
        { title: "b", category: "security", suggestion: "x" },
        { title: "c", category: "MAINTAINABILITY", suggestion: "x" },
        { title: "d", category: "Testing", suggestion: "x" },
        { title: "e", category: "Documentation", suggestion: "x" },
      ],
    }));
    expect(result.suggestions.map(s => s.category)).toEqual([
      "Correctness", "Security", "Maintainability", "Testing", "Documentation",
    ]);
  });
});

// ---------------------------------------------------------------
// 异常输入
// ---------------------------------------------------------------

describe("异常输入", () => {
  it("完全非法 JSON → 抛异常", () => {
    expect(() => parseAIOutput("这不是合法的 JSON 也不是代码块")).toThrow();
  });

  it("非对象的 JSON（数组）→ 抛异常", () => {
    expect(() => parseAIOutput("[1,2,3]")).toThrow();
  });

  it("空字符串 → 抛异常", () => {
    expect(() => parseAIOutput("")).toThrow();
  });
});

// ---------------------------------------------------------------
// 确定性验证
// ---------------------------------------------------------------

describe("确定性", () => {
  it("相同输入跑 10 次得相同输出", () => {
    const input = JSON.stringify({
      summary: "确定性测试",
      risks: [
        { id: "r1", level: "HIGH", title: "风险1", file: "a.ts", reason: "严重", suggestion: "修" },
        { id: "r2", level: "MEDIUM", title: "风险2", file: "b.ts", reason: "中等", suggestion: "看看" },
      ],
      suggestions: [
        { id: "s1", title: "建议1", category: "Testing", suggestion: "加测试" },
      ],
    });

    const results = Array.from({ length: 10 }, () => parseAIOutput(input));
    const hashes = results.map(r => JSON.stringify(r));
    expect(new Set(hashes).size).toBe(1);
  });
});
