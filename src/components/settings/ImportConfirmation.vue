<template>
  <Dialog @clickOutside="close">
    <template v-slot:header>
      <div class="dialog__title">Import settings</div>
    </template>
    <div class="form-group mb16">
      <label>Name</label>
      <input type="text" class="form-control w-100" v-model="workspace.name" />
    </div>
    <div class="d-flex flex-middle">
      <i class="icon-info mr16"></i>
      <div class="mr16">
        <small class="text-muted">Version</small>
        <div>v{{ workspace.version || 0 }}</div>
      </div>
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
      <label>Panels</label>
      <div v-for="pane in panes" :key="pane.id" class="column flex-middle">
        <i class="icon-plus mr8 -small"></i>
        <span>{{ pane.type.toUpperCase() }}</span>
        <small class="ml4">
          <code>{{ pane.id }}</code>
        </small>
      </div>
    </div>
    <div v-if="panes.length" class="form-group mt16">
      <label>Markets</label>
      <button
        v-for="(market, index) in markets"
        :key="index"
        type="button"
        disabled
        class="btn -small mr4 mb4"
      >
        {{ market }}
      </button>
    </div>
    <footer class="dialog__footer">
      <a href="javascript:void(0);" class="btn -text mr8" @click="close(false)"
        >Cancel</a
      >
      <button class="btn -large -green" @click="close(workspace)">
        IMPORT
      </button>
    </footer>
  </Dialog>
</template>

<script lang="ts">
import Dialog from '@/components/framework/Dialog.vue'
import DialogMixin from '@/mixins/dialogMixin'
import { Workspace } from '@/types/types'
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
          type: this.workspace.states.panes.panes[id].type,
          markets: this.workspace.states.panes.panes[id].markets
        }))
      }

      return []
    },
    markets() {
      return this.panes.reduce((markets, pane) => {
        for (const market of pane.markets) {
          if (markets.indexOf(market) === -1) {
            markets.push(market)
          }
        }

        return markets
      }, [])
    }
  },
  components: {
    Dialog
  }
}
</script>
