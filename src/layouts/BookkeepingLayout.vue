<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const activeTab = computed(() => {
  if (route.name === 'batches') return 'batches'
  if (route.name === 'statistics') return 'statistics'
  if (route.name === 'profile') return 'profile'
  return 'dashboard'
})

function handleTabChange(name: string | number) {
  if (name === 'record') {
    router.push({ name: 'record-new' })
    return
  }

  router.push({ name: String(name) })
}
</script>

<template>
  <main class="bookkeeping-shell app-text relative mx-auto flex h-[100dvh] max-w-[430px] flex-col overflow-hidden">
    <div class="hero-wash pointer-events-none absolute inset-x-0 top-0 z-0 mx-auto h-72 max-w-[430px]" />

    <div class="relative z-10 flex-1 overflow-y-auto">
      <RouterView v-slot="{ Component, route: currentRoute }">
        <Transition name="app-page" mode="out-in">
          <component :is="Component" :key="currentRoute.fullPath" />
        </Transition>
      </RouterView>
    </div>

    <footer class="relative z-20 shrink-0 border-t border-[var(--app-border)] bg-[var(--app-page)]">
      <van-tabbar
        class="app-tabbar"
        :model-value="activeTab"
        :fixed="false"
        active-color="var(--app-primary)"
        inactive-color="var(--app-text-subtle)"
        safe-area-inset-bottom
        @change="handleTabChange"
      >
        <van-tabbar-item name="dashboard" icon="home-o">首页</van-tabbar-item>
        <van-tabbar-item name="batches" icon="notes-o">批次</van-tabbar-item>
        <van-tabbar-item name="record" class="record-tabbar-item">
          <template #icon>
            <span class="tabbar-record-action">
              <span class="tabbar-record-icon">
                <van-icon name="plus" size="24" />
              </span>
              <span class="tabbar-record-label">记一笔</span>
            </span>
          </template>
        </van-tabbar-item>
        <van-tabbar-item name="statistics" icon="bar-chart-o">统计</van-tabbar-item>
        <van-tabbar-item name="profile" icon="user-o">我的</van-tabbar-item>
      </van-tabbar>
    </footer>
  </main>
</template>
