# PR Lens 架构设计文档

## 1. 文档目的

本文档用于说明 PR Lens 的整体架构设计，包括系统分层、模块职责、核心接口、数据流转、AI 分析链路、异常兜底方案和部署结构。

PR Lens MVP 的核心目标是完成以下业务闭环：

```text
输入 GitHub PR 链接
-> 获取 PR 信息
-> 获取代码变更
-> 执行规则预检查
-> 构造 AI 上下文
-> AI 生成摘要、风险和 Review 建议
-> 生成 Markdown 报告
-> 页面展示与复制下载
```

本文档重点说明：

- 项目整体架构如何设计。
- 各模块的职责边界。
- 数据在模块之间如何流转。
- 核心 API 如何设计。
- AI 分析链路如何保证稳定。
- 外部服务异常时如何兜底。
- MVP 阶段的架构边界。

## 2. 架构设计原则

### 2.1 单体优先

MVP 阶段采用 Next.js 单体全栈架构，不拆分前后端项目。

原因如下：

- 降低前后端联调成本。
- 降低部署复杂度。
- 避免跨域和多环境配置问题。
- 保证核心流程可以在短周期内稳定跑通。
- 便于演示和部署。

### 2.2 主流程优先

架构只围绕核心业务闭环设计：

```text
PR 链接输入
-> PR 数据获取
-> diff 分析
-> AI Review
-> 报告生成
-> 页面展示
```

MVP 阶段不为暂不实现的功能提前设计复杂架构，例如：

- 用户系统。
- 团队权限。
- 数据库。
- GitHub App。
- 自动评论发布。
- 历史记录。
- 多平台支持。

### 2.3 模块边界清晰

虽然项目采用单体架构，但代码内部需要按职责拆分：

- 页面组件只负责展示和交互。
- API Route 负责串联分析流程。
- GitHub 模块只负责获取 PR 数据。
- Review 模块负责规则检查、上下文构造、风险合并和报告生成。
- AI 模块只负责模型调用、Prompt 构造和输出解析。
- Mock 模块负责兜底演示。

### 2.4 可降级可演示

系统必须支持 Mock 模式。

即使以下外部服务不可用，也应能展示完整业务流程：

- GitHub API 限流。
- GitHub PR 不可访问。
- AI API 超时。
- AI API Key 未配置。
- 模型返回格式异常。

## 3. 总体架构

PR Lens 采用 Next.js 单体全栈架构。

```text
┌─────────────────────────────────────┐
│ Browser UI                          │
│ PR 输入 / 分析状态 / 结果展示 / 报告复制 │
└──────────────────┬──────────────────┘
                   │ POST /api/analyze-pr
                   ↓
┌─────────────────────────────────────┐
│ Next.js Route Handler               │
│ analyze-pr 核心接口                 │
└──────────────────┬──────────────────┘
                   ↓
┌─────────────────────────────────────┐
│ PR Analysis Pipeline                │
│ URL 解析 -> GitHub 数据 -> 规则检查 -> AI 分析 │
└──────────────────┬──────────────────┘
                   ↓
┌─────────────────────────────────────┐
│ Result Builder                      │
│ ReviewResult + Markdown Report      │
└──────────────────┬──────────────────┘
                   ↓
┌─────────────────────────────────────┐
│ Browser UI                          │
│ 摘要 / 风险 / 建议 / Markdown 报告   │
└─────────────────────────────────────┘
```

## 4. 技术架构选型

| 层级 | 技术 | 说明 |
| --- | --- | --- |
| 前端 | Next.js + React | 页面展示和用户交互 |
| 样式 | Tailwind CSS | 快速构建简洁 UI |
| 语言 | TypeScript | 统一数据结构，减少字段错误 |
| 后端接口 | Next.js Route Handler | 在服务端执行 GitHub API 和 AI API 调用 |
| GitHub 数据 | GitHub REST API | 获取 PR metadata 和 changed files |
| 风险识别 | Rule-based Precheck | 提供确定性风险线索 |
| AI 分析 | AI Client 抽象层 | 支持模型服务替换和 Mock |
| 报告生成 | Markdown Report Builder | 生成稳定结构的 Review 报告 |
| 兜底演示 | Mock Mode | 保证无 API Key 或接口异常时可演示 |
| 部署 | Vercel | 快速部署 Next.js 应用 |

