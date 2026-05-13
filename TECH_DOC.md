# 谷记账技术文档

## 1. 项目定位

项目已调整为移动端批次记账 App。核心目标是让用户按批次记录收支，尤其适合潮玩、球鞋、数码等转卖场景。每次卖出都可以继续新增一条记录，历史数据保留在对应批次中，总收入、总支出和利润实时联动。

## 2. 技术栈

- 前端框架：Vue 3 + TypeScript
- 构建工具：Vite
- 状态管理：Pinia
- UI 组件库：Vant
- 样式：TailwindCSS v4
- 图表：ApexCharts / vue3-apexcharts
- 数据持久化：LocalStorage

## 3. 当前功能

- 首页总览
  - 今日收入、今日支出、今日净额。
  - 本月收入、本月支出。
  - 首页趋势迷你图。
  - 最近批次账单列表。
- 批次账单
  - 批次收入、支出、利润自动统计。
  - 支持新建批次。
  - 支持编辑批次名称和封面图。
  - 支持侧滑删除批次，删除时同步删除该批次下的历史记录。
  - 支持查看单个批次下的历史收支记录。
- 新增记录
  - 类别包含：进货支出、邮费、手续费、包装费、卖出收入、其他收入。
  - 不需要填写单价和数量。
  - 输入金额后保存，Pinia 状态立即更新，利润自动重算。
- 统计页
  - 支持按日、周、月、年切换统计周期。
  - 趋势图按当前周期展示利润走势。
  - 月视图按 4 天聚合，避免整月日期挤压。
  - 当前周期总收入、总支出占比。
  - 当前周期维度明细。
- AI 账单助手
  - 首页悬浮 AI 入口跳转独立路由 `/ai-assistant`。
  - 对话层负责收集文字或语音识别后的自然语言需求。
  - 工具层将用户输入拆成待添加收支记录，弹窗中选择已有批次或新建批次后再调用 store 写入账本。
  - AI 页支持本地填写 SiliconFlow API Key；也可以配置 `VITE_SILICONFLOW_API_KEY`。配置后使用 SiliconFlow Chat Completions 和 `deepseek-ai/DeepSeek-V4-Flash`；未配置时使用本地解析兜底。
- 我的
  - 展示本地账本数据概览。

## 4. 数据模型

### Batch

```ts
interface Batch {
  id: string
  name: string
  createdAt: string
  status: 'ongoing' | 'completed'
  cover: string
  imageUrl?: string
}
```

### AccountRecord

```ts
interface AccountRecord {
  id: string
  batchId: string
  type: 'income' | 'expense'
  category: '进货支出' | '邮费' | '手续费' | '包装费' | '卖出收入' | '其他收入'
  amount: number
  note: string
  date: string
  imageUrl?: string
}
```

## 5. 目录结构

```text
src/
├── components/bookkeeping/
│   ├── BatchCard.vue
│   ├── BatchForm.vue
│   ├── BatchFormPage.vue
│   ├── AIAssistantPage.vue
│   ├── RecordForm.vue
│   ├── RecordFormPage.vue
│   └── RecordTimeline.vue
├── stores/
│   └── bookkeeping.ts
├── utils/
│   └── format.ts
├── views/
│   └── HomeView.vue
├── router/
│   └── index.ts
├── App.vue
└── main.ts
```

## 6. 状态管理

`src/stores/bookkeeping.ts` 是账本的核心状态模块：

- `batches`：批次列表。
- `records`：所有收支记录。
- `totalIncome` / `totalExpense` / `totalProfit`：全局统计。
- `monthlyIncome` / `monthlyExpense` / `monthlyProfit`：本月统计。
- `getBatchSummary(batchId)`：批次统计。
- `getBatchRecords(batchId)`：批次历史记录。
- `addBatch(name, imageUrl?)`：新建批次。
- `updateBatch(batchId, payload)`：编辑批次。
- `deleteBatch(batchId)`：删除批次，并删除关联记录。
- `addRecord(draft)`：新增收支记录。

数据通过 `notely-bookkeeping-v3` 写入 LocalStorage。

## 7. 主题和财务颜色

主题集中定义在 `src/assets/main.css`：

