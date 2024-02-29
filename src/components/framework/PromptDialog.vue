<template>
  <Dialog @clickOutside="close" size="small" :resizable="false">
    <template v-slot:header>
      <div class="dialog__title">{{ action }}</div>
    </template>
    <p class="mt0 mb8 -nl" v-if="question">{{ question }}</p>
    <form ref="form" @submit.prevent="submit">
      <div class="form-group">
        <label v-if="label">{{ label }}</label>
        <input
          v-if="tag === 'input'"
          type="text"
          class="form-control w-100"
          :placeholder="placeholder"
          v-model="value"
          v-autofocus
          v-on:keyup.enter="submit"
        />
        <textarea
          v-else
          type="text"
          class="form-control w-100"
          :placeholder="placeholder"
          v-model="value"
          v-autofocus
        />
      </div>
    </form>

    <template v-slot:footer>
      <a href="javascript:void(0);" class="btn -text" @click="close(null)">
        Cancel
      </a>
      <button type="button" class="btn -green ml8 -large" @click="submit">
        <i class="icon-check mr8"></i> {{ submitLabel }}
      </button>
    </template>
  </Dialog>
</template>

<script>
import DialogMixin from '@/mixins/dialogMixin'

export default {
  props: {
    tag: {
      type: String,
      default: 'input'
    },
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
    },
    submitLabel: {
      type: String,
      default: 'Submit'
    },
    placeholder: {
      type: String,
      default: null
    },
    label: {
      type: String,
      default: null
    }
  },
  mixins: [DialogMixin],
  data: () => ({
    value: ''
  }),
  mounted() {
    if (this.input && this.input.length) {
      this.value = this.input
    }
  },
  methods: {
    submit() {
      this.close(this.value)
    }
  }
}
</script>
