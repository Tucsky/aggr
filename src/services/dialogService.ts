import Vue from 'vue'
import store from '@/store'

import VerteDialog from '@/components/framework/picker/VerteDialog.vue'
import ConfirmDialog from '@/components/framework/ConfirmDialog.vue'
import PromptDialog from '@/components/framework/PromptDialog.vue'

class DialogService {
  mountedComponents = {}
  pickerInstance: any

  createComponent(component, props = {}, resolve = null, dialogId?: string): Vue {
    const Factory = Vue.extend(Object.assign({ store }, component))

    const cmp = new Factory(
      Object.assign(
        {},
        {
          propsData: Object.assign({}, props),
          destroyed: () => {
            if (dialogId) {
              this.mountedComponents[dialogId]--
            }

            if (this.pickerInstance === cmp) {
              delete this.pickerInstance
            }

            if (typeof resolve === 'function') {
              resolve((cmp as any).output)
            }
          }
        }
      )
    )

    if (dialogId && !this.mountedComponents[dialogId]) {
      this.mountedComponents[dialogId] = 0
    }

    this.mountedComponents[dialogId]++

    return cmp
  }

  async openAsPromise(component, props = {}, dialogId?: string): Promise<any> {
    return new Promise(resolve => {
      component = this.createComponent(component, props, resolve, dialogId)

      this.mountDialog(component)
    })
  }

  open(component, props = {}, dialogId?: string): Vue {
    component = this.createComponent(component, props, null, dialogId)

    this.mountDialog(component)

    return component
  }

  mountDialog(cmp: Vue) {
    const container = document.getElementById('app') || document.body
    container.appendChild(cmp.$mount().$el)
  }

  isDialogOpened(name) {
    return !!this.mountedComponents[name]
  }

  openPicker(initialColor, cb, title?: string) {
    if (this.pickerInstance) {
      this.pickerInstance.selectColor(initialColor)

      if (typeof title !== 'undefined') {
        this.pickerInstance.title = title

      }

      this.pickerInstance.$off('input')
    } else {
      this.pickerInstance = this.open(VerteDialog, {
        value: initialColor,
        title
      })
    }

    if (typeof cb === 'function') {
      this.pickerInstance.$on('input', cb)
    }

    return this.pickerInstance
  }

  async confirm(options: any) {
    if (!options) {
      return
    }

    if (typeof options === 'string') {
      options = {
        message: options
      }
    }

    if (!options.message) {
      return
    }

    return this.openAsPromise(ConfirmDialog, options)
  }

  async prompt(options: any) {
    if (!options) {
      return
    }

    if (typeof options === 'string') {
      options = {
        action: options
      }
    }

    if (!options.action) {
      return
    }

    return this.openAsPromise(PromptDialog, options)
  }
}

export default new DialogService()
