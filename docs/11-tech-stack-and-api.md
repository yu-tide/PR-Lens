# PR Lens 技术栈与接口文档

## 1. 文档目的

本文档记录 PR1–PR6 完成后的技术选型、类型系统、API 契约和开发规范。

---

## 2. 技术栈

| 层级 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 框架 | Next.js | 16.2.6 | 全栈框架（App Router + Route Handler） |
| UI 库 | React | 19.2.4 | 页面与组件 |
| 语言 | TypeScript | ^5 | 类型安全 |
| 样式 | Tailwind CSS | ^4 | 原子化 CSS |
| 代码检查 | ESLint | ^9 | 静态分析（含 react-hooks 编译器规则） |
| 包管理 | npm | — | 依赖管理 |
| 运行时 | Node.js | — | 服务端执行 |
| 外部 API | GitHub REST API | 2022-11-28 | PR 数据源 |
| 环境变量 | cross-env | ^10.1.0 | 跨平台 env 注入 |

---

## 3. 类型系统

### 3.1 导出类型清单（22 个）

| 类型 | 类别 | 说明 |
|------|------|------|
| `RiskLevel` | 基础 | `"HIGH" \| "MEDIUM" \| "LOW"` |
| `ReviewRisk` | Review | AI 生成的一条风险 |
| `ReviewSuggestion` | Review | AI 生成的一条建议 |
| `ReviewResult` | Review | AI 分析完整结果 |
| `PullRequestMeta` | PR 数据 | PR 元信息（14 个字段） |
| `AnalysisStatus` | UI 状态 | `"idle" \| "analyzing" \| "success" \| "error"` |
| `AnalysisStep` | UI 数据 | 分析步骤 |
| `ExamplePR` | Mock | 示例 PR |
| `FeatureCard` | Mock | 首页功能卡片 |
| `ParsedPullRequestUrl` | 解析 | PR URL 解析结果 |
| `AnalyzeMode` | API | `"real" \| "mock"` |
| `AppErrorCode` | API | 错误码联合类型 |
| `AppError` | API | 结构化错误 |
| `AnalyzePrRequest` | API | POST 请求体 |
| `AnalyzePrResponse` | API | POST 响应体 |
| `ChangedFileStatus` | GitHub | 文件状态联合类型 |
| `ChangedFile` | GitHub | 变更文件（11 个字段） |
| `RuleCheckSeverity` | Review | `"low" \| "medium" \| "high"` |
| `RuleCheckResult` | Review | 规则命中结果 |
| `GitHubApiErrorCode` | GitHub | 错误码联合类型 |

### 3.2 核心类型详细定义

```typescript
// ── PR 元信息 ──
interface PullRequestMeta {
  title: string;          // PR 标题
  author: string;         // 作者 login
  repository: string;     // "owner/repo"（向后兼容）
  changedFiles: number;   // 变更文件数
  additions: number;      // 新增行数
  deletions: number;      // 删除行数
  owner?: string;         // 仓库 owner（githubClient 填充）
  repo?: string;          // 仓库名（githubClient 填充）
  pullNumber?: number;    // PR 编号
  description?: string;   // PR 描述
  baseBranch?: string;    // 目标分支
  headBranch?: string;    // 源分支
  url?: string;           // PR 链接
}

// ── 变更文件 ──
interface ChangedFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  rawUrl?: string;
  blobUrl?: string;
  isBinary?: boolean;
  isTooLarge?: boolean;
}

// ── 规则检查结果 ──
interface RuleCheckResult {
  id: string;             // 唯一标识
  title: string;          // 规则标题
  message: string;        // 详细说明
  severity: "low" | "medium" | "high";
  file?: string;          // 关联文件
  line?: number;          // 关联行号
}

// ── API 响应 ──
interface AnalyzePrResponse {
  success: boolean;
  mode: "real" | "mock";
  pullRequest?: PullRequestMeta;
  reviewResult?: ReviewResult;
  error?: AppError;
  changedFiles?: ChangedFile[];
  ruleCheckResults?: RuleCheckResult[];
  source?: "github" | "mock";
  warning?: string;
}
```

---

## 4. API 接口

### POST /api/analyze-pr

**Request Body:**
```typescript
interface AnalyzePrRequest {
  url?: string;      // GitHub PR URL
  useMock?: boolean; // 是否 Mock 模式
}
```

**Response Body:**
```typescript
interface AnalyzePrResponse {
  success: boolean;                    // 是否成功
  mode: "real" | "mock";              // 分析模式
  pullRequest?: PullRequestMeta;       // PR 元信息
  reviewResult?: ReviewResult;        // AI 分析结果
  changedFiles?: ChangedFile[];       // 变更文件列表
  ruleCheckResults?: RuleCheckResult[]; // 规则预检查结果
  source?: "github" | "mock";         // 数据来源
  warning?: string;                   // 警告信息（fallback 时）
  error?: AppError;                   // 错误信息（失败时）
}
```

**状态码：**

