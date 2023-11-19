import Dialog from '@/components/framework/Dialog.vue'

export default {
  components: {
    Dialog
  },
  data() {
    return {
      output: null
    }
  },
  created() {
    if (import.meta.hot) {
      import.meta.hot.dispose(() => {
        this.close()
      })
    }
  },
  methods: {
    close(data): Promise<void> {
      if (this._isDestroyed) {
        return
      }

      if (this.preventClose) {
        return
      }

      if (typeof data !== 'undefined' && data !== null) {
        this.output = data
      }

      this.$destroy()

      // remove the element from the DOM
      try {
        this.$el.parentNode.removeChild(this.$el)
      } catch (error) {
        //
      }

      return Promise.resolve()
    }
  }
}
