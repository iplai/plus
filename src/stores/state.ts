import { ref } from 'vue'
import { defineStore, acceptHMRUpdate } from 'pinia'

export const useStateStore = defineStore('state', () => {
  const darkMode = ref(localStorage.getItem('@dark') === 'true')
  const autoMode = ref(localStorage.getItem('@auto') === 'true')
  const connecting = ref(false)
  const connected = ref(false)
  return { darkMode, autoMode, connecting, connected }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useStateStore, import.meta.hot))
}