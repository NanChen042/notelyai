import { createRouter, createWebHistory } from 'vue-router'
import AIAssistantPage from '@/components/bookkeeping/AIAssistantPage.vue'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/ai-assistant',
      name: 'ai-assistant',
      component: AIAssistantPage,
    },
  ],
})

export default router
