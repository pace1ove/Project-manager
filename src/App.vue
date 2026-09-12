<template>
  <GlobalErrorBoundary>
    <router-view />
  </GlobalErrorBoundary>
</template>

<script setup lang="ts">
import GlobalErrorBoundary from '@/components/common/GlobalErrorBoundary.vue'
</script>

<style>
#app {
  height: 100vh;
  margin: 0;
  padding: 0;
}
</style>
