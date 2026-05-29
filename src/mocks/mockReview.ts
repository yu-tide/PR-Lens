import type { AnalysisStep, ReviewResult } from "@/types";

export const mockReview: ReviewResult = {
  summary:
    "该 PR 修改了鉴权 token 校验逻辑，影响 auth service、session middleware 和相关测试覆盖。整体方向合理，但 token 校验逻辑和 session 过期处理需要重点人工确认。",
  risks: [
    {
      id: "risk-1",
      level: "HIGH",
      title: "Token 校验逻辑变更需要人工确认",
      file: "src/services/auth.ts",
      reason:
        "该文件涉及核心鉴权逻辑，如果 token 解析、过期判断或签名校验出现问题，可能导致未授权访问或误拦截合法请求。",
      suggestion:
        "建议重点人工检查 token 校验分支，确认过期 token、无效 token 和缺失 token 的处理逻辑都符合预期。",
      requiresHumanCheck: true,
    },
    {
      id: "risk-2",
      level: "MEDIUM",
      title: "Session 过期处理需要补充边界测试",
      file: "src/middleware/session.ts",
      reason:
        "session 过期时间附近的边界情况可能导致用户状态异常，例如刚过期、即将过期或刷新 session 时行为不一致。",
      suggestion:
        "建议补充 session 过期边界测试，覆盖临界时间、刷新 token 和异常 session 状态。",
      requiresHumanCheck: false,
    },
  ],
  suggestions: [
    {
      id: "suggestion-1",
      category: "Correctness",
      title: "补充 token 校验失败场景",
      suggestion:
        "建议补充无效 token、过期 token、缺失 token 和格式错误 token 的单元测试。",
    },
    {
      id: "suggestion-2",
      category: "Security",
      title: "确认错误信息不会泄露敏感细节",
      suggestion:
        "建议检查鉴权失败时返回的错误信息，避免暴露 token 解析细节或内部校验规则。",
    },
    {
      id: "suggestion-3",
      category: "Testing",
      title: "增加 session middleware 集成测试",
      suggestion:
        "建议添加 middleware 层面的集成测试，确保请求链路中的鉴权状态和 session 状态一致。",
    },
  ],
};

export const analysisSteps: AnalysisStep[] = [
  {
    id: "parse-url",
    title: "解析 PR 链接",
    description: "校验 GitHub Pull Request 地址格式",
  },
  {
    id: "fetch-pr",
    title: "获取 PR 信息",
    description: "读取标题、作者、分支与提交记录",
  },
  {
    id: "fetch-files",
    title: "拉取变更文件",
    description: "获取新增、删除和修改的代码文件",
  },
  {
    id: "rule-check",
    title: "执行规则检查",
    description: "识别格式、风险和潜在变更影响",
  },
  {
    id: "ai-review",
    title: "AI 生成审查建议",
    description: "生成摘要、风险提示和 Review 建议",
  },
  {
    id: "report",
    title: "生成 Markdown 报告",
    description: "整理为可复制的 PR 审查报告",
  },
];