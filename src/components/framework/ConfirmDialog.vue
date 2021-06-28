<template>
  <Dialog @clickOutside="close">
    <template v-slot:header>
      <div class="title">{{ title }}</div>
    </template>
    <p class="mx0" v-html="message"></p>
    <footer>
      <a href="javascript:void(0);" class="btn -text" @click="close(false)" v-if="cancel" v-text="cancel"></a>
      <button class="btn -green -large" @click="close(true)"><i class="icon-check mr4"></i> {{ ok }}</button>
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
    }
  },
  mixins: [DialogMixin],
  data: () => ({}),
  methods: {}
}
</script>
