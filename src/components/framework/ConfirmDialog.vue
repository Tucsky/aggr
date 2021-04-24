<template>
  <Dialog :open="open" @clickOutside="close">
    <template v-slot:header>
      <div class="title">{{ title }}</div>
    </template>
    <p class="mx0" v-html="message"></p>
    <footer>
      <a href="javascript:void(0);" class="btn -text" @click="close(false)" v-text="cancel"></a>
      <button class="btn -large" @click="close(true)"><i class="icon-check mr4"></i> {{ ok }}</button>
    </footer>
  </Dialog>
</template>

<script>
import Dialog from '@/components/framework/Dialog.vue'
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
  components: {
    Dialog
  },
  data: () => ({}),
  methods: {}
}
</script>
