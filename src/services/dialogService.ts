import ConfirmDialog from '@/components/framework/ConfirmDialog.vue'
import PromptDialog from '@/components/framework/PromptDialog.vue'
import { reactive } from 'vue'

type DialogProps = Record<string, any>
type DialogInstance = {
  id?: string
  component: any
  props: DialogProps
  resolve: (value: any) => void
}

const dialogs = reactive<DialogInstance[]>([])

export const dialogService = {
  open(
    component: any,
    props: DialogProps = {},
    id?: string
  ): Promise<any> {
    return new Promise(resolve => {
      dialogs.push({ id, component, props, resolve })
    })
  },

  close(id: string, result: any = null) {
    const index = dialogs.findIndex(d => d.id === id)
    if (index !== -1) {
      const [dialog] = dialogs.splice(index, 1) // Remove dialog
      dialog.resolve(result) // Resolve the promise with the output
    }
  },

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

    return this.open(ConfirmDialog, options)
  },

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

    return this.open(PromptDialog, options, dialogId)
  },

  getDialogs() {
    return dialogs
  }
}
