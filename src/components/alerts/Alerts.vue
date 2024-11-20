<template>
  <div class="pane-alerts">
    <pane-header
      class="pane-alerts__header"
      :paneId="paneId"
      :settings="() => import('@/components/alerts/AlertsDialog.vue')"
      :show-search="false"
      :show-name="false"
    >
      <hr />
      <Btn type="button" class="-text" @click="listRef.getAlerts()">
        <i class="icon-refresh"></i>
      </Btn>
    </pane-header>
    <input
      ref="query"
      type="text"
      placeholder="Search..."
      class="form-control pane-alerts__query pane-overlay"
      v-model="query"
    />
    <alerts-list ref="listRef" :query="query" persist-sections />
  </div>
</template>

<script setup lang="ts">
import PaneHeader from '../panes/PaneHeader.vue'
import Btn from '@/components/framework/Btn.vue'
import AlertsList from '@/components/alerts/AlertsList.vue'
import { ref } from 'vue'

// Define props
defineProps<{
  paneId: string
}>()

// Reactive property for query
const query = ref('')
const listRef = ref<InstanceType<typeof AlertsList>>()
</script>

<style lang="scss" scoped>
.pane-alerts {
  $self: &;

  &__query {
    border: 0;
    width: 100%;
    position: absolute;
    z-index: 1;
    border-radius: 0;
    padding: 0;
    font-size: 1.125em;
  }

  &__header {
    background: 0;
  }
}
</style>
