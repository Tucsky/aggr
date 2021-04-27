<template>
  <Dialog :open="open" @clickOutside="close" class="pane-dialog" @mousedown="clickOutsideClose = false" @mouseup="clickOutsideClose = true">
    <template v-slot:header>
      <div class="title">
        <strong v-text="name"></strong>
        <i class="icon-sm -no-grab ml4 icon-edit" style="cursor: pointer" @click="renamePane"></i>
      </div>
      <div class="column -center"></div>
    </template>
    <trades-settings :paneId="paneId" />
  </Dialog>
</template>

<script>
import DialogMixin from '../../mixins/dialogMixin'
import PaneDialogMixin from '../../mixins/paneDialogMixin'
import TradesSettings from './TradesPaneSettings.vue'

export default {
  components: { TradesSettings },
  mixins: [DialogMixin, PaneDialogMixin],
  data: () => ({
    renaming: false
  }),
  methods: {}
}
</script>
