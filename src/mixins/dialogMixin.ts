import Dialog from '@/components/framework/Dialog.vue'

export default {
  components: {
    Dialog
  },
  data: function() {
    return {
      output: null
    }
  },
  created() {
    if (module.hot) {
      module.hot.dispose(() => {
        this.close()
      })
    }
  },
  methods: {
    close(data): Promise<void> {
      if (this._isDestroyed) {
        console.warn('attempting to close destroyed dialog.')
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
        console.warn(
          'failed to remove dialog element: was the dialog already destroyed?',
          error
        )
      }

      return Promise.resolve()
    }
  }
}
