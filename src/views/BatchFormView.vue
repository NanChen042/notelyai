<script setup lang="ts">
import { computed } from 'vue'
import { showToast } from 'vant'
import { useRoute, useRouter } from 'vue-router'
import BatchFormPage from '@/components/bookkeeping/BatchFormPage.vue'
import { useBookkeepingStore } from '@/stores/bookkeeping'

const route = useRoute()
const router = useRouter()
const store = useBookkeepingStore()

const batch = computed(() => {
  const id = typeof route.params.id === 'string' ? route.params.id : ''
  return store.batches.find((item) => item.id === id) ?? null
})

function goBack() {
  router.back()
}

function saveBatch(payload: { id?: string; name: string; imageUrl: string }) {
  if (payload.id) {
    store.updateBatch(payload.id, payload)
    showToast('批次已更新')
    router.push({ name: 'batches', query: { batchId: payload.id } })
    return
  }

  const created = store.addBatch(payload.name, payload.imageUrl)
  showToast('批次已创建')
  router.push({ name: 'batches', query: { batchId: created.id } })
}
</script>

<template>
  <BatchFormPage :batch="batch" @back="goBack" @save="saveBatch" />
</template>
