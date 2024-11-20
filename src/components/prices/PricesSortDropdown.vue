<template>
  <DropdownButton
    :value="sortType"
    :options="['none', 'price', 'volume', 'delta', 'change']"
    @input="selectSortType($event)"
    :class="buttonClass"
  ></DropdownButton>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import store from '@/store'
import DropdownButton from '@/components/framework/DropdownButton.vue'
import { PricesPaneState } from '@/store/panesSettings/prices'

// Define props with types and defaults
const props = withDefaults(
  defineProps<{
    paneId: string
    buttonClass?: string
  }>(),
  {
    buttonClass: '-text -arrow'
  }
)

// Computed property to access sortType from the store
const sortType = computed(
  () => (store.state[props.paneId] as PricesPaneState).sortType
)

/**
 * Method to handle sort type selection.
 * @param {string} option - The selected sort type option.
 */
const selectSortType = (option: string) => {
  if (option === sortType.value) {
    store.commit(`${props.paneId}/TOGGLE_SORT_ASC`)
  }

  store.commit(`${props.paneId}/SET_SORT_TYPE`, option)
}
</script>
