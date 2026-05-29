# PR Lens 数据结构与数据模型设计

## 1. 文档目的

本文档说明 PR Lens 的核心数据结构和数据模型设计，用于支撑以下功能：

- 解析和存储 GitHub Pull Request 信息
- 记录变更文件及 diff 内容
- 执行规则预检查
- 支持 AI 分析生成结构化风险和建议
- 生成可复制或下载的 Markdown Review 报告

数据模型设计遵循以下原则：

- 类型安全与结构化
- 易于维护与扩展
- 支持 MVP 核心业务流程和 Mock 演示
- 明确异常和降级策略

:contentReference[oaicite:1]{index=1}

## 2. 核心数据对象

### 2.1 PullRequestMeta

存储 PR 基本信息。

```typescript
export type PullRequestMeta = {
  owner: string;
  repo: string;
  pullNumber: number;
  title: string;
  author: string;
  description?: string;
  baseBranch: string;
  headBranch: string;
  changedFiles: number;
  additions: number;
  deletions: number;
  url: string;
};
```

### 2.2 ChangedFile

存储单个变更文件的信息及 diff patch。

```typescript
export type ChangedFile = {
  filename: string;
  status: "added" | "modified" | "removed" | "renamed";
  additions: number;
  deletions: number;
  patch?: string;
};

export type ChangedFileList = ChangedFile[];
```

### 2.3 RuleCheckResult

存储规则预检查结果。

```typescript
export type RuleCheckResult = {
  filename: string;
  ruleId: string;
  level: "high" | "medium" | "low";
  reason: string;
};

export type RuleCheckResultList = RuleCheckResult[];
```

### 2.4 ReviewRisk

存储 AI 分析生成的风险信息。

```typescript
export type ReviewRisk = {
  filename: string;
  level: "high" | "medium" | "low";
  title: string;
  reason: string;
  suggestion: string;
  evidence?: string;
  requiresHumanCheck: boolean;
};
```

### 2.5 ReviewResult

存储 AI 分析结果，包括摘要、关键变更、风险和建议。

```typescript
export type ReviewResult = {
  summary: string;
  keyChanges: string[];
  risks: ReviewRisk[];
  suggestions: string[];
  markdownReport?: string;
};
```

### 2.6 AnalyzePrResponse

封装前端 API 分析接口返回结果。

```typescript
export type AnalyzePrResponse = {
  success: boolean;
  mode: "real" | "mock";
  pullRequest?: PullRequestMeta;
  changedFiles?: ChangedFile[];
  ruleCheckResults?: RuleCheckResult[];
  reviewResult?: ReviewResult;
  error?: string;
};
```

## 3. 上下文构造对象

用于将 PR 信息、文件变更和规则检查结果整理成 AI 可理解的上下文。

```typescript
export type ReviewContextInput = {
  pullRequestMeta: PullRequestMeta;
  changedFiles: ChangedFile[];
  ruleCheckResults: RuleCheckResult[];
};

export type AIReviewContext = {
  prTitle: string;
  prDescription?: string;
  repository: string;
  changedFilesSummary: string;
  selectedPatches: string;
  ruleFindings: string;
};
```

## 4. Markdown 报告生成对象

```typescript
export type ReportBuilderInput = {
  pullRequestMeta: PullRequestMeta;
  changedFiles: ChangedFile[];
  ruleCheckResults: RuleCheckResult[];
  reviewResult: ReviewResult;
};

export type MarkdownReport = string;
```

## 5. 数据流说明

1. 前端输入 PR 链接。
2. 后端解析 PR URL 并获取 `PullRequestMeta`。
3. 获取 `ChangedFileList` 并执行 `RuleCheckResultList` 规则检查。
4. 使用 `ReviewContextInput` 构造 `AIReviewContext`。
5. 调用 AI 生成 `ReviewResult`。
6. 根据 `ReviewResult` 和基础数据生成 `MarkdownReport`。
7. 前端展示摘要、风险、建议，并支持复制或下载。

## 6. 设计原则与扩展性

- **类型安全**：TypeScript 类型定义确保前后端一致性。
- **结构化输出**：AI 返回结果必须是 JSON，保证页面可解析。
- **降级策略**：AI 调用失败时使用 Mock 数据或仅展示规则预检查结果。
- **易扩展**：未来可增加更多规则、支持多模型或私有仓库分析。
- **MVP 边界清晰**：仅支持公开 GitHub PR，核心流程闭环可运行即可。