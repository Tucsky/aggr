import store from '@/store'
import { onBeforeUnmount } from 'vue'
import { MutationPayload } from 'vuex'

export function useMutationObserver(
  callback: (mutation: MutationPayload, state: any) => any
) {
  const unsubscribe = store.subscribe(callback)

  onBeforeUnmount(() => {
    unsubscribe()
  })
}
