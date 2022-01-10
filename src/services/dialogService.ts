import Vue from 'vue'
import store from '@/store'

import VerteDialog from '@/components/framework/picker/VerteDialog.vue'
import ConfirmDialog from '@/components/framework/ConfirmDialog.vue'
import PromptDialog from '@/components/framework/PromptDialog.vue'

class DialogService {
  mountedComponents = {}
  isInteracting = false
  pickerInstance: any

  createComponent(component, props: any = {}, resolve = null, dialogId?: string): Vue {
    const Factory = Vue.extend(Object.assign({ store }, component))

    const cmp: any = new Factory(
      Object.assign(
        {},
        {
          dialogId: dialogId,
          propsData: Object.assign({}, props),
          destroyed: () => {
            if (dialogId && this.mountedComponents[dialogId]) {
              delete this.mountedComponents[dialogId]
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

    cmp.dialogId = dialogId

    return cmp
  }

  async openAsPromise(component, props = {}, dialogId?: string): Promise<any> {
    return new Promise(resolve => {
      component = this.createComponent(component, props, resolve, dialogId)

      this.mountDialog(component)
    })
  }

  open(component, props = {}, dialogId?: string, onClose?: Function): Vue {
    component = this.createComponent(component, props, onClose, dialogId)

    this.mountDialog(component)

    return component
  }

  mountDialog(cmp: Vue) {
    const container = document.getElementById('app') || document.body

    const mounted = cmp.$mount()
    container.appendChild(mounted.$el)

    const id = (cmp as any).dialogId

    if (id) {
      if (this.mountedComponents[id]) {
        this.mountedComponents[id].close()
      }

      this.mountedComponents[id] = cmp
    }
  }

  isDialogOpened(name) {
    return !!this.mountedComponents[name]
  }

  openPicker(initialColor, cb, title?: string, onClose?: Function) {
    if (this.pickerInstance) {
      this.pickerInstance.selectColor(initialColor, true)

      if (typeof title !== 'undefined') {
        this.pickerInstance.title = title
      }

      this.pickerInstance.$off('input')
    } else {
      this.pickerInstance = this.open(
        VerteDialog,
        {
          value: initialColor,
          title
        },
        null,
        onClose
      )
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
