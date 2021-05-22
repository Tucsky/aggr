import Dialog from '@/components/framework/Dialog.vue'
import store from '@/store'

export default {
  components: {
    Dialog
  },
  data: function() {
    return {
      preventClickOutside: false,
      output: null,
      open: false
    }
  },
  created() {
    if (module.hot) {
      module.hot.dispose(() => {
        this.close()
      })
    }
  },
  mounted() {
    this.open = true
  },
  methods: {
    close(data): Promise<void> {
      if (this.preventClose) {
        return
      }

      this.open = false

      if (data) {
        this.output = data
      }

      return new Promise(resolve => {
        setTimeout(
          () => {
            this.destroy()

            resolve()
          },
          store.state.settings.disableAnimations ? 0 : 500
        )
      })
    },
    destroy() {
      this.$destroy()

      const parent = this.$el.parentNode

      if (parent) {
        parent.removeChild(this.$el)
      }
    }
  }
}
