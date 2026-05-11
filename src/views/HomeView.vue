<script setup lang="ts">
import { ref } from 'vue';

const active = ref(0);
</script>

<template>
  <main class="min-h-screen bg-gray-50 text-gray-800">
    <!-- 顶部标题栏 -->
    <header class="bg-white shadow-sm py-4 px-6 mb-4">
      <h1 class="text-xl font-bold flex items-center gap-2">
        <span class="text-blue-500">📝</span> Notely AI
      </h1>
    </header>

    <!-- 核心功能标签页 -->
    <van-tabs v-model:active="active" sticky swipeable animated>
      <van-tab title="笔记">
        <div class="p-4">
          <p class="text-gray-500">这里是笔记管理模块...</p>
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
  </main>
</template>

<style scoped>
</style>
