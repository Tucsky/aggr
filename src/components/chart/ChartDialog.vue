<template>
  <Dialog @clickOutside="close" class="pane-dialog -small -mobile-fs">
    <template v-slot:header>
      <div class="title -editable" @dblclick="renamePane" v-text="name"></div>
      <div class="column -center"></div>
    </template>
    <chart-settings :paneId="paneId" />
    <footer>
      <presets
        type="chart"
        :adapter="getPreset"
        @apply="resetPane($event)"
        class="-left -top"
      />
    </footer>
  </Dialog>
</template>

<script>
import DialogMixin from '../../mixins/dialogMixin'
import PaneDialogMixin from '../../mixins/paneDialogMixin'
import ChartSettings from './ChartSettings.vue'

export default {
  components: { ChartSettings },
  mixins: [DialogMixin, PaneDialogMixin],
  methods: {}
}
</script>
