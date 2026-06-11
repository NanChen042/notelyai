<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type { ApexOptions } from 'apexcharts'
import VueApexCharts from 'vue3-apexcharts'
import { useBookkeepingStore } from '@/stores/bookkeeping'
import { formatMoney } from '@/utils/format'

import { getPeriodMeta, createBuckets, getBucketKey } from '@/utils/statistics'
import type { StatisticsPeriod, TrendMetric } from '@/utils/statistics'

const props = defineProps<{
  period: StatisticsPeriod
  trendMetric: TrendMetric
}>()

const emit = defineEmits<{
  updateTrendMetric: [metric: TrendMetric]
}>()

const store = useBookkeepingStore()
const trendScrollRef = ref<HTMLElement | null>(null)

const periodMeta = computed(() => getPeriodMeta(props.period))

const periodRecords = computed(() =>
  store.records.filter((record) => record.date >= periodMeta.value.start && record.date <= periodMeta.value.end),
)

const periodSummary = computed(() => {
  const income = periodRecords.value.filter((record) => record.type === 'income').reduce((sum, record) => sum + record.amount, 0)
  const expense = periodRecords.value.filter((record) => record.type === 'expense').reduce((sum, record) => sum + record.amount, 0)
  return { income, expense, profit: income - expense, count: periodRecords.value.length }
})

