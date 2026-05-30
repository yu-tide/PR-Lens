# PR Lens 当前实现总览

## 1. 文档目的

本文档记录 PR1–PR6 完成后的项目实现现状，包括已实现的功能模块、架构分层、数据流和关键设计决策。

---

## 2. 已实现的核心闭环

```text
用户输入 GitHub PR 链接
  → 前端校验 URL 格式
  → POST /api/analyze-pr
  → parsePrUrl 解析 owner/repo/pullNumber
  → githubClient 调用 GitHub REST API 获取 PR 元信息 + 变更文件
  → diffParser 裁剪超大 patch
  → runRiskRules 执行 7 条规则预检查
  → 返回结构化 AnalyzePrResponse
  → 首页 sessionStorage 存储
  → 结果页展示 PR 信息 / AI摘要 / 风险分析 / Review建议 / 规则预检查 / Markdown预览
```

---

## 3. 架构分层

```
┌──────────────────────────────────────────────────┐
│ 页面层 (src/app/)                                  │
│   page.tsx          ← 首页：URL 输入 + 分析触发    │
│   result/page.tsx   ← 结果页：全部展示             │
├──────────────────────────────────────────────────┤
│ 组件层 (src/components/)                          │
│   AppHeader / Logo / AnalysisFloatingPanel        │
├──────────────────────────────────────────────────┤
│ API 层 (src/app/api/)                             │
│   analyze-pr/route.ts  ← POST /api/analyze-pr     │
├──────────────────────────────────────────────────┤
│ 服务层 (src/services/)                            │
│   github/  ← parsePrUrl / githubClient / diffParser│
│   review/  ← riskRuleDefinitions / riskRules       │
├──────────────────────────────────────────────────┤
│ 类型层 (src/types/index.ts)                        │
│   22 个导出类型，覆盖 UI / API / GitHub / Review    │
├──────────────────────────────────────────────────┤
│ Mock 层 (src/mocks/)                              │
│   mockPr / mockReview / analysisSteps / examplePRs │
└──────────────────────────────────────────────────┘
```

## 4. 页面与组件

### 4.1 首页 `/`

| 区域 | 功能 |
|------|------|
| PR URL 输入框 | 正则校验 `https://github.com/{owner}/{repo}/pull/{number}` |
| "开始分析"按钮 | 调用 `fetch("/api/analyze-pr")`，body `{ url, useMock: false }` |
| "使用示例 PR 快速体验" | 调用同一 API，body `{ useMock: true }` |
| Feature Cards ×3 | 快速理解PR / 风险识别 / Review建议 |
| 校验错误提示 | 空值 / 格式错误，红色提示卡片 |
| 分析浮动面板 | 6 步进度动画 + 成功/失败/分析中三态 + 展开/收起 |

### 4.2 结果页 `/result`

| Section | 数据来源 | 展示 |
|---------|---------|------|
| PR 信息卡片 | `pullRequest`（API）| 标题 / 仓库 / PR编号 / 作者 / 变更数 / 增删 |
| 规则预检查 ⭐ | `ruleCheckResults`（API）| 按 severity 彩色标签展示，空状态兜底 |
| AI 摘要 | `reviewResult.summary`（API）| 多段文字 |
| 风险分析 | `reviewResult.risks`（API）| 高/中/低颜色分区卡片 |
| Review 建议 | `reviewResult.suggestions`（API）| 带分类图标列表 |
| Markdown 预览 | 动态生成 | 行号 + 等宽字体 |
| Mock 模式标记 | `source` 字段 | amber 色徽章 |

所有数据优先从 `sessionStorage("pr-lens:last-analysis")` 读取，为空时降级到硬编码 fallback。

---

## 5. API 接口

### POST /api/analyze-pr

**请求：**
```json
{ "url": "https://github.com/owner/repo/pull/123", "useMock": false }
```

**三种路径：**

| 场景 | HTTP | source | 数据 |
|------|------|--------|------|
| `useMock: true` | 200 | `"mock"` | mockPr + mockReview + mockChangedFiles + ruleCheckResults |
| 真实 URL 成功 | 200 | `"github"` | 真实 pullRequest + changedFiles + ruleCheckResults |
| 真实 URL 失败 | 200 | `"mock"` | mock fallback + warning + ruleCheckResults |
| 无效 URL | 400 | — | 结构化 error |
| JSON 解析失败 | 400 | — | 结构化 error |

**响应结构：**
```json
{
  "success": true,
  "mode": "mock",
  "pullRequest": { PullRequestMeta },
  "reviewResult": { ReviewResult },
  "changedFiles": [ ChangedFile ],
  "ruleCheckResults": [ RuleCheckResult ],
  "source": "github" | "mock",
  "warning": "错误详情（仅 fallback 时有）",
  "error": { AppError }
}
```

---

## 6. GitHub 服务层

### 6.1 URL 解析 (`parsePrUrl.ts`)

```
输入: "https://github.com/vercel/next.js/pull/57855"
输出: { owner: "vercel", repo: "next.js", pullNumber: 57855, url }
异常: ParsePrUrlError(code: "INVALID_PR_URL")
```

