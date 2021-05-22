<template>
  <Dialog :open="open" @clickOutside="close">
    <template v-slot:header>
      <div class="title">Import settings</div>
    </template>
    <div class="form-group">
      <label>Name</label>
      <input type="text" class="form-control" v-model="workspace.name" />
    </div>
    <div class="d-flex flex-middle mt8">
      <i class="icon-info mr16"></i>
      <div class="mr16">
        <small class="text-muted">Created at</small>
        <div>{{ createdAt }} ago</div>
      </div>
      <div>
        <small class="text-muted">Updated at</small>
        <div>{{ updatedAt }} ago</div>
      </div>
    </div>
    <div v-if="panes.length" class="form-group mt16">
      <label>Panes</label>
      <div v-for="pane in panes" :key="pane.id" class="column flex-middle">
        <i class="icon-pile mr8"></i>
        <strong>{{ pane.type.toUpperCase() }}</strong>
        <small class="ml4">
          <code>{{ pane.id }}</code>
        </small>
      </div>
    </div>
    <div v-if="panes.length" class="form-group mt16">
      <label>Markets</label>
      <button v-for="(market, index) in markets" :key="index" type="button" disabled class="btn -green -small mr4 mb4">
        {{ market }}
      </button>
    </div>
    <footer>
      <a href="javascript:void(0);" class="btn -text" @click="close(false)">Cancel</a>
      <button class="btn -large" @click="close(workspace)">IMPORT & LOAD</button>
    </footer>
  </Dialog>
</template>

<script lang="ts">
import Dialog from '@/components/framework/Dialog.vue'
import DialogMixin from '@/mixins/dialogMixin'
import { Workspace } from '@/types/test'
import { ago } from '@/utils/helpers'

export default {
  props: {
    workspace: {
      required: true,
      type: Object as () => Workspace
    }
  },
  mixins: [DialogMixin],
  computed: {
    createdAt() {
      return ago(this.workspace.createdAt)
    },
    updatedAt() {
      return ago(this.workspace.updatedAt)
    },
    panes() {
      if (this.workspace.states.panes && this.workspace.states.panes.panes) {
        return Object.keys(this.workspace.states.panes.panes).map(id => ({
          id,
          name: this.workspace.states.panes.panes[id].name,
          type: this.workspace.states.panes.panes[id].type
        }))
      }

      return []
    },
    markets() {
      if (this.workspace.states.panes && this.workspace.states.panes.marketsListeners) {
        return Object.keys(this.workspace.states.panes.marketsListeners)
      }

      return []
    }
  },
  components: {
    Dialog
  },
  data: () => ({}),
  methods: {}
}
</script>
