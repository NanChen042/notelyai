<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ApexOptions } from 'apexcharts'
import { showConfirmDialog, showToast } from 'vant'
import { useRouter } from 'vue-router'
import VueApexCharts from 'vue3-apexcharts'
import BatchCard from '@/components/bookkeeping/BatchCard.vue'
import BatchFormPage from '@/components/bookkeeping/BatchFormPage.vue'
import RecordFormPage from '@/components/bookkeeping/RecordFormPage.vue'
import RecordTimeline from '@/components/bookkeeping/RecordTimeline.vue'
import type { Batch, RecordDraft } from '@/stores/bookkeeping'
import { useBookkeepingStore } from '@/stores/bookkeeping'
import { formatMoney, getFinancialToneClass } from '@/utils/format'

const store = useBookkeepingStore()
const router = useRouter()

type PageMode = 'dashboard' | 'batch-form' | 'record-form'
type StatisticsPeriod = 'day' | 'week' | 'month' | 'year'

const pageMode = ref<PageMode>('dashboard')
const activeTab = ref(0)
const selectedBatchId = ref<string | null>(null)
const editingBatch = ref<Batch | null>(null)
const statisticsPeriod = ref<StatisticsPeriod>('month')

const statisticsTabs: { label: string; value: StatisticsPeriod }[] = [
  { label: '日', value: 'day' },
  { label: '周', value: 'week' },
  { label: '月', value: 'month' },
  { label: '年', value: 'year' },
]

const selectedBatch = computed(() => {
  const fallback = store.sortedBatches[0]
  return store.sortedBatches.find((batch) => batch.id === selectedBatchId.value) ?? fallback
})

const displayedRecords = computed(() => {
  if (activeTab.value === 1 && selectedBatch.value) return store.getBatchRecords(selectedBatch.value.id)
  return store.recentRecords
})

const todaySummary = computed(() => {
  const today = toDateString(new Date())
  const records = store.records.filter((record) => record.date === today)
  const income = records.filter((record) => record.type === 'income').reduce((sum, record) => sum + record.amount, 0)
  const expense = records.filter((record) => record.type === 'expense').reduce((sum, record) => sum + record.amount, 0)
  return { income, expense, profit: income - expense, count: records.length }
})

const homeTrend = computed(() => {
  const list = store.profitTrend.slice(-7)
  return list.length ? list : [{ date: toDateString(new Date()), profit: 0 }]
})

const homeTrendSeries = computed(() => [
  {
    name: '利润',
    data: homeTrend.value.map((item) => item.profit),
  },
])

const homeTrendOptions = computed<ApexOptions>(() => ({
  chart: {
    type: 'area',
    toolbar: { show: false },
    zoom: { enabled: false },
    sparkline: { enabled: true },
    fontFamily: 'PingFang SC, Noto Sans SC, sans-serif',
  },
  colors: ['var(--app-primary)'],
  dataLabels: { enabled: false },
  stroke: { curve: 'smooth', width: 2 },
  fill: {
    type: 'gradient',
    gradient: { opacityFrom: 0.22, opacityTo: 0.02, stops: [0, 100] },
  },
  grid: { show: false },
  xaxis: {
    categories: homeTrend.value.map((item) => item.date.slice(5).replace('-', '.')),
    labels: { style: { colors: 'var(--app-text-subtle)' } },
  },
  yaxis: { labels: { style: { colors: 'var(--app-text-subtle)' } } },
  tooltip: { enabled: false },
}))

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
    if (bucket) {
      if (record.type === 'income') bucket.income += record.amount
      else bucket.expense += record.amount
    }
  })

  return buckets.map((bucket) => ({
    ...bucket,
    profit: bucket.income - bucket.expense,
  }))
})

const chartTrend = computed(() => {
  return periodTrend.value
})

const hasChartData = computed(() => periodRecords.value.length > 0)

const trendSeries = computed(() => [
  {
    name: '利润',
    data: displayTrend.value.length ? displayTrend.value.map((point) => point.profit) : [0],
  },
])

const displayTrend = computed(() => {
  if (chartTrend.value.length !== 1) return chartTrend.value
  const point = chartTrend.value[0]
  if (!point) return chartTrend.value
  return [
    { ...point, key: `${point.key}-baseline`, label: '', profit: 0 },
    point,
  ]
})

