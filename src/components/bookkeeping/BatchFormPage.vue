<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { showToast } from 'vant'
import type { Batch } from '@/stores/bookkeeping'

const emit = defineEmits<{
  back: []
  save: [payload: { id?: string; name: string; imageUrl: string }]
}>()

const props = defineProps<{
  batch?: Batch | null
}>()

const name = ref('')
const fileList = ref<{ url?: string; content?: string }[]>([])

const imageUrl = computed(() => fileList.value[0]?.url || fileList.value[0]?.content || '')

watch(
  () => props.batch,
  (batch) => {
    name.value = batch?.name ?? ''
    fileList.value = batch?.imageUrl ? [{ url: batch.imageUrl }] : []
  },
  { immediate: true },
)

function saveBatch() {
  if (!name.value.trim()) {
    showToast('请输入批次名称')
    return
  }

  emit('save', {
    id: props.batch?.id,
    name: name.value.trim(),
    imageUrl: imageUrl.value,
  })
}
</script>

<template>
  <section class="app-page-bg min-h-screen px-4 pb-6 pt-5">
    <header class="mb-5 flex items-center justify-between">
      <button class="app-surface flex h-9 w-9 items-center justify-center rounded-full" type="button" @click="emit('back')">
        <van-icon name="arrow-left" size="20" />
      </button>
      <h1 class="app-text text-lg font-bold">{{ batch ? '编辑批次' : '新建批次' }}</h1>
      <span class="w-9" />
    </header>

    <div class="app-card-solid space-y-5 p-4">
      <section>
        <label class="app-text mb-3 block text-sm font-medium">批次名称</label>
        <van-field v-model="name" class="app-field" placeholder="例如：AJ1 黑红脚趾" />
      </section>

      <section>
        <label class="app-text mb-3 block text-sm font-medium">批次图片</label>
        <van-uploader v-model="fileList" :max-count="1" preview-size="92" result-type="dataUrl" />
        <p class="app-subtle mt-2 text-xs">支持上传一张封面图，会显示在批次卡片中</p>
      </section>
    </div>

    <div class="mt-6">
      <button class="app-primary-button w-full rounded-full py-3 text-base font-semibold active:scale-[0.99]" type="button" @click="saveBatch">
        {{ batch ? '保存修改' : '保存批次' }}
      </button>
    </div>
  </section>
</template>
