type FinancialTone = 'income' | 'expense' | 'profit'

export function formatMoney(amount: number, signed = false) {
  const prefix = signed && amount > 0 ? '+' : ''
  return `${prefix}¥${amount.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function getFinancialToneClass(tone: FinancialTone, amount?: number) {
  if (tone === 'income') return 'app-income'
  if (tone === 'expense') return 'app-expense'
  return (amount ?? 0) >= 0 ? 'app-income' : 'app-expense'
}

export function getRecordDotClass(tone: Extract<FinancialTone, 'income' | 'expense'>) {
  return tone === 'income' ? 'bg-[var(--app-income)]' : 'bg-[var(--app-expense)]'
}

export function formatRecordAmount(amount: number, tone: Extract<FinancialTone, 'income' | 'expense'>) {
  return tone === 'income' ? formatMoney(amount, true) : formatMoney(-amount, true)
}

export function formatDate(date: string) {
  const [, month, day] = date.split('-')
  return `${Number(month)}月${Number(day)}日`
}
