<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ApexOptions } from 'apexcharts'
import { showToast } from 'vant'
import VueApexCharts from 'vue3-apexcharts'
import BatchCard from '@/components/bookkeeping/BatchCard.vue'
import BatchFormPage from '@/components/bookkeeping/BatchFormPage.vue'
import RecordFormPage from '@/components/bookkeeping/RecordFormPage.vue'
import RecordTimeline from '@/components/bookkeeping/RecordTimeline.vue'
import SummaryCard from '@/components/bookkeeping/SummaryCard.vue'
import type { RecordDraft } from '@/stores/bookkeeping'
import { useBookkeepingStore } from '@/stores/bookkeeping'
import { formatMoney } from '@/utils/format'

const store = useBookkeepingStore()

type PageMode = 'dashboard' | 'batch-form' | 'record-form'

const pageMode = ref<PageMode>('dashboard')
const activeTab = ref(0)
const selectedBatchId = ref<string | null>(null)

const selectedBatch = computed(() => {
  const fallback = store.sortedBatches[0]
  return store.sortedBatches.find((batch) => batch.id === selectedBatchId.value) ?? fallback
})

const displayedRecords = computed(() => {
  if (activeTab.value === 1 && selectedBatch.value) return store.getBatchRecords(selectedBatch.value.id)
  return store.recentRecords
})

const trendSeries = computed(() => [
  {
    name: '利润',
    data: store.profitTrend.length ? store.profitTrend.map((point) => point.profit) : [0],
  },
])

const trendOptions = computed<ApexOptions>(() => ({
  chart: {
    type: 'area',
    toolbar: { show: false },
    zoom: { enabled: false },
    fontFamily: 'PingFang SC, Noto Sans SC, sans-serif',
  },
  colors: ['#16a34a'],
  dataLabels: { enabled: false },
  stroke: { curve: 'smooth', width: 2 },
  fill: {
    type: 'gradient',
    gradient: { opacityFrom: 0.24, opacityTo: 0.02, stops: [0, 100] },
  },
  grid: { borderColor: '#e8eef4' },
  xaxis: {
    categories: store.profitTrend.map((point) => point.date.slice(5).replace('-', '.')),
    labels: { style: { colors: '#8a97ab' } },
  },
  yaxis: { labels: { style: { colors: '#8a97ab' } } },
}))

