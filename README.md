# PR Lens — AI PR Review 助手

输入 GitHub Pull Request 链接，自动获取代码变更，通过**规则预检查 + AI 双通道分析**，生成 PR 变更摘要、风险识别、Review 建议和 Markdown 报告。

**所选议题：题目三 · AI PR Review 助手**

---

## Demo

- 在线体验：[https://www.pr-lens.xyz](https://www.pr-lens.xyz)（无需登录）
  - 演示 PR 1：https://github.com/vercel/next.js/pull/90732
  - 演示 PR 2：https://github.com/vercel/next.js/pull/77410
- Demo 视频：【AI PR Review 助手-哔哩哔哩】 https://b23.tv/qVeuVH8

---

## 核心功能

| 功能 | 说明 |
|------|------|
| 🔗 **PR 链接解析** | 正则校验 + 提取 owner/repo/pullNumber |
| 📋 **PR 信息获取** | GitHub REST API 获取标题、作者、描述、diff 统计 |
| 📁 **变更文件获取** | changed files + unified diff patch，超 300 行自动裁剪 |
| 🔍 **规则预检查** | 7 条确定性规则：依赖/配置/鉴权/硬编码密钥/大量删除/外部调用/Diff 不可用 |
| 🤖 **AI 智能分析** | 中文变更摘要、风险识别（HIGH/MEDIUM/LOW）、Review 建议、测试缺口检测 |
| 🎭 **Reviewer Persona** | 4 种审查角色：🛡 安全 / ⚡ 性能 / 🧪 测试 / 🧩 可维护性，各有独立 System Prompt |
| 📊 **数据看板** | 风险评分、环形图、柱状图、KPI 卡片 |
| 🏷️ **风险工作站** | 左右分栏：风险索引 + 详情面板（问题 / 影响 / 证据 / 建议 / 人工确认） |
| 📝 **评论草稿箱** | AI 生成 + 手动编辑 + 勾选一键复制 → 直接粘贴到 GitHub PR Review |
| 📄 **Markdown 报告** | 8 段结构化报告，可复制可下载 |
| 🔄 **SSE 流式进度** | 6 步骤实时展示 + 耗时计时，支持取消 |
| 🛡️ **全链路容错** | AI 3 次退避重试 + 降级 fallback，17 种结构化错误码 |
| 🎨 **Mock 模式** | 无需 API Key 即可体验完整流程 |

---

## 亮点

### 🌟 1. Reviewer Persona 分层审查架构

区别于"把所有代码丢给一个通用 AI"，系统定义 4 个独立专家角色，每个角色有专属 System Prompt、检查清单和**排除范围**（明确告诉 AI 不要报告什么），通过"身份 → 排除 → 格式"三层锐化，有效降低幻觉。

### 🌟 2. 规则引擎 × AI 双通道风险检测 + 合并去重

- **确定性规则引擎**（7 条）：0 误报，基于关键词/模式精确匹配
- **AI 概率性分析**：语义理解，覆盖规则无法捕获的问题

通过**文件路径 + 话题（topic）**作为合并键自动去重，AI 和 Rule 命中同一话题时合并为 `ai_and_rule` 来源。AI 不可用时规则结果自动构建降级 ReviewResult，用户不会看到白屏。

### 🌟 3. 证据驱动的可验证审查

每条 AI 风险输出结构化证据（`EvidenceItem[]`），包含文件路径、行号、命中代码片段和证据说明。Reviewer 可在 UI 中直接验证 AI 的判断依据，解决 AI Review"黑盒信任"问题。

### 🌟 4. 精细化 Prompt 工程

噪声过滤（跳过 8 类锁文件）、上下文裁剪（单文件 ≤40 行、总 patch ≤200 行）、中文输出强制、等级判定标准嵌入 Prompt、结构化 JSON 输出约束、temperature=0 确保可复现性。

### 🌟 5. 全链路容错与渐进式降级

AI 最多 3 次退避重试（1s/2s 间隔），所有 17 种错误码都有 `recoverable` / `stage` / `action` 三要素，任何环节失败都不影响用户获得有价值的输出。

---

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 16 (App Router) |
| UI | React 19 + TypeScript + Tailwind CSS 4 |
| API | GitHub REST API |
| AI | 百炼（DashScope）OpenAI-compatible Chat Completions |
| 认证 | jose (JWT) + Prisma + bcryptjs |
| 工具 | ESLint + Vitest |

---

## 快速开始

```bash
npm install                    # 安装依赖
cp .env.example .env.local     # 配置环境变量（不配置也可用 Mock 模式）
npm run dev                    # 启动开发服务器 → http://localhost:3000
```

> 💡 **Mock 模式**：不配置任何 API Key 也能启动，点击示例 PR 即可体验完整流程。

---

## 项目结构

```
pr-lens/
  docs/                         # 需求 / MVP / 业务流程 / 技术栈 / 决策记录
  src/
    app/
      page.tsx                  # 首页（输入 PR URL + 选择 Persona）
      result/page.tsx           # 结果页（看板 + Tab 分区）
      api/analyze-pr/route.ts   # 分析 API（POST + SSE 流式）
      api/auth/                 # 认证 API
      api/history/              # 历史记录 API
    components/result/          # 结果页子组件（10+ 组件：看板、风险工作站、草稿箱等）
    hooks/                      # 自定义 Hooks（结果数据、交互动作、代码上下文）
    services/
      github/                   # GitHub REST API 客户端 + PR URL 解析 + Diff 解析
      review/                   # 规则引擎 + 风险合并 + Markdown 报告生成
      ai/                       # 百炼客户端 + Prompt 模板 + AI 编排 + 输出解析
      errors/                   # 17 种统一错误码工厂
      client/                   # 前端 SSE 流式请求封装
    mocks/                      # Mock PR 数据 + 4 种 Persona 独立 Mock Review
    types/index.ts              # 全量 TypeScript 类型定义
    utils/                      # 工具函数
```

---

## 设计说明

- **模型选择**：阿里百炼 `qwen-plus`（OpenAI 兼容协议），中文理解优异，迁移其他模型仅需改 `baseUrl` + `model`
- **上下文获取**：PR Diff 级别上下文，单文件 ≤40 行裁剪 + 噪声过滤，不引入全仓库索引以保持 MVP 简洁
- **准确性保障**：规则引擎 0 误报保证基础召回 + AI 语义理解覆盖逻辑问题 + Persona 分层减少幻觉 + 证据驱动 + 置信度标注 + 人工确认标记

---

## 当前边界

**支持**：公开 PR 分析 · 单次 Review 报告 · Markdown 报告复制/下载 · Mock 模式 · 4 种 Persona · SSE 流式进度 · AI 失败自动降级

**暂不支持**：私有仓库 · GitHub App · 自动合并判断 · 自动修复 · 多平台（GitLab/Gitee）· 全仓库语义索引

---

## 扩展方向

短期：多模型支持 · PR Discussion 上下文 · 关联 Issue 上下文 · 误报反馈 · 自定义规则

中期：GitHub App 集成 · AST 级别规则 · 全仓库上下文索引 · 多模型交叉验证 · CI/CD 集成

---

> ⚠️ AI Review 结果仅作为辅助参考，可能存在误报或漏报。最终 Review 结论应由开发者人工判断。PR Lens 的定位是**辅助人工代码评审**，而非替代 Reviewer 做最终决策。
