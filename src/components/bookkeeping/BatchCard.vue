<script setup lang="ts">
import type { Batch, BatchSummary } from '@/stores/bookkeeping'
import { formatMoney, getFinancialToneClass } from '@/utils/format'

withDefaults(defineProps<{
  batch: Batch
  summary: BatchSummary
  variant?: 'default' | 'summary'
}>(), {
  variant: 'default',
})
</script>

<template>
  <button class="app-card batch-card w-full p-4 text-left transition active:scale-[0.99]">
    <div class="batch-card-content flex items-start gap-3">
      <div class="batch-cover app-muted flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[var(--app-radius-xs)] text-base font-bold">
        <img v-if="batch.imageUrl" :src="batch.imageUrl" alt="批次图片" class="h-full w-full object-cover" />
        <span v-else>{{ batch.cover }}</span>
      </div>

      <div v-if="variant === 'default'" class="min-w-0 flex-1">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <h3 class="app-text truncate text-base font-semibold">{{ batch.name }}</h3>
            <p class="app-subtle mt-1 text-xs">{{ batch.createdAt }} 创建</p>
          </div>
          <span
            class="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
            :class="batch.status === 'ongoing' ? 'app-primary-soft' : 'app-surface-soft app-muted'"
          >
            {{ batch.status === 'ongoing' ? '进行中' : '已完成' }}
          </span>
        </div>

        <div class="mt-4 grid grid-cols-3 text-xs">
          <div>
            <p class="app-subtle">收入</p>
            <p class="app-text mt-1 font-semibold">{{ formatMoney(summary.income) }}</p>
          </div>
          <div>
            <p class="app-subtle">支出</p>
            <p class="app-text mt-1 font-semibold">{{ formatMoney(summary.expense) }}</p>
          </div>
          <div>
            <p class="app-subtle">利润</p>
            <p class="mt-1 font-semibold" :class="getFinancialToneClass('profit', summary.profit)">
              {{ formatMoney(summary.profit, true) }}
            </p>
          </div>
        </div>
      </div>

      <div v-else class="min-w-0 flex-1">
        <div class="summary-head">
          <p class="app-subtle text-xs font-bold">净利润</p>
          <strong class="summary-profit" :class="getFinancialToneClass('profit', summary.profit)">
            {{ formatMoney(summary.profit, true) }}
          </strong>
        </div>
        <div class="summary-grid mt-3 grid grid-cols-2 gap-2">
          <div>
            <p class="app-subtle">收入</p>
            <strong>{{ formatMoney(summary.income) }}</strong>
          </div>
          <div>
            <p class="app-subtle">支出</p>
            <strong>{{ formatMoney(summary.expense) }}</strong>
          </div>
        </div>
      </div>
    </div>
  </button>
</template>

<style scoped>
.batch-card {
  position: relative;
  overflow: hidden;
}

.batch-card::before {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  z-index: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.58), transparent 42%);
  content: "";
  pointer-events: none;
}

.batch-card-content {
  position: relative;
  z-index: 1;
}

.batch-cover {
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--app-primary-soft) 70%, white), var(--app-surface-soft));
}

.batch-cover img {
  display: block;
}

.summary-head {
  min-width: 0;
}

.summary-profit {
  display: block;
  margin-top: 3px;
  overflow-wrap: anywhere;
  font-size: clamp(20px, 6vw, 28px);
  font-weight: 900;
  line-height: 1.1;
}

.summary-grid p {
  font-size: 12px;
}

.summary-grid strong {
  display: block;
  margin-top: 5px;
  overflow: hidden;
  color: var(--app-text);
  font-size: 14px;
  font-weight: 900;
  line-height: 1.2;
  overflow-wrap: anywhere;
}
</style>
