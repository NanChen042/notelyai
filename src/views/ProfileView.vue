<script setup lang="ts">
import { computed, ref } from 'vue'
import { showConfirmDialog, showToast } from 'vant'
import { useBookkeepingStore } from '@/stores/bookkeeping'
import { formatMoney } from '@/utils/format'

const store = useBookkeepingStore()
const fileInputRef = ref<HTMLInputElement | null>(null)
const importMode = ref<'replace' | 'merge'>('replace')

const dataSizeText = computed(() => {
  const text = JSON.stringify(store.exportBackup())
  const kb = Math.max(1, Math.round(new Blob([text]).size / 1024))
  return `${kb} KB`
})

const lastRecordDate = computed(() => store.sortedRecords[0]?.date ?? '暂无记录')

const summaryItems = computed(() => [
  { label: '批次', value: `${store.batches.length}` },
  { label: '记录', value: `${store.records.length}` },
  { label: '利润', value: formatMoney(store.totalProfit) },
])

function downloadText(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function exportJson() {
  const stamp = new Date().toISOString().slice(0, 10)
  downloadText(`notely-backup-${stamp}.json`, JSON.stringify(store.exportBackup(), null, 2), 'application/json;charset=utf-8')
  showToast('JSON 备份已导出')
}

function escapeCsv(value: unknown) {
  const text = String(value ?? '')
  return `"${text.replaceAll('"', '""')}"`
}

function exportCsv() {
  const headers = ['记录ID', '批次ID', '批次名称', '日期', '类型', '分类', '金额', '备注', '图片']
  const rows = store.sortedRecords.map((record) => [
    record.id,
    record.batchId,
    store.getBatchName(record.batchId),
    record.date,
    record.type === 'income' ? '收入' : '支出',
    record.category,
    record.amount,
    record.note,
    record.imageUrl ? '有' : '',
  ])
  const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n')
  const stamp = new Date().toISOString().slice(0, 10)
  downloadText(`notely-records-${stamp}.csv`, `\ufeff${csv}`, 'text/csv;charset=utf-8')
  showToast('CSV 明细已导出')
}

function openImportFile(mode: 'replace' | 'merge') {
  importMode.value = mode
  if (mode === 'replace') {
    showConfirmDialog({
      title: '覆盖恢复',
      message: '导入后会替换当前所有批次和记录。建议先导出 JSON 备份。',
      confirmButtonText: '选择文件',
      confirmButtonColor: 'var(--app-warning)',
    })
      .then(() => fileInputRef.value?.click())
      .catch(() => {})
    return
  }

  fileInputRef.value?.click()
}

function handleImportFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  const reader = new FileReader()
  reader.onload = () => {
    try {
      const payload = JSON.parse(String(reader.result || '{}'))
      const result = store.importBackup(payload, importMode.value)
      showToast(`${importMode.value === 'replace' ? '已恢复' : '已合并'} ${result.batches} 个批次、${result.records} 条记录`)
    } catch {
      showToast('导入失败，请检查 JSON 文件')
    }
  }
  reader.readAsText(file)
}

function confirmClear() {
  showConfirmDialog({
    title: '清空本地账本',
    message: '清空后当前浏览器里的批次和记录都会删除，建议先导出 JSON 备份。',
    confirmButtonText: '清空',
    confirmButtonColor: 'var(--app-expense)',
  })
    .then(() => {
      store.clearLedger()
      showToast('本地账本已清空')
    })
    .catch(() => {})
}
</script>