const visibleTrendPointCount = computed(() => chartTrend.value.filter((point) => point.profit !== 0).length)

const trendOptions = computed<ApexOptions>(() => ({
  chart: {
    type: 'area',
    toolbar: { show: false },
    zoom: { enabled: false },
    fontFamily: 'PingFang SC, Noto Sans SC, sans-serif',
  },
  colors: ['var(--app-primary)'],
  dataLabels: {
    enabled: displayTrend.value.length <= 2 || visibleTrendPointCount.value === 1,
    formatter: (value) => {
      const amount = Number(value)
      if (displayTrend.value.length > 2 && amount === 0) return ''
      return formatMoney(amount)
    },
    offsetY: -8,
    style: { colors: ['var(--app-text)'], fontSize: '11px', fontWeight: 700 },
    background: {
      enabled: true,
      borderRadius: 8,
      padding: 5,
      opacity: 0.92,
      borderWidth: 0,
      foreColor: 'var(--app-text)',
    },
  },
  stroke: { curve: 'smooth', width: 2 },
  fill: {
    type: 'gradient',
    gradient: { opacityFrom: 0.24, opacityTo: 0.02, stops: [0, 100] },
  },
  grid: { borderColor: 'var(--app-border)' },
  xaxis: {
    categories: displayTrend.value.map((point) => point.label),
    labels: { style: { colors: 'var(--app-text-subtle)' } },
  },
  yaxis: { labels: { style: { colors: 'var(--app-text-subtle)' } } },
}))

const donutSeries = computed(() => [periodSummary.value.income, periodSummary.value.expense])
const donutOptions: ApexOptions = {
  chart: { type: 'donut' },
  colors: ['var(--app-income)', 'var(--app-expense)'],
  labels: ['总收入', '总支出'],
  legend: { show: false },
  dataLabels: { enabled: false },
  stroke: { width: 0 },
  plotOptions: { pie: { donut: { size: '68%' } } },
}

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
      label: `${index + 1}月`,
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
      label: period === 'day' ? '今日' : `${cursor.getMonth() + 1}.${cursor.getDate()}`,
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

function openBatch(batchId: string) {
  selectedBatchId.value = batchId
  activeTab.value = 1
}

function saveRecord(draft: RecordDraft) {
  store.addRecord(draft)
  pageMode.value = 'dashboard'
  showToast('记录已保存，利润已更新')
}

function saveBatch(payload: { id?: string; name: string; imageUrl: string }) {
  if (payload.id) {
    store.updateBatch(payload.id, payload)
    selectedBatchId.value = payload.id
    showToast('批次已更新')
  } else {
    const batch = store.addBatch(payload.name, payload.imageUrl)
    selectedBatchId.value = batch.id
    showToast('批次已创建')
  }

  editingBatch.value = null
  pageMode.value = 'dashboard'
  activeTab.value = 1
}

function openRecordPage() {
  if (!store.batches.length) {
    showToast('请先新建批次')
    pageMode.value = 'batch-form'
    return
  }
  pageMode.value = 'record-form'
}

function openAIAssistant() {
  router.push({ name: 'ai-assistant' })
}

function handleTabChange(name: number | string) {
  if (name === 'record') {
    openRecordPage()
    return
  }
  activeTab.value = Number(name)
}

function openBatchForm(batch?: Batch) {
  editingBatch.value = batch ? { ...batch } : null
  pageMode.value = 'batch-form'
}

function confirmDeleteBatch(batch: Batch) {
  showConfirmDialog({
    title: '删除批次',
    message: `删除“${batch.name}”后，该批次下的收支记录也会一起删除。`,
    confirmButtonText: '删除',
    confirmButtonColor: 'var(--app-expense)',
  })
    .then(() => {
      store.deleteBatch(batch.id)
      if (selectedBatchId.value === batch.id) selectedBatchId.value = store.sortedBatches[0]?.id ?? null
      showToast('批次已删除')
    })
    .catch(() => {})
}
</script>

