<template>
  <transition name="dialog" :duration="300" @after-leave="close">
    <Dialog v-if="opened" @close="hide" class="pane-dialog">
      <template v-slot:header>
        <div
          class="dialog__title -editable"
          @dblclick="renamePane"
          v-text="name"
        ></div>
        <div class="column -center"></div>
      </template>
      <website-settings :paneId="paneId" />
      <template v-slot:footer>
        <presets
          type="website"
          :adapter="getPreset"
          :placeholder="paneId"
          @apply="resetPane($event)"
          class="-left -top"
        />
      </template>
    </Dialog>
  </transition>
</template>

<script setup lang="ts">
import { useDialog } from '@/composables/useDialog'
import { usePaneDialog } from '@/composables/usePaneDialog'
import WebsiteSettings from './WebsiteSettings.vue'
import Presets from '@/components/framework/Presets.vue'

// Define props
const props = defineProps({
  paneId: String
})

// Define emits
defineEmits(['close'])

// Use composables
const { opened, hide, close } = useDialog()
const { name, renamePane, getPreset, resetPane } = usePaneDialog(props.paneId)

// Expose hide for Dialog use
defineExpose({ hide })
</script>