### 6.2 API 客户端 (`githubClient.ts`)

| 函数 | API 端点 | 返回 |
|------|---------|------|
| `getPullRequestMeta` | `GET /repos/{owner}/{repo}/pulls/{number}` | `PullRequestMeta` |
| `getChangedFiles` | `GET /repos/{owner}/{repo}/pulls/{number}/files?per_page=100` | `ChangedFile[]` |

错误处理：`GitHubApiError` 类，4 种错误码（`GITHUB_TOKEN_MISSING` / `GITHUB_PR_NOT_FOUND` / `GITHUB_RATE_LIMIT` / `GITHUB_API_ERROR`）。

### 6.3 Diff 处理 (`diffParser.ts`)

| 输入 patch | 输出 |
|-----------|------|
| 空 / undefined | `{ patch: undefined, isBinary: true, isTooLarge: false }` |
| ≤300 行 | 原样 `{ patch, isBinary: false, isTooLarge: false }` |
| >300 行 | 截断 `{ patch(前300行+说明), isBinary: false, isTooLarge: true }` |

---

## 7. Review 服务层

### 7.1 规则引擎 (`riskRuleDefinitions.ts` + `riskRules.ts`)

`runRiskRules(changedFiles: ChangedFile[]) → RuleCheckResult[]`

7 条规则按 severity 排序输出（high → medium → low）：

| # | 规则 | 触发条件 | severity |
|---|------|---------|----------|
| 1 | 依赖文件变更 | filename 匹配 11 种依赖文件 | medium |
| 2 | 配置文件变更 | filename 匹配 .env / config/ / CI 配置等 | medium |
| 3 | 鉴权/权限变更 | filename+patch 含 auth/token/session 等 10 词 | **high** |
| 4 | 疑似硬编码密钥 | patch 含 api_key/secret/password 等 9 词 | **high** |
| 5 | 大量代码删除 | deletions ≥ 80 | medium |
| 6 | 新增外部调用 | patch 新增行含 fetch(/axios/request( 等 | medium |
| 7 | Diff 不可获取 | isBinary 或 isTooLarge | low |

---

## 8. 数据传递机制

```
首页 runAnalysis()
  → fetch("/api/analyze-pr")
  → sessionStorage.setItem("pr-lens:last-analysis", JSON.stringify(data))
  → router.push("/result")
  → 结果页 useEffect → sessionStorage.getItem → JSON.parse → useMemo 派生 UI 数据
  → sessionStorage 为空 → 降级到 FALLBACK 硬编码数据
```

---

## 9. 已实现的错误处理

| 层级 | 错误 | 处理 |
|------|------|------|
| 前端 | 空 URL / 格式错误 | 客户端正则校验，红色提示，不发请求 |
| API | JSON body 解析失败 | 400 + 结构化 error |
| API | 无效 PR URL | 400 + `INVALID_PR_URL` |
| API | GitHub Token 缺失 | 200 + mock fallback + warning |
| API | GitHub API 404/403/网络错误 | 200 + mock fallback + warning |
| API | 规则检查异常 | 单条规则 catch 跳过，不影响其他 |
| 结果页 | sessionStorage 为空 | 降级到 FALLBACK 硬编码数据 |
| 结果页 | JSON parse 失败 | 静默 catch，走 FALLBACK |
| 结果页 | ruleCheckResults 缺失 | `?? []` 安全兜底 |

---

## 10. Mock 数据体系

| 数据 | 用途 |
|------|------|
| `mockPr` | Mock PR 元信息 |
| `mockReview` | Mock AI 分析结果（2 风险 + 3 建议） |
| `analysisSteps` | 分析面板 6 步进度（解析→获取PR→获取文件→规则检查→AI分析→生成报告） |
| `examplePRs` | 3 个示例 PR URL |
| `featureCards` | 首页 3 张功能卡片 |
| `mockChangedFiles`（route.ts 内） | 4 个文件触发 6 条规则，用于 Mock 演示规则预检查 |

## 11. 错误处理与降级策略

### 11.1 统一错误模型

`createAppError(code, detail?)` → `AppError` 覆盖 17 种错误码，每种带：
- `stage` — 错误阶段（validation / github / ai / report / client / unknown）
- `action` — 用户可执行操作建议
- `recoverable` — 是否可恢复

### 11.2 降级矩阵

| 场景 | HTTP | 行为 |
|------|------|------|
| invalid URL | 400 | 不 fallback |
| GitHub 失败 | 200 | mock PR 兜底 + warning |
| AI 失败 | 200 | mock Review 兜底 + warning |
| Report 生成失败 | 200 | 简化 Markdown 兜底 + warning |
| 前端超时 (30s) | — | 展示可重试错误 |
| GitHub 超时 (10s) | 200 | mock 兜底 + GITHUB_TIMEOUT |
| AI 超时 (30s) | 200 | mock 兜底 + AI_TIMEOUT |

### 11.3 warnings 展示

- 分析浮动面板：按错误码差异化标题 + action 建议
- 结果页：amber 色 banner 列出所有降级提示
- 重新分析按钮：结果页可直接重试
