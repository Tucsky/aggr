<template>
  <transition name="dialog" @after-leave="hide">
    <Dialog v-if="opened" @close="hide" class="pane-dialog">
      <template v-slot:header>
        <div
          class="dialog__title -editable"
          @dblclick="renamePane"
          v-text="name"
        ></div>
        <div class="column -center"></div>
      </template>
      <stats-settings :paneId="paneId" />
    </Dialog>
  </transition>
</template>

<script setup lang="ts">
import { useDialog } from '@/composables/useDialog'
import { usePaneDialog } from '@/composables/usePaneDialog'
import StatsSettings from './StatsSettings.vue'
import Dialog from '@/components/framework/Dialog.vue'

// Define the props
const props = defineProps({
  paneId: {
    type: String,
    required: true
  }
})

// Define emits for the close event
defineEmits(['close'])

// Use composables
const { hide, opened } = useDialog()
const { name, renamePane } = usePaneDialog(props.paneId)
</script>
