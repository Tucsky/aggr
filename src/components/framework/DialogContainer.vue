<template>
  <teleport to="body">
    <div v-for="dialog in dialogs" :key="dialog.id">
      <component
        :is="dialog.component"
        v-bind="dialog.props"
        @close="dialog.resolve"
      />
    </div>
  </teleport>
</template>

<script setup>
import { dialogService } from '@/services/dialogService'

const dialogs = dialogService.getDialogs()
</script>