## 5. 项目目录结构

```text
pr-lens/
  README.md
  .env.example
  .gitignore
  package.json

  docs/
    01-requirement.md
    02-mvp-scope.md
    03-business-flow.md
    04-tech-stack.md
    05-data-model.md
    06-architecture.md
    07-demo-script.md
    08-team-workflow.md
    09-decision-log.md

  src/
    app/
      page.tsx
      api/
        analyze-pr/
          route.ts

    components/
      PRInput.tsx
      ProgressSteps.tsx
      PRInfoCard.tsx
      SummaryCard.tsx
      RiskList.tsx
      ReviewSuggestionList.tsx
      MarkdownReport.tsx
      ErrorState.tsx
      MockBanner.tsx

    services/
      github/
        parsePrUrl.ts
        githubClient.ts
        diffParser.ts

      review/
        riskRules.ts
        contextBuilder.ts
        reportBuilder.ts
        mergeReviewResults.ts

      ai/
        aiClient.ts
        promptTemplates.ts
        analyzePr.ts
        parseAIOutput.ts

    mocks/
      samplePr.ts
      sampleAnalysis.ts

    types/
      index.ts

    utils/
      clipboard.ts
      download.ts
      ids.ts
```

## 6. 模块职责划分

### 6.1 页面层：`src/app/page.tsx`

页面层负责用户交互和结果展示。

主要职责：

- 接收用户输入的 GitHub PR 链接。
- 发起 `/api/analyze-pr` 请求。
- 展示分析进度。
- 展示 PR 基本信息。
- 展示 AI 摘要。
- 展示风险列表。
- 展示 Review 建议。
- 展示 Markdown 报告。
- 支持复制和下载报告。
- 支持 Mock 示例模式。

页面层不负责：

- 直接调用 GitHub API。
- 直接调用 AI API。
- 直接处理 API Key。
- 执行复杂 diff 分析。
- 生成最终 Review 结论。

### 6.2 组件层：`src/components/`

| 组件 | 职责 |
| --- | --- |
| `PRInput.tsx` | PR 链接输入和基础校验 |
| `ProgressSteps.tsx` | 展示分析进度 |
| `PRInfoCard.tsx` | 展示 PR 基本信息 |
| `SummaryCard.tsx` | 展示 PR 变更摘要 |
| `RiskList.tsx` | 展示风险列表 |
| `ReviewSuggestionList.tsx` | 展示 Review 建议 |
| `MarkdownReport.tsx` | 展示 Markdown 报告并提供复制 / 下载入口 |
| `ErrorState.tsx` | 展示错误状态和重试入口 |
| `MockBanner.tsx` | 展示 Mock 模式提示 |

组件设计原则：

- 组件只接收 props，不直接请求外部 API。
- 组件不处理复杂业务逻辑。
- 组件命名与业务模块保持一致。
- 页面状态统一由 `page.tsx` 管理。

### 6.3 API 层：`src/app/api/analyze-pr/route.ts`

这是 MVP 阶段唯一核心后端接口。

接口路径：

```text
POST /api/analyze-pr
```

该接口负责串联完整分析流程：

```text
接收请求
-> 判断是否使用 Mock
-> 校验并解析 PR URL
-> 获取 GitHub PR 基本信息
-> 获取 changed files
-> 执行规则预检查
-> 构造 AI 上下文
-> 调用 AI 分析
-> 合并规则结果和 AI 结果
-> 生成 Markdown 报告
-> 返回 AnalyzePrResponse
```

MVP 阶段只做一个核心接口，可以减少：

- 前后端接口数量。
- 状态同步问题。
- 联调成本。
- 演示失败概率。

后续企业版可以再拆分为多个接口或服务。

## 7. GitHub 服务层：`src/services/github/`

