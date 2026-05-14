# 谷记账技术文档

## 1. 文档目的

这份文档面向项目维护者和二次开发者，重点回答下面几个问题：

- 这个项目当前到底做了什么。
- 核心页面、状态和数据流如何组织。
- AI 助手、统计分析、导入导出这些相对复杂的模块是怎么落地的。
- 后续扩展时应该优先改哪里，避免破坏现有逻辑。

如果你只是第一次接手项目，建议先读 [README.md](./README.md)，再回来看这份文档。

## 2. 项目概览

项目是一个以移动端体验为主的批次记账 App。用户以“批次”为核算单位，围绕某个商品、项目或交易组合连续记录收入与支出，系统自动计算利润并保留全部历史记录。

当前主要业务链路：

1. 新建批次。
2. 在批次下新增多条收入/支出记录。
3. 在首页、批次页、统计页查看自动汇总后的利润结果。
4. 在“我的”页面进行数据备份、恢复、合并和清空。
5. 通过 AI 助手将自然语言账单转换成待确认的记录动作。

## 3. 技术选型

- 框架：Vue 3
- 语言：TypeScript
- 构建：Vite
- 路由：Vue Router
- 状态管理：Pinia
- UI 组件：Vant
- 样式：Tailwind CSS v4 + 全局 CSS Variables
- 图表：ApexCharts + `vue3-apexcharts`
- 富文本渲染：MarkdownIt
- 持久化：浏览器 LocalStorage

技术选型的核心取舍：

- Vue 3 + Pinia 适合这种本地状态驱动型中小前端应用。
- Vant 更适合移动端表单、弹层、Tabbar、Picker 这类高频交互。
- ApexCharts 能快速提供趋势图和 donut 图，不用单独封装底层图形系统。
- LocalStorage 足够支撑当前单端本地账本场景，接入成本低，但需要提供导入导出能力作为数据兜底。

## 4. 项目结构

```text
src/
├── assets/
│   └── main.css
├── components/
│   └── bookkeeping/
│       ├── AIAssistantPage.vue
│       ├── BatchCard.vue
│       ├── BatchForm.vue                # 旧组件，当前主流程未使用
│       ├── BatchFormPage.vue
│       ├── RecordForm.vue               # 旧组件，当前主流程未使用
│       ├── RecordFormPage.vue
│       ├── RecordTimeline.vue
│       └── SummaryCard.vue              # 历史文件，当前主流程未使用
├── layouts/
│   └── BookkeepingLayout.vue
├── router/
│   └── index.ts
├── stores/
│   └── bookkeeping.ts
├── utils/
│   └── format.ts
├── views/
│   ├── BatchFormView.vue
│   ├── BatchesView.vue
│   ├── DashboardView.vue
│   ├── HomeView.vue                     # 历史残留文件
│   ├── ProfileView.vue
│   ├── RecordFormView.vue
│   └── StatisticsView.vue
├── App.vue
└── main.ts
```

当前主路径页面以 `views/` 为入口，`components/bookkeeping/` 下主要承载页面级业务组件与复用组件。项目里保留了少量历史文件，文档中已单独标记，后续清理时应先确认无引用再删。

## 5. 启动流程

入口文件为 [src/main.ts](/Users/a1/Desktop/demo/Notely%20AI/src/main.ts)：

- 引入 `vant/lib/index.css` 和全局样式 `src/assets/main.css`
- 创建 Vue App
- 注册 Pinia
- 注册 Router
- 挂载到 `#app`

[src/App.vue](/Users/a1/Desktop/demo/Notely%20AI/src/App.vue) 当前非常薄，只承担顶层 `RouterView` 容器职责。

## 6. 路由结构

路由定义在 [src/router/index.ts](/Users/a1/Desktop/demo/Notely%20AI/src/router/index.ts)。

### 6.1 主布局路由

根路径 `/` 使用 `BookkeepingLayout` 作为布局壳，内部挂载四个子页面：

- `/` -> `dashboard`
- `/batches` -> `batches`
- `/statistics` -> `statistics`
- `/profile` -> `profile`

`BookkeepingLayout` 负责：

- 页面切换过渡动画
- 底部 `Tabbar`
- “记一笔”主操作跳转到新增记录页
- 将主区域和底部导航拆成独立滚动层

