import type { PullRequestMeta } from "@/types";

/**
 * Mock Pull Request 元信息
 */
export const mockPr: PullRequestMeta = {
  title: "Improve authentication token validation",
  author: "mock-developer",
  repository: "example/pr-lens-demo",
  changedFiles: 5,
  additions: 128,
  deletions: 42,
};
