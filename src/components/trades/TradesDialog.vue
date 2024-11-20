<template>
  <transition name="dialog" :duration="300" @after-leave="close">
    <Dialog v-if="opened" @close="hide" class="pane-dialog" size="medium">
      <template v-slot:header>
        <div
          class="dialog__title -editable"
          @dblclick="renamePane"
          v-text="name"
        ></div>
        <div class="column -center"></div>
      </template>
      <trades-settings :paneId="paneId" />
      <template v-slot:footer>
        <presets
          type="trades"
          :adapter="getPreset"
          :placeholder="paneId"
          @apply="resetPane"
          class="-left -top"
        />
      </template>
    </Dialog>
  </transition>
</template>

<script setup lang="ts">
import { useDialog } from '@/composables/useDialog'
import { usePaneDialog } from '@/composables/usePaneDialog'
import TradesSettings from './TradesSettings.vue'
import Presets from '@/components/framework/Presets.vue'

defineEmits(['close'])

const props = defineProps({
  paneId: {
    type: String,
    required: true
  }
})

const { name, renamePane, getPreset, resetPane } = usePaneDialog(props.paneId)
const { hide, close, opened } = useDialog()

defineExpose({ hide, close })
</script>
