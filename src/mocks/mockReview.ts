import type { AnalysisStep, ReviewResult, ReviewerPersona } from "@/types";

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

// ============================================================
// Persona Mock 数据（Demo 场景，不同角色展示不同审查视角）
// ============================================================

const mockReviewPerformance: ReviewResult = {
  summary:
    "该 PR 修改了鉴权 token 校验逻辑与 session 中间件。性能审查视角下，主要关注鉴权链路的额外开销、重复计算和缓存优化空间。",
  risks: [
    {
      id: "risk-1",
      level: "HIGH",
      title: "每次请求重复解析 Token 可能造成不必要的 CPU 开销",
      file: "src/services/auth.ts",
      reason:
        "token 解析在高 QPS 场景下可能成为性能瓶颈，尤其当 JWT 签名算法较复杂（如 RS256）时。若未做解析结果缓存，每次请求都需完整解析。",
      suggestion:
        "建议在请求上下文中缓存 token 解析结果，或考虑使用更轻量的签名算法。高流量接口建议压测 token 解析平均耗时。",
      requiresHumanCheck: true,
    },
    {
      id: "risk-2",
      level: "MEDIUM",
      title: "Session 中间件同步阻塞可能影响请求吞吐",
      file: "src/middleware/session.ts",
      reason:
        "session 读取路径若为同步 I/O（如本地文件或同步 Redis 调用），将阻塞事件循环，影响并发请求处理能力。",
      suggestion:
        "建议评估 session 读写的平均延迟，确认是否已使用异步 API。若使用 Redis，检查连接池配置是否合理。",
      requiresHumanCheck: false,
    },
  ],
  suggestions: [
    {
      id: "suggestion-1",
      category: "Correctness",
      title: "为 token 解析添加性能基准测试",
      suggestion:
        "建议编写 benchmark 测试，对比不同 token 长度和签名算法下的解析耗时，设定性能回归阈值。",
    },
    {
      id: "suggestion-2",
      category: "Maintainability",
      title: "评估 Redis/缓存连接池大小",
      suggestion:
        "检查 session store 的连接池配置是否匹配预期 QPS，避免连接等待成为瓶颈。",
    },
    {
      id: "suggestion-3",
      category: "Testing",
      title: "补充高并发场景集成测试",
      suggestion:
        "建议添加并发请求测试，模拟 100+ 并发下鉴权链路的表现，关注 p95/p99 延迟。",
    },
  ],
};

const mockReviewTesting: ReviewResult = {
  summary:
    "该 PR 修改了鉴权 token 校验逻辑与 session 中间件。测试审查视角下，主要关注新增/修改代码的测试覆盖、边界条件和回归风险。",
  risks: [
    {
      id: "risk-1",
      level: "HIGH",
      title: "Token 校验缺少异常路径测试",
      file: "src/services/auth.ts",
      reason:
        "当前代码变更未附带对应的测试用例，无法确认以下场景是否覆盖：token 格式错误、签名不匹配、token 过期/即将过期、并发请求中的 token 刷新竞态。",
      suggestion:
        "建议至少补充 6 个测试用例覆盖上述场景，并确保每个分支都有断言。",
      requiresHumanCheck: true,
    },
    {
      id: "risk-2",
      level: "MEDIUM",
      title: "Session 过期边界未覆盖 ±1 时间窗口",
      file: "src/middleware/session.ts",
      reason:
        "session 过期逻辑的边界条件（精确过期时刻、过期前 1 秒、过期后 1 秒）通常是最容易出 bug 的地方，当前未见相关测试。",
      suggestion:
        "建议添加时间边界测试：使用模拟时钟精确控制 session TTL，验证过期前后行为。",
      requiresHumanCheck: false,
    },
  ],
  suggestions: [
    {
      id: "suggestion-1",
      category: "Testing",
      title: "补充 token 校验的单元测试矩阵",
      suggestion:
        "覆盖：有效 token、过期 token、格式错误 token、空 token、伪造签名 token、不同算法 token。",
    },
    {
      id: "suggestion-2",
      category: "Testing",
      title: "添加 session 中间件的集成测试",
      suggestion:
        "模拟完整请求链路，验证 session 创建、读取、过期、刷新和并发访问的一致性和正确性。",
    },
    {
      id: "suggestion-3",
      category: "Testing",
      title: "评估回归影响面并添加冒烟测试",
      suggestion:
        "建议识别所有依赖 session/auth 的接口，添加关键路径冒烟测试，确保本次变更不破坏现有功能。",
    },
  ],
};

const mockReviewMaintainability: ReviewResult = {
  summary:
    "该 PR 修改了鉴权 token 校验逻辑与 session 中间件。可维护性审查视角下，主要关注代码结构、职责划分和长期可读性。",
  risks: [
    {
      id: "risk-1",
      level: "HIGH",
      title: "auth.ts 职责过重，token 解析与业务逻辑耦合",
      file: "src/services/auth.ts",
      reason:
        "该文件同时包含了 token 解析、签名校验、过期判断、用户信息提取等多种职责，单一函数过大，后续修改风险高。",
      suggestion:
        "建议将 token 解析、校验、用户信息提取拆分为独立模块。token 解析可抽取为 src/services/auth/tokenParser.ts。",
      requiresHumanCheck: true,
    },
    {
      id: "risk-2",
      level: "MEDIUM",
      title: "Session 中间件命名不够表意，魔法数字较多",
      file: "src/middleware/session.ts",
      reason:
        "session 过期时间、刷新阈值等使用硬编码数值，缺少命名常量，不利于后续调整和理解。",
      suggestion:
        "建议将魔法数字提取为命名常量（如 SESSION_TTL_MS、REFRESH_THRESHOLD_MS），并添加注释说明取值依据。",
      requiresHumanCheck: false,
    },
  ],
  suggestions: [
    {
      id: "suggestion-1",
      category: "Maintainability",
      title: "重构 auth 模块为单一职责子模块",
      suggestion:
        "按职责拆分为 tokenParser、tokenValidator、userExtractor，每个文件聚焦一件事。",
    },
    {
      id: "suggestion-2",
      category: "Maintainability",
      title: "将魔法数字提取为命名常量",
      suggestion:
        "在 src/config/auth.config.ts 中集中管理 token TTL、session TTL、刷新窗口等配置值。",
    },
    {
      id: "suggestion-3",
      category: "Documentation",
      title: "补充鉴权流程的架构注释",
      suggestion:
        "在 auth service 入口处添加 JSDoc，说明整体鉴权流程、模块职责边界和典型调用链路。",
    },
  ],
};

/** 非 security 角色的 mock 数据索引（security 使用默认 mockReview） */
const PERSONA_MOCK_REVIEWS: Partial<Record<ReviewerPersona, ReviewResult>> = {
  performance: mockReviewPerformance,
  testing: mockReviewTesting,
  maintainability: mockReviewMaintainability,
};

/**
 * 根据 reviewerPersona 返回对应的 mock ReviewResult。
 * - security → 使用默认 mockReview（鉴权/安全视角）
 * - performance / testing / maintainability → 使用各自独立 mock 数据
 */
export function getMockReviewByPersona(persona: ReviewerPersona): ReviewResult {
  return PERSONA_MOCK_REVIEWS[persona] ?? mockReview;
}