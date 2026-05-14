<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
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
const AI_BUBBLE_STORAGE_KEY = 'notely-ai-bubble-position'
const aiBubble = reactive({
  x: 0,
  y: 0,
  side: 'right' as 'left' | 'right',
  collapsed: true,
})
const aiDrag = reactive({
  active: false,
  moved: false,
  offsetX: 0,
  offsetY: 0,
})
const aiBubbleReady = ref(false)

const todaySummary = computed(() => {
  const today = toDateString(new Date())
  const records = store.records.filter((record) => record.date === today)
  const income = records.filter((record) => record.type === 'income').reduce((sum, record) => sum + record.amount, 0)
  const expense = records.filter((record) => record.type === 'expense').reduce((sum, record) => sum + record.amount, 0)
  return { income, expense, profit: income - expense, count: records.length }
})

const yesterdaySummary = computed(() => {
  const date = new Date()
  date.setDate(date.getDate() - 1)
  const yesterday = toDateString(date)
  const records = store.records.filter((record) => record.date === yesterday)
  const income = records.filter((record) => record.type === 'income').reduce((sum, record) => sum + record.amount, 0)
  const expense = records.filter((record) => record.type === 'expense').reduce((sum, record) => sum + record.amount, 0)
  return { income, expense, profit: income - expense, count: records.length }
})

const dailyProfitDelta = computed(() => todaySummary.value.profit - yesterdaySummary.value.profit)
const dailyTrendTone = computed(() => (dailyProfitDelta.value >= 0 ? 'up' : 'down'))
const dailyTrendText = computed(() => {
  const prefix = dailyProfitDelta.value >= 0 ? '较昨 +' : '较昨 '
  return `${prefix}${formatMoney(dailyProfitDelta.value).replace('¥', '')}`
})

