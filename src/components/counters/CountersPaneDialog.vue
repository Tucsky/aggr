<template>
  <Dialog @clickOutside="close" class="pane-dialog">
    <template v-slot:header>
      <div class="title -editable" @dblclick="renamePane" v-text="name"></div>
      <div class="column -center"></div>
    </template>
    <counters-pane-settings :paneId="paneId" />
  </Dialog>
</template>

<script>
import DialogMixin from '../../mixins/dialogMixin'
import PaneDialogMixin from '../../mixins/paneDialogMixin'
import CountersPaneSettings from './CountersPaneSettings.vue'

export default {
  components: { CountersPaneSettings },
  mixins: [DialogMixin, PaneDialogMixin],
  data: () => ({
    renaming: false
  }),
  methods: {}
}
</script>
