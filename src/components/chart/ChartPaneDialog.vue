<template>
  <Dialog @clickOutside="close" class="pane-dialog">
    <template v-slot:header>
      <div class="title -editable" @dblclick="renamePane" v-text="name"></div>
      <div class="column -center"></div>
    </template>
    <chart-pane-settings :paneId="paneId" />
    <footer>
      <presets type="chart" :adapter="getPreset" @apply="resetPane($event)" class="-left -top" />
    </footer>
  </Dialog>
</template>

<script>
import DialogMixin from '../../mixins/dialogMixin'
import PaneDialogMixin from '../../mixins/paneDialogMixin'
import ChartPaneSettings from './ChartPaneSettings.vue'

export default {
  components: { ChartPaneSettings },
  mixins: [DialogMixin, PaneDialogMixin],
  methods: {}
}
</script>