<template>
  <BatchFormPage
    v-if="pageMode === 'batch-form'"
    :batch="editingBatch"
    @back="editingBatch = null; pageMode = 'dashboard'"
    @save="saveBatch"
  />

  <RecordFormPage
    v-else-if="pageMode === 'record-form'"
    :batches="store.sortedBatches"
    :expense-categories="store.expenseCategories"
    :income-categories="store.incomeCategories"
    @back="pageMode = 'dashboard'"
    @save="saveRecord"
  />

  <main v-else class="bookkeeping-shell app-text relative mx-auto flex h-[100dvh] max-w-[430px] flex-col overflow-hidden">
    <div class="hero-wash pointer-events-none absolute inset-x-0 top-0 z-0 mx-auto h-72 max-w-[430px]" />

    <div class="relative z-10 flex-1 overflow-y-auto">
    <section v-if="activeTab === 0" class="space-y-5 px-4 pb-6 pt-5">
      <header class="flex items-center justify-between">
        <div>
          <p class="app-muted text-[11px] font-semibold tracking-[0.24em]">BATCH LEDGER</p>
          <h1 class="mt-1 text-[32px] font-black leading-none tracking-tight">谷记账</h1>
        </div>
        <button class="glass-chip flex h-12 w-12 items-center justify-center text-2xl font-black" type="button" @click="activeTab = 3">谷</button>
      </header>

      <section class="hero-card overflow-hidden rounded-[28px] p-5 text-white">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-sm text-white/70">今日净额</p>
            <strong class="mt-2 block text-[38px] font-black leading-none tracking-normal">{{ formatMoney(todaySummary.profit) }}</strong>
          </div>
          <div class="rounded-full bg-white/14 px-3 py-1 text-xs font-semibold text-white/86">{{ todaySummary.count }} 笔</div>
        </div>

        <div class="mt-5 grid grid-cols-2 gap-3">
          <div class="metric-tile">
            <p class="text-xs text-white/58">今日收入</p>
            <p class="mt-1 text-base font-bold">{{ formatMoney(todaySummary.income) }}</p>
          </div>
          <div class="metric-tile">
            <p class="text-xs text-white/58">今日支出</p>
            <p class="mt-1 text-base font-bold">{{ formatMoney(todaySummary.expense) }}</p>
          </div>
        </div>

        <div class="mt-5 grid grid-cols-2 gap-3">
          <div class="month-tile">
            <p>本月收入</p>
            <strong>{{ formatMoney(store.monthlyIncome) }}</strong>
          </div>
          <div class="month-tile">
            <p>本月支出</p>
            <strong>{{ formatMoney(store.monthlyExpense) }}</strong>
          </div>
        </div>
      </section>

      <div class="grid grid-cols-3 gap-3">
        <div class="stat-card">
          <p class="app-subtle text-xs">批次数</p>
          <p class="mt-1 text-xl font-black">{{ store.batches.length }}</p>
        </div>
        <div class="stat-card">
          <p class="app-subtle text-xs">记录数</p>
          <p class="mt-1 text-xl font-black">{{ store.records.length }}</p>
        </div>
        <div class="stat-card">
          <p class="app-subtle text-xs">总利润</p>
          <p class="mt-1 text-lg font-black" :class="getFinancialToneClass('profit', store.totalProfit)">{{ formatMoney(store.totalProfit) }}</p>
        </div>
      </div>

      <section class="app-card-solid p-4">
        <div class="mb-2 flex items-center justify-between">
          <h2 class="text-base font-black">近 7 天趋势</h2>
          <span class="app-subtle text-xs">首页概览</span>
        </div>
        <VueApexCharts type="area" height="120" :options="homeTrendOptions" :series="homeTrendSeries" />
      </section>

      <section>
        <div class="mb-3 flex items-center justify-between">
          <div>
            <p class="app-section-kicker">RECENT BATCHES</p>
            <h2 class="text-lg font-black">批次账单</h2>
          </div>
          <button class="app-muted flex items-center gap-1 text-sm font-semibold" type="button" @click="activeTab = 1">
            全部 <van-icon name="arrow" />
          </button>
        </div>

        <div v-if="store.sortedBatches.length" class="space-y-3">
          <van-swipe-cell v-for="batch in store.sortedBatches.slice(0, 3)" :key="batch.id" class="batch-swipe-cell">
            <BatchCard :batch="batch" :summary="store.getBatchSummary(batch.id)" @click="openBatch(batch.id)" />
            <template #right>
              <div class="flex h-full overflow-hidden rounded-2xl">
                <button class="swipe-action swipe-action-edit" type="button" @click.stop="openBatchForm(batch)">
                  编辑
                </button>
                <button class="swipe-action swipe-action-delete" type="button" @click.stop="confirmDeleteBatch(batch)">
                  删除
                </button>
              </div>
            </template>
          </van-swipe-cell>
        </div>
        <div v-else class="glass-panel rounded-2xl p-5 text-center">
          <p class="text-base font-semibold">还没有批次</p>
          <p class="app-muted mt-1 text-sm">先创建批次，再添加卖出收入和支出记录</p>
          <button class="app-primary-button mt-4 rounded-full px-4 py-2 text-sm font-semibold" type="button" @click="openBatchForm()">
            新建第一个批次
          </button>
        </div>
      </section>
    </section>

    <section v-else-if="activeTab === 1" class="space-y-5 px-4 pb-6 pt-5">
      <header class="flex items-center justify-between">
        <button class="app-surface flex h-9 w-9 items-center justify-center rounded-full" type="button" @click="activeTab = 0">
          <van-icon name="arrow-left" size="20" />
        </button>
        <h1 class="text-lg font-bold">批次账单</h1>
        <button class="app-muted text-sm" type="button" @click="openBatchForm()">新建</button>
      </header>

      <div class="batch-switcher -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
        <button
          v-for="batch in store.sortedBatches"
          :key="batch.id"
          class="batch-chip shrink-0 text-left transition active:scale-[0.98]"
          :class="selectedBatch?.id === batch.id ? 'batch-chip-active' : 'batch-chip-idle'"
          type="button"
          @click="selectedBatchId = batch.id"
        >
          <div class="flex items-center gap-3">
            <div class="batch-chip-cover">
              <img v-if="batch.imageUrl" :src="batch.imageUrl" alt="批次图片" class="h-full w-full object-cover" />
              <span v-else>{{ batch.cover }}</span>
            </div>
            <div class="min-w-0">
              <p class="truncate text-sm font-black">{{ batch.name }}</p>
              <p class="mt-1 text-xs opacity-70">{{ formatMoney(store.getBatchSummary(batch.id).profit, true) }}</p>
            </div>
          </div>
        </button>
      </div>

      <van-swipe-cell v-if="selectedBatch" class="batch-swipe-cell">
        <BatchCard :batch="selectedBatch" :summary="store.getBatchSummary(selectedBatch.id)" />
        <template #right>
          <div class="flex h-full overflow-hidden rounded-2xl">
            <button class="swipe-action swipe-action-edit" type="button" @click.stop="openBatchForm(selectedBatch)">
              编辑
            </button>
            <button class="swipe-action swipe-action-delete" type="button" @click.stop="confirmDeleteBatch(selectedBatch)">
              删除
            </button>
          </div>
        </template>
      </van-swipe-cell>
      <div v-else class="glass-panel app-muted rounded-2xl p-5 text-center">暂无批次数据，点击右上角“新建”</div>

      <div class="app-card-solid p-4">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="font-bold">收支记录</h2>
          <span class="app-subtle text-xs">每次卖出可继续新增</span>
        </div>
        <RecordTimeline :records="displayedRecords" :get-batch-name="store.getBatchName" />
      </div>
    </section>

    <section v-else-if="activeTab === 2" class="space-y-5 px-4 pb-6 pt-5">
      <header>
        <p class="app-muted text-[11px] font-semibold tracking-[0.24em]">ANALYTICS</p>
        <h1 class="mt-1 text-[28px] font-black leading-none">统计</h1>
      </header>

      <section class="analytics-card overflow-hidden p-4">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="app-muted text-sm font-semibold">{{ periodMeta.label }}净利润</p>
            <strong class="mt-2 block text-[34px] font-black leading-none" :class="getFinancialToneClass('profit', periodSummary.profit)">{{ formatMoney(periodSummary.profit) }}</strong>
          </div>
          <span class="app-primary-soft rounded-full px-3 py-1 text-xs font-semibold">{{ periodSummary.count }} 笔</span>
        </div>

        <div class="mt-5 grid grid-cols-4 gap-1 rounded-2xl bg-[var(--app-surface-soft)] p-1">
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

        <div v-if="hasChartData" class="chart-scroll -mx-4 mt-5 overflow-x-auto px-4 pb-2">
          <div class="chart-track" :style="{ width: statisticsPeriod === 'month' ? `${Math.max(430, periodTrend.length * 56)}px` : '100%' }">
            <VueApexCharts type="area" height="210" :options="trendOptions" :series="trendSeries" />
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

        <div class="mt-4 grid grid-cols-3 gap-3">
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

        <div class="mt-5 flex items-center justify-between rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-3">
          <div>
            <p class="app-subtle text-xs">收支占比</p>
            <p class="mt-1 text-sm font-semibold">当前周期</p>
          </div>
          <VueApexCharts v-if="hasChartData" type="donut" width="112" :options="donutOptions" :series="donutSeries" />
          <div v-else class="empty-donut">
            <span />
          </div>
        </div>
      </section>
    </section>

    <section v-else class="space-y-5 px-4 pb-6 pt-5">
      <header>
        <h1 class="text-xl font-bold">我的</h1>
      </header>

      <div class="app-card-solid p-5">
        <div class="flex items-center gap-4">
          <div class="app-primary-soft flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold">谷</div>
          <div>
            <h2 class="text-lg font-bold">本地账本</h2>
            <p class="app-muted mt-1 text-sm">数据保存在当前浏览器本地存储</p>
          </div>
        </div>
      </div>
    </section>

    </div>

    <button
      v-if="activeTab === 0"
      class="ai-fab absolute bottom-24 right-4 z-20"
      type="button"
      @click="openAIAssistant"
    >
      <van-icon name="chat-o" size="20" />
      AI
    </button>

    <footer class="relative z-20 shrink-0 border-t border-[var(--app-border)] bg-[var(--app-page)]">
    <van-tabbar class="app-tabbar" :model-value="activeTab" :fixed="false" active-color="var(--app-primary)" inactive-color="var(--app-text-subtle)" safe-area-inset-bottom @change="handleTabChange">
      <van-tabbar-item :name="0" icon="home-o">首页</van-tabbar-item>
      <van-tabbar-item :name="1" icon="notes-o">批次</van-tabbar-item>
      <van-tabbar-item name="record" class="record-tabbar-item">
        <template #icon>
          <span class="tabbar-record-icon">
            <van-icon name="plus" size="24" />
          </span>
        </template>
        记一笔
      </van-tabbar-item>
      <van-tabbar-item :name="2" icon="bar-chart-o">统计</van-tabbar-item>
      <van-tabbar-item :name="3" icon="user-o">我的</van-tabbar-item>
    </van-tabbar>
    </footer>
  </main>
