<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { showConfirmDialog, showToast } from 'vant'
import { useRoute, useRouter } from 'vue-router'
import BatchCard from '@/components/bookkeeping/BatchCard.vue'
import RecordTimeline from '@/components/bookkeeping/RecordTimeline.vue'
import type { AccountRecord, Batch } from '@/stores/bookkeeping'
import { useBookkeepingStore } from '@/stores/bookkeeping'

const route = useRoute()
const router = useRouter()
const store = useBookkeepingStore()

const activeTabId = ref('')

// Sync active batch for static display
const activeBatch = computed(() => {
  return store.sortedBatches.find((b) => b.id === activeTabId.value) ?? store.sortedBatches[0] ?? null
})

// Sync route batchId with activeTabId
watch(
  () => route.query.batchId,
  (newId) => {
    const val = typeof newId === 'string' ? newId : ''
    const targetId = store.sortedBatches.find((b) => b.id === val)?.id ?? store.sortedBatches[0]?.id ?? ''
    if (activeTabId.value !== targetId) {
      activeTabId.value = targetId
    }
  },
  { immediate: true }
)

// Sync activeTabId with route query
watch(activeTabId, (newId) => {
  if (newId && route.query.batchId !== newId) {
    router.replace({ name: 'batches', query: { batchId: newId } })
  }
})

// Handle store batch list changes (such as deleting active batch)
watch(
  () => store.sortedBatches,
  (batches) => {
    if (batches.length > 0) {
      if (!batches.some((b) => b.id === activeTabId.value)) {
        activeTabId.value = batches[0]?.id ?? ''
      }
    } else {
      activeTabId.value = ''
      if (route.query.batchId) {
        router.replace({ name: 'batches', query: {} })
      }
    }
  },
  { deep: true }
)

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

    <div v-if="!store.sortedBatches.length" class="glass-panel app-muted rounded-2xl p-5 text-center">
      暂无批次数据，点击右上角“新建”
    </div>

    <template v-else>
      <!-- Batch summary card stays static at the top and updates reactively -->
      <van-swipe-cell v-if="activeBatch" class="batch-swipe-cell">
        <BatchCard :batch="activeBatch" :summary="store.getBatchSummary(activeBatch.id)" variant="summary" />
        <template #right>
          <div class="flex h-full overflow-hidden rounded-2xl">
            <button class="swipe-action swipe-action-edit" type="button" @click.stop="openBatchForm(activeBatch)">编辑</button>
            <button class="swipe-action swipe-action-delete" type="button" @click.stop="confirmDeleteBatch(activeBatch)">删除</button>
          </div>
        </template>
      </van-swipe-cell>

      <!-- Only the bottom transaction records slide horizontally -->
      <van-tabs
        v-model:active="activeTabId"
        swipeable
        animated
        :border="false"
        class="batches-tabs"
      >
        <van-tab
          v-for="batch in store.sortedBatches"
          :key="batch.id"
          :name="batch.id"
          :title="batch.name"
        >
          <div class="app-card-solid p-4 mt-4">
            <div class="mb-4 flex items-center justify-between">
              <h2 class="font-bold">收支记录</h2>
              <span class="app-subtle text-xs">每次卖出可继续新增</span>
            </div>
            <RecordTimeline
              :records="store.getBatchRecords(batch.id)"
              :get-batch-name="store.getBatchName"
              @edit="openEditRecord"
              @delete="deleteRecord"
            />
          </div>
        </van-tab>
      </van-tabs>
    </template>
  </section>
</template>

<style scoped>
.batch-swipe-cell {
  border-radius: 16px;
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

.batches-tabs :deep(.van-tabs__wrap) {
  border: 1px solid rgba(255, 255, 255, 0.74);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
  backdrop-filter: blur(10px);
}

.batches-tabs :deep(.van-tabs__nav) {
  background: transparent;
  padding-bottom: 6px;
}

.batches-tabs :deep(.van-tab) {
  font-weight: 700;
  color: var(--app-text-muted);
  font-size: 14px;
  padding: 0 16px;
}

.batches-tabs :deep(.van-tab--active) {
  font-weight: 900;
  color: var(--app-primary);
  font-size: 15px;
}

.batches-tabs :deep(.van-tabs__line) {
  background: var(--app-primary);
  height: 3px;
  border-radius: 99px;
  bottom: 8px;
}
</style>


