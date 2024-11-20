<template>
  <form @submit.prevent="submit">
    <transition name="dialog" :duration="300" @after-leave="close">
      <Dialog
        v-if="opened"
        class="edit-resource-dialog"
        @close="hide"
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
                >{{ displayId }}</code
              >
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
                title="IDs are unique in the library!"
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
            ref="editorRef"
            style="height: auto; min-height: 100px"
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

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import Dialog from '@/components/framework/Dialog.vue'
import { useDialog } from '@/composables/useDialog'
import Btn from '@/components/framework/Btn.vue'
import { slugify, uniqueName } from '@/utils/helpers'
import MarkdownEditor from '@/components/framework/editor/MarkdownEditor.vue'

const props = defineProps({
  item: {
    type: Object,
    required: true
  },
  ids: {
    type: Array,
    required: true
  }
})

defineEmits(['close'])
const { opened, close, hide } = useDialog()
defineExpose({ close })

const name = ref(props.item.name || '')
const description = ref(props.item.description || '')
const updateId = ref(false)
const imageObjectUrl = ref<string | null>(null)
const newImagePreview = ref<File | null>(null)
const hasDeletedPreview = ref(false)
const editorRef = ref<InstanceType<typeof MarkdownEditor> | null>(null)

const displayId = computed(() => {
  const id = props.item.id
  if (!id) return 'no id'
  return id.length <= 16 ? id : `${id.slice(0, 6)}..${id.substr(-6)}`
})

const newId = computed(() =>
  uniqueName(slugify(name.value), idsExceptCurrent.value)
)
const idsExceptCurrent = computed(() =>
  props.ids.filter(id => id !== props.item.id)
)

const hasCustomPreview = computed(() => {
  if (hasDeletedPreview.value) return false
  return !!(newImagePreview.value || props.item.preview instanceof File)
})

const previewName = computed(() =>
  hasCustomPreview.value ? `${props.item.id}.png` : 'Browse'
)

const loadPreview = () => {
  clearPreview()
  const preview = newImagePreview.value || props.item.preview
  if (preview instanceof File || preview instanceof Blob) {
    imageObjectUrl.value = URL.createObjectURL(preview)
  }
}

const clearPreview = () => {
  if (imageObjectUrl.value) {
    URL.revokeObjectURL(imageObjectUrl.value)
    imageObjectUrl.value = null
  }
}

const handlePreviewFile = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  newImagePreview.value = file
  hasDeletedPreview.value = false
  loadPreview()
}

const removePreview = () => {
  newImagePreview.value = null
  clearPreview()
  hasDeletedPreview.value = true
}

const resizeEditor = () => {
  editorRef.value?.resize()
}

const submit = () => {
  hide({
    ...props.item,
    name: name.value,
    displayName: name.value,
    description: description.value,
    preview:
      newImagePreview.value ||
      (hasDeletedPreview.value ? null : props.item.preview),
    id: updateId.value ? newId.value : props.item.id
  })
}

onMounted(() => {
  loadPreview()
})

onBeforeUnmount(() => {
  clearPreview()
})
</script>

<style lang="scss" scoped>
.edit-resource-dialog {
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
