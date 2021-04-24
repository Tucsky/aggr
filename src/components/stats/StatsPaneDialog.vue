<template>
  <Dialog :open="open" @clickOutside="close" class="pane-dialog">
    <template v-slot:header>
      <div class="title">
        <editable :class="{ '-no-grab': renaming }" :content="name" :editable="renaming" @output="name = $event" placeholder="Nom"></editable>
        <i
          class="icon-sm -no-grab ml4"
          style="cursor: pointer"
          :class="{ 'icon-check': renaming, 'icon-edit': !renaming }"
          @click="renaming = false"
        ></i>
      </div>
      <div class="column -center"></div>
    </template>
    <stats-pane-settings :paneId="paneId" />
  </Dialog>
</template>

<script>
import DialogMixin from '../../mixins/dialogMixin'
import StatsPaneSettings from './StatsPaneSettings.vue'

export default {
  components: { StatsPaneSettings },
  props: ['paneId'],
  mixins: [DialogMixin],
  computed: {
    name: {
      get() {
        return this.$store.state.panes.panes[this.paneId].name
      },
      set(name) {
        this.$store.commit('panes/SET_PANE_NAME', { id: this.paneId, name: name })
      }
    }
  },
  data: () => ({
    renaming: false
  }),
  methods: {}
}
</script>
