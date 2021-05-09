<template>
  <Dialog :open="open" @clickOutside="close">
    <template v-slot:header>
      <div class="title">{{ action }}</div>
    </template>
    <p class="mx0" v-if="question">{{ question }}</p>
    <div class="form-group">
      <input type="text" class="form-control" v-model="value" />
    </div>
    <footer>
      <a href="javascript:void(0);" class="btn -text" @click="close(false)">Cancel</a>
      <button class="btn -large" @click="close(value)"><i class="icon-check mr4"></i> OK</button>
    </footer>
  </Dialog>
</template>

<script>
import DialogMixin from '@/mixins/dialogMixin'

export default {
  props: {
    question: {
      type: String
    },
    action: {
      type: String,
      required: true
    },
    input: {
      type: String,
      default: ''
    }
  },
  mixins: [DialogMixin],
  data: () => ({
    value: ''
  }),
  created() {
    if (this.input && this.input.length) {
      this.value = this.input
    }
  }
}
</script>
