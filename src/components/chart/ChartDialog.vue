<template>
  <transition name="dialog" :duration="300" @after-leave="close">
    <Dialog v-if="opened" @close="hide" class="pane-dialog" size="medium">
      <template #header>
        <div class="dialog__title -editable" @dblclick="renamePane">
          {{ name }}
          <Btn class="-text" small @click="renamePane">
            <i class="icon-edit"></i>
          </Btn>
        </div>
      </template>
      <chart-settings :paneId="paneId" />
      <template v-slot:footer>
        <presets
          type="chart"
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
import Dialog from '@/components/framework/Dialog.vue'
import Btn from '@/components/framework/Btn.vue'
import ChartSettings from './ChartSettings.vue'
import Presets from '@/components/framework/Presets.vue'

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
const { name, renamePane, resetPane, getPreset } = usePaneDialog(props.paneId)
</script>