</template>

<style scoped>
.bookkeeping-shell {
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--app-primary-soft) 70%, white) 0%, rgba(247, 248, 250, 0.97) 28%, var(--app-page) 54%),
    radial-gradient(circle at 15% 15%, color-mix(in srgb, var(--app-primary) 18%, transparent), transparent 45%);
}

.hero-wash {
  background:
    radial-gradient(circle at 20% 15%, color-mix(in srgb, var(--app-primary) 22%, transparent), transparent 56%),
    radial-gradient(circle at 95% 0%, rgba(15, 118, 110, 0.16), transparent 50%);
}

.glass-panel {
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(8px);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.07);
}

.hero-card {
  position: relative;
  background:
    radial-gradient(circle at 20% 0%, rgba(255, 255, 255, 0.24), transparent 34%),
    linear-gradient(135deg, var(--app-primary-strong), var(--app-primary) 58%, #0f766e);
  box-shadow: 0 26px 56px color-mix(in srgb, var(--app-primary) 28%, transparent);
}

.analytics-card {
  border: 1px solid var(--app-border);
  border-radius: 28px;
  background: #fff;
  box-shadow: var(--app-shadow-strong);
}

.chart-scroll {
  scrollbar-width: none;
}

.chart-scroll::-webkit-scrollbar {
  display: none;
}

.chart-track {
  min-width: 100%;
  border: 1px solid var(--app-border);
  border-radius: 22px;
  padding: 10px 8px 0;
  background: #fff;
}

.empty-chart {
  position: relative;
  display: flex;
  height: 210px;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: 22px;
  background: #fff;
}

.empty-chart::before {
  position: absolute;
  inset: 28px 18px;
  border-bottom: 1px solid var(--app-border);
  background:
    linear-gradient(135deg, transparent 46%, color-mix(in srgb, var(--app-primary) 24%, transparent) 47%, color-mix(in srgb, var(--app-primary) 24%, transparent) 49%, transparent 50%),
    linear-gradient(180deg, transparent 0 32%, rgba(15, 23, 42, 0.04) 33%, transparent 34% 66%, rgba(15, 23, 42, 0.04) 67%, transparent 68%);
  content: "";
}

.empty-chart-grid {
  position: absolute;
  inset: auto 20px 26px;
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 8px;
}

.empty-chart-grid span {
  height: 28px;
  border-radius: 999px 999px 0 0;
  background: var(--app-surface-soft);
}

.empty-chart-grid span:nth-child(3n) {
  height: 48px;
}

.empty-donut {
  display: flex;
  width: 86px;
  height: 86px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: conic-gradient(var(--app-primary-soft), var(--app-surface));
}

.empty-donut span {
  display: block;
  width: 56px;
  height: 56px;
  border-radius: 999px;
  background: var(--app-surface-soft);
}

.analytics-metric {
  min-width: 0;
  border: 1px solid var(--app-border);
  border-radius: 18px;
  padding: 12px 10px;
  background: #fff;
}

.analytics-metric p {
  color: var(--app-text-subtle);
  font-size: 12px;
}

.analytics-metric strong {
  display: block;
  margin-top: 4px;
  overflow: hidden;
  color: var(--app-text);
  font-size: 14px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:deep(.analytics-card .app-muted) {
  color: #5f7187;
}

:deep(.analytics-card .app-primary-soft) {
  background: #e9f5ef;
  color: #167d4a;
}

.hero-card::after {
  position: absolute;
  right: -42px;
  bottom: -68px;
  width: 180px;
  height: 180px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 999px;
  content: "";
}

.metric-tile {
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 18px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
}

.month-tile {
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 18px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(10px);
}

.month-tile p {
  color: rgba(255, 255, 255, 0.58);
  font-size: 12px;
}

.month-tile strong {
  display: block;
  margin-top: 4px;
  overflow: hidden;
  color: #fff;
  font-size: 15px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stat-card {
  min-width: 0;
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 20px;
  padding: 14px 12px;
  background: rgba(255, 255, 255, 0.74);
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.06);
  backdrop-filter: blur(12px);
}

.glass-chip {
  background: rgba(255, 255, 255, 0.78);
  color: var(--app-primary);
  backdrop-filter: blur(8px);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--app-primary) 12%, transparent);
}

