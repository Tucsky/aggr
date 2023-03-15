<template>
  <transition
    name="dialog"
    :duration="500"
    @after-leave="onHide"
    @after-enter="onShow"
  >
    <Dialog v-if="dialogOpened" class="alert-dialog" @clickOutside="hide">
      <template v-slot:header>
        <div>
          <div class="dialog__title">
            <i class="icon-plus -lower"></i>
            Alert @<code>{{ price }}</code>
          </div>
        </div>

        <div class="column -center"></div>
      </template>
      <form ref="form" class="alert-dialog__form" @submit.prevent="create">
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
              @keyup.enter="create"
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
        <a href="javascript:void(0);" class="btn -text" @click="close(false)">
          Cancel
        </a>
        <button type="button" class="btn -green ml8 -large" @click="create">
          <i class="icon-check mr8"></i> Create
        </button>
      </template>
    </Dialog>
  </transition>
</template>

<script>
import DialogMixin from '@/mixins/dialogMixin'
import EmojiPicker from '@/components/framework/EmojiPicker.vue'

export default {
  name: 'AlertDialog',
  props: {
    price: {
      type: Number
    }
  },
  mixins: [DialogMixin, EmojiPicker],
  data() {
    return {
      dialogOpened: false,
      value: ''
    }
  },
  mounted() {
    this.show()
  },
  methods: {
    show() {
      this.dialogOpened = true
    },
    hide() {
      this.dialogOpened = false
    },
    onHide() {
      this.close(typeof this.data === 'string' ? this.data : null)
    },
    onShow() {
      //
    },
    create() {
      this.data = this.value
      this.hide()
    },
    appendEmoji(str) {
      this.value += str

      this.$refs.input.focus()
    }
  }
}
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
