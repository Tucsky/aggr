import Vue from 'vue'
import store from '@/store'

import ConfirmDialog from '@/components/framework/ConfirmDialog.vue'
import PromptDialog from '@/components/framework/PromptDialog.vue'

export interface DialogPosition {
  x?: number
  y?: number
  w?: number
  h?: number
}

class DialogService {
  mountedComponents: { [id: string]: any } = {}
  dialogPositions: { [id: string]: any } = {}
  isInteracting = false
  hasDialogOpened = false
  pickerInstance: any

  createComponent(
    component,
    props: any = {},
    resolve = null,
    dialogId?: string
  ): Vue {
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

              this.hasDialogOpened =
                Object.keys(this.mountedComponents).length > 0
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

  open(component, props = {}, dialogId?: string, onClose?: () => void): Vue {
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

      this.hasDialogOpened = Object.keys(this.mountedComponents).length > 0
    }
  }

  isDialogOpened(name) {
    return !!this.mountedComponents[name]
  }

  async openPicker(
    initialColor,
    label?: string,
    onInput?: () => void,
    onClose?: () => void
  ) {
    if (this.pickerInstance) {
      this.pickerInstance.$off('input')
      this.pickerInstance.setColorFromProp(initialColor)

      this.pickerInstance.label = typeof label !== 'undefined' ? label : null
    } else {
      this.pickerInstance = this.open(
        (await import('@/components/framework/picker/ColorPickerDialog.vue'))
          .default,
        {
          value: initialColor,
          label
        },
        null,
        onClose
      )
    }

    if (typeof onInput === 'function') {
      this.pickerInstance.$on('input', onInput)
    }

    return this.pickerInstance
  }

  async openIndicator(paneId: string, indicatorId: string) {
    return this.open(
      (await import('@/components/indicators/IndicatorDialog.vue')).default,
      {
        paneId,
        indicatorId
      },
      'indicator'
    )
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

  async prompt(options: any, dialogId = 'prompt') {
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

    return this.openAsPromise(PromptDialog, options, dialogId)
  }
}

export default new DialogService()
