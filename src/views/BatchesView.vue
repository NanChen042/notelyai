<script setup lang="ts">
import { computed } from 'vue'
import { showConfirmDialog, showToast } from 'vant'
import { useRoute, useRouter } from 'vue-router'
import BatchCard from '@/components/bookkeeping/BatchCard.vue'
import RecordTimeline from '@/components/bookkeeping/RecordTimeline.vue'
import type { AccountRecord, Batch } from '@/stores/bookkeeping'
import { useBookkeepingStore } from '@/stores/bookkeeping'
import { formatMoney } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const store = useBookkeepingStore()

const selectedBatch = computed(() => {
  const routeBatchId = typeof route.query.batchId === 'string' ? route.query.batchId : ''
  return store.sortedBatches.find((batch) => batch.id === routeBatchId) ?? store.sortedBatches[0] ?? null
})

const displayedRecords = computed(() => (selectedBatch.value ? store.getBatchRecords(selectedBatch.value.id) : []))

function selectBatch(batchId: string) {
  router.replace({ name: 'batches', query: { batchId } })
}

function openBatchForm(batch?: Batch) {
  router.push(batch ? { name: 'batch-edit', params: { id: batch.id } } : { name: 'batch-new' })
}

function openEditRecord(record: AccountRecord) {
  router.push({ name: 'record-edit', params: { id: record.id } })
}

function deleteRecord(id: string) {
  store.deleteRecord(id)
  showToast('记录已删除')
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
      router.replace({ name: 'batches' })
    })
    .catch(() => {})
}
</script>

<template>
  <section class="space-y-5 px-4 pb-6 pt-5">
    <header class="flex items-center justify-between">
      <button class="app-surface flex h-9 w-9 items-center justify-center rounded-full" type="button" @click="router.push({ name: 'dashboard' })">
        <van-icon name="arrow-left" size="20" />
      </button>
      <h1 class="text-lg font-bold">批次账单</h1>
      <button class="app-muted text-sm" type="button" @click="openBatchForm()">新建</button>
    </header>

    <section v-if="store.sortedBatches.length" class="batch-selector">
      <div class="mb-2 flex items-center justify-between">
        <span class="app-subtle text-xs font-bold">选择批次</span>
        <span class="app-subtle text-xs">{{ store.sortedBatches.length }} 个</span>
      </div>
      <div class="batch-switcher -mx-3 flex gap-2 overflow-x-auto px-3 pb-0.5">
        <button
          v-for="batch in store.sortedBatches"
          :key="batch.id"
          class="batch-chip shrink-0 text-left transition active:scale-[0.98]"
          :class="selectedBatch?.id === batch.id ? 'batch-chip-active' : 'batch-chip-idle'"
          type="button"
          @click="selectBatch(batch.id)"
        >
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-black">{{ batch.name }}</span>
          </span>
        </button>
      </div>
    </section>

    <van-swipe-cell v-if="selectedBatch" class="batch-swipe-cell">
      <BatchCard :batch="selectedBatch" :summary="store.getBatchSummary(selectedBatch.id)" variant="summary" />
      <template #right>
        <div class="flex h-full overflow-hidden rounded-2xl">
          <button class="swipe-action swipe-action-edit" type="button" @click.stop="openBatchForm(selectedBatch)">编辑</button>
          <button class="swipe-action swipe-action-delete" type="button" @click.stop="confirmDeleteBatch(selectedBatch)">删除</button>
        </div>
      </template>
    </van-swipe-cell>

    <div v-else class="glass-panel app-muted rounded-2xl p-5 text-center">暂无批次数据，点击右上角“新建”</div>

    <div class="app-card-solid p-4">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="font-bold">收支记录</h2>
        <span class="app-subtle text-xs">每次卖出可继续新增</span>
      </div>
      <RecordTimeline
        :records="displayedRecords"
        :get-batch-name="store.getBatchName"
        @edit="openEditRecord"
        @delete="deleteRecord"
      />
    </div>
  </section>
</template>
