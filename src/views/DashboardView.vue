<script setup lang="ts">
import { computed } from 'vue'
import type { ApexOptions } from 'apexcharts'
import { showConfirmDialog, showToast } from 'vant'
import { useRouter } from 'vue-router'
import VueApexCharts from 'vue3-apexcharts'
import BatchCard from '@/components/bookkeeping/BatchCard.vue'
import { useBookkeepingStore } from '@/stores/bookkeeping'
import type { Batch } from '@/stores/bookkeeping'
import { formatMoney, getFinancialToneClass } from '@/utils/format'

const store = useBookkeepingStore()
const router = useRouter()

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

function toDateString(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function openBatch(batchId: string) {
  router.push({ name: 'batches', query: { batchId } })
}

function openBatchForm(batch?: Batch) {
  router.push(batch ? { name: 'batch-edit', params: { id: batch.id } } : { name: 'batch-new' })
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
      showToast('批次已删除')
    })
    .catch(() => {})
}
</script>

<template>
  <section class="space-y-5 px-4 pb-6 pt-5">
    <header class="flex items-center justify-between">
      <div>
        <p class="app-muted text-[11px] font-semibold tracking-[0.24em]">BATCH LEDGER</p>
        <h1 class="mt-1 text-[32px] font-black leading-none tracking-tight">谷记账</h1>
      </div>
      <button class="glass-chip flex h-12 w-12 items-center justify-center text-2xl font-black" type="button" @click="router.push({ name: 'profile' })">谷</button>
    </header>

    <section class="hero-card overflow-hidden rounded-[28px] p-5 text-white">
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0">
          <p class="text-sm text-white/70">今日净额</p>
          <strong class="money-hero mt-2 block font-black leading-none tracking-normal">{{ formatMoney(todaySummary.profit) }}</strong>
        </div>
        <div class="shrink-0 rounded-full bg-white/14 px-3 py-1 text-xs font-semibold text-white/86">{{ todaySummary.count }} 笔</div>
      </div>

      <div class="mt-5 grid grid-cols-2 gap-3">
        <div class="metric-tile">
          <p class="text-xs text-white/58">今日收入</p>
          <p class="metric-money mt-1 font-bold">{{ formatMoney(todaySummary.income) }}</p>
        </div>
        <div class="metric-tile">
          <p class="text-xs text-white/58">今日支出</p>
          <p class="metric-money mt-1 font-bold">{{ formatMoney(todaySummary.expense) }}</p>
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
        <p class="stat-money mt-1 font-black" :class="getFinancialToneClass('profit', store.totalProfit)">{{ formatMoney(store.totalProfit) }}</p>
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
        <button class="app-muted flex items-center gap-1 text-sm font-semibold" type="button" @click="router.push({ name: 'batches' })">
          全部 <van-icon name="arrow" />
        </button>
      </div>

      <div v-if="store.sortedBatches.length" class="space-y-3">
        <van-swipe-cell v-for="batch in store.sortedBatches.slice(0, 3)" :key="batch.id" class="batch-swipe-cell">
          <BatchCard :batch="batch" :summary="store.getBatchSummary(batch.id)" @click="openBatch(batch.id)" />
          <template #right>
            <div class="flex h-full overflow-hidden rounded-2xl">
              <button class="swipe-action swipe-action-edit" type="button" @click.stop="openBatchForm(batch)">编辑</button>
              <button class="swipe-action swipe-action-delete" type="button" @click.stop="confirmDeleteBatch(batch)">删除</button>
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

    <button class="ai-fab fixed bottom-24 right-[calc(50%-199px)] z-20 max-[430px]:right-4" type="button" @click="router.push({ name: 'ai-assistant' })">
      <van-icon name="chat-o" size="20" />
      AI
    </button>
  </section>
</template>
