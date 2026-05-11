<script setup lang="ts">
import { computed } from 'vue'
import type { AccountRecord } from '@/stores/bookkeeping'
import { formatDate, formatMoney } from '@/utils/format'

const props = defineProps<{
  records: AccountRecord[]
  getBatchName: (batchId: string) => string
}>()

const groupedRecords = computed(() => {
  const groups = new Map<string, AccountRecord[]>()
  props.records.forEach((record) => {
    if (!groups.has(record.date)) groups.set(record.date, [])
    groups.get(record.date)?.push(record)
  })

  return [...groups.entries()].map(([date, records]) => ({ date, records }))
})
</script>

<template>
  <section class="space-y-5">
    <div v-for="group in groupedRecords" :key="group.date">
      <p class="mb-3 text-sm font-medium text-slate-500">{{ formatDate(group.date) }}</p>

      <div class="relative space-y-4 pl-5 before:absolute before:left-[5px] before:top-2 before:h-full before:w-px before:bg-slate-200">
        <div v-for="record in group.records" :key="record.id" class="relative flex items-start justify-between gap-4 border-b border-slate-100 pb-4 last:border-b-0">
          <span
            class="absolute -left-[19px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-white"
            :class="record.type === 'income' ? 'bg-emerald-500' : 'bg-slate-400'"
          />

          <div class="min-w-0 flex-1">
            <h4 class="text-sm font-semibold text-slate-950">{{ record.category }}</h4>
            <p class="mt-1 truncate text-xs text-slate-400">{{ record.note || getBatchName(record.batchId) }}</p>
            <div v-if="record.imageUrl" class="mt-2 h-14 w-14 overflow-hidden rounded-xl bg-slate-100">
              <img :src="record.imageUrl" alt="记录图片" class="h-full w-full object-cover" />
            </div>
          </div>

          <strong
            class="shrink-0 text-sm"
            :class="record.type === 'income' ? 'text-emerald-600' : 'text-slate-900'"
          >
            {{ record.type === 'income' ? formatMoney(record.amount, true) : `- ${formatMoney(record.amount)}` }}
          </strong>
        </div>
      </div>
    </div>

    <van-empty v-if="records.length === 0" image-size="72" description="还没有记录" />
  </section>
</template>
