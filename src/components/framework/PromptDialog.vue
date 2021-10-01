<template>
  <Dialog @clickOutside="close">
    <template v-slot:header>
      <div class="title">{{ action }}</div>
    </template>
    <p class="mx0" v-if="question">{{ question }}</p>
    <form @submit.prevent="submit">
      <div class="form-group">
        <input ref="input" type="text" class="form-control w-100" v-model="value" />
      </div>

      <footer>
        <a href="javascript:void(0);" class="btn -text" @click="close(false)">Cancel</a>
        <button type="submit" class="btn -green ml8 -large"><i class="icon-check mr8"></i> Submit</button>
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
    submit() {
      this.close(this.value)
    }
  }
}
</script>
