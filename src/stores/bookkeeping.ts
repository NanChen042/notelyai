import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'

export type RecordCategory = '进货支出' | '邮费' | '手续费' | '包装费' | '卖出收入' | '其他收入'
export type RecordType = 'income' | 'expense'
export type BatchStatus = 'ongoing' | 'completed'

export interface AccountRecord {
  id: string
  batchId: string
  type: RecordType
  category: RecordCategory
  amount: number
  note: string
  date: string
  imageUrl?: string
}

export interface Batch {
  id: string
  name: string
  createdAt: string
  status: BatchStatus
  cover: string
  imageUrl?: string
}

export interface BatchSummary {
  income: number
  expense: number
  profit: number
  recordCount: number
}

export interface RecordDraft {
  batchId: string
  category: RecordCategory
  amount: number
  note: string
  date: string
  imageUrl?: string
}

export interface BookkeepingBackup {
  app: 'notely-ai'
  version: 1
  exportedAt: string
  data: {
    batches: Batch[]
    records: AccountRecord[]
  }
}

const STORAGE_KEY = 'notely-bookkeeping-v3'

const expenseCategories: RecordCategory[] = ['进货支出', '邮费', '手续费', '包装费']
const incomeCategories: RecordCategory[] = ['卖出收入', '其他收入']

const categoryTypeMap: Record<RecordCategory, RecordType> = {
  进货支出: 'expense',
  邮费: 'expense',
  手续费: 'expense',
  包装费: 'expense',
  卖出收入: 'income',
  其他收入: 'income',
}

const today = () => new Date().toISOString().slice(0, 10)

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

function sortByDateDesc<T extends { date?: string; createdAt?: string; id: string }>(items: T[]) {
  return [...items].sort((a, b) => {
    const left = a.date ?? a.createdAt ?? ''
    const right = b.date ?? b.createdAt ?? ''
    return right.localeCompare(left) || b.id.localeCompare(a.id)
  })
}

function normalizeBatch(batch: Partial<Batch>): Batch | null {
  const name = String(batch.name ?? '').trim()
  const id = String(batch.id ?? '').trim()
  if (!id || !name) return null

  return {
    id,
    name,
    createdAt: String(batch.createdAt || today()),
    status: batch.status === 'completed' ? 'completed' : 'ongoing',
    cover: String(batch.cover || name.slice(0, 2).toUpperCase()),
    imageUrl: String(batch.imageUrl || ''),
  }
}

function isRecordCategory(category: unknown): category is RecordCategory {
  return typeof category === 'string' && category in categoryTypeMap
}

function normalizeRecord(record: Partial<AccountRecord>, validBatchIds: Set<string>): AccountRecord | null {
  const id = String(record.id ?? '').trim()
  const batchId = String(record.batchId ?? '').trim()
  const amount = Number(record.amount)
  const category = record.category
  if (!id || !validBatchIds.has(batchId) || !isRecordCategory(category) || !Number.isFinite(amount)) return null

  return {
    id,
    batchId,
    type: categoryTypeMap[category],
    category,
    amount: Math.max(0, amount),
    note: String(record.note || '').trim(),
    date: String(record.date || today()),
    imageUrl: String(record.imageUrl || ''),
  }
}

