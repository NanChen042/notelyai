<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ApexOptions } from 'apexcharts'
import VueApexCharts from 'vue3-apexcharts'
import { useBookkeepingStore } from '@/stores/bookkeeping'
import { formatMoney, getFinancialToneClass } from '@/utils/format'

type StatisticsPeriod = 'day' | 'week' | 'month' | 'year'

const store = useBookkeepingStore()
const statisticsPeriod = ref<StatisticsPeriod>('month')

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
  })

  return buckets.map((bucket) => ({
    ...bucket,
    profit: bucket.income - bucket.expense,
  }))
})

const hasChartData = computed(() => periodRecords.value.length > 0)
const visibleTrendPointCount = computed(() => periodTrend.value.filter((point) => point.profit !== 0).length)
const trendColor = computed(() => (periodSummary.value.profit < 0 ? 'var(--app-expense)' : 'var(--app-primary)'))
const chartType = computed(() => (statisticsPeriod.value === 'day' ? 'bar' : 'area'))
const chartUnitText = computed(() => {
  if (statisticsPeriod.value === 'year') return '单位：月'
  if (statisticsPeriod.value === 'month') return '单位：日'
  if (statisticsPeriod.value === 'week') return '单位：日'
  return '今日'
})
const profitRate = computed(() => (periodSummary.value.income ? Math.round((periodSummary.value.profit / periodSummary.value.income) * 100) : 0))
const averageRecordAmount = computed(() => (periodSummary.value.count ? ratioTotal.value / periodSummary.value.count : 0))
const bestTrendPoint = computed(() => {
  return periodTrend.value.reduce(
    (best, point) => (point.profit > best.profit ? point : best),
    { key: '', label: '-', income: 0, expense: 0, profit: 0 },
  )
})

const trendSeries = computed(() => [
  {
    name: '利润',
    data: periodTrend.value.length ? periodTrend.value.map((point) => point.profit) : [0],
  },
])

const trendOptions = computed<ApexOptions>(() => ({
  chart: {
    type: chartType.value,
    toolbar: { show: false },
    zoom: { enabled: false },
    fontFamily: 'PingFang SC, Noto Sans SC, sans-serif',
  },
  colors: [trendColor.value],
  dataLabels: {
    enabled: false,
    formatter: (value) => {
      const amount = Number(value)
      if (statisticsPeriod.value !== 'day' && amount === 0) return ''
      return formatMoney(amount)
    },
    offsetY: -8,
    style: { colors: ['#334155'], fontSize: '11px', fontWeight: 700 },
    background: {
      enabled: true,
      borderRadius: 8,
      padding: 5,
      opacity: 1,
      borderWidth: 1,
      borderColor: '#e5ebe8',
      foreColor: '#334155',
      backgroundColor: '#ffffff',
    },
  },
  plotOptions: {
    bar: {
      borderRadius: 8,
      columnWidth: '42%',
    },
  },
  stroke: { curve: 'smooth', width: 2 },
  fill: {
    type: 'gradient',
    gradient: { opacityFrom: 0.24, opacityTo: 0.02, stops: [0, 100] },
  },
  grid: { borderColor: 'var(--app-border)', padding: { left: 0, right: 2, top: 4, bottom: 0 } },
  xaxis: {
    categories: periodTrend.value.map((point) => point.label),
    tickPlacement: 'on',
    labels: {
      hideOverlappingLabels: true,
      rotate: 0,
      trim: true,
      style: { colors: 'var(--app-text-subtle)', fontSize: '11px' },
    },
  },
  yaxis: {
    labels: {
      formatter: (value) => compactMoney(Number(value)),
      style: { colors: 'var(--app-text-subtle)', fontSize: '11px' },
    },
  },
  tooltip: {
    y: {
      formatter: (value) => formatMoney(Number(value)),
    },
  },
}))

const ratioTotal = computed(() => periodSummary.value.income + periodSummary.value.expense)
const incomeRatio = computed(() => (ratioTotal.value ? Math.round((periodSummary.value.income / ratioTotal.value) * 100) : 0))
const expenseRatio = computed(() => (ratioTotal.value ? 100 - incomeRatio.value : 0))

const donutSeries = computed(() => [periodSummary.value.income, periodSummary.value.expense])
const donutOptions = computed<ApexOptions>(() => ({
  chart: { type: 'donut' },
  colors: ['var(--app-income)', 'var(--app-expense)'],
  labels: ['总收入', '总支出'],
  legend: { show: false },
  dataLabels: { enabled: false },
  stroke: { width: 0 },
  plotOptions: { pie: { donut: { size: '68%' } } },
  tooltip: {
    y: {
      formatter: (value) => formatMoney(Number(value)),
    },
  },
}))

function toDateString(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getPeriodMeta(period: StatisticsPeriod) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  if (period === 'day') {
    const today = toDateString(now)
    return { label: '今日', start: today, end: today }
  }

  if (period === 'week') {
    const day = now.getDay() || 7
    const start = new Date(year, month, now.getDate() - day + 1)
    const end = new Date(year, month, now.getDate() + (7 - day))
    return { label: '本周', start: toDateString(start), end: toDateString(end) }
  }

  if (period === 'month') {
    return { label: '本月', start: toDateString(new Date(year, month, 1)), end: toDateString(new Date(year, month + 1, 0)) }
  }

  return { label: '本年', start: `${year}-01-01`, end: `${year}-12-31` }
}

