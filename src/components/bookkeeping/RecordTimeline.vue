<script setup lang="ts">
import { computed } from 'vue'
import type { AccountRecord } from '@/stores/bookkeeping'
import { formatDate, formatRecordAmount, getFinancialToneClass, getRecordDotClass } from '@/utils/format'

const props = defineProps<{
  records: AccountRecord[]
  getBatchName: (batchId: string) => string
}>()

const emit = defineEmits<{
  edit: [record: AccountRecord]
  delete: [id: string]
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
      <p class="record-date-label">{{ formatDate(group.date) }}</p>

      <div class="record-group">
        <van-swipe-cell v-for="record in group.records" :key="record.id" class="record-swipe-cell" :right-width="72">
          <div class="record-row" @click="emit('edit', record)">
            <span
              class="record-dot"
              :class="getRecordDotClass(record.type)"
            />

            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <h4 class="app-text truncate text-sm font-black">{{ record.category }}</h4>
                <span class="record-type-chip" :class="record.type === 'income' ? 'record-type-income' : 'record-type-expense'">
                  {{ record.type === 'income' ? '收入' : '支出' }}
                </span>
              </div>
              <p class="app-subtle mt-1 truncate text-xs">{{ record.note || getBatchName(record.batchId) }}</p>
              <div v-if="record.imageUrl" class="app-surface-soft mt-2 h-14 w-14 overflow-hidden rounded-xl">
                <img :src="record.imageUrl" alt="记录图片" class="h-full w-full object-cover" />
              </div>
            </div>

            <strong class="shrink-0 text-sm font-black" :class="getFinancialToneClass(record.type)">
              {{ formatRecordAmount(record.amount, record.type) }}
            </strong>
          </div>
          <template #right>
            <van-button square text="删除" type="danger" class="delete-button" @click="emit('delete', record.id)" />
          </template>
        </van-swipe-cell>
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
.record-date-label {
  display: inline-flex;
  margin-bottom: 10px;
  border-radius: 999px;
  padding: 4px 10px;
  background: var(--app-surface-soft);
  color: var(--app-text-muted);
  font-size: 13px;
  font-weight: 800;
}

.record-group {
  position: relative;
  padding-left: 20px;
}

.record-group::before {
  position: absolute;
  top: 12px;
  bottom: 18px;
  left: 5px;
  width: 1px;
  background: color-mix(in srgb, var(--app-border) 55%, transparent);
  content: "";
}

.record-row {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 10px;
  border: 1px solid color-mix(in srgb, var(--app-border) 72%, transparent);
  border-radius: 16px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.035);
  cursor: pointer;
}

.record-swipe-cell {
  overflow: hidden;
  border-radius: 16px;
}

.record-swipe-cell:last-child .record-row {
  margin-bottom: 0;
}

.record-dot {
  position: absolute;
  top: 17px;
  left: -19px;
  width: 10px;
  height: 10px;
  border-radius: 999px;
  box-shadow: 0 0 0 4px #fff;
}

.record-type-chip {
  flex: 0 0 auto;
  border-radius: 999px;
  padding: 2px 7px;
  font-size: 10px;
  font-weight: 900;
}

.record-type-income {
  background: color-mix(in srgb, var(--app-income) 12%, white);
  color: var(--app-income);
}

.record-type-expense {
  background: color-mix(in srgb, var(--app-expense) 12%, white);
  color: var(--app-expense);
}

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
.delete-button {
  height: 100%;
  width: 72px;
}
</style>
