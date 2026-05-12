# 谷记账

一个移动端批次记账 App，用于记录每个批次的进货支出、邮费、手续费、包装费、卖出收入和其他收入。每次新增收支后，总收入、总支出和净利润会自动更新，历史卖出记录会持续保留在对应批次下。

## 功能

- 批次账单：首页和批次页展示每个批次的收入、支出、利润和状态。
- 批次操作：批次卡片支持侧滑编辑和删除，删除批次时会同步删除该批次下的收支记录。
- 收支记录：支持进货支出、邮费、手续费、包装费、卖出收入、其他收入。
- 自动利润：基于 Pinia getters 实时计算总收入、总支出、本月利润和批次利润。
- 本地存储：使用 LocalStorage 保存批次和记录数据。
- 统计视图：使用 ApexCharts 展示利润趋势和收支占比，支持按日、周、月、年切换；月视图按 4 天聚合，减少日期挤压。
- AI 账单助手：首页悬浮入口进入独立路由，支持文字或语音输入自然语言账单；弹窗中可选择已有批次或新建批次，确认后自动写入记录；可在 AI 页本地填写 SiliconFlow API Key，也可通过 `VITE_SILICONFLOW_API_KEY` 接入 `Qwen/Qwen2.5-7B-Instruct`。
- 移动端界面：基于 Vant + TailwindCSS，参考 App 式账本设计。
- 统一主题：通过 `src/assets/main.css` 中的 `--app-*` 和 `--van-*` CSS 变量统一主色、文字、收入、支出和页面背景。

## 技术栈

- Vue 3 + TypeScript
- Vite
- Pinia
- Vant
- TailwindCSS v4
- ApexCharts / vue3-apexcharts
- LocalStorage

## 项目结构

```text
src/
├── components/bookkeeping/  # 账本业务组件
├── stores/bookkeeping.ts    # Pinia 本地账本状态
├── utils/format.ts          # 金额、日期和财务语义色工具
├── views/HomeView.vue       # App 主界面
├── router/index.ts          # 首页和 AI 助手路由
└── main.ts                  # 应用入口
```

## 开发命令

```sh
pnpm install
pnpm dev
pnpm build
```

## 配置说明

- `postcss.config.cjs` 当前不启用旧版 `postcss-px-to-viewport` 插件，避免 PostCSS 8 迁移警告。
- `vite.config.ts` 已设置 `build.chunkSizeWarningLimit`，避免图表依赖正常体积触发 chunk 警告。
- 财务颜色不要在组件里直接判断，统一使用 `getFinancialToneClass`、`getRecordDotClass` 和 `formatRecordAmount`。
- AI 模型密钥优先读取浏览器本地保存的 SiliconFlow API Key，其次读取 `VITE_SILICONFLOW_API_KEY`；未配置时会使用本地解析兜底，不会阻塞基础记账流程。
