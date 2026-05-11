<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { showToast } from 'vant'
import type { Batch, RecordCategory, RecordDraft } from '@/stores/bookkeeping'
import { formatMoney } from '@/utils/format'

const props = defineProps<{
  show: boolean
  batches: Batch[]
  expenseCategories: RecordCategory[]
  incomeCategories: RecordCategory[]
}>()

const emit = defineEmits<{
  close: []
  save: [draft: RecordDraft]
}>()

const categoryOptions = computed(() => [...props.expenseCategories, ...props.incomeCategories])
const today = () => new Date().toISOString().slice(0, 10)

const form = reactive({
  batchId: '',
  category: '卖出收入' as RecordCategory,
  amount: '',
  note: '',
  date: today(),
})

const preview = computed(() => {
  const amount = Number(form.amount)
  if (!Number.isFinite(amount)) return formatMoney(0)
  return formatMoney(amount)
})

watch(
  () => [props.show, props.batches],
  () => {
    if (!form.batchId && props.batches[0]) form.batchId = props.batches[0].id
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
  })

  form.amount = ''
  form.note = ''
  form.category = '卖出收入'
  form.date = today()
}
</script>

<template>
  <van-popup :show="show" position="bottom" round closeable :style="{ height: '86%' }" @click-close-icon="emit('close')" @click-overlay="emit('close')">
    <div class="flex h-full flex-col bg-[#f7f8fa]">
      <header class="sticky top-0 z-10 bg-[#f7f8fa] px-5 pb-3 pt-5">
        <h2 class="text-center text-lg font-bold text-slate-950">新增记录</h2>
      </header>

      <div class="flex-1 space-y-6 overflow-y-auto px-5 pb-6">
        <section>
          <label class="mb-3 block text-sm font-medium text-slate-700">所属批次</label>
          <van-radio-group v-model="form.batchId" direction="horizontal" class="grid grid-cols-2 gap-3">
            <van-radio v-for="batch in batches" :key="batch.id" :name="batch.id" checked-color="#16834b">
              <span class="text-sm">{{ batch.name }}</span>
            </van-radio>
          </van-radio-group>
        </section>

        <section>
          <label class="mb-3 block text-sm font-medium text-slate-700">类别</label>
          <div class="grid grid-cols-3 gap-3">
            <button
              v-for="category in categoryOptions"
              :key="category"
              class="h-11 rounded-full text-sm font-medium transition"
              :class="form.category === category ? 'bg-emerald-600 text-white shadow-[0_10px_22px_rgba(22,131,75,0.24)]' : 'bg-white text-slate-700'"
              type="button"
              @click="form.category = category"
            >
              {{ category }}
            </button>
          </div>
        </section>

        <section>
          <label class="mb-3 block text-sm font-medium text-slate-700">金额</label>
          <van-field v-model="form.amount" type="number" input-align="left" clearable class="rounded-xl border border-slate-100 bg-white text-lg" placeholder="请输入金额">
            <template #left-icon>
              <span class="mr-2 text-lg font-bold text-slate-950">¥</span>
            </template>
          </van-field>
          <p class="mt-2 text-xs text-slate-400">当前输入：{{ preview }}</p>
        </section>

        <section>
          <label class="mb-3 block text-sm font-medium text-slate-700">备注</label>
          <van-field v-model="form.note" class="rounded-xl border border-slate-100 bg-white" placeholder="例如：闲鱼卖出，订单号 123456" />
        </section>

        <section>
          <label class="mb-3 block text-sm font-medium text-slate-700">日期</label>
          <van-field v-model="form.date" type="date" class="rounded-xl border border-slate-100 bg-white" />
        </section>
      </div>

      <footer class="bg-[#f7f8fa] p-5">
        <van-button block color="#16834b" round size="large" @click="saveRecord">保存</van-button>
      </footer>
    </div>
  </van-popup>
</template>