- `--app-primary`：应用主色，当前为账本绿。
- `--app-income`：收入色。
- `--app-expense`：支出/删除色。
- `--app-text` / `--app-text-muted` / `--app-text-subtle`：文字层级。
- `--van-primary-color` 等 Vant 变量映射到 `--app-*` 变量。

金额颜色不要在组件中直接写正负判断，应统一使用 `src/utils/format.ts`：

- `getFinancialToneClass('income')`
- `getFinancialToneClass('expense')`
- `getFinancialToneClass('profit', amount)`
- `getRecordDotClass(type)`
- `formatRecordAmount(amount, type)`

## 8. 构建警告处理

- 移除了 `postcss-px-to-viewport` 的启用配置，避免旧插件的 PostCSS 8 迁移警告。
- 在 `vite.config.ts` 中设置 `build.chunkSizeWarningLimit: 1000`，避免 ApexCharts 正常依赖体积触发 chunk 警告。

## 9. AI 工具执行流程

AI 助手不是动态表单页面，而是一个独立聊天路由。用户输入自然语言后，前端会尝试调用 SiliconFlow Chat Completions：

- 模型：`deepseek-ai/DeepSeek-V4-Flash`
- 接口：`https://api.siliconflow.cn/v1/chat/completions`
- 工具：`create_records`

API Key 可以在 AI 页面右上角配置入口填写，输入框使用密码模式，保存到当前浏览器 LocalStorage；页面只显示配置状态，不展示密钥内容。保存后状态会立即更新为本地 key 已读取。调用接口前会重新读取 LocalStorage，优先使用本地保存的 key，其次使用 `VITE_SILICONFLOW_API_KEY`。

聊天输入框支持浏览器原生 Web Speech API。点击麦克风后开始中文听写，识别到最终文本后自动作为聊天内容发送；不支持语音识别的浏览器会提示用户改用文字输入。

工具返回的记录不会直接写入，而是先进入底部确认弹窗。用户需要选择已有批次，或者切换为新建批次并填写批次名称。点击“确认添加”后，组件才会调用 `store.addBatch` 和 `store.addRecord` 写入账本。

## 10. 实时开发记录

### 2026-05-11

- 项目从 Notely AI 智能记事本调整为谷记账批次记账 App。
- 使用 Pinia + LocalStorage 实现批次和收支记录持久化。
- 拆分账本组件，替换原单文件演示页。
- 新增邮费、手续费、卖出收入等类别，并按类别自动判断收入或支出。
- 新增记录保存后，首页、批次页和统计页利润自动更新。
- 同步更新 README、TECH_DOC、TECH_BLOG 三个文档。

### 2026-05-12

- 统一 Vant 和应用主题变量，主色、文字色、页面背景、收入色和支出色集中维护。
- 将底部新增记录按钮重构为 footer 区域的 `Tabbar` 中心加号，页面主体用 `flex-1` 独立滚动。
- 批次卡片接入 `van-swipe-cell`，支持侧滑编辑和删除。
- 新增批次编辑能力，复用 `BatchFormPage`。
- 新增批次删除能力，删除批次时同步清理关联收支记录。
- 统计页新增日、周、月、年切换。
- 月视图按 4 天聚合，减少 x 轴日期密度。
- 抽象财务语义色工具，避免组件里散落利润、收入、支出颜色判断。
- 首页和统计页补齐无数据图表状态。
- 底部导航改为 header/body/footer 布局，`Tabbar` 作为 footer 不再遮挡页面滚动。
- 首页新增 AI 悬浮入口，AI 助手改为独立路由和工具确认弹窗。
- AI 聊天输入框新增语音识别入口，识别后的文本自动进入工具执行流程。

### 2026-05-13

- 优化 AI 助手引导语，开场白提示用户选择或新建批次。
- 支持智能识别新建批次意图，自动在确认清单中切换为“新建”模式。
- 引入轻量级 Markdown 渲染，支持加粗、行内代码和引用。
- 修复 Toast 样式，强制还原为深色背景，解决受全局变量影响变白的问题。
- 修复聊天气泡高度过大问题，去除 `display: table` 并改用 Flex 布局。
- 将确认添加成功的 Toast 停留时间延长至 30 秒。
