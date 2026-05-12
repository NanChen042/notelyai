<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

onMounted(() => {
  router.replace({ name: 'dashboard' })
})
</script>

<template>
  <div class="app-page-bg min-h-screen" />
</template>
