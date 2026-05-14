# 谷记账 / Notely AI

## 项目定位

这个项目最初是一个偏 AI 笔记方向的前端实验，后续明确收敛成“批次记账”工具。当前的核心不是通用记事，而是围绕下面这条链路展开：

- 先创建批次。
- 再持续记录该批次的进货、邮费、手续费、包装费、卖出收入和其他收入。
- 每条记录都保留历史，不覆盖旧数据。
- 页面自动计算批次利润、全局利润和周期统计。
- 在需要时通过 AI 助手把自然语言拆成待确认的记账动作。

## 当前能力

- 首页总览
  - 展示今日收入、今日支出、今日净额。
  - 展示本月收入、本月支出和最近批次。
  - 提供右侧悬浮 `AI` 入口进入 AI 账单助手。
- 批次账单
  - 支持新建、编辑、删除批次。
  - 批次卡片自动汇总收入、支出、利润和记录数。
  - 可查看单个批次下的完整历史流水。
- 收支记录
  - 支持 `进货支出`、`邮费`、`手续费`、`包装费`、`卖出收入`、`其他收入`。
  - 支持新增、编辑、删除记录。
  - 每次卖出都作为独立记录保留，不覆盖历史记录。
- 统计分析
  - 支持按 `日 / 周 / 月 / 年` 查看统计结果。
  - 提供收入、支出、利润、收支占比和趋势图。
  - 月视图按每天建桶，默认自动滚动到今天附近。
- AI 账单助手
  - 支持文字输入和浏览器语音识别输入。
  - 可接入 SiliconFlow 的 `deepseek-ai/DeepSeek-V4-Flash`。
  - 未配置 API Key 时使用本地解析兜底，不阻塞基础记账流程。
  - AI 只负责拆解记录，真正写入前仍需用户确认。
- 数据管理
  - 账本数据保存在浏览器 LocalStorage。
  - 支持导出 JSON 备份和 CSV 明细。
  - 支持 JSON 合并导入、覆盖恢复和清空本地账本。

## 技术栈

- Vue 3
- TypeScript
- Vite
- Pinia
- Vue Router
- Vant
- Tailwind CSS v4
- ApexCharts / `vue3-apexcharts`
- LocalStorage
- MarkdownIt

## 快速启动

```sh
pnpm install
pnpm dev
```

常用命令：

```sh
pnpm dev
pnpm type-check
pnpm build
pnpm preview
```

## 环境要求

- Node.js: `^20.19.0 || >=22.12.0`
- 包管理器：`pnpm`

## AI 配置

AI 助手优先读取浏览器本地保存的 SiliconFlow API Key，其次读取环境变量 `VITE_SILICONFLOW_API_KEY`。

可选写法：

```env
VITE_SILICONFLOW_API_KEY=your_api_key_here
```

如果不配置，AI 页仍可使用，但会退回本地规则解析，能力比远程模型弱一些。

## 目录结构

```text
src/
├── assets/
│   └── main.css                    # 全局主题变量、动画、通用样式
├── components/bookkeeping/         # 账本业务组件
├── layouts/
│   └── BookkeepingLayout.vue       # 主布局，包含底部导航
├── router/
│   └── index.ts                    # 路由定义
├── stores/
│   └── bookkeeping.ts              # 核心账本 store
├── utils/
│   └── format.ts                   # 金额、日期、财务语义工具
├── views/
│   ├── DashboardView.vue           # 首页
│   ├── BatchesView.vue             # 批次页
│   ├── StatisticsView.vue          # 统计页
│   ├── ProfileView.vue             # 我的 / 数据管理
│   ├── BatchFormView.vue           # 批次编辑页
│   └── RecordFormView.vue          # 记录编辑页
├── App.vue
└── main.ts
```

## 关键设计原则

- 记录的收入/支出属性由分类自动映射，避免手动切换导致统计不一致。
- AI 不直接写库，只生成待确认操作，确保可控性。
- 财务颜色统一走工具函数和 CSS 变量，不在组件里散写判断。
- 主导航使用 App 式 `header / body / footer` 布局，避免底部栏遮挡内容。
- 所有核心数据都能通过导出 JSON 备份恢复，降低 LocalStorage 单点风险。

## 配置与约定

- `vite.config.ts` 中启用了：
  - `@` 别名映射到 `src/`
  - `VantResolver()` 自动导入
  - `@tailwindcss/vite`
  - `build.chunkSizeWarningLimit = 1000`
- `postcss.config.cjs` 当前保持空插件配置，避免旧版 `postcss-px-to-viewport` 兼容问题。
- 全局主题统一放在 `src/assets/main.css` 的 `--app-*` 和 `--van-*` 变量中维护。

## 文档说明

- [TECH_DOC.md](./TECH_DOC.md)
  - 面向维护者的技术文档，重点解释架构、数据模型、状态流和扩展方式。
- [TECH_BLOG.md](./TECH_BLOG.md)
  - 面向博客写作和对外分享的长篇文章，详细拆解这个项目的设计和实现过程。

## 现状说明

仓库里仍保留了少量历史文件，例如早期的 `HomeView.vue`、`SummaryCard.vue`、`BatchForm.vue`、`RecordForm.vue`。当前主流程已经迁移到新的页面和页面级组件中，这些旧文件不属于主路径实现，后续可以视情况继续清理。