:deep(.app-tabbar) {
  position: relative;
  height: 72px;
  box-shadow: none;
}

:deep(.app-tabbar .van-tabbar-item) {
  color: var(--app-text-subtle);
  font-size: 11px;
  font-weight: 700;
}

:deep(.app-tabbar .van-tabbar-item--active) {
  color: var(--app-primary);
}

:deep(.record-tabbar-item .van-tabbar-item__icon) {
  margin-bottom: 2px;
}

:deep(.record-tabbar-item .van-tabbar-item__text) {
  color: var(--app-primary);
  font-weight: 800;
}

.tabbar-record-icon {
  display: inline-flex;
  width: 48px;
  height: 48px;
  align-items: center;
  justify-content: center;
  border: 4px solid var(--app-page);
  border-radius: 999px;
  background: var(--app-primary);
  color: #fff;
  box-shadow: 0 12px 28px color-mix(in srgb, var(--app-primary) 28%, transparent);
  transform: translateY(-12px);
}

.batch-swipe-cell {
  border-radius: 16px;
}

.batch-switcher {
  scrollbar-width: none;
}

.batch-switcher::-webkit-scrollbar {
  display: none;
}

.batch-chip {
  width: 176px;
  border: 1px solid transparent;
  border-radius: 22px;
  padding: 12px;
}

.batch-chip-idle {
  background: rgba(255, 255, 255, 0.72);
  color: var(--app-text-muted);
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.05);
  backdrop-filter: blur(10px);
}

.batch-chip-active {
  background: var(--app-primary);
  color: #fff;
  box-shadow: 0 16px 34px color-mix(in srgb, var(--app-primary) 25%, transparent);
}

.batch-chip-cover {
  display: flex;
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.2);
  color: inherit;
  font-size: 13px;
  font-weight: 800;
}

.swipe-action {
  width: 64px;
  border: 0;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
}

.swipe-action-edit {
  background: var(--app-warning);
}

.swipe-action-delete {
  background: var(--app-expense);
}

.ai-fab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 0;
  border-radius: 999px;
  padding: 10px 12px;
  background: linear-gradient(135deg, #2f57f4, #4668f5);
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  box-shadow: 0 14px 26px rgba(47, 87, 244, 0.28);
}
</style>
