import type { ReviewResult } from "@/types";

/**
 * Mock Review 结果
 */
export const mockReview: ReviewResult = {
  summary:
    "该 PR 对鉴权 token 校验逻辑进行了重构，将原先同步校验改为异步 token 刷新 + 缓存双写方案，" +
    "涉及 auth service 核心校验链路、session middleware 生命周期管理，以及相关单元测试与集成测试的更新。" +
    "整体变更范围可控，但核心安全逻辑的修改需要额外的人工复核。",

  risks: [
    {
      id: "risk-001",
      level: "HIGH",
      title: "Token 校验逻辑变更需要人工确认",
      file: "src/services/auth.ts",
      reason:
        "auth.ts 中的 token 校验逻辑从同步硬性拒绝改为异步刷新后放行，" +
        "变更涉及核心安全路径。若刷新逻辑存在缺陷，可能导致已过期或伪造的 token 被错误放行。",
      suggestion:
        "建议在合入前由安全负责人对 token 刷新分支的条件覆盖、错误回退路径进行逐行审查，" +
        "并补充 token 伪造场景的集成测试。",
      requiresHumanCheck: true,
    },
    {
      id: "risk-002",
      level: "MEDIUM",
      title: "Session 过期处理需补充边界测试",
      file: "src/middleware/session.ts",
      reason:
        "session middleware 在 token 过期后的降级逻辑仅覆盖了 HTTP 401 状态，" +
        "未覆盖网络超时、Redis 连接中断等异常场景，可能导致用户会话状态不一致。",
      suggestion:
        "建议补充以下边界测试用例：网络超时后的 session 清理、" +
        "Redis 不可用时的优雅降级、并发刷新 token 时的幂等性验证。",
      requiresHumanCheck: false,
    },
  ],

  suggestions: [
    {
      id: "sug-001",
      title: "Token 刷新分支缺少返回值校验",
      category: "Correctness",
      suggestion:
        "在 asyncRefreshToken 函数中，当 HTTP 响应状态为非 200 时应显式抛出异常，" +
        "避免将空字符串或错误响应体误写入 token 缓存，导致后续请求携带无效凭证。",
    },
    {
      id: "sug-002",
      title: "Token 缓存键应使用常量而非硬编码字符串",
      category: "Security",
      suggestion:
        "当前代码中多处使用硬编码字符串 'auth:token' 作为缓存键。" +
        "建议抽取为模块级常量 CACHE_KEY_TOKEN，避免因拼写不一致导致缓存穿透或污染。" +
        "同时建议对缓存键增加前缀命名空间，防止与其他模块的缓存键冲突。",
    },
    {
      id: "sug-003",
      title: "缺少针对异常场景的单元测试覆盖",
      category: "Testing",
      suggestion:
        "当前测试用例仅覆盖了正常刷新路径，建议新增以下测试：" +
        "（1）refresh API 返回 500 时的重试与降级行为；" +
        "（2）refresh API 超时后的兜底逻辑；" +
        "（3）并发刷新时的竞态条件测试。",
    },
  ],
};
