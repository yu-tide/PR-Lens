PR Lens 技术选型与实现方案
1. 文档目的

本文档旨在明确 PR Lens 项目的技术选型、架构设计和实现方案，为开发团队提供稳定可执行的指导，确保 MVP 阶段可交付、可演示，同时为后续扩展提供参考。

2. 系统概述

PR Lens 是一个 AI PR Review 辅助工具，主要功能包括：

- 输入公开 GitHub PR 链接。
- 获取 PR 基本信息及变更文件。
- 执行规则预检查。
- 调用 AI 生成摘要、风险提示和 Review 建议。
- 输出可复制或下载的 Markdown Review 报告。
  
系统定位为辅助人工审查，不直接替代 Reviewer。

3. 技术选型

3.1 前端

- 框架：React + TypeScript
- UI 库：Tailwind CSS + shadcn/ui
- 状态管理：React Context 或 Zustand
- 组件功能：
  - GitHub PR 输入与校验
  - 分析过程步骤条
  - Markdown 报告预览与复制下载
  - 风险列表和 Review 建议展示
  - Mock 数据演示
    
3.2 后端

- 运行环境：Node.js
- 框架：Express / Fastify
- 功能：
  - GitHub API 调用与数据解析
  - 规则预检查
  - AI 调用接口
  - Markdown 报告生成
  - Mock 模式支持
- 安全：
  - GitHub Token 和 AI API Key 保存在环境变量
  - 前端不暴露密钥
  - 不保存用户 PR 数据
    
3.3 AI 与数据处理

- 模型调用：OpenAI 或可选 LLM
- 输入：PR metadata + changed files + patch
- 输出：
  - 结构化 JSON，包括摘要、风险列表和建议
- 上下文裁剪：
  - 优先保留风险文件、核心变更
  - 忽略 lock 文件、样式、自动生成文件和静态资源
- 降级策略：
  - 模型异常时使用 Mock 数据
  - 页面不崩溃，保持可演示
    
3.4 数据存储

- MVP 阶段无需数据库
- Mock 模式和本地状态足够支撑 demo
- 后续版本可考虑引入数据库以支持历史记录和团队管理
  
3.5 安全与边界

- 不分析私有仓库
- 不向 GitHub 发布评论
- AI 分析结果仅供参考，最终审查由开发者人工判断
  
4. 系统架构

[前端 React] <-> [后端 Node.js API] <-> [GitHub API / AI 模型]

- 前端负责用户输入、状态展示和报告生成
- 后端处理数据获取、规则检查、AI 调用和 Markdown 输出
- Mock 模式可替代后端调用，实现离线演示
  
5. 核心模块设计

5.1 PR 数据获取

- 功能：
  - 校验 PR 链接
  - 获取基本信息、changed files 和 patch
- 输出：
  - PRMeta 对象
  - ChangedFile 列表
    
5.2 规则预检查

- 功能：
  - 识别依赖文件、配置文件、鉴权逻辑、敏感信息等
- 输出：
  - RuleCheckResult 列表
  - 风险等级 High / Medium / Low
    
5.3 AI 分析

- 功能：
  - 生成 PR 摘要
  - 生成风险列表
  - 生成 Review 建议
- 输出：
  - ReviewResult JSON
- 验证：
  - 输出结构化，异常降级至 Mock 数据
  - 提供可复制的 Markdown 报告内容
    
5.4 Markdown 报告生成

- 功能：
  - 合并 PR 信息、摘要、风险和建议
  - 支持复制和下载
- 格式：
  - 可直接粘贴至 GitHub Review 评论
    
5.5 Mock 演示模式

- 功能：
  - 前端可快速展示完整流程
  - 后端提供示例数据
- 用途：
  - 演示、测试和录制 Demo
    
6. 可选增强功能

- 风险等级筛选
- 不同风格 Markdown 模板
- Diff 展示优化
- 上下文裁剪优化
- 分析进度可视化
  
7. 不做功能（MVP 限制）

- 用户登录
- 数据库存储
- 私有仓库授权
- GitHub App 集成
- 自动发布 Review 评论
- 自动修复代码
- 自动判断合并可行性
- 多平台支持（GitLab/Gitee/Bitbucket）
- 历史分析记录
- 团队管理后台
  
8. 验收标准

功能验收

- 系统可获取 PR 信息和变更文件
- 规则预检查和 AI 分析可生成摘要、风险和建议
- Markdown 报告可复制或下载
- Mock 模式可完整运行
  
工程验收

- main 分支可运行
- README 和 .env.example 完整
- 不提交真实 API Key
- PR 提交记录规范，能够展示开发过程
  
9. 总结

本技术选型方案明确了 MVP 阶段可交付的功能、技术栈和系统架构，确保开发团队在有限时间内完成核心功能，同时为后续扩展提供清晰指导。