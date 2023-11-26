<template>
  <Dialog
    @clickOutside="close"
    class="pane-dialog"
    size="medium"
    @mousedown="clickOutsideClose = false"
    @mouseup="clickOutsideClose = true"
  >
    <template v-slot:header>
      <div
        class="dialog__title -editable"
        @dblclick="renamePane"
        v-text="name"
      ></div>
      <div class="column -center"></div>
    </template>
    <AlertsSettings />
  </Dialog>
</template>

<script>
import DialogMixin from '../../mixins/dialogMixin'
import PaneDialogMixin from '../../mixins/paneDialogMixin'
import AlertsSettings from './AlertsSettings.vue'

export default {
  components: { AlertsSettings },
  mixins: [DialogMixin, PaneDialogMixin]
}
</script>
