1. 项目概述

项目名称： PR Lens  
项目类型： AI Pull Request Review 助手  
目标平台： GitHub 公开 Pull Request

PR Lens 是一个面向开发者的 AI PR Review 辅助工具。用户输入公开 GitHub Pull Request 链接后，系统自动获取 PR 基本信息和代码变更，结合规则预检查与 AI 分析，生成结构化的 PR 摘要、风险提示、Review 建议和可复制的 Markdown Review 报告。

PR Lens 的定位是辅助人工代码评审，而不是替代 Reviewer 做最终判断。系统不自动判断 PR 是否可以合并，也不直接向 GitHub 发布评论。

2. 项目目标

本项目优先解决以下问题：

- 帮助 Reviewer 快速理解 PR 的主要变更和影响范围。
- 标记需要优先关注的风险文件和变更点。
- 生成具体、可执行、可复制的 Review 建议草稿。
- 降低阅读大段 diff 前的理解成本。
- 避免输出泛泛而谈、无法落地的 AI 建议。
  
3. 目标用户

3.1 代码 Reviewer

核心用户包括：

- 团队 Tech Lead
- 资深开发者
- 项目 Maintainer
- 需要审核同事 PR 的开发者
  
他们的主要需求是：

- 快速理解 PR 改动范围。
- 找到需要优先查看的风险文件。
- 获得具体、可执行的 Review 建议。
- 减少人工阅读 diff 前的初筛成本。
  
3.2 PR 作者

次要用户包括：

- 普通业务开发者
- 实习生或新人开发者
- 开源贡献者
  
他们的主要需求是：

- 在提交 Review 前自查明显问题。
- 检查 PR 描述和代码变更是否清楚。
- 提前发现缺少错误处理、测试或说明的问题。
- 使用 AI 报告辅助修改 PR 内容。
  
4. 核心使用场景

4.1 Reviewer 快速理解陌生 PR

Reviewer 收到一个描述较少、文件变更较多的 PR 时，可以使用 PR Lens 先了解主要变更、影响模块、潜在风险和人工 Review 优先级。

4.2 PR 作者提交前自查

PR 作者在提交 Review 前，可以使用 PR Lens 检查是否存在明显风险、缺少错误处理、测试不足或说明不清等问题。

4.3 小团队提升 Review 效率

在 Reviewer 时间有限的小团队中，PR Lens 可作为 Review 前的辅助初筛工具，帮助团队更快判断人工 Review 重点。

5. MVP 范围

5.1 主流程

输入公开 GitHub PR 链接
-> 解析 PR 地址
-> 获取 PR 基本信息
-> 获取变更文件与 patch
-> 执行规则预检查
-> 调用 AI 生成分析结果
-> 展示 PR 摘要、风险点与 Review 建议
-> 生成可复制或可下载的 Markdown Review 报告