### 6.2 独立功能页

以下页面不走底部导航壳，而是独立路由：

- `/batch/new`
- `/batch/:id/edit`
- `/record/new`
- `/record/:id/edit`
- `/ai-assistant`

这样做的目的是把表单页和 AI 页面从主导航流程中剥离出来，减少布局耦合，也避免底部 Tabbar 对复杂输入界面造成干扰。

## 7. 页面职责

### 7.1 DashboardView

[src/views/DashboardView.vue](/Users/a1/Desktop/demo/Notely%20AI/src/views/DashboardView.vue)

职责：

- 展示今日收入、支出、净额
- 展示本月收入、本月支出
- 展示最近批次列表
- 提供批次编辑、删除快捷入口
- 提供可拖拽吸边的 AI 悬浮入口

关键点：

- 今日/昨日对比在页面内用 `computed` 实时计算。
- 趋势迷你图使用 `vue3-apexcharts`。
- AI 悬浮球位置持久化到 `notely-ai-bubble-position`。
- 悬浮球点击和拖拽已拆开处理，避免点击无法跳转的问题。

### 7.2 BatchesView

[src/views/BatchesView.vue](/Users/a1/Desktop/demo/Notely%20AI/src/views/BatchesView.vue)

职责：

- 批次横向切换
- 当前批次概览
- 当前批次历史记录时间线
- 批次编辑 / 删除
- 记录编辑 / 删除

关键点：

- 当前选中批次通过路由 query `batchId` 驱动。
- 批次详情卡片使用 `van-swipe-cell` 支持侧滑编辑和删除。
- 记录列表使用 `RecordTimeline` 组件做日期分组和滑删。

### 7.3 StatisticsView

[src/views/StatisticsView.vue](/Users/a1/Desktop/demo/Notely%20AI/src/views/StatisticsView.vue)

职责：

- 按日 / 周 / 月 / 年查看当前周期统计
- 切换收入 / 支出趋势
- 展示最佳点、低谷、活跃日期
- 展示收支占比 donut 图

关键点：

- `statisticsPeriod` 控制统计周期。
- `trendMetric` 控制趋势图展示收入还是支出。
- 统计维度通过页面内的 `getPeriodMeta`、`createBuckets`、`getBucketKey` 完成建桶和聚合。
- 月视图在数据多时支持横向滚动，并自动定位到今天附近。

### 7.4 ProfileView

[src/views/ProfileView.vue](/Users/a1/Desktop/demo/Notely%20AI/src/views/ProfileView.vue)

职责：

- 显示本地账本概览
- 导出 JSON 备份
- 导出 CSV 明细
- 导入 JSON 备份（合并 / 覆盖）
- 清空本地账本

这是当前“数据安全”和“迁移能力”的主入口。

### 7.5 RecordFormView / BatchFormView

两个页面是表单页容器，负责：

- 根据路由参数读取待编辑实体
- 把保存结果回写到 store
- 在保存后跳回批次页

表单本体分别落在：

- [src/components/bookkeeping/RecordFormPage.vue](/Users/a1/Desktop/demo/Notely%20AI/src/components/bookkeeping/RecordFormPage.vue)
- [src/components/bookkeeping/BatchFormPage.vue](/Users/a1/Desktop/demo/Notely%20AI/src/components/bookkeeping/BatchFormPage.vue)

### 7.6 AIAssistantPage

[src/components/bookkeeping/AIAssistantPage.vue](/Users/a1/Desktop/demo/Notely%20AI/src/components/bookkeeping/AIAssistantPage.vue)

职责：

- 聊天输入
- 调用远程 AI 或本地兜底解析
- 展示待确认记录
- 让用户选择已有批次或新建批次
- 确认后写入 store
- 管理 SiliconFlow API Key

这个页面是整个项目中逻辑最复杂的单文件之一。

## 8. 数据模型

数据模型定义在 [src/stores/bookkeeping.ts](/Users/a1/Desktop/demo/Notely%20AI/src/stores/bookkeeping.ts)。

### 8.1 RecordCategory

```ts
export type RecordCategory =
  | '进货支出'
  | '邮费'
  | '手续费'
  | '包装费'
  | '卖出收入'
  | '其他收入'
```

