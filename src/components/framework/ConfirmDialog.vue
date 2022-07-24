<template>
  <Dialog @clickOutside="close">
    <template v-slot:header>
      <div class="title">{{ title }}</div>
    </template>
    <p class="mx0" v-if="!html" v-text="message"></p>
    <p class="mx0" v-else v-html="message"></p>
    <footer class="pl16">
      <button
        v-for="action in actions"
        :key="action.label"
        class="btn -text -large mr16"
        @click="onClickAction($event, action)"
      >
        {{ action.label }}
      </button>

      <a
        href="javascript:void(0);"
        class="btn -text mr8"
        @click="close(false)"
        v-if="cancel"
        v-text="cancel"
      ></a>
      <button class="btn -green -large" v-autofocus @click="close(true)">
        <i class="icon-check mr4"></i> {{ ok }}
      </button>
    </footer>
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
  mixins: [DialogMixin],
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
