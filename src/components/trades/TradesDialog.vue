<template>
  <Dialog @clickOutside="close" class="pane-dialog -medium -mobile-fs">
    <template v-slot:header>
      <div class="title -editable" @dblclick="renamePane" v-text="name"></div>
      <div class="column -center"></div>
    </template>
    <trades-settings :paneId="paneId" />
    <footer>
      <presets
        type="trades"
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
import TradesSettings from './TradesSettings.vue'

export default {
  components: { TradesSettings },
  mixins: [DialogMixin, PaneDialogMixin],
  data: () => ({
    renaming: false
  }),
  methods: {}
}
</script>
