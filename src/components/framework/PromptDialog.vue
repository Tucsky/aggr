<template>
  <Dialog @clickOutside="close">
    <template v-slot:header>
      <div class="title">{{ action }}</div>
    </template>
    <p class="mx0" v-if="question">{{ question }}</p>
    <form @submit.prevent="validate">
      <div class="form-group">
        <input ref="input" type="text" class="form-control" v-model="value" />
      </div>

      <footer>
        <a href="javascript:void(0);" class="btn -text" @click="close(false)">Cancel</a>
        <button type="submit" class="btn -large"><i class="icon-check mr4"></i> Validate</button>
      </footer>
    </form>
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
  },
  mounted() {
    this.$nextTick(() => {
      this.$refs.input.focus()
    })
  },
  methods: {
    validate() {
      if (!this.value.length) {
        return
      }

      this.close(this.value)
    }
  }
}
</script>
