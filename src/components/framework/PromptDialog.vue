<template>
  <Dialog
    @clickOutside="close"
    size="small"
    :resizable="markdown"
    @resize="resizeEditor"
  >
    <template v-slot:header>
      <div class="dialog__title">{{ action }}</div>
    </template>
    <p class="mt0 mb8 -nl" v-if="question">{{ question }}</p>
    <form
      ref="form"
      class="flex-grow-1 d-flex -column"
      @submit.prevent="submit"
    >
      <div class="form-group flex-grow-1 d-flex -column">
        <div v-if="label || markdown" class="d-flex mb8">
          <label class="mr8 mt4 mb4">{{ label }}</label>

          <label v-if="markdown" class="checkbox-control -small mlauto mr0">
            <input type="checkbox" class="form-control" v-model="showPreview" />
            <div v-tippy title="Show preview"></div>
          </label>
        </div>
        <MarkdownEditor
          v-if="markdown"
          class="w-100 flex-grow-1"
          ref="editor"
          v-model="value"
          :show-preview="showPreview"
          minimal
          autofocus
        />
        <input
          v-else
          type="text"
          class="form-control w-100"
          :placeholder="placeholder"
          v-model="value"
          v-autofocus
          v-on:keyup.enter="submit"
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
  components: {
    MarkdownEditor: () =>
      import('@/components/framework/editor/MarkdownEditor.vue')
  },
  props: {
    markdown: {
      type: Boolean,
      default: false
    },
    textarea: {
      type: Boolean,
      default: false
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
    value: '',
    showPreview: false
  }),
  mounted() {
    if (this.input && this.input.length) {
      this.value = this.input
    }
  },
  methods: {
    submit() {
      this.close(this.value)
    },
    resizeEditor() {
      if (this.$refs.editor && this.$refs.editor.resize) {
        this.$refs.editor.resize()
      }
    }
  }
}
</script>