function createBuckets(period: StatisticsPeriod, start: string, end: string) {
  const buckets: { key: string; label: string; income: number; expense: number }[] = []

  if (period === 'year') {
    const year = start.slice(0, 4)
    return Array.from({ length: 12 }, (_, index) => ({
      key: `${year}-${`${index + 1}`.padStart(2, '0')}`,
      label: `${index + 1}`,
      income: 0,
      expense: 0,
    }))
  }

  if (period === 'month') {
    const year = start.slice(0, 4)
    const month = start.slice(5, 7)
    const lastDay = Number(end.slice(8, 10))
    for (let day = 1; day <= lastDay; day += 4) {
      buckets.push({
        key: `${year}-${month}-${`${day}`.padStart(2, '0')}`,
        label: `${day}`,
        income: 0,
        expense: 0,
      })
    }
    return buckets
  }

  const cursor = new Date(start)
  const endDate = new Date(end)
  while (cursor <= endDate) {
    const key = toDateString(cursor)
    buckets.push({
      key,
      label: period === 'day' ? '今' : `${cursor.getDate()}`,
      income: 0,
      expense: 0,
    })
    cursor.setDate(cursor.getDate() + 1)
  }
  return buckets
}

function getBucketKey(date: string, period: StatisticsPeriod) {
  if (period === 'year') return date.slice(0, 7)
  if (period === 'month') {
    const day = Number(date.slice(8, 10))
    const bucketStart = Math.floor((day - 1) / 4) * 4 + 1
    return `${date.slice(0, 8)}${`${bucketStart}`.padStart(2, '0')}`
  }
  return date
}

function compactMoney(amount: number) {
  const abs = Math.abs(amount)
  if (abs >= 10000) return `${amount < 0 ? '-' : ''}${(abs / 10000).toFixed(abs >= 100000 ? 0 : 1)}万`
  return `${amount}`
}
</script>

<template>
  <section class="space-y-4 px-3 pb-5 pt-4">
    <header>
      <p class="app-muted text-[11px] font-semibold tracking-[0.24em]">ANALYTICS</p>
      <h1 class="mt-1 text-[28px] font-black leading-none">统计</h1>
    </header>

    <section class="analytics-card analytics-card-compact p-3">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          <p class="app-muted text-sm font-semibold">{{ periodMeta.label }}净利润</p>
          <strong class="analytics-profit mt-2 block font-black leading-tight" :class="getFinancialToneClass('profit', periodSummary.profit)">
            {{ formatMoney(periodSummary.profit) }}
          </strong>
        </div>
        <span class="app-primary-soft shrink-0 rounded-full px-3 py-1 text-xs font-semibold">{{ periodSummary.count }} 笔</span>
      </div>

      <div class="mt-4 grid grid-cols-4 gap-1 rounded-2xl bg-[var(--app-surface-soft)] p-1">
        <button
          v-for="tab in statisticsTabs"
          :key="tab.value"
          class="h-9 rounded-xl text-sm font-bold transition"
          :class="statisticsPeriod === tab.value ? 'bg-white text-[var(--app-primary)] shadow-[0_8px_18px_rgba(15,23,42,0.08)]' : 'text-[#6c8097]'"
          type="button"
          @click="statisticsPeriod = tab.value"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="mt-3 grid grid-cols-3 gap-2">
        <div class="analytics-insight">
          <p>毛利率</p>
          <strong :class="getFinancialToneClass('profit', periodSummary.profit)">{{ profitRate }}%</strong>
        </div>
        <div class="analytics-insight">
          <p>均笔</p>
          <strong>{{ formatMoney(averageRecordAmount) }}</strong>
        </div>
        <div class="analytics-insight">
          <p>最佳</p>
          <strong>{{ bestTrendPoint.label }}</strong>
        </div>
      </div>

      <div v-if="hasChartData" class="mt-4">
        <div class="mb-2 flex items-center justify-between">
          <span class="app-subtle text-xs">利润走势</span>
          <span class="chart-hint">{{ chartUnitText }}</span>
        </div>
        <div class="chart-panel">
          <div class="chart-track">
            <VueApexCharts :type="chartType" height="188" :options="trendOptions" :series="trendSeries" />
          </div>
        </div>
      </div>
      <div v-else class="empty-chart mt-5">
        <div class="empty-chart-grid">
          <span v-for="index in 12" :key="index" />
        </div>
        <div class="relative z-10 text-center">
          <p class="text-sm font-bold">当前周期暂无数据</p>
          <p class="app-subtle mt-1 text-xs">新增一条收支记录后，这里会生成趋势图</p>
        </div>
      </div>

      <div class="mt-3 grid grid-cols-3 gap-2">
        <div class="analytics-metric">
          <p>收入</p>
          <strong>{{ formatMoney(periodSummary.income) }}</strong>
        </div>
        <div class="analytics-metric">
          <p>支出</p>
          <strong>{{ formatMoney(periodSummary.expense) }}</strong>
        </div>
        <div class="analytics-metric">
          <p>记录</p>
          <strong>{{ periodSummary.count }}</strong>
        </div>
      </div>

      <div class="ratio-panel mt-3">
        <div class="min-w-0 flex-1">
          <p class="app-subtle text-xs">收支占比</p>
          <p class="mt-1 text-sm font-semibold">当前周期</p>
          <div class="ratio-legend mt-3">
            <div>
              <span class="ratio-dot ratio-dot-income" />
              <span>收入 {{ incomeRatio }}%</span>
            </div>
            <div>
              <span class="ratio-dot ratio-dot-expense" />
              <span>支出 {{ expenseRatio }}%</span>
            </div>
          </div>
        </div>
        <VueApexCharts v-if="hasChartData" type="donut" width="112" :options="donutOptions" :series="donutSeries" />
        <div v-else class="empty-donut">
          <span />
        </div>
      </div>
    </section>
  </section>
</template>