| Status | 场景 |
|--------|------|
| 200 | 成功（真实数据 / mock 数据 / mock fallback） |
| 400 | JSON 解析失败 / 缺少 url / URL 格式无效 |
| 500 | 未预期异常 |

**Mock 模式请求示例：**
```bash
curl -X POST http://localhost:3000/api/analyze-pr \
  -H "Content-Type: application/json" \
  -d '{"useMock": true}'
```

**真实模式请求示例：**
```bash
curl -X POST http://localhost:3000/api/analyze-pr \
  -H "Content-Type: application/json" \
  -d '{"url":"https://github.com/facebook/react/pull/1","useMock":false}'
```

---

## 5. 错误码体系

### AppErrorCode（应用层）
```
"INVALID_PR_URL"  — PR URL 格式非法
"MOCK_MODE"       — Mock 模式标记（预留）
"UNKNOWN_ERROR"   — 未预期异常
```

### GitHubApiErrorCode（GitHub 层）
```
"GITHUB_TOKEN_MISSING"  — 未配置 GITHUB_TOKEN
"GITHUB_PR_NOT_FOUND"   — PR 不存在（404）
"GITHUB_RATE_LIMIT"     — API 限流（403 + x-ratelimit-remaining=0）
"GITHUB_API_ERROR"      — 其他 API 错误 / 网络错误
```

### 错误处理策略

| 错误 | 行为 |
|------|------|
| 无效 URL | HTTP 400，不 fallback |
| GitHub API 失败 | HTTP 200 + mock fallback + warning |
| 未配置 Token | HTTP 200 + mock fallback + warning |
| 网络异常 | HTTP 200 + mock fallback + warning |
| sessionStorage 不可用 | 结果页降级到硬编码 fallback |

---

## 6. 环境变量

| 变量 | 用途 | 必填 |
|------|------|------|
| `GITHUB_TOKEN` | GitHub Personal Access Token（服务端） | 否* |
| `AI_API_KEY` | AI API Key（预留 PR7） | 否 |
| `AI_BASE_URL` | AI 服务地址（预留 PR7） | 否 |
| `AI_MODEL_NAME` | AI 模型名（预留 PR7） | 否 |
| `NEXT_PUBLIC_APP_NAME` | 应用名称 | 否 |
| `NODE_TLS_REJECT_UNAUTHORIZED` | 本地开发 TLS 跳过（仅 dev） | 否 |
| `NODE_OPTIONS` | `--dns-result-order=ipv4first`（仅 dev） | 否 |

> \* 未配置时自动降级到 Mock 模式，不影响基本体验。

---

## 7. 目录结构

```text
src/
├── app/
│   ├── layout.tsx                        # 根布局
│   ├── page.tsx                          # 首页
│   ├── globals.css                       # 全局样式
│   ├── result/page.tsx                   # 结果页
│   └── api/analyze-pr/route.ts           # 核心 API
├── components/
│   ├── Logo.tsx
│   ├── AppHeader.tsx
│   └── AnalysisFloatingPanel.tsx
├── services/
│   ├── github/
│   │   ├── parsePrUrl.ts                 # URL 解析
│   │   ├── githubClient.ts               # REST 客户端
│   │   └── diffParser.ts                 # Diff 处理
│   └── review/
│       ├── riskRuleDefinitions.ts        # 规则定义
│       └── riskRules.ts                  # 规则编排
├── types/
│   └── index.ts                          # 全部类型导出
└── mocks/
    ├── index.ts
    ├── mockPr.ts
    └── mockReview.ts
```

---

## 8. 关键设计决策

| 决策 | 选择 | 原因 |
|------|------|------|
| 架构 | Next.js 单体全栈 | 降低联调成本，快速交付 |
| 状态管理 | React useState + useMemo | MVP 阶段无需 Redux |
| 类型安全 | 全部 interface/type，禁 any | 减少运行时错误 |
| Mock 策略 | 服务端 Mock（route.ts 内） | 前后端都能走通 |
| sessionStorage | 不作为唯一数据源 | 结果页有硬编码 fallback |
| 规则检查 | AI 之前执行 | 不依赖 AI，降低漏报 |
| diff 裁剪 | 300 行/文件 | 控制上下文大小，防超限 |
| 网络异常 | 自动降级 mock | 保证演示稳定 |

## 9. 错误响应结构

```typescript
{
  success: false;
  error: {
    code: AppErrorCode;     // 17 种错误码
    message: string;        // 用户可读信息
    detail?: string;        // 可选详情
    stage: AppErrorStage;   // 错误阶段
    action: string;         // 建议操作
    recoverable: boolean;
  }
}
```

## 10. 超时策略

| 层级 | 超时 | 错误码 |
|------|------|--------|
| GitHub API | 10s | GITHUB_TIMEOUT |
| AI API | 30s | AI_TIMEOUT |
| 前端请求 | 30s | NETWORK_ERROR |

## 11. 环境变量（最终版）

```env
GITHUB_TOKEN=your_token_here
BAILIAN_API_KEY=your_bailian_key
BAILIAN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
BAILIAN_MODEL=qwen-plus
NEXT_PUBLIC_APP_NAME=PR Lens
```
