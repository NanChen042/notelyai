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
    addRecord,
    updateBatchStatus,
  }
})
