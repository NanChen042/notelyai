<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { showToast } from 'vant'
import type { Batch, RecordCategory, RecordDraft, AccountRecord } from '@/stores/bookkeeping'
import { formatMoney } from '@/utils/format'

const props = defineProps<{
  batches: Batch[]
  expenseCategories: RecordCategory[]
  incomeCategories: RecordCategory[]
  record?: AccountRecord
}>()

const emit = defineEmits<{
  back: []
  createBatch: [payload: { name: string; imageUrl: string }, done: (batchId: string) => void]
  save: [draft: RecordDraft & { id?: string }]
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
const batchFileList = ref<{ url?: string; content?: string }[]>([])
const showBatchPicker = ref(false)
const showBatchCreator = ref(false)
const batchName = ref('')

const preview = computed(() => {
  const amount = Number(form.amount)
  return Number.isFinite(amount) ? formatMoney(amount) : formatMoney(0)
})

const imageUrl = computed(() => fileList.value[0]?.url || fileList.value[0]?.content || '')
const newBatchImageUrl = computed(() => batchFileList.value[0]?.url || batchFileList.value[0]?.content || '')
const selectedBatchName = computed(() => props.batches.find((batch) => batch.id === form.batchId)?.name ?? '请选择批次')
const batchColumns = computed(() =>
  props.batches.map((batch) => ({
    text: batch.name,
    value: batch.id,
  })),
)

watch(
  () => props.batches,
  (list) => {
    if (!form.batchId && list[0]) form.batchId = list[0].id
  },
  { immediate: true },
)

watch(
  () => props.record,
  (rec) => {
    if (rec) {
      form.batchId = rec.batchId
      form.category = rec.category
      form.amount = String(rec.amount)
      form.note = rec.note
      form.date = rec.date
      if (rec.imageUrl) {
        fileList.value = [{ url: rec.imageUrl }]
      } else {
        fileList.value = []
      }
    }
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
    ...(props.record ? { id: props.record.id } : {}),
    batchId: form.batchId,
    category: form.category,
    amount,
    note: form.note,
    date: form.date,
    imageUrl: imageUrl.value,
  })
}

function confirmBatchSelection({ selectedOptions }: { selectedOptions: { text: string; value: string }[] }) {
  const selected = selectedOptions[0]
  if (selected?.value) form.batchId = selected.value
  showBatchPicker.value = false
}

function openBatchCreator() {
  batchName.value = ''
  batchFileList.value = []
  showBatchCreator.value = true
}

function createBatch() {
  const name = batchName.value.trim()
  if (!name) {
    showToast('请输入批次名称')
    return
  }

  emit('createBatch', { name, imageUrl: newBatchImageUrl.value }, (batchId) => {
    form.batchId = batchId
    showBatchCreator.value = false
  })
}
</script>

