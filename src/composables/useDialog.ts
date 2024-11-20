import { ref, onMounted as vueOnMounted, getCurrentInstance } from 'vue'

export function useDialog(onMounted = vueOnMounted) {
  const output = ref()
  const opened = ref(false)
  const instance = getCurrentInstance() as any
  const emit = instance?.proxy?.$emit?.bind(instance.proxy) || (() => undefined)

  const close = () => {
    emit('close', output.value)
  }

  const show = () => {
    opened.value = true
  }

  const hide = (data?: any) => {
    if (typeof data !== 'undefined' && data !== null) {
      output.value = data
    }
    opened.value = false
  }

  onMounted(() => {
    show()
  })

  return { close, hide, show, opened }
}