export const useBookkeepingStore = defineStore('bookkeeping', () => {
  const batches = ref<Batch[]>([])
  const records = ref<AccountRecord[]>([])

  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    try {
      const parsed = JSON.parse(saved) as { batches?: Batch[]; records?: AccountRecord[] }
      if (Array.isArray(parsed.batches) && Array.isArray(parsed.records)) {
        batches.value = parsed.batches.map((batch) => ({
          ...batch,
          cover: batch.cover || batch.name.slice(0, 2),
        }))
        records.value = parsed.records.map((record) => ({
          ...record,
          imageUrl: record.imageUrl || '',
        }))
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  watch(
    [batches, records],
    () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ batches: batches.value, records: records.value }))
    },
    { deep: true },
  )

  const sortedBatches = computed(() => sortByDateDesc(batches.value.map((batch) => ({ ...batch, date: batch.createdAt }))))
  const sortedRecords = computed(() => sortByDateDesc(records.value))

  const totalIncome = computed(() =>
    records.value.filter((record) => record.type === 'income').reduce((sum, record) => sum + record.amount, 0),
  )

  const totalExpense = computed(() =>
    records.value.filter((record) => record.type === 'expense').reduce((sum, record) => sum + record.amount, 0),
  )

  const totalProfit = computed(() => totalIncome.value - totalExpense.value)

  const recentRecords = computed(() => sortedRecords.value.slice(0, 12))

  const monthlyRecords = computed(() => {
    const month = today().slice(0, 7)
    return records.value.filter((record) => record.date.startsWith(month))
  })

  const monthlyIncome = computed(() =>
    monthlyRecords.value.filter((record) => record.type === 'income').reduce((sum, record) => sum + record.amount, 0),
  )

  const monthlyExpense = computed(() =>
    monthlyRecords.value.filter((record) => record.type === 'expense').reduce((sum, record) => sum + record.amount, 0),
  )

  const monthlyProfit = computed(() => monthlyIncome.value - monthlyExpense.value)

  const profitTrend = computed(() => {
    const dailyProfit = records.value.reduce<Record<string, number>>((map, record) => {
      map[record.date] = (map[record.date] ?? 0) + (record.type === 'income' ? record.amount : -record.amount)
      return map
    }, {})

    let running = 0
    return Object.entries(dailyProfit)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([date, profit]) => {
        running += profit
        return { date, profit: running }
      })
  })

  function getBatchSummary(batchId: string): BatchSummary {
    const batchRecords = records.value.filter((record) => record.batchId === batchId)
    const income = batchRecords.filter((record) => record.type === 'income').reduce((sum, record) => sum + record.amount, 0)
    const expense = batchRecords.filter((record) => record.type === 'expense').reduce((sum, record) => sum + record.amount, 0)

    return {
      income,
      expense,
      profit: income - expense,
      recordCount: batchRecords.length,
    }
  }

  function getBatchRecords(batchId: string) {
    return sortedRecords.value.filter((record) => record.batchId === batchId)
  }

  function getBatchName(batchId: string) {
    return batches.value.find((batch) => batch.id === batchId)?.name ?? '未知批次'
  }

  function addBatch(name: string, imageUrl?: string) {
    const trimmedName = name.trim()
    const newBatch: Batch = {
      id: uid(),
      name: trimmedName,
      createdAt: today(),
      status: 'ongoing',
      cover: trimmedName.slice(0, 2).toUpperCase(),
      imageUrl: imageUrl || '',
    }
    batches.value.unshift(newBatch)
    return newBatch
  }

  function updateBatch(batchId: string, payload: { name: string; imageUrl?: string }) {
    const batch = batches.value.find((item) => item.id === batchId)
    const trimmedName = payload.name.trim()
    if (!batch || !trimmedName) return

    batch.name = trimmedName
    batch.cover = trimmedName.slice(0, 2).toUpperCase()
    batch.imageUrl = payload.imageUrl || ''
  }

  function deleteBatch(batchId: string) {
    batches.value = batches.value.filter((batch) => batch.id !== batchId)
    records.value = records.value.filter((record) => record.batchId !== batchId)
  }

  function addRecord(draft: RecordDraft) {
    const amount = Number(draft.amount)
    const newRecord: AccountRecord = {
      id: uid(),
      batchId: draft.batchId,
      type: categoryTypeMap[draft.category],
      category: draft.category,
      amount: Number.isFinite(amount) ? amount : 0,
      note: draft.note.trim(),
      date: draft.date || today(),
      imageUrl: draft.imageUrl || '',
    }

    records.value.push(newRecord)
    return newRecord
  }

  function updateBatchStatus(batchId: string, status: BatchStatus) {
    const batch = batches.value.find((item) => item.id === batchId)
    if (batch) batch.status = status
  }

  function updateRecord(recordId: string, draft: Partial<RecordDraft>) {
    const record = records.value.find((item) => item.id === recordId)
    if (!record) return

    if (draft.batchId) record.batchId = draft.batchId
    if (draft.category) {
      record.category = draft.category
      record.type = categoryTypeMap[draft.category]
    }
    const amount = Number(draft.amount)
    if (Number.isFinite(amount)) record.amount = amount
    if (draft.note !== undefined) record.note = draft.note.trim()
    if (draft.date) record.date = draft.date
    if (draft.imageUrl !== undefined) record.imageUrl = draft.imageUrl
  }

  function deleteRecord(recordId: string) {
    records.value = records.value.filter((record) => record.id !== recordId)
  }

  function exportBackup(): BookkeepingBackup {
    return {
      app: 'notely-ai',
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        batches: batches.value,
        records: records.value,
      },
    }
  }

  function importBackup(payload: unknown, mode: 'replace' | 'merge' = 'replace') {
    const backup = payload as Partial<BookkeepingBackup> & { batches?: Batch[]; records?: AccountRecord[] }
    const source: { batches?: Partial<Batch>[]; records?: Partial<AccountRecord>[] } = backup.data ?? backup
    const normalizedBatches = Array.isArray(source.batches) ? source.batches.map(normalizeBatch).filter((item): item is Batch => Boolean(item)) : []
    const validBatchIds = new Set(normalizedBatches.map((batch) => batch.id))
    const normalizedRecords = Array.isArray(source.records)
      ? source.records.map((record) => normalizeRecord(record, validBatchIds)).filter((item): item is AccountRecord => Boolean(item))
      : []

    if (mode === 'replace') {
      batches.value = normalizedBatches
      records.value = normalizedRecords
      return { batches: normalizedBatches.length, records: normalizedRecords.length }
    }

    const existingBatchIds = new Set(batches.value.map((batch) => batch.id))
    const existingRecordIds = new Set(records.value.map((record) => record.id))
    const incomingBatches = normalizedBatches.filter((batch) => !existingBatchIds.has(batch.id))
    const incomingRecords = normalizedRecords.filter((record) => !existingRecordIds.has(record.id))
    batches.value = [...incomingBatches, ...batches.value]
    records.value = [...records.value, ...incomingRecords]
    return { batches: incomingBatches.length, records: incomingRecords.length }
  }

  function clearLedger() {
    batches.value = []
    records.value = []
  }

  return {
    batches,
    records,
    sortedBatches,
    sortedRecords,
    recentRecords,
    expenseCategories,
    incomeCategories,
    totalIncome,
    totalExpense,
    totalProfit,
    monthlyIncome,
    monthlyExpense,
    monthlyProfit,
    profitTrend,
    getBatchSummary,
    getBatchRecords,
    getBatchName,
    addBatch,
    updateBatch,
    deleteBatch,
    addRecord,
    updateRecord,
    deleteRecord,
    updateBatchStatus,
    exportBackup,
    importBackup,
    clearLedger,
  }
})
