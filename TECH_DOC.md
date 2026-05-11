# Notely AI - 技术文档

## 1. 项目简介
Notely AI 是一个 AI 驱动的智能记事本，支持自然语言创建、任务管理、笔记管理、标签分类、知识库检索等功能，帮助用户高效记录和管理信息，让 AI 成为用户的“第二大脑”。

---

## 2. 技术栈选型
基于图片中的规划与当前代码的实际情况，技术栈整理如下：

- **前端框架**: Vue 3 (组合式 API) + TypeScript
- **构建工具**: Vite
- **状态管理**: Pinia
- **UI 组件库**: 
  - *设计规划*: Naive UI
  - *当前实际*: **Vant** (见 `package.json` 与 `HomeView.vue` 中的 `van-tabs`)
- **路由管理**: Vue Router
- **HTTP 客户端**: Axios
- **日期处理**: Day.js
- **Markdown 解析**: Markdown-it
- **图表库**: ECharts (可选)
- **CSS 框架**: **TailwindCSS** (根据最近的文件变动，项目已引入 `@tailwindcss/vite` 插件)

---

## 3. 系统架构
### 3.1 表现层 (Presentation)
- Vue3 + TypeScript 前端应用
- Vite 构建工具
- UI 组件库 (规划为 Naive UI，当前为 Vant)

### 3.2 业务层 (Business)
- **笔记管理 (Notes)**: 创建/编辑、分类/标签、搜索/过滤
- **任务管理 (Tasks)**: 创建/编辑、状态管理、截止日期
- **AI 助手 (AI Assistant)**: 自然语言解析、内容生成、智能推荐
- **知识库 (Knowledge)**: 笔记向量化、语义检索、关联推荐
- **用户管理 (User)**: 个人设置、偏好配置、数据管理

### 3.3 数据层 (Data)
- **Pinia**: 状态管理
- **IndexedDB**: 本地数据库
- **LocalStorage**: 本地存储
- **文件存储**: 上传附件

### 3.4 外部服务 (External)
- AI 大模型 API (如 OpenAI)
- 向量数据库 (如 Pinecone)
- 云存储服务 (如 OSS)
- 推送服务 (可选)

---

## 4. 核心功能模块
- **智能记录**: 自然语言创建、语音输入、AI 内容补全
- **笔记管理**: 增删改查、标签分类、全文检索
- **任务管理**: 任务清单、状态流转、提醒通知
- **AI 助手**: 内容总结、智能改写、生成大纲
- **知识库**: 向量检索、关联推荐、知识图谱
- **数据统计**: 笔记统计、任务统计、趋势分析
- **系统设置**: 主题设置、数据备份、隐私设置

---

## 5. AI 能力设计
- **自然语言解析**: 将用户输入的自然语言转换为结构化数据（任务/笔记/待办等）
- **内容生成**: 根据用户指令生成笔记内容、摘要、大纲等
- **智能分类**: 自动为内容添加标签和分类，提高管理效率
- **语义搜索**: 基于语义理解的搜索，找到更相关的笔记和信息
- **智能推荐**: 根据用户行为和内容，推荐相关笔记和任务

---

## 6. 预期项目结构 (src/)
```text
src/
├── assets/         # 静态资源
├── components/     # 组件
│   ├── common/     # 通用组件
│   ├── editor/     # 编辑器组件
│   └── ai/         # AI 相关组件
├── views/          # 页面视图
│   ├── notes/      # 笔记相关
│   ├── tasks/      # 任务相关
│   ├── ai/         # AI 助手页面
│   ├── tags/       # 标签管理
│   ├── stats/      # 数据统计
│   └── settings/   # 系统设置
├── stores/         # 状态管理 (Pinia)
│   ├── note.ts
│   ├── task.ts
│   └── ai.ts
├── services/       # 业务服务/API
│   ├── api.ts
│   ├── ai.ts
│   └── storage.ts
├── types/          # TS 类型定义
├── utils/          # 工具函数
├── router/         # 路由配置
├── App.vue         # 根组件
└── main.ts         # 入口文件
```

---

## 7. 开发计划
- **阶段一 (1-2周)**: 基础搭建，搭建项目基础架构，实现核心功能。
- **阶段二 (2-3周)**: 核心功能开发，开发笔记、任务等核心模块。
- **阶段三 (2-3周)**: AI 功能集成，集成 AI 能力，优化用户体验。
- **阶段四 (1-2周)**: 优化与测试，性能优化，功能测试。
- **阶段五 (1周)**: 部署上线，部署应用，上线发布。

---

## 8. 实时开发记录 (同步更新)
### 2026-05-11
- **环境修复**:
  - 修复了 `vite.config.ts` 中的 `import.meta.url` 报错，通过将 `tsconfig.node.json` 中的 `module` 改为 `ESNext`。
  - 修复了 `tsconfig.node.json` 和 `tsconfig.app.json` 中的 `tsBuildInfoFile` 报错，通过添加 `"incremental": true`。
  - 修复了 PostCSS 加载 TS 配置的报错，通过将 `postcss.config.ts` 重命名为 `postcss.config.cjs`（因为内容是 CommonJS 规范）。
- **技术栈调整**:
  - 引入了 TailwindCSS (通过 `@tailwindcss/vite` 插件)。
  - 确认当前实际使用的 UI 库为 **Vant**（而非设计图中的 Naive UI）。
- **文档与博客**:
  - 创建了第一篇技术博客 `TECH_BLOG.md`，记录了从零搭建与避坑指南。
- **前端页面搭建**:
  - 开始搭建前端基础页面布局（重构 `HomeView.vue` 为多标签页结构）。
- **代码托管**:
  - 初始化了本地 Git 仓库，并完成了首次提交。
  - 成功将代码推送到云端仓库 `https://cnb.cool/nanchen_042/notelyai`。
  - 已对本地 remote 地址进行安全处理，移除了 Token 信息。
- **云原生构建**:
  - 创建了 `.cnb.yml` 配置文件，配置了基于 Node 20 和 pnpm 的自动化构建流水线。
