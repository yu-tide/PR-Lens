AI PR Review 助手：输入 GitHub Pull Request 链接，自动生成 PR 变更摘要、风险识别和 Review 建议，帮助开发者提升代码评审效率。
所选议题：题目三 · AI PR Review 助手

---
Demo
- 项目现已部署
  可访问链接：https://www.pr-lens.xyz
- Demo 视频：待补充

---
功能概览
PR Lens 支持以下核心流程：
输入 GitHub PR 链接
→ 获取 PR 基本信息
→ 获取 changed files / diff
→ 规则预检查
→ AI 分析
→ 生成 Review 报告
核心功能：
- GitHub PR 链接解析
- PR 基本信息获取
- changed files / patch 获取
- 规则预检查：依赖、配置、鉴权、敏感字段、大量删除等
- AI 生成 PR 变更摘要
- AI 识别风险代码
- AI 生成 Review 建议
- 生成可复制的 Markdown Review 报告
- Mock 模式兜底演示

---
技术栈
- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- GitHub REST API
- ESLint

---
快速开始

1. 安装依赖

```bash
npm install
```

2. 配置环境变量

```bash
# macOS / Linux
cp .env.example .env.local

# Windows PowerShell
Copy-Item .env.example .env.local
```

然后编辑 .env.local 填入真实的 API Key：

```env
GITHUB_TOKEN=your_github_token_here

# Bailian / DashScope OpenAI-compatible API
BAILIAN_API_KEY=
BAILIAN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
BAILIAN_MODEL=qwen-plus
```

3. 启动项目

```bash
# 标准启动
npm run dev

# Windows 国内开发环境（跳过 TLS 校验 + IPv4 优先）
npm run dev:local
```

其他命令：

```bash
npm run lint    # ESLint 检查
npm run build   # 生产构建
```

访问：http://localhost:3000

---
项目结构
pr-lens/
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
    10-implementation-overview.md
    11-tech-stack-and-api.md

  src/
    app/
      page.tsx
      result/page.tsx
      api/analyze-pr/route.ts

    components/
      result/                   ← 结果页子组件（PR10）

    services/
      client/                   ← 前端请求封装
      errors/                   ← 统一错误工厂
      github/                   ← GitHub API 客户端
      review/                   ← 规则检查 + 报告生成
      ai/                       ← 百炼 AI 客户端
    mocks/
    types/

---
设计说明
PR Lens 不直接把全部 diff 丢给 AI，而是先做规则预检查和上下文整理，再调用 AI 生成结构化结果。
主要设计点：
- 使用 GitHub REST API 获取公开 PR 数据
- 使用规则预检查识别高风险文件
- 使用 Context Builder 控制 AI 输入上下文
- 要求 AI 返回结构化 JSON
- 由系统生成 Markdown Review 报告
- Mock 模式保证 demo 可复现

---
当前边界
当前版本支持：
- 公开 GitHub PR 分析
- 单次 Review 报告生成
- Markdown 报告复制 / 下载
- Mock 示例演示
当前版本暂不支持：
- 用户登录
- 私有仓库授权
- GitHub App
- 自动发布 Review 评论
- 自动修复代码
- 自动判断是否可以合并
- 历史分析记录

---
项目文档


---
后续计划
- GitHub App 集成
- 私有仓库支持
- 自动发布 Review 评论
- 团队自定义 Review 规则
- 增量 Review
- CI 集成
- 静态分析工具集成

---
说明
AI Review 结果仅作为辅助参考，可能存在误报或漏报。最终 Review 结论应由开发者人工判断。