### 8.2 RecordType

```ts
export type RecordType = 'income' | 'expense'
```

### 8.3 Batch

```ts
export interface Batch {
  id: string
  name: string
  createdAt: string
  status: 'ongoing' | 'completed'
  cover: string
  imageUrl?: string
}
```

### 8.4 AccountRecord

```ts
export interface AccountRecord {
  id: string
  batchId: string
  type: 'income' | 'expense'
  category: RecordCategory
  amount: number
  note: string
  date: string
  imageUrl?: string
}
```

### 8.5 RecordDraft

```ts
export interface RecordDraft {
  batchId: string
  category: RecordCategory
  amount: number
  note: string
  date: string
  imageUrl?: string
}
```

### 8.6 BookkeepingBackup

```ts
export interface BookkeepingBackup {
  app: 'notely-ai'
  version: 1
  exportedAt: string
  data: {
    batches: Batch[]
    records: AccountRecord[]
  }
}
```

## 9. Store 设计

核心 store 为 [src/stores/bookkeeping.ts](/Users/a1/Desktop/demo/Notely%20AI/src/stores/bookkeeping.ts)。

### 9.1 单一数据源

当前只维护两个主数组：

- `batches`
- `records`

绝大多数统计结果都通过 `computed` 实时推导，而不是冗余存储。

### 9.2 分类自动映射收支

项目没有让用户直接选择 `income` 或 `expense`，而是通过 `categoryTypeMap` 自动映射：

- `进货支出`、`邮费`、`手续费`、`包装费` -> `expense`
- `卖出收入`、`其他收入` -> `income`

这个设计非常重要，它保证了：

- 表单层更简单
- AI 解析层不用关心正负号方向
- 统计结果更稳定，不会因用户误选“收入/支出”破坏数据

### 9.3 核心 getters / computed

store 当前暴露的核心派生数据包括：

- `sortedBatches`
- `sortedRecords`
- `recentRecords`
- `totalIncome`
- `totalExpense`
- `totalProfit`
- `monthlyIncome`
- `monthlyExpense`
- `monthlyProfit`
- `profitTrend`

### 9.4 核心方法

- `getBatchSummary(batchId)`
- `getBatchRecords(batchId)`
- `getBatchName(batchId)`
- `addBatch(name, imageUrl?)`
- `updateBatch(batchId, payload)`
- `deleteBatch(batchId)`
- `updateBatchStatus(batchId, status)`
- `addRecord(draft)`
- `updateRecord(recordId, draft)`
- `deleteRecord(recordId)`
- `exportBackup()`
- `importBackup(payload, mode)`
- `clearLedger()`

### 9.5 本地持久化

数据通过 `watch([batches, records], ...)` 自动写入 LocalStorage，当前存储 key：

```ts
const STORAGE_KEY = 'notely-bookkeeping-v3'
```

这意味着：

- 任一批次或记录变化，都会触发持久化
- 刷新后会自动恢复
- 没有后端同步能力，因此导出备份很重要

### 9.6 数据恢复与规范化

`importBackup` 支持对导入数据做规范化：

- `normalizeBatch`
- `normalizeRecord`
- `isRecordCategory`

作用是尽量把非标准数据转成当前可接受的数据形态，降低导入失败率，同时过滤明显无效的数据。

## 10. 表单流转

### 10.1 批次表单

`BatchFormPage` 支持：

- 输入批次名称
- 上传一张封面图
- 新建或编辑同构处理

表单校验相对简单，当前只强制要求名称非空。

### 10.2 记录表单

`RecordFormPage` 支持：

- 选择所属批次
- 快速新建批次并自动回填
- 选择分类
- 输入金额
- 上传记录图片
- 输入备注
- 修改日期

保存时会校验：

- 已选择批次
- 有合法分类
- 金额为正数

如果从编辑态进入，会先回填旧记录数据。

## 11. AI 助手设计

AI 助手是本项目中最值得单独说明的模块。

### 11.1 设计原则

AI 助手并不直接操作 store，而是遵循“解析 -> 确认 -> 执行”的流程：

1. 用户输入自然语言。
2. 系统尝试调用远程模型解析。
3. 如果失败，退回本地规则解析。
4. 页面展示待确认记录清单。
5. 用户选择批次或新建批次。
6. 用户点击确认后，才真正写入 store。

