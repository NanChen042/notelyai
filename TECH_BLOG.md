# 谷记账开发日记：从记事本到批次记账 App

## 一、方向调整

项目最初叫 Notely AI，原计划是智能记事本。但最新需求更明确：做一个类似“谷记账”的移动端批次记账 App，用来记录每个批次的进货支出、邮费、手续费和卖出收入，并自动算出利润。

这次调整后，项目的重点从“笔记内容管理”转为“批次账本 + 本地数据 + 移动端交互”。

## 二、核心需求

- 收支类别要覆盖：进货支出、邮费、手续费、包装费、卖出收入、其他收入。
- 新增记录时只填类别、金额、备注、日期和所属批次，不做单价、数量。
- 每次卖出都新增一条记录，不覆盖历史卖出数据。
- 总收入、总支出、净利润和批次利润要自动更新。
- 数据存储在本地浏览器，刷新后仍保留。
- 代码要按正规前端方式组织，使用组件化和 Pinia。
- 界面参考 App 设计图，使用项目自带的 Vant、TailwindCSS 和 ApexCharts。

## 三、实现方案

### Pinia 账本状态

新增 `src/stores/bookkeeping.ts` 作为核心 store，维护两个主要数据：

- `batches`：批次账单。
- `records`：收支记录。

收入和支出不靠用户手动选择，而是由类别自动映射：

```ts
const categoryTypeMap = {
  进货支出: 'expense',
  邮费: 'expense',
  手续费: 'expense',
  包装费: 'expense',
  卖出收入: 'income',
  其他收入: 'income',
}
```

这样新增“邮费”或“手续费”时会自动计入支出，新增“卖出收入”时会自动计入收入，利润计算始终保持一致。

### 组件化拆分

账本相关 UI 拆到了 `src/components/bookkeeping/`：

- `SummaryCard.vue`：首页利润卡片。
- `BatchCard.vue`：批次卡片。
- `RecordTimeline.vue`：历史记录时间线。
- `RecordForm.vue`：新增收支记录弹窗。
- `BatchForm.vue`：新建批次弹窗。

`HomeView.vue` 负责页面组合和 tab 切换，不再把所有逻辑堆在一个文件里。

### 本地持久化

Pinia store 使用 LocalStorage 保存数据：

```ts
localStorage.setItem(STORAGE_KEY, JSON.stringify({
  batches: batches.value,
  records: records.value,
}))
```

读取时会恢复批次和历史记录，因此“批次账单每次卖出都要新填一次，上次历史数据也包含在内”这个需求可以自然满足。

## 四、界面调整

页面改成移动端 App 结构：

- 首页：本月利润、总收入、总支出、批次账单。
- 批次：横向批次切换、批次详情、历史记录。
- 统计：利润趋势、收支占比。
- 我的：本地账本概览。

新增记录使用底部弹窗，类别使用分段按钮，整体贴近设计图里的移动端账本体验。

## 五、警告处理

本次还同步处理了两个构建警告来源：

- `postcss-px-to-viewport` 会打印 PostCSS 8 迁移警告，因此当前 `postcss.config.cjs` 不再启用该旧插件。
- ApexCharts 体积较大，会触发 Vite 默认 chunk 提示，因此在 `vite.config.ts` 中设置了 `build.chunkSizeWarningLimit: 1000`。

## 六、当前结果

项目现在已经完成从智能记事本到批次记账 App 的核心转型，功能上可以新增批次、新增收支、保留历史记录，并实时更新利润。后续可以继续补充记录筛选、批次完成状态切换、数据导出和更细的统计维度。
