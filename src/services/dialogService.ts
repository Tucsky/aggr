import { createApp } from 'vue'
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
  dialogPositions: { [id: string]: DialogPosition } = {}
  isInteracting = false
  hasDialogOpened = false
  pickerInstance: any

  createComponent(
    component: any,
    props: any = {},
    resolve: ((value: any) => void) | null = null,
    dialogId?: string
  ) {
    const app = createApp(component, {
      ...props,
      // Add the close event handler directly to the component's props
      onClose: (data: any) => {
        // Clean up mountedComponents
        if (dialogId && this.mountedComponents[dialogId]) {
          delete this.mountedComponents[dialogId]
          this.hasDialogOpened = Object.keys(this.mountedComponents).length > 0
        }

        // Unmount the app and remove the container
        app.unmount()
        container.remove()

        // Resolve the promise if provided
        if (resolve) {
          resolve(data) // Pass the output value
        }
      }
    })

    // Provide store globally if needed
    app.provide('store', store)

    const container = document.createElement('div')
    document.body.appendChild(container)

    app.mount(container)

    if (dialogId) {
      this.mountedComponents[dialogId] = app
      this.hasDialogOpened = Object.keys(this.mountedComponents).length > 0
    }

    return app
  }

  async openAsPromise(
    component: any,
    props: any = {},
    dialogId?: string
  ): Promise<any> {
    return new Promise(resolve => {
      this.createComponent(component, props, resolve, dialogId)
    })
  }

  open(
    component: any,
    props: any = {},
    dialogId?: string,
    onClose?: (value: any) => void
  ) {
    return this.createComponent(component, props, onClose, dialogId)
  }

  async openPicker(
    initialColor: string,
    label?: string,
    onInput?: (color: string) => void,
    onClose?: () => void
  ) {
    if (this.pickerInstance) {
      this.pickerInstance.setColorFromProp(initialColor)
      this.pickerInstance.label = label || null
    } else {
      this.pickerInstance = this.open(
        (await import('@/components/framework/picker/ColorPickerDialog.vue'))
          .default,
        {
          modelValue: initialColor,
          label,
          onInput
        },
        null,
        onClose
      )
    }

    return this.pickerInstance
  }

  async confirm(options: any) {
    if (!options) {
      return
    }

    if (typeof options === 'string') {
      options = { message: options }
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
      options = { action: options }
    }

    if (!options.action) {
      return
    }

    return this.openAsPromise(PromptDialog, options, dialogId)
  }
}

export default new DialogService()
