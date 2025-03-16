<template>
  <form @submit.prevent="submit">
    <transition name="dialog" :duration="500" @after-leave="onHide">
      <Dialog
        v-if="dialogOpened"
        class="edit-resource-dialog"
        @clickOutside="hide"
        @resize="resizeEditor"
      >
        <template v-slot:header>
          <div class="d-flex">
            <div class="dialog__title">Edit {{ item.name }}</div>

            <small class="-center">
              <code
                class="-filled -center ml4"
                :title="`ID: ${item.id}`"
                v-tippy
              >
                {{ displayId }}
              </code>
            </small>
          </div>
        </template>
        <div class="d-flex -gap16 mb16">
          <div class="form-group">
            <label for="label">Name</label>
            <input
              id="label"
              type="text"
              class="form-control w-100"
              v-model="name"
              required
            />
          </div>
          <div v-if="item.name !== name" class="form-group">
            <label for="label">&nbsp;</label>
            <label class="checkbox-control">
              <input type="checkbox" class="form-control" v-model="updateId" />
              <div class="mr8" title="Get a new ID" v-tippy></div>
              <i
                class="icon-info"
                title="IDs are unique in the library !"
                v-tippy
              ></i>
            </label>
          </div>
        </div>
        <p v-if="updateId && item.id !== newId">
          <i class="icon-info"></i> ID change
          <code class="-filled">{{ item.id }}</code> →
          <code class="-filled">{{ newId }}</code>
        </p>
        <div class="form-group mb16 flex-grow-1 d-flex -column">
          <label for="label">
            Description
            <span
              class="icon-info"
              title='Markdown supported <span class="badge -red ml4">new</span>'
              v-tippy
            ></span>
          </label>
          <MarkdownEditor
            class="w-100 flex-grow-1"
            ref="editor"
            style="height: auto"
            v-model="description"
            minimal
          />
        </div>
        <div class="d-flex -gap16">
          <div class="form-group">
            <label for="label">Preview</label>
            <button class="btn -file -blue -cases">
              <i class="icon-upload mr8"></i>
              {{ previewName }}
              <i
                v-if="hasCustomPreview"
                class="icon-cross mr8 btn__suffix"
                @click.stop.prevent="removePreview"
              ></i>
              <input
                type="file"
                class="input-file"
                accept="image/*"
                @change="handlePreviewFile"
              />
            </button>
          </div>
          <div class="edit-resource-dialog__preview">
            <img v-if="imageObjectUrl" :src="imageObjectUrl" />
          </div>
        </div>

        <template v-slot:footer>
          <Btn type="button" class="btn -text" @click="hide">Cancel</Btn>
          <Btn type="submit" class="btn -green ml8 -large">
            <i class="icon-check mr8"></i> Save
          </Btn>
        </template>
      </Dialog>
    </transition>
  </form>
</template>

<script>
import Btn from '@/components/framework/Btn.vue'
import DialogMixin from '@/mixins/dialogMixin'
import { slugify, uniqueName } from '@/utils/helpers'

export default {
  name: 'EditResourceDialog',
  components: {
    Btn,
    MarkdownEditor: () =>
      import('@/components/framework/editor/MarkdownEditor.vue')
  },
  props: {
    item: {
      type: Object,
      required: true
    },
    ids: {
      type: Array,
      required: true
    }
  },
  mixins: [DialogMixin],
  data() {
    return {
      dialogOpened: false,
      name: this.item.name || '',
      description: this.item.description || '',
      updateId: false,
      imageObjectUrl: null,
      newImagePreview: null,
      hasDeletedPreview: false
    }
  },
  computed: {
    displayId() {
      const id = this.item.id

      if (!id) {
        return 'no id'
      }

      if (id.length <= 16) {
        return id
      } else {
        return id.slice(0, 6) + '..' + id.substr(-6)
      }
    },
    newId() {
      return uniqueName(slugify(this.name), this.idsExceptCurrent)
    },
    idsExceptCurrent() {
      return this.ids.filter(id => id !== this.item.id)
    },
    hasCustomPreview() {
      if (this.hasDeletedPreview) {
        return false
      }

      if (this.newImagePreview || this.item.preview instanceof File) {
        return true
      }

      return false
    },
    previewName() {
      if (this.hasCustomPreview) {
        return this.item.id + '.png'
      }

      return 'Browse'
    }
  },
  mounted() {
    this.loadPreview()
    this.show()
  },
  beforeDestroy() {
    this.clearPreview()
  },
  methods: {
    show() {
      this.dialogOpened = true
    },
    hide() {
      this.dialogOpened = false
    },
    onHide() {
      this.close()
    },
    submit() {
      this.output = {
        ...this.item,
        name: this.name,
        displayName: this.name,
        description: this.description
      }

      if (this.newImagePreview) {
        this.output.preview = this.newImagePreview
      } else if (this.hasDeletedPreview) {
        this.output.preview = null
      }

      if (this.updateId) {
        this.output.id = this.newId
      }

      this.hide()
    },
    loadPreview() {
      this.clearPreview()

      const preview = this.newImagePreview || this.item.preview
      if (preview instanceof File || preview instanceof Blob) {
        this.imageObjectUrl = URL.createObjectURL(preview)
      }
    },
    clearPreview() {
      if (this.imageObjectUrl) {
        URL.revokeObjectURL(this.imageObjectUrl)
        this.imageObjectUrl = null
      }
    },
    handlePreviewFile() {
      const file = event.target.files[0]

      if (!file) {
        return
      }

      this.newImagePreview = file
      this.hasDeletedPreview = false
      this.loadPreview()
    },
    removePreview() {
      if (this.newImagePreview) {
        this.newImagePreview = null
      }

      this.clearPreview()
      this.hasDeletedPreview = true
    },
    resizeEditor() {
      if (this.$refs.editor) {
        this.$refs.editor.resize()
      }
    }
  }
}
</script>
<style lang="scss" scoped>
.edit-resource-dialog {
  ::v-deep .dialog__content {
    width: 420px;
  }
  &__preview {
    position: relative;
    border-radius: 0.375rem;
    border: 1px solid var(--theme-background-200);
    background-color: var(--theme-background-75);
    flex-grow: 1;

    img {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      object-fit: cover;
      width: 100%;
      height: 100%;
    }
  }
}
</style>
