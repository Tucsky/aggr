import store from '@/store'
import { DirectiveBinding } from 'vue'

interface CommitChangeElement extends HTMLElement {
  __changeHandler__?: (event: Event) => void
}

const isCheckbox = (element: HTMLElement | HTMLInputElement) => {
  return (
    (element as HTMLInputElement).type === 'checkbox' ||
    element.tagName === 'LABEL'
  )
}

const createHandler = (
  binding: DirectiveBinding<any>,
  type: 'commit' | 'dispatch'
) => {
  return (event: Event) => {
    const target = event.target as HTMLInputElement
    const value = isCheckbox(target) ? target.checked : target.value

    if (binding.value) {
      if (Array.isArray(binding.value)) {
        store[type](binding.value[0], binding.value[1](value))
      } else {
        store[type](binding.value, value)
      }
    }
  }
}

const directiveFactory = (type: 'commit' | 'dispatch') => {
  return {
    beforeMount(el: HTMLInputElement, binding: DirectiveBinding<any>) {
      const element = el as CommitChangeElement
      const handler = createHandler(binding, type)
      element.__changeHandler__ = handler
      element.addEventListener(
        el.type === 'checkbox' ? 'change' : 'input',
        handler
      )
    },

    beforeUnmount(el: HTMLInputElement) {
      const element = el as CommitChangeElement
      if (element.__changeHandler__) {
        element.removeEventListener(
          el.type === 'checkbox' ? 'change' : 'input',
          element.__changeHandler__
        )
        delete element.__changeHandler__
      }
    }
  }
}

const commitDirective = directiveFactory('commit')
const dispatchDirective = directiveFactory('dispatch')

export { commitDirective, dispatchDirective }
