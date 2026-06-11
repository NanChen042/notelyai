<script setup lang="ts">
import { computed, ref } from 'vue'
import { useBookkeepingStore } from '@/stores/bookkeeping'
import { formatMoney } from '@/utils/format'
import StatisticsPanel from '@/components/bookkeeping/StatisticsPanel.vue'
import { getPeriodMeta, createBuckets, getBucketKey } from '@/utils/statistics'
import type { StatisticsPeriod, TrendMetric } from '@/utils/statistics'

const store = useBookkeepingStore()
const statisticsPeriod = ref<StatisticsPeriod>('month')
const trendMetric = ref<TrendMetric>('expense')

const statisticsTabs: { label: string; value: StatisticsPeriod }[] = [
  { label: '日', value: 'day' },
  { label: '周', value: 'week' },
  { label: '月', value: 'month' },
  { label: '年', value: 'year' },
]

const periodMeta = computed(() => getPeriodMeta(statisticsPeriod.value))

const periodRecords = computed(() =>
  store.records.filter((record) => record.date >= periodMeta.value.start && record.date <= periodMeta.value.end),
)

const periodSummary = computed(() => {
  const income = periodRecords.value.filter((record) => record.type === 'income').reduce((sum, record) => sum + record.amount, 0)
  const expense = periodRecords.value.filter((record) => record.type === 'expense').reduce((sum, record) => sum + record.amount, 0)
  return { income, expense, profit: income - expense, count: periodRecords.value.length }
})

const periodTrend = computed(() => {
  const buckets = createBuckets(statisticsPeriod.value, periodMeta.value.start, periodMeta.value.end)
  periodRecords.value.forEach((record) => {
    const key = getBucketKey(record.date, statisticsPeriod.value)
    const bucket = buckets.find((item) => item.key === key)
    if (!bucket) return
    if (record.type === 'income') bucket.income += record.amount
    else bucket.expense += record.amount
    bucket.count += 1
  })

  return buckets.map((bucket) => ({
    ...bucket,
    profit: bucket.income - bucket.expense,
  }))
})

const profitRate = computed(() => (periodSummary.value.income ? Math.round((periodSummary.value.profit / periodSummary.value.income) * 100) : 0))
const ratioTotal = computed(() => periodSummary.value.income + periodSummary.value.expense)
const averageRecordAmount = computed(() => (periodSummary.value.count ? ratioTotal.value / periodSummary.value.count : 0))
const bestTrendPoint = computed(() => {
  return periodTrend.value.reduce(
    (best, point) => (point.profit > best.profit ? point : best),
    { key: '', label: '-', income: 0, expense: 0, profit: 0 },
  )
})

function handleUpdateTrendMetric(metric: TrendMetric) {
  trendMetric.value = metric
}
</script>

<template>
  <section class="space-y-4 px-3 pb-5 pt-4 bg-slate-50 min-h-[calc(100dvh-50px)]">
    <!-- 头部 -->
    <header class="mb-2">
      <p class="text-[11px] font-semibold tracking-[0.2em] text-emerald-600/80">ANALYTICS</p>
      <h1 class="mt-0.5 text-3xl font-black text-slate-800">统计分析</h1>
    </header>

    <!-- 主卡片：沉浸式渐变背景 -->
    <section class="relative overflow-hidden rounded-[var(--app-radius-lg)] bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white shadow-xl shadow-emerald-900/10">
      <!-- 装饰背景 -->
      <div class="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl"></div>
      <div class="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-teal-500/20 blur-2xl"></div>

      <div class="relative z-10 flex items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          <p class="text-xs font-medium text-emerald-100/80">{{ periodMeta.label }}净利润</p>
          <strong class="mt-1 block font-['Inter'] text-4xl font-black tabular-nums leading-none tracking-tight">
            <span class="text-[0.6em] font-medium opacity-80">{{ periodSummary.profit < 0 ? '-' : '' }}¥</span>{{ formatMoney(Math.abs(periodSummary.profit)).replace('¥', '') }}
          </strong>
        </div>
        <span class="shrink-0 rounded-full bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur-sm">{{ periodSummary.count }} 笔</span>
      </div>

      <!-- 分段选择器：白色毛玻璃感 -->
      <div class="relative z-10 mt-5 grid grid-cols-4 gap-1 rounded-[var(--app-radius-sm)] bg-black/10 p-1 backdrop-blur-sm">
        <button
          v-for="tab in statisticsTabs"
          :key="tab.value"
          class="h-8 rounded-[var(--app-radius-sm)] text-xs font-bold transition-all duration-200"
          :class="statisticsPeriod === tab.value ? '!bg-white !text-emerald-700 shadow-sm' : '!text-emerald-100/70 hover:!text-white'"
          type="button"
          @click="statisticsPeriod = tab.value"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- 三个小指标：卡片内嵌样式 -->
      <div class="relative z-10 mt-4 grid grid-cols-3 gap-2">
        <div class="rounded-[var(--app-radius-sm)] bg-white/10 p-3 backdrop-blur-sm">
          <p class="text-xs font-medium text-emerald-100/70">毛利率</p>
          <strong class="mt-1 block font-['Inter'] text-lg font-bold tabular-nums">{{ profitRate }}%</strong>
        </div>
        <div class="rounded-[var(--app-radius-sm)] bg-white/10 p-3 backdrop-blur-sm">
          <p class="text-xs font-medium text-emerald-100/70">均笔</p>
          <strong class="mt-1 block font-['Inter'] text-lg font-bold tabular-nums">
            <span class="mr-px text-[0.7em] font-medium opacity-80">¥</span>{{ formatMoney(averageRecordAmount).replace('¥', '') }}
          </strong>
        </div>
        <div class="rounded-[var(--app-radius-sm)] bg-white/10 p-3 backdrop-blur-sm">
          <p class="text-xs font-medium text-emerald-100/70">最佳</p>
          <strong class="mt-1 block text-base font-bold truncate">{{ bestTrendPoint.label }}</strong>
        </div>
      </div>
    </section>

    <!-- 图表滑动切换区域 -->
    <van-tabs
      v-model:active="statisticsPeriod"
      swipeable
      animated
      :border="false"
      class="statistics-tabs"
    >
      <van-tab
        v-for="tab in statisticsTabs"
        :key="tab.value"
        :name="tab.value"
        title=""
      >
        <div class="pt-4 pb-2">
          <StatisticsPanel
            :period="tab.value"
            :trend-metric="trendMetric"
            @update-trend-metric="handleUpdateTrendMetric"
          />
        </div>
      </van-tab>
    </van-tabs>
  </section>
</template>

<style scoped>
/* 隐藏 van-tabs 顶部的默认导航条，只保留左右滑动手势和内容区域 */
.statistics-tabs :deep(.van-tabs__wrap) {
  display: none;
}
</style>