<template>
  <section class="profile-page space-y-5 px-4 pb-6 pt-5">
    <header>
      <p class="app-subtle text-[11px] font-bold tracking-[0.22em]">LOCAL LEDGER</p>
      <h1 class="mt-1 text-[30px] font-black leading-none tracking-tight">我的</h1>
    </header>

    <section class="profile-hero">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-sm font-semibold text-white/72">本地账本</p>
          <h2 class="mt-2 text-2xl font-black text-white">数据中心</h2>
          <p class="mt-2 text-xs font-medium text-white/62">数据保存在当前浏览器，可导出备份或迁移。</p>
        </div>
        <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/16 text-xl font-black text-white">谷</div>
      </div>

      <div class="mt-5 grid grid-cols-3 gap-2">
        <div v-for="item in summaryItems" :key="item.label" class="profile-hero-stat">
          <p>{{ item.label }}</p>
          <strong>{{ item.value }}</strong>
        </div>
      </div>
    </section>

    <section class="profile-panel">
      <div class="mb-4 flex items-center justify-between">
        <div>
          <h2 class="text-base font-black">账本概览</h2>
          <p class="app-subtle mt-1 text-xs">最近记录：{{ lastRecordDate }}</p>
        </div>
        <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">{{ dataSizeText }}</span>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div class="profile-metric">
          <p>总收入</p>
          <strong class="text-emerald-700">{{ formatMoney(store.totalIncome) }}</strong>
        </div>
        <div class="profile-metric">
          <p>总支出</p>
          <strong class="text-rose-600">{{ formatMoney(store.totalExpense) }}</strong>
        </div>
      </div>
    </section>

    <section class="profile-panel">
      <h2 class="mb-4 text-base font-black">导出</h2>
      <div class="grid grid-cols-2 gap-3">
        <button class="profile-action profile-action-primary" type="button" @click="exportJson">
          <van-icon name="down" size="20" />
          <span>JSON 备份</span>
          <small>完整恢复</small>
        </button>
        <button class="profile-action" type="button" @click="exportCsv">
          <van-icon name="description-o" size="20" />
          <span>CSV 明细</span>
          <small>Excel 可打开</small>
        </button>
      </div>
    </section>

    <section class="profile-panel">
      <h2 class="mb-4 text-base font-black">导入</h2>
      <div class="grid grid-cols-2 gap-3">
        <button class="profile-action" type="button" @click="openImportFile('merge')">
          <van-icon name="plus" size="20" />
          <span>合并导入</span>
          <small>保留现有</small>
        </button>
        <button class="profile-action profile-action-warn" type="button" @click="openImportFile('replace')">
          <van-icon name="replay" size="20" />
          <span>覆盖恢复</span>
          <small>替换当前</small>
        </button>
      </div>
      <input ref="fileInputRef" class="hidden" type="file" accept="application/json,.json" @change="handleImportFile" />
    </section>

    <section class="profile-panel">
      <button class="profile-danger-button" type="button" @click="confirmClear">
        <van-icon name="delete-o" size="18" />
        清空本地账本
      </button>
    </section>
  </section>
</template>

<style scoped>
.profile-page {
  background:
    radial-gradient(circle at 70% -10%, color-mix(in srgb, var(--app-primary) 14%, transparent), transparent 36%),
    var(--app-page);
}

.profile-hero {
  overflow: hidden;
  border-radius: var(--app-radius-lg);
  padding: 20px;
  background:
    radial-gradient(circle at 88% 8%, rgba(255, 255, 255, 0.26), transparent 32%),
    linear-gradient(135deg, var(--app-primary-strong), var(--app-primary) 58%, #0f766e);
  box-shadow: 0 24px 52px color-mix(in srgb, var(--app-primary) 22%, transparent);
}

.profile-hero-stat {
  min-width: 0;
  border-radius: var(--app-radius-sm);
  padding: 10px;
  background: rgba(255, 255, 255, 0.12);
}

.profile-hero-stat p {
  color: rgba(255, 255, 255, 0.62);
  font-size: 11px;
  font-weight: 700;
}

.profile-hero-stat strong {
  display: block;
  margin-top: 4px;
  overflow: hidden;
  color: #fff;
  font-size: 13px;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-panel {
  border: 1px solid rgba(255, 255, 255, 0.78);
  border-radius: var(--app-radius-md);
  padding: 16px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.055);
  backdrop-filter: blur(12px);
}

.profile-metric {
  min-width: 0;
  border-radius: var(--app-radius-sm);
  padding: 14px;
  background: var(--app-surface-soft);
}

.profile-metric p {
  color: var(--app-text-subtle);
  font-size: 12px;
  font-weight: 800;
}

.profile-metric strong {
  display: block;
  margin-top: 6px;
  overflow: hidden;
  font-size: 15px;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-action {
  display: grid;
  min-width: 0;
  gap: 5px;
  justify-items: start;
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius-sm);
  padding: 14px;
  background: #fff;
  color: var(--app-text);
  text-align: left;
}

.profile-action span {
  font-size: 14px;
  font-weight: 900;
}

.profile-action small {
  color: var(--app-text-subtle);
  font-size: 11px;
  font-weight: 700;
}

.profile-action-primary {
  border-color: color-mix(in srgb, var(--app-primary) 20%, transparent);
  background: var(--app-primary-soft);
  color: var(--app-primary);
}

.profile-action-warn {
  border-color: color-mix(in srgb, var(--app-warning) 18%, transparent);
  background: #fff7ed;
  color: var(--app-warning);
}

.profile-danger-button {
  display: inline-flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: var(--app-radius-sm);
  padding: 12px;
  background: #fff1f2;
  color: var(--app-expense);
  font-size: 14px;
  font-weight: 900;
}
</style>
