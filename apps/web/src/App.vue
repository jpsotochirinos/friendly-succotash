<template>
  <div class="h-screen min-h-0 overflow-hidden">
    <Toast />
    <RouterView class="h-full min-h-0" />
  </div>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router';
import Toast from 'primevue/toast';
</script>
