<script setup lang="ts">
import { computed, ref } from 'vue'
import { showToast } from 'vant'

const emit = defineEmits<{
  back: []
  save: [payload: { name: string; imageUrl: string }]
}>()

const name = ref('')
const fileList = ref<{ url?: string; content?: string }[]>([])

const imageUrl = computed(() => fileList.value[0]?.url || fileList.value[0]?.content || '')

function saveBatch() {
  if (!name.value.trim()) {
    showToast('请输入批次名称')
    return
  }

  emit('save', {
    name: name.value.trim(),
    imageUrl: imageUrl.value,
  })
}
</script>

<template>
  <section class="min-h-screen bg-[#f7f8fa] px-4 pb-6 pt-5">
    <header class="mb-5 flex items-center justify-between">
      <button class="flex h-9 w-9 items-center justify-center rounded-full bg-white" type="button" @click="emit('back')">
        <van-icon name="arrow-left" size="20" />
      </button>
      <h1 class="text-lg font-bold text-slate-900">新建批次</h1>
      <span class="w-9" />
    </header>

    <div class="space-y-5 rounded-2xl bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
      <section>
        <label class="mb-3 block text-sm font-medium text-slate-700">批次名称</label>
        <van-field v-model="name" class="rounded-xl border border-slate-100 bg-white" placeholder="例如：AJ1 黑红脚趾" />
      </section>

      <section>
        <label class="mb-3 block text-sm font-medium text-slate-700">批次图片</label>
        <van-uploader v-model="fileList" :max-count="1" preview-size="92" result-type="dataUrl" />
        <p class="mt-2 text-xs text-slate-400">支持上传一张封面图，会显示在批次卡片中</p>
      </section>
    </div>

    <div class="mt-6">
      <button class="w-full rounded-full bg-[linear-gradient(135deg,#0d9d57,#0f7a4c)] py-3 text-base font-semibold text-white shadow-[0_14px_28px_rgba(16,132,78,0.3)] active:scale-[0.99]" type="button" @click="saveBatch">
        保存批次
      </button>
    </div>
  </section>
</template>
