<template>
  <Dialog @clickOutside="close">
    <template v-slot:header>
      <div class="title">{{ action }}</div>
    </template>
    <p class="mx0" v-if="question">{{ question }}</p>
    <form @submit.prevent="submit">
      <div class="form-group">
        <label v-if="label">{{ label }}</label>
        <input
          type="text"
          class="form-control w-100"
          :placeholder="placeholder"
          v-model="value"
          v-autofocus
        />
      </div>

      <footer>
        <a href="javascript:void(0);" class="btn -text" @click="close(false)"
          >Cancel</a
        >
        <button type="submit" class="btn -green ml8 -large">
          <i class="icon-check mr8"></i> {{ submitLabel }}
        </button>
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
  created() {
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