const donutSeries = computed(() => [store.totalIncome, store.totalExpense])
const donutOptions: ApexOptions = {
  chart: { type: 'donut' },
  colors: ['#22c55e', '#fb7185'],
  labels: ['总收入', '总支出'],
  legend: { show: false },
  dataLabels: { enabled: false },
  stroke: { width: 0 },
  plotOptions: { pie: { donut: { size: '68%' } } },
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

function saveBatch(payload: { name: string; imageUrl: string }) {
  const batch = store.addBatch(payload.name, payload.imageUrl)
  selectedBatchId.value = batch.id
  pageMode.value = 'dashboard'
  activeTab.value = 1
  showToast('批次已创建')
}

function openRecordPage() {
  if (!store.batches.length) {
    showToast('请先新建批次')
    pageMode.value = 'batch-form'
    return
  }
  pageMode.value = 'record-form'
}
</script>

<template>
  <BatchFormPage v-if="pageMode === 'batch-form'" @back="pageMode = 'dashboard'" @save="saveBatch" />

  <RecordFormPage
    v-else-if="pageMode === 'record-form'"
    :batches="store.sortedBatches"
    :expense-categories="store.expenseCategories"
    :income-categories="store.incomeCategories"
    @back="pageMode = 'dashboard'"
    @save="saveRecord"
  />

  <main v-else class="bookkeeping-shell mx-auto min-h-screen max-w-[430px] pb-20 text-slate-950">
    <div class="pointer-events-none fixed inset-x-0 top-0 z-0 mx-auto h-80 max-w-[430px] bg-[radial-gradient(circle_at_20%_15%,rgba(16,185,129,0.22),transparent_56%),radial-gradient(circle_at_95%_0%,rgba(7,89,133,0.18),transparent_50%)]" />

    <section v-if="activeTab === 0" class="relative z-10 space-y-5 px-4 pb-4 pt-5">
      <header class="flex items-center justify-between">
        <div>
          <p class="text-[11px] tracking-[0.24em] text-slate-500">BATCH LEDGER</p>
          <h1 class="text-[30px] font-black leading-none tracking-tight text-slate-900">谷记账</h1>
        </div>
        <div class="glass-chip flex h-12 w-12 items-center justify-center text-2xl font-black text-emerald-700">谷</div>
      </header>

      <SummaryCard
        title="本月利润"
        :income="store.monthlyIncome"
        :expense="store.monthlyExpense"
        :profit="store.monthlyProfit"
        :trend="store.profitTrend"
      />

      <div class="glass-panel rounded-2xl p-4">
        <div class="grid grid-cols-3 text-center">
          <div>
            <p class="text-xs tracking-wide text-slate-400">批次数</p>
            <p class="mt-1 text-xl font-bold">{{ store.batches.length }}</p>
          </div>
          <div>
            <p class="text-xs tracking-wide text-slate-400">记录数</p>
            <p class="mt-1 text-xl font-bold">{{ store.records.length }}</p>
          </div>
          <div>
            <p class="text-xs tracking-wide text-slate-400">总利润</p>
            <p class="mt-1 text-xl font-bold text-emerald-600">{{ formatMoney(store.totalProfit) }}</p>
          </div>
        </div>
      </div>

      <section>
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-lg font-bold">批次账单</h2>
          <button class="flex items-center gap-1 text-sm text-slate-500" type="button" @click="activeTab = 1">
            全部 <van-icon name="arrow" />
          </button>
        </div>

        <div v-if="store.sortedBatches.length" class="space-y-3">
          <BatchCard
            v-for="batch in store.sortedBatches.slice(0, 3)"
            :key="batch.id"
            :batch="batch"
            :summary="store.getBatchSummary(batch.id)"
            @click="openBatch(batch.id)"
          />
        </div>
        <div v-else class="glass-panel rounded-2xl p-5 text-center">
          <p class="text-base font-semibold text-slate-800">还没有批次</p>
          <p class="mt-1 text-sm text-slate-500">先创建批次，再添加卖出收入和支出记录</p>
          <button class="mt-4 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white" type="button" @click="pageMode = 'batch-form'">
            新建第一个批次
          </button>
        </div>
      </section>
    </section>

    <section v-else-if="activeTab === 1" class="relative z-10 space-y-5 px-4 pb-4 pt-5">
      <header class="flex items-center justify-between">
        <button class="flex h-9 w-9 items-center justify-center rounded-full bg-white" type="button" @click="activeTab = 0">
          <van-icon name="arrow-left" size="20" />
        </button>
        <h1 class="text-lg font-bold">批次账单</h1>
        <button class="text-sm text-slate-500" type="button" @click="pageMode = 'batch-form'">新建</button>
      </header>

      <div class="flex gap-2 overflow-x-auto pb-1">
        <button
          v-for="batch in store.sortedBatches"
          :key="batch.id"
          class="shrink-0 rounded-full px-4 py-2 text-sm font-medium"
          :class="selectedBatch?.id === batch.id ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600'"
          type="button"
          @click="selectedBatchId = batch.id"
        >
          {{ batch.name }}
        </button>
      </div>

      <BatchCard v-if="selectedBatch" :batch="selectedBatch" :summary="store.getBatchSummary(selectedBatch.id)" />
      <div v-else class="glass-panel rounded-2xl p-5 text-center text-slate-500">暂无批次数据，点击右上角“新建”</div>

      <div class="rounded-2xl bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="font-bold">收支记录</h2>
          <span class="text-xs text-slate-400">每次卖出可继续新增</span>
        </div>
        <RecordTimeline :records="displayedRecords" :get-batch-name="store.getBatchName" />
      </div>
    </section>

    <section v-else-if="activeTab === 2" class="relative z-10 space-y-5 px-4 pb-4 pt-5">
      <header>
        <h1 class="text-xl font-bold">统计</h1>
      </header>

      <div class="rounded-2xl bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
        <div class="mb-2 flex items-center justify-between">
          <div>
            <p class="text-sm font-semibold text-emerald-600">利润趋势</p>
            <h2 class="mt-1 text-2xl font-bold">{{ formatMoney(store.totalProfit) }}</h2>
          </div>
          <span class="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-600">全部时间</span>
        </div>
        <VueApexCharts type="area" height="180" :options="trendOptions" :series="trendSeries" />
      </div>

      <div class="rounded-2xl bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
        <h2 class="mb-4 font-bold">收支概览</h2>
        <div class="flex items-center justify-between gap-4">
          <VueApexCharts type="donut" width="160" :options="donutOptions" :series="donutSeries" />
          <div class="flex-1 space-y-5">
            <div>
              <p class="text-sm text-slate-400">总收入</p>
              <p class="mt-1 text-lg font-bold">{{ formatMoney(store.totalIncome) }}</p>
            </div>
            <div>
              <p class="text-sm text-slate-400">总支出</p>
              <p class="mt-1 text-lg font-bold">{{ formatMoney(store.totalExpense) }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section v-else class="relative z-10 space-y-5 px-4 pb-4 pt-5">
      <header>
        <h1 class="text-xl font-bold">我的</h1>
      </header>

      <div class="rounded-2xl bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
        <div class="flex items-center gap-4">
          <div class="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-xl font-bold text-emerald-700">谷</div>
          <div>
            <h2 class="text-lg font-bold">本地账本</h2>
            <p class="mt-1 text-sm text-slate-500">数据保存在当前浏览器本地存储</p>
          </div>
        </div>
      </div>
    </section>

    <button
      v-if="activeTab !== 2"
      class="fixed bottom-24 left-1/2 z-20 flex h-12 w-[180px] -translate-x-1/2 items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#0d9d57,#0f7a4c)] text-sm font-semibold text-white shadow-[0_16px_34px_rgba(16,132,78,0.36)] active:scale-[0.98]"
      type="button"
      @click="openRecordPage"
    >
      <van-icon name="plus" size="18" />
      新增记录
    </button>

    <van-tabbar v-model="activeTab" active-color="#16834b" inactive-color="#8a94a6" safe-area-inset-bottom>
      <van-tabbar-item icon="home-o">首页</van-tabbar-item>
      <van-tabbar-item icon="notes-o">批次</van-tabbar-item>
      <van-tabbar-item icon="bar-chart-o">统计</van-tabbar-item>
      <van-tabbar-item icon="user-o">我的</van-tabbar-item>
    </van-tabbar>
  </main>
</template>

<style scoped>
.bookkeeping-shell {
  background:
    linear-gradient(180deg, rgba(241, 251, 247, 0.9) 0%, rgba(247, 248, 250, 0.97) 28%, #f7f8fa 54%),
    radial-gradient(circle at 15% 15%, rgba(20, 184, 166, 0.18), transparent 45%);
}

.glass-panel {
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(8px);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.07);
}

.glass-chip {
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(8px);
  box-shadow: inset 0 0 0 1px rgba(16, 185, 129, 0.12);
}
</style>
