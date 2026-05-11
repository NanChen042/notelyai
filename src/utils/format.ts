export function formatMoney(amount: number, signed = false) {
  const prefix = signed && amount > 0 ? '+' : ''
  return `${prefix}¥${amount.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function formatDate(date: string) {
  const [, month, day] = date.split('-')
  return `${Number(month)}月${Number(day)}日`
}
