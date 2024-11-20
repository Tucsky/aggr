<template>
  <div class="tabs">
    <slot />
  </div>
</template>
<script setup lang="ts">
import {
  ref,
  watch,
  onMounted,
  onBeforeUnmount,
  defineProps,
  defineEmits,
  getCurrentInstance
} from 'vue'
import Tab from './Tab.vue'

// Define props and emits
const props = defineProps({
  value: {
    default: null
  }
})
const emit = defineEmits(['input'])

// Reactive internal value
const _value = ref<string | null>(null)

// Access instance to handle slot components
const instance = getCurrentInstance()

// Methods for binding/unbinding tabs
const bindTabs = () => {
  instance?.proxy?.$slots.default?.forEach(tab => {
    const tabInstance = tab.componentInstance as unknown as InstanceType<
      typeof Tab
    >
    tabInstance.$on('select', selectTab)

    if (props.value === tabInstance.name) {
      selectTab(props.value)
    }
  })
}

const unbindTabs = () => {
  instance?.proxy?.$slots.default?.forEach(tab => {
    const tabInstance = tab.componentInstance as unknown as InstanceType<
      typeof Tab
    >
    tabInstance.$off('select', selectTab)
  })
}

// Method to retrieve a tab instance by name
const getTabInstance = (name: string) => {
  return instance?.proxy?.$slots.default?.find(
    tab => (tab.componentInstance as any).name === name
  ).componentInstance as unknown as InstanceType<typeof Tab>
}

// Method to select a tab
const selectTab = (name: string) => {
  if (!_value.value || props.value !== name) {
    if (_value.value) {
      getTabInstance(_value.value)?.deselect()
    }

    _value.value = name
    getTabInstance(name)?.select()
    emit('input', _value.value)
  }
}

// Watch for changes in `value` prop to handle selection updates
watch(
  () => props.value,
  newValue => {
    if (newValue !== _value.value) {
      selectTab(newValue)
    }
  }
)

// Lifecycle hooks to bind and unbind tabs
onMounted(() => {
  bindTabs()
})

onBeforeUnmount(() => {
  unbindTabs()
})
</script>

<style lang="scss" scoped>
.tabs {
  padding: 0 1rem;
  flex-shrink: 0;
  display: flex;
  align-items: stretch;
  list-style: none;
  margin: 0;
  height: 2.5rem;
  box-shadow: inset 0 -1px 0 var(--theme-background-200);
}
</style>
