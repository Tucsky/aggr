<template>
  <Dialog
    @clickOutside="close"
    class="pane-dialog"
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
    <website-settings :paneId="paneId" />
    <template v-slot:footer>
      <presets
        type="website"
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
import WebsiteSettings from './WebsiteSettings.vue'

export default {
  components: { WebsiteSettings },
  mixins: [DialogMixin, PaneDialogMixin]
}
</script>
