<template>
  <Dialog @clickOutside="close" class="pane-dialog" @mousedown="clickOutsideClose = false" @mouseup="clickOutsideClose = true">
    <template v-slot:header>
      <div class="title">
        <span v-text="name"></span>
        <i class="icon-sm -no-grab ml4 icon-edit" style="cursor: pointer" @click="renamePane"></i>
      </div>
      <div class="column -center"></div>
    </template>
    <trades-settings :paneId="paneId" />
    <footer>
      <button class="btn -red mrauto ml0" @click="resetPane"><i class="icon-warning mr4"></i> Reset</button>
    </footer>
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
