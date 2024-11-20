<template>
  <transition name="dialog" :duration="300" @after-leave="close">
    <Dialog v-if="opened" class="pane-dialog" size="medium" @close="close">
      <template v-slot:header>
        <div
          class="dialog__title -editable"
          @dblclick="renamePane"
          v-text="name"
        ></div>
        <div class="column -center"></div>
      </template>
      <AlertsSettings />
    </Dialog>
  </transition>
</template>

<script setup lang="ts">
import { useDialog } from '@/composables/useDialog'
import Dialog from '@/components/framework/Dialog.vue'
import AlertsSettings from './AlertsSettings.vue'
import { usePaneDialog } from '@/composables/usePaneDialog'

// Initialize dialog logic
const { opened, close } = useDialog()
defineExpose({ close })

const props = defineProps({
  paneId: {
    required: true,
    type: String
  }
})
const { name, renamePane } = usePaneDialog(props.paneId)
</script>