GitHub 服务层负责 PR URL 解析、GitHub API 调用和 diff 基础处理。

| 文件 | 职责 |
| --- | --- |
| `parsePrUrl.ts` | 解析 GitHub PR 链接 |
| `githubClient.ts` | 调用 GitHub REST API |
| `diffParser.ts` | 对 patch 做轻量处理 |

### 7.1 `parsePrUrl.ts`

负责将用户输入的 PR 链接解析为：

```typescript
type ParsedPullRequestUrl = {
  owner: string;
  repo: string;
  pullNumber: number;
  url: string;
};
```

仅支持以下格式：

```text
https://github.com/{owner}/{repo}/pull/{number}
```

非法链接返回：

```text
INVALID_PR_URL
```

### 7.2 `githubClient.ts`

负责调用 GitHub REST API。

需要实现两个核心方法：

```typescript
getPullRequestMeta(
  params: ParsedPullRequestUrl
): Promise<PullRequestMeta>;
```

```typescript
getChangedFiles(
  params: ParsedPullRequestUrl
): Promise<ChangedFile[]>;
```

安全要求：

- GitHub Token 只从服务端环境变量读取。
- 不允许在前端暴露 GitHub Token。
- GitHub API 失败时返回统一错误结构。

### 7.3 `diffParser.ts`

MVP 阶段只做轻量 diff 处理：

- 判断 patch 是否存在。
- 对超长 patch 做裁剪。
- 提取基础关键词。
- 标记二进制或无 patch 文件。

MVP 阶段不做复杂 AST 解析。

## 8. Review 服务层：`src/services/review/`

Review 服务层负责 AI 分析前后的业务逻辑，包括规则预检查、上下文构造、风险合并和报告生成。

| 文件 | 职责 |
| --- | --- |
| `riskRules.ts` | 执行规则预检查 |
| `contextBuilder.ts` | 构造 AI 分析上下文 |
| `mergeReviewResults.ts` | 合并规则风险和 AI 风险 |
| `reportBuilder.ts` | 生成 Markdown 报告 |

### 8.1 `riskRules.ts`

规则预检查模块。

输入：

```typescript
ChangedFile[]
```

输出：

```typescript
RuleCheckResult[]
```

初版规则包括：

- 依赖文件变更。
- 配置文件变更。
- 鉴权或权限相关变更。
- 疑似硬编码敏感信息。
- 大量删除。
- 新增外部调用。
- 测试缺失提示。

规则预检查的作用：

- 不依赖 AI 即可发现明显风险。
- 帮助 AI 聚焦高风险文件。
- AI 失败时仍能输出基础风险提示。
- 降低漏报概率。

### 8.2 `contextBuilder.ts`

上下文构造模块。

输入：

```typescript
PullRequestMeta
ChangedFile[]
RuleCheckResult[]
```

输出：

```typescript
AIReviewContext
```

核心逻辑：

- 汇总 PR 基本信息。
- 汇总变更文件列表。
- 选择进入 AI 的重点 patch。
- 添加规则预检查结果。
- 添加上下文裁剪说明。

上下文选择优先级：

```text
规则命中的高风险文件
-> 鉴权 / 配置 / 依赖 / 数据处理相关文件
-> 新增逻辑较多的文件
-> 删除逻辑较多的文件
-> PR 描述中提到的文件
```

降低优先级：

```text
lock 文件
纯样式文件
自动生成文件
大型静态资源
纯格式化变更
```

### 8.3 `mergeReviewResults.ts`

负责合并规则预检查结果和 AI 分析结果。

目标：

- 避免重复风险。
- 标记风险来源。
- 提升高风险项优先级。
- 保留人工确认标记。

合并原则：

```text
同一文件、相似风险合并
规则和 AI 都命中 -> source = ai_and_rule
只有 AI 命中 -> source = ai
只有规则命中 -> source = rule
High 风险优先展示
所有 High 风险默认 requiresHumanCheck = true
```

### 8.4 `reportBuilder.ts`

报告生成模块。

输入：

```typescript
ReportBuilderInput
```

输出：

