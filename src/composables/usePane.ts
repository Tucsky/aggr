import { onMounted, onBeforeUnmount, nextTick, Ref } from 'vue'
import store from '@/store'

export function usePane(
  paneId: string,
  paneElement?: Ref<HTMLElement | undefined>,
  onResize?: (width: number, height: number, isMounting?: boolean) => void
) {
  // Methods
  const refreshZoom = () => {
    store.dispatch('panes/refreshZoom', { id: paneId })
  }

  const focusPane = () => {
    store.commit('app/SET_FOCUSED_PANE', paneId)
  }

  // Lifecycle hooks
  onMounted(async () => {
    if (paneElement && paneElement.value) {
      paneElement.value.id = paneId

      refreshZoom()

      if (onResize) {
        await nextTick()
        const width = paneElement.value.clientWidth
        const height = paneElement.value.clientHeight

        onResize(width, height, true)
      }

      paneElement.value.addEventListener('mousedown', focusPane)
    }
  })

  onBeforeUnmount(() => {
    if (paneElement && paneElement.value) {
      paneElement.value.removeEventListener('mousedown', focusPane)
    }
  })
}
