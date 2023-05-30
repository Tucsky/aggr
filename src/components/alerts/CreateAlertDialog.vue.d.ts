import EmojiPicker from '@/components/framework/EmojiPicker.vue'

declare const _default: import('vue').DefineComponent<
  {
    price: {
      type: NumberConstructor
    }
    input: {
      type: StringConstructor
      default: null
    }
    edit: {
      type: BooleanConstructor
      default: boolean
    }
  },
  {},
  {
    dialogOpened: boolean
    value: string
  },
  {
    submitLabel(): 'Create' | 'Update'
  },
  {
    show(): void
    hide(): void
    onHide(): void
    onShow(): void
    create(): void
    appendEmoji(str: any): void
  },
  | {
      components: {
        Dialog: typeof import('@/components/framework/Dialog.vue').default
      }
      data(): {
        output: null
      }
      created(): void
      methods: {
        close(data: any): Promise<void>
      }
    }
  | typeof EmojiPicker,
  import('vue/types/v3-component-options.js').ComponentOptionsMixin,
  {},
  string,
  Readonly<
    import('vue').ExtractPropTypes<{
      price: {
        type: NumberConstructor
      }
      input: {
        type: StringConstructor
        default: null
      }
      edit: {
        type: BooleanConstructor
        default: boolean
      }
    }>
  >,
  {
    input: string
    edit: boolean
  }
>
export default _default
