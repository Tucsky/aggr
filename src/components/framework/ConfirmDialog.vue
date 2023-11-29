<template>
  <Dialog ref="dialog" @clickOutside="close" size="small" :resizable="false">
    <template v-slot:header>
      <div class="dialog__title">{{ title }}</div>
    </template>
    <p class="mx0 -nl text-color-50" v-if="!html" v-text="message"></p>
    <p class="mx0 text-color-50" v-else v-html="message"></p>
    <template v-if="showFooter" v-slot:footer>
      <button
        v-for="action in actions"
        :key="action.label"
        type="button"
        class="btn -text mr8"
        @click="onClickAction($event, action)"
        @mousedown.prevent
      >
        {{ action.label }}
      </button>

      <Btn
        type="button"
        class="-text mr8"
        @click="close(false)"
        @mousedown.native.prevent
        v-if="cancel"
      >
        {{ cancel }}
      </Btn>
      <Btn
        v-if="ok"
        type="button"
        :disabled="!isSubmitEnabled"
        class="-green -large"
        v-autofocus
        @click="close(true)"
        @mousedown.native.prevent
      >
        <i class="icon-check mr4"></i> {{ ok }}
      </Btn>
    </template>
  </Dialog>
</template>

<script>
import Btn from '@/components/framework/Btn.vue'
import DialogMixin from '@/mixins/dialogMixin'

export default {
  components: {
    Btn
  },
  props: {
    title: {
      type: String,
      default: 'Confirmation'
    },
    message: {
      type: String,
      required: true
    },
    ok: {
      type: String,
      default: 'OK'
    },
    cancel: {
      type: String,
      default: 'Cancel'
    },
    html: {
      type: Boolean,
      default: false
    },
    actions: {
      type: Array,
      default: () => []
    },
    requireScroll: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      isSubmitEnabled: !this.requireScroll
    }
  },
  computed: {
    showFooter() {
      return this.ok || this.cancel || this.actions.length
    }
  },
  mixins: [DialogMixin],
  mounted() {
    document.querySelector('.app__wrapper').classList.add('-blur')

    if (this.requireScroll) {
      this.bindScroll()
    }
  },
  beforeDestroy() {
    document.querySelector('.app__wrapper').classList.remove('-blur')

    this.unbindScroll()
  },
  methods: {
    async bindScroll() {
      await this.$nextTick()
      const bodyElement = this.$refs.dialog.$refs.body

      if (bodyElement) {
        console.log('bind scroll')
        this.scrollHandler = this.handleScroll.bind(this)

        bodyElement.addEventListener('scroll', this.handleScroll)
      } else {
        console.log('couldnt bind', this.$refs.dialog.$refs)
      }
    },
    handleScroll() {
      const bodyElement = this.$refs.dialog.$refs.body
      this.isSubmitEnabled =
        bodyElement.scrollTop + bodyElement.clientHeight >=
        bodyElement.scrollHeight - 1

      console.log(
        'scroll',
        this.isSubmitEnabled
          ? 'submit button unlocked'
          : 'submit button still disabled'
      )

      if (this.isSubmitEnabled) {
        this.unbindScroll()
      }
    },
    unbindScroll() {
      if (!this.scrollHandler) {
        console.log('scroll already unbinded?')
        return
      }

      const bodyElement = this.$refs.dialog.$refs.body

      if (bodyElement) {
        console.log('unbind scroll')

        bodyElement.removeEventListener('scroll', this.handleScroll)
        this.handleScroll = null
      } else {
        console.log('couldnt unbind', this.$refs.dialog.$refs)
        this.scrollHandler = null
      }
    },
    onClickAction(event, action) {
      if (action.callback) {
        const output = action.callback(event)
        if (typeof output !== 'undefined') {
          this.close(output)
        }
      }
    }
  }
}
</script>
<style lang="scss">
.app__wrapper.-blur {
  filter: blur(0.25rem);
}
</style>
