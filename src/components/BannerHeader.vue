<script setup lang="ts">
import { h, computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { NMenu, useLoadingBar, NIcon } from 'naive-ui'
import { AccessPoint, AccessPointOff } from '@vicons/tabler'
import { useStateStore } from '@/stores/state'

import SwitchTheme from './SwitchTheme.vue'
import router from '@/router'

defineEmits(['set-theme'])

const routes = router.getRoutes()
const currentRoute = useRoute()
const state = useStateStore()
const loadingBar = useLoadingBar()

const menuOptions = routes.map(route => ({
  label: () => h(RouterLink, {
    to: {
      name: route.name as string
    }
  }, () => route.name),
  key: route.name as string
}));

const menuValue = computed(() => {
  return currentRoute.name as string
})

function handleStart() {
  loadingBar.start()
}

function handleFinish() {
  loadingBar.finish()
}

function handleError() {
  loadingBar.error()
}

defineExpose({ handleStart, handleFinish, handleError })
</script>

<template>
  <n-menu mode="horizontal" :value="menuValue" :options="menuOptions" />
  <n-icon size="25" :color="state.connected ? '' : 'red'" :component="state.connected ? AccessPoint : AccessPointOff" style="margin-right: 20px;" />
  <switch-theme @set-theme="$emit('set-theme')" />
</template>
<style>
a.router-link-active.router-link-exact-active {
  font-size: x-large;
}
</style>