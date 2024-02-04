<script setup lang="ts">
import { NSwitch, NIcon, NCheckbox, NSpace } from 'naive-ui'
import { MoonStars, Sun } from '@vicons/tabler'
import { useStateStore } from '@/stores/state'
import { storeToRefs } from 'pinia'
const state = useStateStore()
const { autoMode, darkMode } = storeToRefs(state)
</script>

<template>
  <n-space style="min-width: max-content;margin-right: 20px;">
    <n-switch v-model:value="darkMode" :disabled="autoMode" @click.stop="$emit('set-theme')">
      <template #unchecked-icon>
        <n-icon :component="Sun" />
      </template>
      <template #unchecked>
        Light
      </template>
      <template #checked>
        Dark
      </template>
      <template #checked-icon>
        <n-icon :component="MoonStars" />
      </template>
    </n-switch>
    <n-checkbox v-model:checked="autoMode" @click.stop="$emit('set-theme')">
      跟随系统
    </n-checkbox>
  </n-space>
</template>