这个设计的优点是：

- 避免 AI 误判后直接污染账本
- 兼容远程 AI 与本地解析双通道
- 业务写入逻辑始终保持单一出口

### 11.2 远程模型配置

当前默认模型：

```ts
const modelName = 'deepseek-ai/DeepSeek-V4-Flash'
```

调用地址：

```ts
https://api.siliconflow.cn/v1/chat/completions
```

API Key 来源优先级：

1. 当前浏览器 LocalStorage 中的 `notely-siliconflow-api-key`
2. `VITE_SILICONFLOW_API_KEY`

### 11.3 工具调用协议

AI 请求要求模型只做一件事：调用 `create_records` 工具，返回结构化记录，而不是直接输出最终数据写入指令。

工具返回结构的关键字段：

- `batch`
  - `action: 'create' | 'use'`
  - `name`
- `records`
  - `category`
  - `amount`
  - `note`
  - `date`

前端收到后会通过 `normalizeToolRecords()` 再次清洗。

### 11.4 本地兜底解析

当远程模型不可用时，页面会使用本地规则解析，主要依赖：

- `parseChineseNumber`
- `normalizeDate`
- `inferCategory`
- `cleanNote`
- `inferBatchNameFromText`
- `parseRecordsLocally`

本地解析能力有限，但对类似：

- “今天买栗子十块钱，运费五块钱”
- “卖出收入一百二十元”
- “包装费六块，手续费三块”

这样的简单账单足够可用。

### 11.5 语音输入

AI 页通过浏览器原生 Web Speech API 做语音识别：

- 优先读取 `window.SpeechRecognition`
- 兼容 `webkitSpeechRecognition`
- 识别语言固定为 `zh-CN`

识别完成后直接把最终文本送入与文字输入相同的 `sendMessage()` 流程。

### 11.6 UI 形态

AI 页主要由三部分组成：

- 头部：返回、标题、设置、模型标记
- 中部：聊天消息流
- 底部：快捷短语、输入框、语音按钮、发送按钮

确认执行清单和 API Key 设置都放在底部 `Popup` 中完成。

## 12. 统计分析实现

统计页是另一个逻辑密度较高的模块。

### 12.1 周期定义

通过 `getPeriodMeta(period)` 返回：

- `label`
- `start`
- `end`

支持四种周期：

- `day`
- `week`
- `month`
- `year`

### 12.2 建桶策略

`createBuckets(period, start, end)` 负责为趋势图构造时间桶：

- `year`：按 12 个月建桶
- `month`：按当月每天建桶
- `week` / `day`：按日期逐日建桶

记录落桶时通过 `getBucketKey(date, period)` 决定使用完整日期还是年月。

### 12.3 趋势指标

当前趋势图只展示：

- 收入
- 支出

利润虽然在页面摘要中展示，但并未作为主趋势切换项提供。

### 12.4 图表辅助指标

统计页额外计算了：

- `profitRate`
- `averageRecordAmount`
- `bestTrendPoint`
- `worstTrendPoint`
- `activeTrendPoint`
- `incomeRatio`
- `expenseRatio`

这些指标基本都由同一套周期数据派生出来，没有额外存储。

## 13. 主题系统

全局主题集中在 [src/assets/main.css](/Users/a1/Desktop/demo/Notely%20AI/src/assets/main.css)。

### 13.1 核心 CSS Variables

- `--app-primary`
- `--app-primary-strong`
- `--app-primary-soft`
- `--app-income`
- `--app-expense`
- `--app-warning`
- `--app-page`
- `--app-surface`
- `--app-surface-soft`
- `--app-border`
- `--app-text`
- `--app-text-muted`
- `--app-text-subtle`

### 13.2 与 Vant 的映射

同时定义了若干 `--van-*` 变量，使 Vant 组件跟项目主题保持一致，例如：

- `--van-primary-color`
- `--van-success-color`
- `--van-danger-color`
- `--van-text-color`
- `--van-background`

### 13.3 Toast 样式修正

项目显式覆盖了：

- `--van-toast-background-color`
- `--van-toast-text-color`
- `--van-toast-icon-color`