const periodTrend = computed(() => {
  const buckets = createBuckets(props.period, periodMeta.value.start, periodMeta.value.end)
  periodRecords.value.forEach((record) => {
    const key = getBucketKey(record.date, props.period)
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

const hasChartData = computed(() => periodRecords.value.length > 0)
const chartUnitText = computed(() => {
  if (props.period === 'year') return '单位：月'
  if (props.period === 'month') return '单位：日'
  if (props.period === 'week') return '单位：日'
  return '今日'
})
const bestTrendPoint = computed(() => {
  return periodTrend.value.reduce(
    (best, point) => (point.profit > best.profit ? point : best),
    { key: '', label: '-', income: 0, expense: 0, profit: 0 },
  )
})
const worstTrendPoint = computed(() => {
  return periodTrend.value.reduce(
    (worst, point) => (point.profit < worst.profit ? point : worst),
    { key: '', label: '-', income: 0, expense: 0, profit: 0, count: 0 },
  )
})
const activeTrendPoint = computed(() => {
  return periodTrend.value.reduce(
    (active, point) => (point.count > active.count ? point : active),
    { key: '', label: '-', income: 0, expense: 0, profit: 0, count: 0 },
  )
})
const chartInsightText = computed(() => {
  if (!hasChartData.value) return '暂无趋势洞察'
  const activeLabel = formatBucketLabel(activeTrendPoint.value.label)
  if (props.trendMetric === 'expense') {
    return `${activeLabel} 记录最多，本周期支出 ${formatMoney(periodSummary.value.expense)}`
  }
  return `${activeLabel} 记录最多，本周期收入 ${formatMoney(periodSummary.value.income)}`
})
const isScrollableTrend = computed(() => props.period === 'month' && periodTrend.value.length > 7)
const trendChartWidth = computed(() => {
  if (!isScrollableTrend.value) return '100%'
  return `${periodTrend.value.length * 52}px`
})
const trendMetricMeta = computed(() => {
  if (props.trendMetric === 'income') {
    return {
      label: '收入',
      color: 'var(--app-income)',
      softColor: 'rgba(22, 131, 75, 0.14)',
      total: periodSummary.value.income,
    }
  }
  return {
    label: '支出',
    color: 'var(--app-expense)',
    softColor: 'rgba(227, 93, 106, 0.14)',
    total: periodSummary.value.expense,
  }
})
const trendValues = computed(() => periodTrend.value.map((point) => point[props.trendMetric]))
const trendSeries = computed(() => [
  {
    name: trendMetricMeta.value.label,
    data: trendValues.value.length ? trendValues.value : [0],
  },
])
const trendYAxisBounds = computed(() => {
  const values = trendValues.value
  const max = Math.max(0, ...values)
  if (max === 0) return { min: 0, max: 1 }
  const padding = Math.max(max * 0.16, 1)
  return {
    min: 0,
    max: Math.ceil((max + padding) / 10) * 10,
  }
})
const trendYAxisTicks = computed(() => {
  const { max } = trendYAxisBounds.value
  if (max <= 1) return [0]
  return [max, Math.round(max / 2), 0]
})

const trendOptions = computed<ApexOptions>(() => {
  const isDense = props.period === 'month' || props.period === 'year'

  return {
    chart: {
      type: 'area',
      toolbar: { show: false },
      zoom: { enabled: false },
      fontFamily: 'Inter, system-ui, sans-serif',
      sparkline: { enabled: false },
      parentHeightOffset: 0,
    },
    colors: [trendMetricMeta.value.color],
    dataLabels: { enabled: false },
    stroke: {
      curve: 'smooth',
      width: 3,
      lineCap: 'round',
    },
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'light',
        opacityFrom: 0.28,
        opacityTo: 0.04,
        stops: [0, 100],
      },
    },
    markers: {
      size: isDense ? 0 : 3,
      strokeWidth: 2,
      strokeColors: '#fff',
      hover: {
        size: 6,
      },
    },
    grid: {
      borderColor: '#edf2f7',
      strokeDashArray: 4,
      padding: { left: 0, right: 8, top: 0, bottom: 0 },
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
    },
    xaxis: {
      categories: periodTrend.value.map((point) => point.label),
      tickPlacement: 'on',
      tickAmount: undefined,
      labels: {
        hideOverlappingLabels: false,
        rotate: 0,
        trim: true,
        formatter: (value) => formatXAxisLabel(String(value)),
        style: { colors: '#94a3b8', fontSize: '10px', fontWeight: 500 },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
      crosshairs: {
        show: true,
        stroke: { color: '#cbd5e1', width: 1, dashArray: 4 },
      },
    },
    yaxis: {
      min: trendYAxisBounds.value.min,
      max: trendYAxisBounds.value.max,
      tickAmount: Math.max(trendYAxisTicks.value.length - 1, 1),
      labels: {
        show: false,
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    legend: {
      show: false,
    },
    annotations: {
      yaxis: [
        {
          y: 0,
          borderColor: '#cbd5e1',
          strokeDashArray: 3,
        },
      ],
    },
    tooltip: {
      theme: 'light',
      shared: true,
      intersect: false,
      x: {
        formatter: (_, options) => {
          const point = options ? periodTrend.value[options.dataPointIndex] : null
          return point ? formatBucketLabel(point.label) : ''
        },
      },
      y: {
        formatter: (value) => {
          const amount = Number(value)
          return `${formatMoney(amount)} ${trendMetricMeta.value.label}`
        },
      },
      marker: { show: true },
    },
  }
})

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

// 辅助计算函数已被提取到 @/utils/statistics.ts

function compactMoney(amount: number) {
  const abs = Math.abs(amount)
  if (abs >= 10000) return `${amount < 0 ? '-' : ''}${(abs / 10000).toFixed(abs >= 100000 ? 0 : 1)}万`
  return `${amount}`
}

function formatBucketLabel(label: string) {
  if (label === '今' || label === '-') return label
  if (props.period === 'year') return `${label}月`
  if (props.period === 'week' || props.period === 'month') return `${label}日`
  return label
}

function formatXAxisLabel(label: string) {
  return label
}

function getYAxisLabelStyle(value: number) {
  const { min, max } = trendYAxisBounds.value
  const range = max - min || 1
  const top = ((max - value) / range) * 100
  return { top: `${top}%` }
}

function scrollTrendToToday() {
  if (!isScrollableTrend.value || !trendScrollRef.value) return
  const today = new Date().getDate()
  const todayIndex = periodTrend.value.findIndex((point) => Number(point.label) === today)
  if (todayIndex < 0) return

  const slotWidth = 52
  const visibleSlots = 7
  const targetIndex = Math.max(todayIndex - Math.floor(visibleSlots / 2), 0)
  trendScrollRef.value.scrollLeft = targetIndex * slotWidth
}

watch(
  [() => props.period, () => props.trendMetric, periodTrend],
  () => {
    nextTick(scrollTrendToToday)
  },
  { flush: 'post', immediate: true },
)
</script>

<template>
  <div class="space-y-4">
    <!-- 图表区域：经营走势面板 -->
    <section class="overflow-hidden rounded-[var(--app-radius-md)] border border-slate-100 bg-white shadow-sm">
      <div v-if="hasChartData">
        <div class="border-b border-slate-100 bg-slate-50/70 p-4">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <h3 class="text-sm font-bold text-slate-800">{{ periodMeta.label }}{{ trendMetricMeta.label }}趋势</h3>
              <p class="mt-0.5 truncate text-xs text-slate-400">{{ chartInsightText }}</p>
            </div>
            <span class="shrink-0 rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-slate-500 shadow-sm">{{ chartUnitText }}</span>
          </div>

          <div class="mt-4 grid grid-cols-3 gap-2">
            <div class="rounded-[var(--app-radius-sm)] bg-white p-3 shadow-sm">
              <p class="text-[11px] font-semibold text-slate-400">最佳点</p>
              <strong class="mt-1 block truncate font-['Inter'] text-sm font-black text-emerald-700">{{ formatBucketLabel(bestTrendPoint.label) }}</strong>
              <p class="mt-0.5 truncate text-[11px] font-medium text-slate-400">{{ formatMoney(bestTrendPoint.profit) }}</p>
            </div>
            <div class="rounded-[var(--app-radius-sm)] bg-white p-3 shadow-sm">
              <p class="text-[11px] font-semibold text-slate-400">低谷</p>
              <strong class="mt-1 block truncate font-['Inter'] text-sm font-black text-rose-600">{{ formatBucketLabel(worstTrendPoint.label) }}</strong>
              <p class="mt-0.5 truncate text-[11px] font-medium text-slate-400">{{ formatMoney(worstTrendPoint.profit) }}</p>
            </div>
            <div class="rounded-[var(--app-radius-sm)] bg-white p-3 shadow-sm">
              <p class="text-[11px] font-semibold text-slate-400">活跃</p>
              <strong class="mt-1 block truncate font-['Inter'] text-sm font-black text-slate-700">{{ formatBucketLabel(activeTrendPoint.label) }}</strong>
              <p class="mt-0.5 truncate text-[11px] font-medium text-slate-400">{{ activeTrendPoint.count }} 笔</p>
            </div>
          </div>
        </div>

        <div class="p-4 pb-3">
          <div class="mb-3 flex items-center justify-between gap-3">
            <div class="inline-grid grid-cols-2 rounded-full bg-slate-100 p-1 text-xs font-bold">
              <button
                class="h-8 rounded-full px-4 transition"
                :class="props.trendMetric === 'expense' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400'"
                type="button"
                @click="emit('updateTrendMetric', 'expense')"
              >
                支出
              </button>
              <button
                class="h-8 rounded-full px-4 transition"
                :class="props.trendMetric === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'"
                type="button"
                @click="emit('updateTrendMetric', 'income')"
              >
                收入
              </button>
            </div>
            <span v-if="isScrollableTrend" class="shrink-0 text-[11px] font-semibold text-slate-400">已定位到今天</span>
          </div>
          <div class="flex">
            <div class="trend-y-axis relative h-[220px] w-9 shrink-0">
              <span
                v-for="tick in trendYAxisTicks"
                :key="tick"
                class="absolute right-2 -translate-y-1/2 font-['Inter'] text-[10px] font-medium text-slate-400"
                :style="getYAxisLabelStyle(tick)"
              >
                {{ compactMoney(tick) }}
              </span>
            </div>
            <div
              ref="trendScrollRef"
              class="trend-scroll min-w-0 flex-1 overflow-x-auto pb-1"
              @touchstart.stop
              @touchmove.stop
            >
              <div class="chart-panel min-w-full !border-0 !bg-transparent" :style="{ width: trendChartWidth }">
                <div class="chart-track !bg-transparent">
                  <VueApexCharts type="area" height="220" :width="trendChartWidth" :options="trendOptions" :series="trendSeries" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="py-10 text-center">
        <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <van-icon name="chart-trending-o" size="24" />
        </div>
        <p class="text-sm font-bold text-slate-800">当前周期暂无数据</p>
        <p class="mt-1 text-xs text-slate-400">新增一条收支记录后，这里会生成趋势图</p>
      </div>
    </section>

    <!-- 底部收支明细 -->
    <section class="grid grid-cols-3 gap-3">
      <div class="rounded-[var(--app-radius-sm)] bg-emerald-50 p-4 border border-emerald-100">
        <p class="text-xs font-medium text-emerald-600">总收入</p>
        <strong class="mt-1 block font-['Inter'] text-lg font-bold text-emerald-700 tabular-nums">
          <span class="mr-px text-[0.7em] font-medium opacity-80">¥</span>{{ formatMoney(periodSummary.income).replace('¥', '') }}
        </strong>
      </div>
      <div class="rounded-[var(--app-radius-sm)] bg-rose-50 p-4 border border-rose-100">
        <p class="text-xs font-medium text-rose-600">总支出</p>
        <strong class="mt-1 block font-['Inter'] text-lg font-bold text-rose-700 tabular-nums">
          <span class="mr-px text-[0.7em] font-medium opacity-80">¥</span>{{ formatMoney(periodSummary.expense).replace('¥', '') }}
        </strong>
      </div>
      <div class="rounded-[var(--app-radius-sm)] bg-slate-50 p-4 border border-slate-100">
        <p class="text-xs font-medium text-slate-500">记账笔数</p>
        <strong class="mt-1 block font-['Inter'] text-xl font-bold text-slate-700 tabular-nums">{{ periodSummary.count }}</strong>
      </div>
    </section>

    <!-- 收支占比 -->
    <section class="rounded-[var(--app-radius-md)] bg-white p-5 shadow-sm border border-slate-100">
      <div class="flex items-center justify-between">
        <div class="min-w-0 flex-1">
          <h3 class="text-sm font-bold text-slate-800">收支占比</h3>
          <p class="text-xs text-slate-400 mt-0.5">当前分析周期</p>
          <div class="mt-4 space-y-2">
            <div class="flex items-center justify-between text-xs">
              <div class="flex items-center gap-1.5">
                <span class="h-2 w-2 rounded-full bg-emerald-500"></span>
                <span class="text-slate-600 font-medium">收入</span>
              </div>
              <span class="font-bold text-emerald-600">{{ incomeRatio }}%</span>
            </div>
            <div class="flex items-center justify-between text-xs">
              <div class="flex items-center gap-1.5">
                <span class="h-2 w-2 rounded-full bg-rose-500"></span>
                <span class="text-slate-600 font-medium">支出</span>
              </div>
              <span class="font-bold text-rose-600">{{ expenseRatio }}%</span>
            </div>
          </div>
        </div>
        <div class="shrink-0">
          <VueApexCharts v-if="hasChartData" type="donut" width="120" :options="donutOptions" :series="donutSeries" />
          <div v-else class="h-20 w-20 rounded-full bg-slate-100 flex items-center justify-center text-xs text-slate-400">
            无数据
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.trend-scroll {
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}

.trend-scroll::-webkit-scrollbar {
  display: none;
}
</style>
