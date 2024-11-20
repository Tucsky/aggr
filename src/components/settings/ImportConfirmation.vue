<template>
  <form @submit.prevent="submit">
    <transition name="dialog" :duration="300" @after-leave="close">
      <Dialog v-if="opened" @close="hide">
        <template v-slot:header>
          <div class="dialog__title">Import settings</div>
        </template>
        <div class="form-group mb16">
          <label>Name</label>
          <input type="text" class="form-control w-100" v-model="name" />
        </div>
        <div class="d-flex flex-middle">
          <i class="icon-info mr16" title="workspace version"></i>
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
        <template #footer>
          <button type="button" class="btn -text mr8" @click="hide(false)">
            Cancel
          </button>
          <button type="submit" class="btn -large -green" @click="submit">
            Import
          </button>
        </template>
      </Dialog>
    </transition>
  </form>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import Dialog from '@/components/framework/Dialog.vue'
import { useDialog } from '@/composables/useDialog'
import { ago } from '@/utils/helpers'
import { Workspace } from '@/types/types'

defineEmits(['close'])

const props = defineProps({
  workspace: {
    type: Object as () => Workspace,
    required: true
  }
})

const { opened, hide, close } = useDialog()

const name = ref<string>(props.workspace.name)
const createdAt = computed(() => ago(props.workspace.createdAt))
const updatedAt = computed(() => ago(props.workspace.updatedAt))

const panes = computed(() => {
  if (props.workspace.states.panes && props.workspace.states.panes.panes) {
    return Object.keys(props.workspace.states.panes.panes).map(id => ({
      id,
      name: props.workspace.states.panes.panes[id].name,
      type: props.workspace.states.panes.panes[id].type,
      markets: props.workspace.states.panes.panes[id].markets
    }))
  }
  return []
})

const markets = computed(() => {
  return panes.value.reduce((markets, pane) => {
    for (const market of pane.markets) {
      if (!markets.includes(market)) {
        markets.push(market)
      }
    }
    return markets
  }, [])
})

const submit = () => {
  hide({
    ...props.workspace,
    name: name.value
  })
}
</script>
