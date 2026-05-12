import { createRouter, createWebHistory } from 'vue-router'
import AIAssistantPage from '@/components/bookkeeping/AIAssistantPage.vue'
import BookkeepingLayout from '@/layouts/BookkeepingLayout.vue'
import BatchFormView from '@/views/BatchFormView.vue'
import BatchesView from '@/views/BatchesView.vue'
import DashboardView from '@/views/DashboardView.vue'
import ProfileView from '@/views/ProfileView.vue'
import RecordFormView from '@/views/RecordFormView.vue'
import StatisticsView from '@/views/StatisticsView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: BookkeepingLayout,
      children: [
        {
          path: '',
          name: 'dashboard',
          component: DashboardView,
        },
        {
          path: 'batches',
          name: 'batches',
          component: BatchesView,
        },
        {
          path: 'statistics',
          name: 'statistics',
          component: StatisticsView,
        },
        {
          path: 'profile',
          name: 'profile',
          component: ProfileView,
        },
      ],
    },
    {
      path: '/batch/new',
      name: 'batch-new',
      component: BatchFormView,
    },
    {
      path: '/batch/:id/edit',
      name: 'batch-edit',
      component: BatchFormView,
    },
    {
      path: '/record/new',
      name: 'record-new',
      component: RecordFormView,
    },
    {
      path: '/record/:id/edit',
      name: 'record-edit',
      component: RecordFormView,
    },
    {
      path: '/ai-assistant',
      name: 'ai-assistant',
      component: AIAssistantPage,
    },
  ],
})

export default router