const homeTrendSeries = computed(() => [
  {
    name: '净额',
    data: [yesterdaySummary.value.profit, todaySummary.value.profit],
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
  colors: [dailyTrendTone.value === 'up' ? '#ffffff' : '#fecdd3'],
  dataLabels: { enabled: false },
  stroke: { curve: 'smooth', width: 3, lineCap: 'round' },
  fill: {
    type: 'gradient',
    gradient: { opacityFrom: 0.34, opacityTo: 0.04, stops: [0, 100] },
  },
  markers: {
    size: [0, 4],
    strokeWidth: 2,
    strokeColors: '#ffffff',
    colors: [dailyTrendTone.value === 'up' ? '#ffffff' : '#fecdd3'],
  },
  grid: { show: false },
  xaxis: {
    categories: ['昨日', '今日'],
    labels: { show: false },
  },
  yaxis: { labels: { show: false } },
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

function getBubbleBounds() {
  const width = Math.min(window.innerWidth, 430)
  const left = (window.innerWidth - width) / 2
  const bottomNav = 92
  const size = 48
  return {
    left,
    right: left + width,
    top: 12,
    bottom: window.innerHeight - bottomNav,
    size,
  }
}

function ensureBubblePosition() {
  if (aiBubbleReady.value) return
  const bounds = getBubbleBounds()
  try {
    const saved = JSON.parse(localStorage.getItem(AI_BUBBLE_STORAGE_KEY) || '{}') as { side?: 'left' | 'right'; y?: number }
    aiBubble.side = saved.side === 'left' ? 'left' : 'right'
    aiBubble.y = typeof saved.y === 'number' ? saved.y : bounds.bottom - bounds.size - 12
  } catch {
    aiBubble.side = 'right'
    aiBubble.y = bounds.bottom - bounds.size - 12
  }
  aiBubble.x = aiBubble.side === 'left' ? bounds.left - 14 : bounds.right - bounds.size + 14
  aiBubble.y = Math.min(Math.max(aiBubble.y, bounds.top), bounds.bottom - bounds.size)
  aiBubble.collapsed = true
  aiBubbleReady.value = true
}

function resetBubbleToEdge() {
  if (!aiBubbleReady.value) return
  const bounds = getBubbleBounds()
  aiBubble.x = aiBubble.side === 'left' ? bounds.left - 14 : bounds.right - bounds.size + 14
  aiBubble.y = Math.min(Math.max(aiBubble.y, bounds.top), bounds.bottom - bounds.size)
}

function persistBubblePosition() {
  localStorage.setItem(AI_BUBBLE_STORAGE_KEY, JSON.stringify({ side: aiBubble.side, y: aiBubble.y }))
}

function handleAiPointerDown(event: PointerEvent) {
  ensureBubblePosition()
  aiDrag.active = true
  aiDrag.moved = false
  aiDrag.offsetX = event.clientX - aiBubble.x
  aiDrag.offsetY = event.clientY - aiBubble.y
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function handleAiPointerMove(event: PointerEvent) {
  if (!aiDrag.active) return
  const bounds = getBubbleBounds()
  const nextX = event.clientX - aiDrag.offsetX
  const nextY = event.clientY - aiDrag.offsetY
  aiBubble.x = Math.min(Math.max(nextX, bounds.left + 6), bounds.right - bounds.size - 6)
  aiBubble.y = Math.min(Math.max(nextY, bounds.top), bounds.bottom - bounds.size)
  aiDrag.moved = true
}

function handleAiPointerUp(event: PointerEvent) {
  if (!aiDrag.active) return
  const bounds = getBubbleBounds()
  const centerX = aiBubble.x + bounds.size / 2
  aiBubble.side = centerX < window.innerWidth / 2 ? 'left' : 'right'
  aiBubble.x = aiBubble.side === 'left' ? bounds.left - 14 : bounds.right - bounds.size + 14
  aiBubble.collapsed = true
  aiDrag.active = false
  persistBubblePosition()
  ;(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId)
}

function handleAiPointerCancel(event: PointerEvent) {
  if (!aiDrag.active) return
  aiDrag.active = false
  aiBubble.collapsed = true
  persistBubblePosition()
  ;(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId)
}

function openAiAssistant() {
  if (aiDrag.moved) return
  if (aiBubble.collapsed) {
    aiBubble.collapsed = false
    return
  }
  persistBubblePosition()
  router.push({ name: 'ai-assistant' })
}

onMounted(() => {
  ensureBubblePosition()
  window.addEventListener('resize', resetBubbleToEdge)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resetBubbleToEdge)
})
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
        <div class="min-w-0 flex-1">
          <p class="text-sm text-white/70">今日净额</p>
          <strong class="money-hero mt-2 block font-black leading-none tracking-normal">{{ formatMoney(todaySummary.profit) }}</strong>
          <p class="mt-2 text-xs font-semibold" :class="dailyTrendTone === 'up' ? 'text-emerald-50/90' : 'text-rose-100'">{{ dailyTrendText }}</p>
        </div>
        <div class="w-[116px] shrink-0">
          <div class="mb-2 ml-auto w-fit rounded-full bg-white/14 px-3 py-1 text-xs font-semibold text-white/86">{{ todaySummary.count }} 笔</div>
          <div class="h-14">
            <VueApexCharts type="area" height="56" :options="homeTrendOptions" :series="homeTrendSeries" />
          </div>
          <div class="mt-1 flex justify-between text-[10px] font-semibold text-white/48">
            <span>昨日</span>
            <span>今日</span>
          </div>
        </div>
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

    <button
      class="ai-orb"
      :class="[`ai-orb-${aiBubble.side}`, { 'ai-orb-collapsed': aiBubble.collapsed, 'ai-orb-dragging': aiDrag.active }]"
      :style="{ left: `${aiBubble.x}px`, top: `${aiBubble.y}px` }"
      type="button"
      @pointerdown="handleAiPointerDown"
      @pointermove="handleAiPointerMove"
      @pointerup="handleAiPointerUp"
      @pointercancel="handleAiPointerCancel"
      @click="openAiAssistant"
    >
      <span class="ai-orb-icon">
        <van-icon name="chat-o" size="19" />
      </span>
      <span class="ai-orb-label">AI</span>
    </button>
  </section>
</template>