```typescript
MarkdownReport
```

报告结构：

```markdown
# PR Review 报告

## 1. PR 基本信息

## 2. 变更摘要

## 3. 重点变更

## 4. 风险列表

## 5. Review 建议

## 6. 需要人工确认的问题

## 7. AI 分析限制
```

报告由系统生成，不完全依赖 AI 直接输出 Markdown。

原因如下：

- 保证报告结构稳定。
- 避免 AI 输出格式漂移。
- 方便页面复制和下载。
- 方便后续接入 GitHub 评论发布。

## 9. AI 服务层：`src/services/ai/`

AI 服务层负责模型调用、Prompt 构造、AI 输出解析和清洗。

| 文件 | 职责 |
| --- | --- |
| `aiClient.ts` | 封装模型调用 |
| `promptTemplates.ts` | 维护 Prompt 模板 |
| `analyzePr.ts` | 调用 AI 完成 PR 分析 |
| `parseAIOutput.ts` | 校验和清洗 AI 输出 |

### 9.1 `aiClient.ts`

AI Client 是模型调用抽象层。

职责：

- 读取 `AI_API_KEY`、`AI_BASE_URL`、`AI_MODEL_NAME`。
- 接收结构化上下文。
- 调用模型服务。
- 设置超时控制。
- 返回模型原始结果。
- 统一处理异常。

设计原则：

- 不绑定具体模型供应商。
- 便于切换模型。
- 便于 Mock。
- 不向前端暴露 API Key。

### 9.2 `promptTemplates.ts`

负责维护 AI Prompt。

Prompt 必须约束模型：

- 只基于提供的 PR 信息和 diff 分析。
- 不编造业务背景。
- 不把猜测写成事实。
- 风险必须尽量指向具体文件。
- 建议必须可执行。
- 信息不足时标记 `requiresHumanCheck: true`。
- 必须返回结构化 JSON。
- 不要返回 Markdown。
- 不要返回代码块包裹内容。

### 9.3 `analyzePr.ts`

AI 分析业务封装。

输入：

```typescript
AIReviewContext
```

输出：

```typescript
AIReviewParsedOutput
```

核心流程：

```text
构造 prompt
-> 调用 aiClient
-> 获取原始输出
-> parseAIOutput 校验
-> 返回结构化结果
```

### 9.4 `parseAIOutput.ts`

负责 AI 输出校验和清洗。

校验内容：

- `summary` 是否为 string。
- `keyChanges` 是否为 string[]。
- `risks` 是否为数组。
- `risk.level` 是否为 high / medium / low。
- `risk.filename` 是否存在。
- `suggestions` 是否为数组。
- `limitations` 是否为 string[]。

如果校验失败：

- 返回 `AI_INVALID_JSON`。
- 保留规则预检查结果。
- 页面不崩溃。
- 引导用户使用 Mock 模式或重试。

## 10. Mock 层：`src/mocks/`

Mock 层负责提供可稳定演示的示例数据。

| 文件 | 职责 |
| --- | --- |
| `samplePr.ts` | 示例 PR 数据 |
| `sampleAnalysis.ts` | 示例分析结果 |

Mock 数据必须覆盖：

- PR 基本信息。
- changed files。
- 规则预检查结果。
- AI 变更摘要。
- 风险列表。
- Review 建议。
- Markdown 报告。

Mock 模式要求：

- 不依赖 GitHub API。
- 不依赖 AI API。
- 不需要任何 API Key。
- 页面明确展示 `当前为 Mock 模式`。
- 可用于演示和本地测试。

## 11. 核心接口设计

### 11.1 分析 PR 接口

接口：

```text
POST /api/analyze-pr
```

请求：

```typescript
type AnalyzePrRequest = {
  url?: string;
  useMock?: boolean;
};
```

响应：

```typescript
type AnalyzePrResponse = {
  success: boolean;
  mode: "real" | "mock";
  status: AnalyzeStatus;
  pullRequest?: PullRequestMeta;
  changedFiles?: ChangedFile[];
  ruleCheckResults?: RuleCheckResult[];
  reviewResult?: ReviewResult;
  error?: AppError;
};
```

