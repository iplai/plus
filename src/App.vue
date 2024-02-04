<script setup lang="ts">
import { ref, reactive, onBeforeMount, onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { NConfigProvider, NNotificationProvider, NLoadingBarProvider, NLayout, NLayoutHeader, NLayoutContent, NLayoutFooter, NMessageProvider, NBackTop } from 'naive-ui'
import { useOsTheme, darkTheme } from 'naive-ui';
import type { GlobalThemeOverrides, GlobalTheme } from 'naive-ui';
import BannerHeader from './components/BannerHeader.vue'
import { useStateStore } from '@/stores/state'
import { storeToRefs } from 'pinia';
import aardio from '@/aardio'

const state = useStateStore()
const { connected, connecting } = storeToRefs(state)
const osTheme = useOsTheme()
const theme = ref<GlobalTheme | null>(null)

const headerRef = ref<typeof BannerHeader | null>(null)
const intervalId = ref(0)

function setTheme() {
  if (state.autoMode) {
    theme.value = osTheme.value === 'dark' ? darkTheme : null
  } else {
    theme.value = state.darkMode ? darkTheme : null
  }
  localStorage.setItem('@dark', state.darkMode.toString())
  localStorage.setItem('@auto', state.autoMode.toString())
}

async function connectAardio() {
  console.log(headerRef.value);

  headerRef.value?.handleStart()
  try {
    await aardio.open(parseInt(new URLSearchParams(window.location.search).get('port') || '9002'))
  } catch (error) {

  }
  if (!aardio.isConnected()) {
    headerRef.value?.handleError()
  }
}
onBeforeMount(() => {
  setTheme()
  aardio.on('open', () => {
    connected.value = true
    headerRef.value?.handleFinish()

  })
  aardio.on('close', () => {
    connected.value = false
    headerRef.value?.handleError()
  })
})
onMounted(() => {
  headerRef.value?.handleStart()
  intervalId.value = setInterval(async () => {
    if (!aardio.isConnected() && !connecting.value) {
      connecting.value = true
      connected.value = false
      await connectAardio()
      connecting.value = !connecting.value
    }
  }, 1500);
  window.aardio = aardio
})
const darkModeThemeOverrides: GlobalThemeOverrides = reactive({
  // common: {
  //   bodyColor: '#454545',
  //   headColor: '#404040',
  // },
  // table: {
  //   borderColor: '#f7f7f7',
  // }
})
const lightModeThemeOverrides: GlobalThemeOverrides = reactive({
  // common: {
  //   bodyColor: '#ffffff',
  //   headColor: '#f7f7f7',
  // },
  // table: {
  //   borderColor: '#f7f7f7',
  // }
})

</script>

<template>
  <n-config-provider :theme="theme" :theme-overrides="state.darkMode ? darkModeThemeOverrides : lightModeThemeOverrides">
    <n-loading-bar-provider>
      <n-layout-header style="height: 42px; display: flex; align-items: center; justify-content: space-between;" bordered>
        <banner-header ref="headerRef" @set-theme="setTheme()"></banner-header>
      </n-layout-header>
      <n-layout position="absolute" :native-scrollbar="false" style="top: 42px; margin:auto; " content-style="padding-top: 20px; height: 100%; display: flex; flex-direction: column">
        <!-- <n-layout-content style="min-width: max-content; margin: auto;padding-top: 20px; "> -->
        <n-notification-provider>
          <n-message-provider>
            <router-view v-slot="{ Component }">
              <keep-alive>
                <component :is="Component" />
              </keep-alive>
            </router-view>
          </n-message-provider>
        </n-notification-provider>
        <n-back-top />
        <!-- </n-layout-content> -->
        <n-layout-footer style="flex-shrink: 0">
        </n-layout-footer>
      </n-layout>
    </n-loading-bar-provider>
  </n-config-provider>
</template>

<style scoped>
.n-a {
  display: inline-block;
}
</style>