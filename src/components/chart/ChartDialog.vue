<template>
  <Dialog @clickOutside="close" class="pane-dialog" size="medium">
    <template v-slot:header>
      <div
        class="dialog__title -editable"
        @dblclick="renamePane"
        v-text="name"
      ></div>
      <div class="column -center"></div>
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
</template>

<script>
import DialogMixin from '../../mixins/dialogMixin'
import PaneDialogMixin from '../../mixins/paneDialogMixin'
import ChartSettings from './ChartSettings.vue'

export default {
  components: { ChartSettings },
  mixins: [DialogMixin, PaneDialogMixin]
}
</script>