### 11.2 Real 模式处理流程

```text
1. 接收 url
2. 校验 url
3. 解析 owner / repo / pullNumber
4. 请求 GitHub PR metadata
5. 请求 GitHub changed files
6. 执行规则预检查
7. 构造 AIReviewContext
8. 调用 AI 分析
9. 校验 AI 输出
10. 合并规则结果和 AI 结果
11. 构造 Markdown 报告
12. 返回 AnalyzePrResponse
```

### 11.3 Mock 模式处理流程

```text
1. 接收 useMock = true
2. 跳过 GitHub API
3. 跳过 AI API
4. 读取 sampleAnalysis
5. 返回 AnalyzePrResponse
```

## 12. 数据流设计

完整数据流如下：

```text
AnalyzePrRequest
 ↓
ParsedPullRequestUrl
 ↓
PullRequestMeta
 ↓
ChangedFile[]
 ↓
RuleCheckResult[]
 ↓
AIReviewContext
 ↓
AIReviewRawOutput
 ↓
AIReviewParsedOutput
 ↓
ReviewResult
 ↓
MarkdownReport
 ↓
AnalyzePrResponse
 ↓
AnalyzePageState
```

## 13. AI 分析链路设计

### 13.1 AI 分析输入

AI 不直接接收用户原始输入，也不直接接收完整 GitHub API 原始响应。

AI 输入由 `contextBuilder.ts` 生成，包含：

- PR 标题。
- PR 描述。
- 仓库信息。
- changed files 摘要。
- 重点 patch。
- 规则预检查结果。
- 上下文裁剪说明。

### 13.2 AI 分析输出

AI 输出必须是结构化 JSON：

```json
{
  "summary": "string",
  "keyChanges": ["string"],
  "risks": [
    {
      "filename": "string",
      "level": "high | medium | low",
      "title": "string",
      "reason": "string",
      "suggestion": "string",
      "evidence": "string",
      "requiresHumanCheck": true
    }
  ],
  "suggestions": [
    {
      "category": "correctness | security | maintainability | testing | performance | documentation | other",
      "filename": "string",
      "title": "string",
      "suggestion": "string",
      "reason": "string"
    }
  ],
  "limitations": ["string"]
}
```

### 13.3 为什么 AI 不直接生成最终 Markdown

AI 不直接生成最终 Markdown，原因如下：

- AI 输出格式不稳定。
- Markdown 结构需要长期保持一致。
- 页面展示需要结构化数据。
- 报告生成应由系统控制。
- 后续如果接入 GitHub 评论，需要稳定字段。

因此，AI 只生成结构化分析结果，最终 Markdown 由 `reportBuilder.ts` 生成。

## 14. 上下文理解设计

### 14.1 上下文来源

上下文来自：

- PR metadata。
- PR description。
- changed files。
- patch。
- 文件路径。
- 规则预检查结果。

### 14.2 上下文裁剪策略

当 PR diff 较大时，优先保留：

```text
规则预检查命中的文件
鉴权 / 配置 / 依赖 / API / 数据处理相关文件
新增逻辑较多的文件
删除逻辑较多的文件
PR 描述中提到的文件
```

降低优先级：

```text
lock 文件
纯样式文件
自动生成文件
大型静态资源
纯格式化变更
```

### 14.3 上下文裁剪说明

如果系统裁剪了上下文，应在 `limitations` 中说明：

```text
当前分析基于 PR diff 和部分重点文件 patch，未读取完整仓库上下文。
```

## 15. 分析准确性设计

为了提高分析准确性，PR Lens 采用以下组合：

```text
规则预检查 + AI 分析 + 结构化输出 + 结果校验
```

### 15.1 规则预检查的作用

- 提前发现明显风险。
- 给 AI 提供风险线索。
- 降低漏报概率。
- AI 失败时提供基础结果。

### 15.2 AI 分析的作用

- 总结 PR 变更目的。
- 识别潜在逻辑风险。
- 生成可执行 Review 建议。
- 补充规则无法覆盖的语义判断。