<template>
  <section class="record-page app-page-bg min-h-screen px-4 pb-28 pt-5">
    <header class="mb-5 flex items-center justify-between">
      <button class="app-surface record-icon-button flex h-10 w-10 items-center justify-center rounded-full" type="button" @click="emit('back')">
        <van-icon name="arrow-left" size="20" />
      </button>
      <div class="text-center">
        <p class="app-subtle text-[11px] font-bold tracking-[0.2em]">LEDGER ENTRY</p>
        <h1 class="app-text mt-0.5 text-lg font-black">{{ record ? '编辑记录' : '记一笔' }}</h1>
      </div>
      <span class="w-10" />
    </header>

    <section class="record-amount-card">
      <p class="text-xs font-semibold text-white/68">当前金额</p>
      <strong class="mt-2 block font-['Inter'] text-4xl font-black leading-none text-white">{{ preview }}</strong>
      <div class="mt-4 flex items-center justify-between gap-3 text-xs text-white/70">
        <span class="truncate">{{ selectedBatchName }}</span>
        <span class="shrink-0 rounded-full bg-white/14 px-2.5 py-1 font-bold text-white/86">{{ form.category }}</span>
      </div>
    </section>

    <div class="mt-4 space-y-4">
      <section class="record-panel">
        <div class="mb-3 flex items-center justify-between">
          <label class="app-text text-sm font-black">所属批次</label>
          <button class="record-link-button" type="button" @click="openBatchCreator">
            <van-icon name="plus" size="14" />
            新建批次
          </button>
        </div>
        <div class="grid grid-cols-[1fr_auto] gap-2">
          <button class="record-select-field" type="button" :disabled="!batches.length" @click="showBatchPicker = true">
            <span class="truncate">{{ selectedBatchName }}</span>
            <van-icon name="arrow-down" size="16" />
          </button>
          <button class="record-mini-button" type="button" @click="openBatchCreator">新增</button>
        </div>
        <p v-if="!batches.length" class="mt-2 text-xs font-medium text-amber-600">还没有批次，可以直接在这里新建后继续记账。</p>
      </section>

      <section class="record-panel">
        <label class="app-text mb-3 block text-sm font-black">类别</label>
        <div class="grid grid-cols-3 gap-3">
          <button
            v-for="category in categoryOptions"
            :key="category"
            class="record-category-button"
            :class="form.category === category ? 'record-category-button-active' : ''"
            type="button"
            @click="form.category = category"
          >
            {{ category }}
          </button>
        </div>
      </section>

      <section class="record-panel">
        <label class="app-text mb-3 block text-sm font-black">金额</label>
        <van-field v-model="form.amount" type="number" input-align="left" clearable class="record-field text-lg" placeholder="请输入金额">
          <template #left-icon>
            <span class="app-text mr-2 text-lg font-bold">¥</span>
          </template>
        </van-field>
      </section>

      <section class="record-panel">
        <label class="app-text mb-3 block text-sm font-black">图片</label>
        <van-uploader v-model="fileList" :max-count="1" preview-size="92" result-type="dataUrl" />
      </section>

      <section class="record-panel">
        <label class="app-text mb-3 block text-sm font-black">备注</label>
        <van-field v-model="form.note" class="record-field" placeholder="例如：闲鱼卖出，订单号 123456" />
      </section>

      <section class="record-panel">
        <label class="app-text mb-3 block text-sm font-black">日期</label>
        <van-field v-model="form.date" type="date" class="record-field" />
      </section>
    </div>

    <div class="record-save-bar">
      <button class="app-primary-button w-full rounded-full py-3 text-base font-semibold active:scale-[0.99]" type="button" @click="saveRecord">
        保存记录
      </button>
    </div>

    <van-popup v-model:show="showBatchPicker" round position="bottom">
      <van-picker
        title="选择批次"
        :columns="batchColumns"
        @confirm="confirmBatchSelection"
        @cancel="showBatchPicker = false"
      />
    </van-popup>

    <van-popup v-model:show="showBatchCreator" round position="bottom">
      <div class="batch-create-sheet p-5">
        <div class="mb-5 flex items-center justify-between">
          <div>
            <p class="app-subtle text-[11px] font-bold tracking-[0.18em]">NEW BATCH</p>
            <h2 class="app-text mt-1 text-lg font-black">新建批次</h2>
          </div>
          <button class="record-icon-button app-surface flex h-9 w-9 items-center justify-center rounded-full" type="button" @click="showBatchCreator = false">
            <van-icon name="cross" size="18" />
          </button>
        </div>

        <div class="space-y-4">
          <section>
            <label class="app-text mb-3 block text-sm font-black">批次名称</label>
            <van-field v-model="batchName" class="record-field" placeholder="例如：AJ1 黑红脚趾" />
          </section>
          <section>
            <label class="app-text mb-3 block text-sm font-black">批次图片</label>
            <van-uploader v-model="batchFileList" :max-count="1" preview-size="84" result-type="dataUrl" />
          </section>
          <button class="app-primary-button w-full rounded-full py-3 text-base font-semibold" type="button" @click="createBatch">
            创建并选中
          </button>
        </div>
      </div>
    </van-popup>
  </section>
</template>

<style scoped>
.record-page {
  background:
    radial-gradient(circle at 50% -10%, color-mix(in srgb, var(--app-primary) 16%, transparent), transparent 38%),
    var(--app-page);
}

.record-icon-button {
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
}

.record-amount-card {
  position: relative;
  overflow: hidden;
  border-radius: var(--app-radius-lg);
  padding: 20px;
  background:
    radial-gradient(circle at 88% 8%, rgba(255, 255, 255, 0.28), transparent 34%),
    linear-gradient(135deg, var(--app-primary-strong), var(--app-primary) 58%, #0f766e);
  box-shadow: 0 24px 52px color-mix(in srgb, var(--app-primary) 24%, transparent);
}

.record-panel {
  border: 1px solid rgba(255, 255, 255, 0.74);
  border-radius: var(--app-radius-md);
  padding: 16px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.055);
  backdrop-filter: blur(12px);
}

.record-select-field {
  display: flex;
  width: 100%;
  height: 46px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius-sm);
  padding: 0 14px;
  background: var(--app-surface);
  color: var(--app-text);
  font-size: 15px;
  font-weight: 700;
  text-align: left;
}

.record-select-field:disabled {
  color: var(--app-text-subtle);
}

.record-link-button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--app-primary);
  font-size: 12px;
  font-weight: 900;
}

.record-mini-button {
  border-radius: var(--app-radius-sm);
  padding: 0 13px;
  background: var(--app-primary-soft);
  color: var(--app-primary);
  font-size: 13px;
  font-weight: 900;
}

.record-category-button {
  min-width: 0;
  height: 42px;
  border: 1px solid transparent;
  border-radius: var(--app-radius-sm);
  background: var(--app-surface-soft);
  color: var(--app-text);
  font-size: 13px;
  font-weight: 800;
  transition: 0.18s ease;
}

.record-category-button-active {
  border-color: color-mix(in srgb, var(--app-primary) 22%, transparent);
  background: var(--app-primary);
  color: #fff;
  box-shadow: 0 10px 22px color-mix(in srgb, var(--app-primary) 22%, transparent);
}

.record-field {
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius-sm);
  background: var(--app-surface);
  padding: 10px 12px;
}

.record-save-bar {
  position: fixed;
  right: max(16px, calc(50% - 199px));
  bottom: 18px;
  left: max(16px, calc(50% - 199px));
  z-index: 30;
}

.batch-create-sheet {
  background: var(--app-page);
}
</style>
