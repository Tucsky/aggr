<template>
  <transition name="dialog" :duration="300" @after-leave="close">
    <Dialog v-if="opened" class="alert-dialog" @close="hide">
      <template v-slot:header>
        <div>
          <div class="dialog__title">
            <i
              class="-lower"
              :class="[!edit && 'icon-plus', edit && 'icon-edit']"
            ></i>
            Alert @<code>{{ price }}</code>
          </div>
        </div>

        <div class="column -center"></div>
      </template>
      <form ref="form" class="alert-dialog__form" @submit.prevent="submit">
        <div class="form-group">
          <label>Label</label>

          <div class="input-group">
            <input
              ref="input"
              type="text"
              class="form-control w-100"
              placeholder="Custom message (optional)"
              v-model="value"
              v-autofocus
              @keyup.enter="submit"
            />
            <button
              v-if="value.length"
              type="button"
              class="btn -text -small"
              @click="value = ''"
            >
              <i class="icon-cross"></i>
            </button>
          </div>
        </div>

        <emoji-picker @emoji="appendEmoji" class="alert-dialog__picker" />
      </form>

      <template v-slot:footer>
        <button type="button" class="btn -text" @click="hide(false)">
          Cancel
        </button>
        <button type="button" class="btn -green ml8 -large" @click="submit">
          <i class="icon-check mr8"></i> {{ submitLabel }}
        </button>
      </template>
    </Dialog>
  </transition>
</template>
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useDialog } from '@/composables/useDialog'
import Dialog from '@/components/framework/Dialog.vue'
import EmojiPicker from '@/components/framework/EmojiPicker.vue'

const props = defineProps({
  price: {
    type: Number,
    required: false
  },
  input: {
    type: String,
    default: null
  },
  edit: {
    type: Boolean,
    default: false
  }
})

// Initialize dialog logic
const { opened, close, hide } = useDialog()
defineExpose({ close })

// Reactive state
const value = ref('')

onMounted(() => {
  if (props.input) {
    value.value = props.input
  }

  show()
})

// Computed properties
const submitLabel = computed(() => (props.edit ? 'Update' : 'Create'))

// Methods
const show = () => {
  opened.value = true
}

const submit = () => {
  hide(value.value)
}

const appendEmoji = (str: string) => {
  value.value += str
  inputRef.value?.focus()
}

// Refs
const inputRef = ref<HTMLInputElement | null>(null)
</script>

<style lang="scss">
.alert-dialog {
  .dialog__content {
    width: 320px;
  }

  .dialog__body {
    height: 250px;
    padding: 0;
  }

  &__form {
    display: flex;
    flex-direction: column;
    height: 100%;

    .form-group {
      padding: 1rem 1rem 0;
    }
  }

  &__picker {
    flex-grow: 1;
  }
}
</style>
