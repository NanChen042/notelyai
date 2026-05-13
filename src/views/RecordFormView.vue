<script setup lang="ts">
import { computed } from 'vue'
import { showToast } from 'vant'
import { useRoute, useRouter } from 'vue-router'
import RecordFormPage from '@/components/bookkeeping/RecordFormPage.vue'
import type { RecordDraft } from '@/stores/bookkeeping'
import { useBookkeepingStore } from '@/stores/bookkeeping'

const route = useRoute()
const router = useRouter()
const store = useBookkeepingStore()

const record = computed(() => {
  const id = typeof route.params.id === 'string' ? route.params.id : ''
  return store.records.find((item) => item.id === id)
})

function goBack() {
  router.back()
}

function saveRecord(draft: RecordDraft & { id?: string }) {
  if (draft.id) {
    store.updateRecord(draft.id, draft)
    showToast('记录已更新')
    router.push({ name: 'batches', query: { batchId: draft.batchId } })
    return
  }

  store.addRecord(draft)
  showToast('记录已保存，利润已更新')
  router.push({ name: 'batches', query: { batchId: draft.batchId } })
}

function createBatch(payload: { name: string; imageUrl: string }, done: (batchId: string) => void) {
  const created = store.addBatch(payload.name, payload.imageUrl)
  showToast('批次已创建')
  done(created.id)
}
</script>

<template>
  <RecordFormPage
    :batches="store.sortedBatches"
    :expense-categories="store.expenseCategories"
    :income-categories="store.incomeCategories"
    :record="record"
    @back="goBack"
    @create-batch="createBatch"
    @save="saveRecord"
  />
</template>
