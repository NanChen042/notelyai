<script setup lang="ts">
import type { Batch, BatchSummary } from '@/stores/bookkeeping'
import { formatMoney } from '@/utils/format'

defineProps<{
  batch: Batch
  summary: BatchSummary
}>()
</script>

<template>
  <button class="w-full rounded-2xl bg-white p-4 text-left shadow-[0_10px_28px_rgba(15,23,42,0.06)] transition active:scale-[0.99]">
    <div class="flex items-start gap-3">
      <div class="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-base font-bold text-slate-700">
        <img v-if="batch.imageUrl" :src="batch.imageUrl" alt="批次图片" class="h-full w-full object-cover" />
        <span v-else>{{ batch.cover }}</span>
      </div>

      <div class="min-w-0 flex-1">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <h3 class="truncate text-base font-semibold text-slate-950">{{ batch.name }}</h3>
            <p class="mt-1 text-xs text-slate-400">{{ batch.createdAt }} 创建</p>
          </div>
          <span
            class="shrink-0 rounded-full px-2 py-1 text-[11px]"
            :class="batch.status === 'ongoing' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'"
          >
            {{ batch.status === 'ongoing' ? '进行中' : '已完成' }}
          </span>
        </div>

        <div class="mt-4 grid grid-cols-3 text-xs">
          <div>
            <p class="text-slate-400">收入</p>
            <p class="mt-1 font-semibold text-slate-700">{{ formatMoney(summary.income) }}</p>
          </div>
          <div>
            <p class="text-slate-400">支出</p>
            <p class="mt-1 font-semibold text-slate-700">{{ formatMoney(summary.expense) }}</p>
          </div>
          <div>
            <p class="text-slate-400">利润</p>
            <p class="mt-1 font-semibold" :class="summary.profit >= 0 ? 'text-emerald-600' : 'text-red-500'">
              {{ formatMoney(summary.profit, true) }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </button>
</template>
