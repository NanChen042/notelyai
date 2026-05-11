<script setup>
import { ref } from 'vue';
import apexchart from 'vue3-apexcharts';

const active = ref(0);

// 图表配置
const chartOptions = ref({
  chart: {
    type: 'area',
    toolbar: { show: false },
    fontFamily: 'Inter, system-ui, sans-serif',
    sparkline: { enabled: true } // 精简模式，只看趋势
  },
  colors: ['#3B82F6'],
  stroke: {
    curve: 'smooth',
    width: 2,
  },
  fill: {
    type: 'gradient',
    gradient: {
      shadeIntensity: 1,
      opacityFrom: 0.45,
      opacityTo: 0.05,
      stops: [0, 100]
    }
  },
  tooltip: {
    enabled: true,
    theme: 'light',
    x: { show: false },
    y: { title: { formatter: () => '新增笔记' } }
  }
});

// 图表数据
const chartSeries = ref([{
  name: '笔记数',
  data: [4, 7, 5, 12, 8, 15, 11]
}]);

const searchText = ref('');
</script>

<template>
  <main class="min-h-screen bg-gray-50 text-gray-800 pb-20">
    <!-- 顶部标题栏 -->
    <header class="bg-white shadow-sm py-4 px-6 mb-2 flex justify-between items-center">
      <h1 class="text-xl font-bold flex items-center gap-2">
        <span class="text-blue-500">📝</span> Notely AI
      </h1>
      <div class="text-sm text-gray-500">智能助手已就绪</div>
    </header>

    <!-- 核心功能标签页 -->
    <van-tabs v-model:active="active" sticky swipeable animated color="#3B82F6" title-active-color="#3B82F6">
      <van-tab title="笔记">
        <div class="p-4 space-y-4">
          <!-- 搜索栏 -->
          <van-search v-model="searchText" placeholder="搜索您的笔记..." class="rounded-lg bg-transparent p-0" />

          <!-- 图表卡片 (Premium 质感) -->
          <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div class="flex justify-between items-center mb-2">
              <div>
                <h3 class="font-bold text-gray-700">本周笔记趋势</h3>
                <p class="text-xs text-gray-400">持续记录，保持思考</p>
              </div>
              <span class="text-sm text-blue-500 font-bold">+25%</span>
            </div>
            <div class="h-[100px]">
              <apexchart type="area" height="100" :options="chartOptions" :series="chartSeries"></apexchart>
            </div>
          </div>

          <!-- 笔记列表 -->
          <div class="space-y-3">
            <!-- 卡片 1 -->
            <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div class="flex justify-between items-start">
                <h3 class="font-bold text-gray-800">🚀 AI 助手提示词优化</h3>
                <span class="text-xs text-gray-400">10:24</span>
              </div>
              <p class="text-sm text-gray-600 mt-1 line-clamp-2">
                今天整理了一套关于代码生成的提示词模板，能够显著提升生成代码的质量和准确度...
              </p>
              <div class="flex gap-2 mt-3">
                <span class="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">#AI</span>
                <span class="text-xs px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full">#工作</span>
              </div>
            </div>

            <!-- 卡片 2 -->
            <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div class="flex justify-between items-start">
                <h3 class="font-bold text-gray-800">💡 每日灵感随笔</h3>
                <span class="text-xs text-gray-400">昨天</span>
              </div>
              <p class="text-sm text-gray-600 mt-1 line-clamp-2">
                突然想到一个关于智能记事本的新功能：可以通过语音输入自动提取待办事项...
              </p>
              <div class="flex gap-2 mt-3">
                <span class="text-xs px-2 py-0.5 bg-green-50 text-green-600 rounded-full">#灵感</span>
                <span class="text-xs px-2 py-0.5 bg-gray-50 text-gray-600 rounded-full">#生活</span>
              </div>
            </div>
          </div>
        </div>
      </van-tab>

      <van-tab title="任务">
        <div class="p-4">
          <p class="text-gray-500">这里是任务管理模块...</p>
        </div>
      </van-tab>
      
      <van-tab title="AI 助手">
        <div class="p-4">
          <p class="text-gray-500">这里是 AI 助手模块...</p>
        </div>
      </van-tab>
      
      <van-tab title="知识库">
        <div class="p-4">
          <p class="text-gray-500">这里是知识库检索模块...</p>
        </div>
      </van-tab>
      
      <van-tab title="我的">
        <div class="p-4">
          <p class="text-gray-500">这里是用户管理模块...</p>
        </div>
      </van-tab>
    </van-tabs>

    <!-- 悬浮新建按钮 -->
    <button class="fixed bottom-6 right-6 w-14 h-14 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center text-2xl transition-transform hover:scale-110 active:scale-95 z-50">
      +
    </button>
  </main>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
