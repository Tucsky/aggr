<template>
  <Dialog
    @close="close"
    class="pane-dialog"
    size="small"
    @mousedown="clickOutsideClose = false"
    @mouseup="clickOutsideClose = true"
  >
    <template v-slot:header>
      <div
        class="dialog__title -editable"
        @dblclick="renamePane"
        v-text="name"
      ></div>
      <div class="column -center"></div>
    </template>
    <PricesSettings :paneId="paneId" />
    <template v-slot:footer>
      <presets
        type="prices"
        :adapter="getPreset"
        :placeholder="paneId"
        @apply="resetPane($event)"
        class="-left -top"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Dialog from '@/components/framework/Dialog.vue'
import PricesSettings from './PricesSettings.vue'
import { usePaneDialog } from '@/composables/usePaneDialog'
import { useDialog } from '@/composables/useDialog'

defineEmits(['close'])
const props = defineProps({
  paneId: {
    type: String,
    required: true
  }
})

const { close } = useDialog()
const { name, renamePane, resetPane, getPreset } = usePaneDialog(props.paneId)

defineExpose({ close })

const clickOutsideClose = ref(true)
</script>
