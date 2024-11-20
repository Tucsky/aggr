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
      <counters-settings :paneId="paneId" />
    </Dialog>
  </transition>
</template>

<script setup lang="ts">
import { useDialog } from '@/composables/useDialog'
import { usePaneDialog } from '@/composables/usePaneDialog'
import Dialog from '@/components/framework/Dialog.vue'
import CountersSettings from './CountersSettings.vue'

const props = defineProps({
  paneId: {
    required: true,
    type: String
  }
})

// Initialize dialog logic
const { opened, close, hide } = useDialog()
defineExpose({ close })

// Use pane dialog composable
const { name, renamePane } = usePaneDialog(props.paneId)
</script>
