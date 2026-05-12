<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { showToast } from 'vant'
import type { Batch, RecordCategory, RecordDraft } from '@/stores/bookkeeping'
import { formatMoney } from '@/utils/format'

const props = defineProps<{
  batches: Batch[]
  expenseCategories: RecordCategory[]
  incomeCategories: RecordCategory[]
}>()

const emit = defineEmits<{
  back: []
  save: [draft: RecordDraft]
}>()

const categoryOptions = computed(() => [...props.expenseCategories, ...props.incomeCategories])
const today = () => new Date().toISOString().slice(0, 10)

const form = reactive({
  batchId: props.batches[0]?.id || '',
  category: '卖出收入' as RecordCategory,
  amount: '',
  note: '',
  date: today(),
})

const fileList = ref<{ url?: string; content?: string }[]>([])

const preview = computed(() => {
  const amount = Number(form.amount)
  return Number.isFinite(amount) ? formatMoney(amount) : formatMoney(0)
})

const imageUrl = computed(() => fileList.value[0]?.url || fileList.value[0]?.content || '')

watch(
  () => props.batches,
  (list) => {
    if (!form.batchId && list[0]) form.batchId = list[0].id
  },
  { immediate: true },
)

function saveRecord() {
  const amount = Number(form.amount)
  if (!form.batchId || !form.category || !Number.isFinite(amount) || amount <= 0) {
    showToast('请填写批次、类别和有效金额')
    return
  }

  emit('save', {
    batchId: form.batchId,
    category: form.category,
    amount,
    note: form.note,
    date: form.date,
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
      <h1 class="app-text text-lg font-bold">新增记录</h1>
      <span class="w-9" />
    </header>

    <div class="app-card-solid space-y-5 p-4">
      <van-empty v-if="!batches.length" image-size="72" description="请先新建一个批次后再记账" />

      <section>
        <label class="app-text mb-3 block text-sm font-medium">所属批次</label>
        <div class="grid grid-cols-2 gap-3">
          <button
            v-for="batch in batches"
            :key="batch.id"
            class="h-11 rounded-full text-sm font-medium transition"
            :class="form.batchId === batch.id ? 'app-primary-button' : 'app-surface-soft app-text'"
            type="button"
            @click="form.batchId = batch.id"
          >
            {{ batch.name }}
          </button>
        </div>
      </section>

      <section>
        <label class="app-text mb-3 block text-sm font-medium">类别</label>
        <div class="grid grid-cols-3 gap-3">
          <button
            v-for="category in categoryOptions"
            :key="category"
            class="h-11 rounded-full text-sm font-medium transition"
            :class="form.category === category ? 'app-primary-button' : 'app-surface-soft app-text'"
            type="button"
            @click="form.category = category"
          >
            {{ category }}
          </button>
        </div>
      </section>

      <section>
        <label class="app-text mb-3 block text-sm font-medium">金额</label>
        <van-field v-model="form.amount" type="number" input-align="left" clearable class="app-field text-lg" placeholder="请输入金额">
          <template #left-icon>
            <span class="app-text mr-2 text-lg font-bold">¥</span>
          </template>
        </van-field>
        <p class="app-subtle mt-2 text-xs">当前输入：{{ preview }}</p>
      </section>

      <section>
        <label class="app-text mb-3 block text-sm font-medium">图片</label>
        <van-uploader v-model="fileList" :max-count="1" preview-size="92" result-type="dataUrl" />
      </section>

      <section>
        <label class="app-text mb-3 block text-sm font-medium">备注</label>
        <van-field v-model="form.note" class="app-field" placeholder="例如：闲鱼卖出，订单号 123456" />
      </section>

      <section>
        <label class="app-text mb-3 block text-sm font-medium">日期</label>
        <van-field v-model="form.date" type="date" class="app-field" />
      </section>
    </div>

    <div class="mt-6">
      <button class="app-primary-button w-full rounded-full py-3 text-base font-semibold active:scale-[0.99]" type="button" @click="saveRecord">
        保存记录
      </button>
    </div>
  </section>
</template>