### 15.3 结果校验的作用

- 防止 AI 返回无法解析的内容。
- 防止页面崩溃。
- 防止字段缺失导致报告生成失败。
- 提升系统稳定性。

## 16. 误报与漏报控制

### 16.1 降低误报

采用以下策略：

- 风险必须尽量指向具体文件。
- 建议必须说明原因。
- 低置信判断标记为 `requiresHumanCheck`。
- 不自动阻塞合并。
- 不自动发布 GitHub 评论。
- 报告中明确说明 AI 结果仅供参考。

### 16.2 降低漏报

采用以下策略：

- 规则预检查扫描高风险路径。
- 对 `auth`、`token`、`config`、`dependency` 等关键词做检查。
- 对大量删除和外部调用做额外提示。
- 上下文裁剪时优先保留高风险文件。
- AI 分析时传入规则命中结果。

## 17. 异常处理架构

### 17.1 错误类型

| 错误码 | 说明 |
| --- | --- |
| `INVALID_PR_URL` | PR 链接格式错误 |
| `GITHUB_API_ERROR` | GitHub API 请求失败 |
| `GITHUB_PR_NOT_FOUND` | PR 不存在或不可访问 |
| `GITHUB_RATE_LIMIT` | GitHub API 限流 |
| `AI_API_ERROR` | AI 服务调用失败 |
| `AI_TIMEOUT` | AI 服务超时 |
| `AI_INVALID_JSON` | AI 返回格式不可解析 |
| `REPORT_BUILD_ERROR` | Markdown 报告生成失败 |
| `UNKNOWN_ERROR` | 未知错误 |

### 17.2 异常兜底策略

| 场景 | 处理方式 |
| --- | --- |
| PR 链接错误 | 前端提示并停止流程 |
| GitHub API 失败 | 展示错误，提供 Mock 模式 |
| AI API 失败 | 保留 PR 信息和规则结果，提供 Mock |
| AI JSON 解析失败 | 展示降级结果，保证页面不崩溃 |
| Markdown 生成失败 | 展示分析结果，并提示报告生成失败 |

## 18. 前端状态架构

前端采用轻量状态管理，不引入 Redux 或复杂状态库。

状态类型：

```typescript
type AnalyzeStatus =
  | "idle"
  | "parsing"
  | "fetching_pr"
  | "fetching_files"
  | "rule_checking"
  | "building_context"
  | "ai_analyzing"
  | "report_generating"
  | "success"
  | "error";
```

状态展示关系：

| 状态 | 展示内容 |
| --- | --- |
| `idle` | 输入框、示例按钮 |
| `parsing` | 正在解析 PR 链接 |
| `fetching_pr` | 正在获取 PR 信息 |
| `fetching_files` | 正在获取变更文件 |
| `rule_checking` | 正在执行规则预检查 |
| `building_context` | 正在构造 AI 上下文 |
| `ai_analyzing` | 正在生成 AI Review |
| `report_generating` | 正在生成 Markdown 报告 |
| `success` | 展示分析结果 |
| `error` | 展示错误提示和兜底入口 |

## 19. 部署架构

MVP 部署采用 Vercel。

```text
GitHub Repo
 ↓
Vercel Import Project
 ↓
配置环境变量
 ↓
Deploy
 ↓
生成在线访问地址
```

环境变量：

```bash
GITHUB_TOKEN=
AI_API_KEY=
AI_BASE_URL=
AI_MODEL_NAME=
NEXT_PUBLIC_APP_NAME=PR Lens
```

安全要求：

- `.env` 不提交。
- `.env.example` 需要提交。
- 服务端 API Key 不暴露给前端。
- 前端只调用 `/api/analyze-pr`。

## 20. 架构实现优先级

### 20.1 P0 必须完成

- Next.js 项目骨架。
- `/api/analyze-pr` 核心接口。
- PR URL 解析。
- Mock 分析流程。
- GitHub PR metadata 获取。
- GitHub changed files 获取。
- 规则预检查。
- Context Builder。
- AI Client。
- AI 输出解析。
- Markdown Report Builder。
- 前端结果展示。
- 复制 / 下载报告。
- 错误兜底。

