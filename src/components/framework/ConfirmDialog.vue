<template>
  <Dialog @clickOutside="close" size="small" :resizable="false">
    <template v-slot:header>
      <div class="dialog__title">{{ title }}</div>
    </template>
    <p class="mx0 -nl text-color-50" v-if="!html" v-text="message"></p>
    <p class="mx0 text-color-50" v-else v-html="message"></p>
    <template v-if="showFooter" v-slot:footer>
      <button
        v-for="action in actions"
        :key="action.label"
        class="btn -text mr8"
        @click="onClickAction($event, action)"
      >
        {{ action.label }}
      </button>

      <button
        type="button"
        class="btn -text mr8"
        @click="close(false)"
        v-if="cancel"
        v-text="cancel"
      ></button>
      <button
        v-if="ok"
        type="button"
        class="btn -green -large"
        v-autofocus
        @click="close(true)"
      >
        <i class="icon-check mr4"></i> {{ ok }}
      </button>
    </template>
  </Dialog>
</template>

<script>
import DialogMixin from '@/mixins/dialogMixin'

export default {
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
  },
  beforeDestroy() {
    document.querySelector('.app__wrapper').classList.remove('-blur')
  },
  methods: {
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
