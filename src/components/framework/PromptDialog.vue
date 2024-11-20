<template>
  <form @submit.prevent="submit">
    <transition name="dialog" :duration="300" @after-leave="close">
      <Dialog
        v-if="opened"
        size="small"
        :resizable="markdown"
        @resize="resizeEditor"
        @close="hide"
      >
        <template v-slot:header>
          <div class="dialog__title">{{ action }}</div>
        </template>
        <p class="mt0 mb8 -nl" v-if="question">{{ question }}</p>
        <div class="flex-grow-1 d-flex -column">
          <div class="form-group flex-grow-1 d-flex -column">
            <div v-if="label || markdown" class="d-flex mb8">
              <label class="mr8 mt4 mb4">{{ label }}</label>

              <label v-if="markdown" class="checkbox-control -small mlauto mr0">
                <input
                  type="checkbox"
                  class="form-control"
                  v-model="showPreview"
                />
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
        </div>

        <template v-slot:footer>
          <a href="javascript:void(0);" class="btn -text" @click="hide(null)">
            Cancel
          </a>
          <button type="button" class="btn -green ml8 -large" @click="submit">
            <i class="icon-check mr8"></i> {{ submitLabel }}
          </button>
        </template>
      </Dialog>
    </transition>
  </form>
</template>

<script setup lang="ts">
import { ref, onMounted, defineProps } from 'vue'
import { defineAsyncComponent } from 'vue'
import Dialog from '@/components/framework/Dialog.vue'
import { useDialog } from '@/composables/useDialog'
const { opened, close, hide } = useDialog()
defineExpose({ close })

const props = defineProps({
  markdown: {
    type: Boolean,
    default: false
  },
  textarea: {
    type: Boolean,
    default: false
  },
  question: String,
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
})

const MarkdownEditor = defineAsyncComponent(
  () => import('@/components/framework/editor/MarkdownEditor.vue')
)

const value = ref('')
const showPreview = ref(false)

const editorRef = ref<any>(null)

onMounted(() => {
  if (props.input && props.input.length) {
    value.value = props.input
  }
})

const submit = () => {
  hide(value.value)
}

const resizeEditor = () => {
  if (editorRef.value && typeof editorRef.value.resize === 'function') {
    editorRef.value.resize()
  }
}
</script>