并对 `.van-toast`、`.van-toast__text` 做了样式兜底，避免被全局 popup 或主题变量联动影响而变白。

## 14. 工具函数

[src/utils/format.ts](/Users/a1/Desktop/demo/Notely%20AI/src/utils/format.ts) 提供了统一的财务语义和格式化方法：

- `formatMoney(amount, signed?)`
- `getFinancialToneClass(tone, amount?)`
- `getRecordDotClass(tone)`
- `formatRecordAmount(amount, tone)`
- `formatDate(date)`

建议：

- 组件里不要自己重复写金额格式化逻辑。
- 组件里不要自行判断利润正负对应的颜色。
- 统一通过这些工具函数和 `--app-*` 变量控制样式语义。

## 15. 构建与工程配置

### 15.1 Vite

[vite.config.ts](/Users/a1/Desktop/demo/Notely%20AI/vite.config.ts) 当前包含：

- `@vitejs/plugin-vue`
- `vite-plugin-vue-devtools`
- `unplugin-auto-import`
- `unplugin-vue-components`
- `@vant/auto-import-resolver`
- `@tailwindcss/vite`

并设置：

```ts
build: {
  chunkSizeWarningLimit: 1000,
}
```

这是因为图表依赖会让产物体积偏大，默认 warning 容易误导。

### 15.2 PostCSS

[postcss.config.cjs](/Users/a1/Desktop/demo/Notely%20AI/postcss.config.cjs) 当前保持空插件配置：

```js
module.exports = {
  plugins: {},
}
```

原因是旧版 `postcss-px-to-viewport` 在当前依赖组合下容易产生兼容性和迁移噪音，暂未启用。

## 16. 已知问题与技术债

### 16.1 历史文件未完全清理

当前仓库保留了：

- `src/views/HomeView.vue`
- `src/components/bookkeeping/SummaryCard.vue`
- `src/components/bookkeeping/BatchForm.vue`
- `src/components/bookkeeping/RecordForm.vue`

这些文件不是当前主路径的一部分，后续建议确认无引用后清理。

### 16.2 LocalStorage 单端限制

当前数据只在本地浏览器保存，存在以下限制：

- 清缓存或换设备会丢数据
- 无法多端同步
- 无用户账户体系

现阶段依靠导入导出缓解，但长期看如果要产品化，应考虑服务端存储。

### 16.3 AI 本地兜底能力有限

本地规则解析适合简单句式，不适合复杂上下文、多轮指代或非标准金额表达。后续若继续强化 AI 体验，建议引入更稳定的结构化提示策略，或者补更强的本地 parser。

### 16.4 统计页和首页的日期逻辑依赖浏览器时区

多个地方使用 `new Date().toISOString().slice(0, 10)` 或本地时间拼接日期。当前在单端本地使用问题不大，但如果未来接服务端或跨时区同步，需要统一日期基准。

## 17. 推荐扩展方向

按优先级建议如下：

1. 清理历史残留文件，压缩认知噪音。
2. 为 store 增加更系统的单元测试，重点覆盖导入导出、分类映射、利润计算。
3. 为 AI 本地解析补测试样例，避免规则改动导致识别回退。
4. 增加批次状态切换入口和筛选能力。
5. 增加记录搜索、分类筛选和日期筛选。
6. 设计更稳定的数据版本升级策略，为后续 schema 变化留接口。
7. 如果业务继续扩大，再考虑后端同步、登录体系和云备份。

## 18. 最近关键迭代摘要

### 2026-05-11

- 项目从记事本方向收敛到批次记账方向。
- 引入 `bookkeeping` store 管理批次和记录。
- 完成基础账本数据结构和本地持久化。

### 2026-05-12

- 统一主题变量。
- 底部导航改为 App 式布局。
- 批次卡片支持侧滑编辑和删除。
- 统计页补齐多周期切换。
- 首页接入 AI 悬浮入口。

### 2026-05-13

- AI 助手增加批次引导、新建批次识别、Markdown 渲染、语音识别。
- 修复 Toast 样式问题。
- 优化聊天气泡布局和确认添加体验。

### 2026-05-14

- 修复首页 AI 悬浮球点击无法进入页面的问题。
- 将轻触与拖拽逻辑拆分，并增加拖拽阈值，提升移动端点击成功率。
