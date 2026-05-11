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
  - 本月收入、本月支出、本月利润。
  - 利润趋势迷你图。
  - 最近批次账单列表。
- 批次账单
  - 批次收入、支出、利润自动统计。
  - 支持新建批次。
  - 支持查看单个批次下的历史收支记录。
- 新增记录
  - 类别包含：进货支出、邮费、手续费、包装费、卖出收入、其他收入。
  - 不需要填写单价和数量。
  - 输入金额后保存，Pinia 状态立即更新，利润自动重算。
- 统计页
  - 全部利润趋势。
  - 总收入、总支出占比。
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
}
```

## 5. 目录结构

```text
src/
├── components/bookkeeping/
│   ├── BatchCard.vue
│   ├── BatchForm.vue
│   ├── RecordForm.vue
│   ├── RecordTimeline.vue
│   └── SummaryCard.vue
├── stores/
│   └── bookkeeping.ts
├── utils/
│   └── format.ts
├── views/
│   └── HomeView.vue
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
- `addBatch(name)`：新建批次。
- `addRecord(draft)`：新增收支记录。

数据通过 `notely-bookkeeping-v2` 写入 LocalStorage。

## 7. 构建警告处理

- 移除了 `postcss-px-to-viewport` 的启用配置，避免旧插件的 PostCSS 8 迁移警告。
- 在 `vite.config.ts` 中设置 `build.chunkSizeWarningLimit: 1000`，避免 ApexCharts 正常依赖体积触发 chunk 警告。

## 8. 实时开发记录

### 2026-05-11

- 项目从 Notely AI 智能记事本调整为谷记账批次记账 App。
- 使用 Pinia + LocalStorage 实现批次和收支记录持久化。
- 拆分账本组件，替换原单文件演示页。
- 新增邮费、手续费、卖出收入等类别，并按类别自动判断收入或支出。
- 新增记录保存后，首页、批次页和统计页利润自动更新。
- 同步更新 README、TECH_DOC、TECH_BLOG 三个文档。