### 20.2 P1 可选完成

- 风险等级筛选。
- 更好的 Diff 展示。
- 更细的上下文裁剪。
- 分析步骤可视化。
- Markdown 模板优化。
- 示例 PR 快速入口。

### 20.3 明确不做

- 用户登录。
- 数据库。
- GitHub App。
- 私有仓库授权。
- 自动发布 Review 评论。
- 自动修复代码。
- 自动判断是否可以合并。
- 历史记录。
- 团队后台。
- 多平台支持。

## 21. 后续扩展架构

如果项目继续扩展为企业级工具，可以按以下方向演进。

### 21.1 GitHub App

支持 PR 创建或更新时自动触发分析。

### 21.2 GitHub 评论发布

在用户授权后，将 Review 报告发布为 GitHub Review 评论。

### 21.3 私有仓库支持

通过 GitHub App 或 OAuth 获取私有仓库权限。

### 21.4 数据库存储

引入数据库保存：

- 分析历史。
- 用户配置。
- 团队规则。
- Review 记录。

### 21.5 团队规则库

支持团队自定义风险规则，例如：

- 修改 `auth` 目录必须补测试。
- 修改 API 必须更新文档。
- 依赖变更必须人工确认。
- 修改配置文件需要 Tech Lead Review。

### 21.6 CI 集成

在 CI 流程中自动运行 PR Lens，并将结果作为合并前参考。

### 21.7 静态分析工具集成

未来可接入：

- ESLint。
- Semgrep。
- CodeQL。
- SonarQube。
- Snyk。

AI 不替代这些工具，而是整合它们的结果，生成更易理解的 Review 报告。

## 22. 架构风险与应对

| 风险 | 影响 | 应对 |
| --- | --- | --- |
| GitHub API 限流 | 无法获取真实 PR | 使用 Mock 模式兜底 |
| AI API 超时 | 无法生成分析 | 展示规则预检查结果，并提供 Mock |
| AI 输出格式异常 | 页面解析失败 | 使用 `parseAIOutput` 校验和降级 |
| diff 过大 | 上下文超限 | 使用 Context Builder 裁剪 |
| 页面状态复杂 | 用户体验混乱 | 统一使用 `AnalyzeStatus` 管理 |
| Vercel 部署失败 | 无法线上展示 | 保证本地可运行，并准备演示视频 |

## 23. 最终架构结论

PR Lens MVP 架构采用：

```text
Next.js 单体全栈
+ TypeScript 类型约束
+ GitHub REST API 获取 PR 数据
+ Rule-based Precheck 提供确定性风险线索
+ Context Builder 控制上下文质量
+ AI Client 生成摘要、风险和建议
+ Markdown Report Builder 生成报告
+ Mock Mode 保证演示稳定
+ Vercel 快速部署
```

该架构能够覆盖 PR Lens MVP 的核心能力：

| 题目要求 | 架构对应 |
| --- | --- |
| 用户指定 GitHub PR | `PRInput` + `parsePrUrl` |
| 自动获取代码变更 | `githubClient` |
| 智能分析 | `AI Client` + `promptTemplates` |
| PR 变更总结 | `ReviewResult.summary` |
| 风险代码识别 | `riskRules` + `ReviewRisk` |
| Review 建议生成 | `ReviewSuggestion` |
| 上下文理解 | `contextBuilder` |
| 误报与漏报控制 | 规则预检查 + 人工确认标记 |
| 响应速度 | 不克隆仓库 + 上下文裁剪 |
| 使用体验 | 前端状态管理 + Markdown 报告 |
| 稳定演示 | Mock Mode |

MVP 阶段只要保证以下闭环稳定运行，即认为架构目标达成：

```text
输入公开 GitHub PR 链接
-> 获取 PR 信息和 changed files
-> 规则预检查
-> AI 分析
-> 生成 Markdown Review 报告
-> 页面展示并支持复制下载
```