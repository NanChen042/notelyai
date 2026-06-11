export type StatisticsPeriod = 'day' | 'week' | 'month' | 'year'
export type TrendMetric = 'expense' | 'income'

export function getPeriodMeta(period: StatisticsPeriod) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  if (period === 'day') {
    const today = new Date()
    const yearStr = today.getFullYear()
    const monthStr = `${today.getMonth() + 1}`.padStart(2, '0')
    const dayStr = `${today.getDate()}`.padStart(2, '0')
    const todayStr = `${yearStr}-${monthStr}-${dayStr}`
    return { label: '今日', start: todayStr, end: todayStr }
  }

  if (period === 'week') {
    const day = now.getDay() || 7
    const start = new Date(year, month, now.getDate() - day + 1)
    const end = new Date(year, month, now.getDate() + (7 - day))
    const startYear = start.getFullYear()
    const startMonth = `${start.getMonth() + 1}`.padStart(2, '0')
    const startDay = `${start.getDate()}`.padStart(2, '0')
    const endYear = end.getFullYear()
    const endMonth = `${end.getMonth() + 1}`.padStart(2, '0')
    const endDay = `${end.getDate()}`.padStart(2, '0')
    return { label: '本周', start: `${startYear}-${startMonth}-${startDay}`, end: `${endYear}-${endMonth}-${endDay}` }
  }

  if (period === 'month') {
    const startStr = `${year}-${`${month + 1}`.padStart(2, '0')}-01`
    const lastDayDate = new Date(year, month + 1, 0)
    const endStr = `${year}-${`${month + 1}`.padStart(2, '0')}-${`${lastDayDate.getDate()}`.padStart(2, '0')}`
    return { label: '本月', start: startStr, end: endStr }
  }

  return { label: '本年', start: `${year}-01-01`, end: `${year}-12-31` }
}

export function createBuckets(period: StatisticsPeriod, start: string, end: string) {
  const buckets: { key: string; label: string; income: number; expense: number; count: number }[] = []

  if (period === 'year') {
    const year = start.slice(0, 4)
    return Array.from({ length: 12 }, (_, index) => ({
      key: `${year}-${`${index + 1}`.padStart(2, '0')}`,
      label: `${index + 1}`,
      income: 0,
      expense: 0,
      count: 0,
    }))
  }

  if (period === 'month') {
    const year = start.slice(0, 4)
    const month = start.slice(5, 7)
    const lastDay = Number(end.slice(8, 10))
    for (let day = 1; day <= lastDay; day += 1) {
      buckets.push({
        key: `${year}-${month}-${`${day}`.padStart(2, '0')}`,
        label: `${day}`,
        income: 0,
        expense: 0,
        count: 0,
      })
    }
    return buckets
  }

  const cursor = new Date(start)
  const endDate = new Date(end)
  while (cursor <= endDate) {
    const yearStr = cursor.getFullYear()
    const monthStr = `${cursor.getMonth() + 1}`.padStart(2, '0')
    const dayStr = `${cursor.getDate()}`.padStart(2, '0')
    const key = `${yearStr}-${monthStr}-${dayStr}`
    buckets.push({
      key,
      label: period === 'day' ? '今' : `${cursor.getDate()}`,
      income: 0,
      expense: 0,
      count: 0,
    })
    cursor.setDate(cursor.getDate() + 1)
  }
  return buckets
}

export function getBucketKey(date: string, period: StatisticsPeriod) {
  if (period === 'year') return date.slice(0, 7)
  return date
}
