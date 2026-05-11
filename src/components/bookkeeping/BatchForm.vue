<script setup lang="ts">
import { ref, watch } from 'vue'
import { showToast } from 'vant'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  close: []
  save: [name: string]
}>()

const name = ref('')

watch(
  () => props.show,
  (show) => {
    if (!show) name.value = ''
  },
)

function saveBatch() {
  if (!name.value.trim()) {
    showToast('请输入批次名称')
    return
  }

  emit('save', name.value)
}
</script>

<template>
  <van-popup :show="show" position="bottom" round :style="{ height: '40%' }" @click-overlay="emit('close')">
    <div class="flex h-full flex-col bg-[#f7f8fa] p-5">
      <h2 class="text-center text-lg font-bold text-slate-950">新建批次</h2>
      <div class="mt-6 flex-1">
        <label class="mb-3 block text-sm font-medium text-slate-700">批次名称</label>
        <van-field v-model="name" autofocus class="rounded-xl border border-slate-100 bg-white" placeholder="例如：AJ1 黑红脚趾" />
      </div>

      <div class="grid grid-cols-2 gap-3">
        <van-button round block @click="emit('close')">取消</van-button>
        <van-button round block color="#16834b" @click="saveBatch">保存</van-button>
      </div>
    </div>
  </van-popup>
</template>
