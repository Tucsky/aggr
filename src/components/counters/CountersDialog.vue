<template>
  <Dialog @clickOutside="close" class="pane-dialog">
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
</template>

<script>
import DialogMixin from '../../mixins/dialogMixin'
import PaneDialogMixin from '../../mixins/paneDialogMixin'
import CountersSettings from './CountersSettings.vue'

export default {
  components: { CountersSettings },
  mixins: [DialogMixin, PaneDialogMixin]
}
</script>
