<script setup lang="ts">
import { computed } from 'vue'
import type { AccountRecord } from '@/stores/bookkeeping'
import { formatDate, formatRecordAmount, getFinancialToneClass, getRecordDotClass } from '@/utils/format'

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
      <p class="app-muted mb-3 text-sm font-medium">{{ formatDate(group.date) }}</p>

      <div class="relative space-y-4 pl-5 before:absolute before:left-[5px] before:top-2 before:h-full before:w-px before:bg-[var(--app-border)]">
        <div v-for="record in group.records" :key="record.id" class="app-border relative flex items-start justify-between gap-4 border-b pb-4 last:border-b-0">
          <span
            class="absolute -left-[19px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-white"
            :class="getRecordDotClass(record.type)"
          />

          <div class="min-w-0 flex-1">
            <h4 class="app-text text-sm font-semibold">{{ record.category }}</h4>
            <p class="app-subtle mt-1 truncate text-xs">{{ record.note || getBatchName(record.batchId) }}</p>
            <div v-if="record.imageUrl" class="app-surface-soft mt-2 h-14 w-14 overflow-hidden rounded-xl">
              <img :src="record.imageUrl" alt="记录图片" class="h-full w-full object-cover" />
            </div>
          </div>

          <strong class="shrink-0 text-sm font-black" :class="getFinancialToneClass(record.type)">
            {{ formatRecordAmount(record.amount, record.type) }}
          </strong>
        </div>
      </div>
    </div>

    <div v-if="records.length === 0" class="empty-records">
      <div class="empty-records-icon">
        <van-icon name="notes-o" size="24" />
      </div>
      <p class="mt-3 text-sm font-bold">还没有记录</p>
      <p class="app-subtle mt-1 text-xs">新增收入或支出后，流水会显示在这里</p>
    </div>
  </section>
</template>

<style scoped>
.empty-records {
  border: 1px dashed var(--app-border);
  border-radius: 20px;
  padding: 28px 16px;
  text-align: center;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.72), rgba(241, 245, 243, 0.72));
}

.empty-records-icon {
  display: inline-flex;
  width: 52px;
  height: 52px;
  align-items: center;
  justify-content: center;
  border-radius: 18px;
  background: var(--app-primary-soft);
  color: var(--app-primary);
}
</style>
