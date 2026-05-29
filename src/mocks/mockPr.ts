import type { ExamplePR, FeatureCard, PullRequestMeta } from "@/types";

export const mockPr: PullRequestMeta = {
  title: "Improve authentication token validation",
  author: "mock-developer",
  repository: "example/pr-lens-demo",
  changedFiles: 5,
  additions: 128,
  deletions: 42,
};

export const examplePRs: ExamplePR[] = [
  {
    id: "nextjs-rate-limit",
    repo: "vercel/next.js",
    prNumber: "#57855",
    title: "为 API 路由添加限流支持",
    url: "https://github.com/vercel/next.js/pull/57855",
  },
  {
    id: "supabase-session",
    repo: "supabase/supabase",
    prNumber: "#30621",
    title: "重构用户会话处理逻辑",
    url: "https://github.com/supabase/supabase/pull/30621",
  },
  {
    id: "stripe-webhook",
    repo: "stripe/stripe-node",
    prNumber: "#1821",
    title: "添加 Webhook 幂等性校验",
    url: "https://github.com/stripe/stripe-node/pull/1821",
  },
];

export const featureCards: FeatureCard[] = [
  {
    id: "summary",
    title: "快速理解 PR",
    description: "AI 生成变更摘要，快速掌握提交内容与影响范围。",
    icon: "flash",
    tone: "blue",
  },
  {
    id: "risk",
    title: "风险识别",
    description: "识别潜在风险与缺陷，优先关注重点代码变更。",
    icon: "shield",
    tone: "green",
  },
  {
    id: "review",
    title: "Review 建议",
    description: "提供具体可执行的 Review 建议，提升代码质量与协作效率。",
    icon: "message",
    tone: "purple",
  },
];