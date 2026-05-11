<script setup lang="ts">
import { computed } from 'vue'
import type { ApexOptions } from 'apexcharts'
import VueApexCharts from 'vue3-apexcharts'
import { formatMoney } from '@/utils/format'

const props = defineProps<{
  title: string
  income: number
  expense: number
  profit: number
  trend: { date: string; profit: number }[]
}>()

const chartSeries = computed(() => [
  {
    name: '利润',
    data: props.trend.length ? props.trend.map((point) => Math.max(point.profit, 0)) : [0],
  },
])

const chartOptions = computed<ApexOptions>(() => ({
  chart: {
    type: 'area',
    toolbar: { show: false },
    sparkline: { enabled: true },
  },
  colors: ['#ffffff'],
  stroke: {
    curve: 'smooth',
    width: 2,
  },
  fill: {
    type: 'gradient',
    gradient: {
      opacityFrom: 0.22,
      opacityTo: 0,
      stops: [0, 100],
    },
  },
  grid: { show: false },
  tooltip: { enabled: false },
}))
</script>

<template>
  <section class="overflow-hidden rounded-[22px] bg-[linear-gradient(135deg,#0f7a3b,#16a05d)] p-5 text-white shadow-[0_18px_40px_rgba(13,126,66,0.24)]">
    <div class="flex items-start justify-between">
      <div>
        <p class="text-sm text-white/82">{{ title }}</p>
        <strong class="mt-2 block text-3xl font-bold tracking-normal">{{ formatMoney(profit) }}</strong>
      </div>
      <van-icon name="eye-o" size="20" class="mt-1 text-white/85" />
    </div>

    <div class="mt-1 h-14">
      <VueApexCharts type="area" height="56" :options="chartOptions" :series="chartSeries" />
    </div>

    <div class="mt-4 grid grid-cols-3 border-t border-white/15 pt-4 text-sm">
      <div>
        <p class="text-xs text-white/68">总收入</p>
        <p class="mt-1 font-semibold">{{ formatMoney(income) }}</p>
      </div>
      <div>
        <p class="text-xs text-white/68">总支出</p>
        <p class="mt-1 font-semibold">{{ formatMoney(expense) }}</p>
      </div>
      <div>
        <p class="text-xs text-white/68">净利润</p>
        <p class="mt-1 font-semibold">{{ formatMoney(profit) }}</p>
      </div>
    </div>
  </section>
</template>
