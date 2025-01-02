<template>
  <div class="indicator-option">
    <component
      v-if="type"
      :is="componentName"
      :pane-id="paneId"
      :indicator-id="indicatorId"
      :label="label"
      :modelValue="value"
      :definition="definition"
      @update:modelValue="setValue($event)"
    >
      <template v-if="definition.description" #description>
        <i
          class="icon-info pl4"
          v-tippy="{ followCursor: true, distance: 24 }"
          :title="definition.description"
        ></i>
      </template>
    </component>
  </div>
</template>
<script lang="ts" setup>
/* eslint-disable @typescript-eslint/no-unused-vars */

import { ref, computed, watch, onMounted, defineAsyncComponent } from 'vue'
import store from '@/store' // Rule #11
import {
  getIndicatorOptionType,
  getDefaultIndicatorOptionValue
} from './options'
import { ALLOWED_OPTION_TYPES } from './buildUtils'

// Props
const props = defineProps({
  indicatorId: {
    type: String,
    required: true
  },
  paneId: {
    type: String,
    required: true
  },
  plotTypes: {
    type: Array as () => string[],
    required: true
  },
  name: {
    type: String,
    required: true
  },
  ensure: {
    type: Boolean,
    default: false
  }
})

// Refs (data)
const type = ref<string | null>(null)
const value = ref<any>(null)

// Computed properties
const currentIndicatorValue = computed(
  () =>
    store.state[props.paneId].indicators[props.indicatorId].options[props.name]
)

const definition = computed(
  () =>
    store.state[props.paneId].indicators[props.indicatorId].optionsDefinitions[
      props.name
    ] || {}
)

const label = computed(() => definition.value.label || props.name)

const componentName = computed(() => {
  if (!type.value) return 'IndicatorOptionText'
  if (props.name === 'lineType') return 'IndicatorOptionLineType'
  if (props.name === 'lineStyle') return 'IndicatorOptionLineStyle'
  return `IndicatorOption${type.value[0].toUpperCase()}${type.value
    .toLowerCase()
    .slice(1)}`
})

// Async components
const IndicatorOptionNumber = defineAsyncComponent(
  () => import('@/components/chart/options/IndicatorOptionNumber.vue')
)
const IndicatorOptionText = defineAsyncComponent(
  () => import('@/components/chart/options/IndicatorOptionText.vue')
)
const IndicatorOptionList = defineAsyncComponent(
  () => import('@/components/chart/options/IndicatorOptionList.vue')
)
const IndicatorOptionLineStyle = defineAsyncComponent(
  () => import('@/components/chart/options/IndicatorOptionLineStyle.vue')
)
const IndicatorOptionLineType = defineAsyncComponent(
  () => import('@/components/chart/options/IndicatorOptionLineType.vue')
)
const IndicatorOptionExchange = defineAsyncComponent(
  () => import('@/components/chart/options/IndicatorOptionExchange.vue')
)
const IndicatorOptionRange = defineAsyncComponent(
  () => import('@/components/chart/options/IndicatorOptionRange.vue')
)
const IndicatorOptionCheckbox = defineAsyncComponent(
  () => import('@/components/chart/options/IndicatorOptionCheckbox.vue')
)
const IndicatorOptionColor = defineAsyncComponent(
  () => import('@/components/chart/options/IndicatorOptionColor.vue')
)

// Methods
const getType = () => {
  const inferredType =
    definition.value.type ||
    getIndicatorOptionType(
      props.name,
      props.plotTypes,
      true,
      currentIndicatorValue.value
    )

  if (!Object.values(ALLOWED_OPTION_TYPES).includes(inferredType)) {
    return 'number'
  }
  return inferredType
}

const getValue = () => {
  let preferredValue

  if (typeof currentIndicatorValue.value !== 'undefined') {
    preferredValue = currentIndicatorValue.value
  }

  if (
    typeof preferredValue === 'undefined' &&
    typeof definition.value.default !== 'undefined'
  ) {
    return definition.value.default
  }

  const defaultValue = getDefaultIndicatorOptionValue(
    props.name,
    props.plotTypes
  )

  if (typeof preferredValue !== 'undefined') {
    if (
      preferredValue &&
      typeof preferredValue === 'object' &&
      defaultValue &&
      typeof defaultValue === 'object'
    ) {
      return Object.assign({}, defaultValue, preferredValue)
    } else {
      return preferredValue
    }
  } else if (typeof defaultValue !== 'undefined') {
    return defaultValue
  }

  return null
}

const setValue = (newValue: any) => {
  setIndicatorOption(props.name, newValue)
  value.value = newValue
  type.value = getType()
}

const setIndicatorOption = (key: string, newValue: any) => {
  store.dispatch(`${props.paneId}/setIndicatorOption`, {
    id: props.indicatorId,
    key,
    value: newValue
  })
}

// Watchers
watch(definition, () => {
  type.value = getType()
})

watch(currentIndicatorValue, () => {
  const newValue = getValue()
  if (
    +value.value !== +newValue ||
    (isNaN(+value.value) && newValue !== value.value)
  ) {
    value.value = newValue
  }
})

// Lifecycle hooks
onMounted(() => {
  value.value = getValue()
  type.value = getType()

  if (
    props.ensure &&
    typeof currentIndicatorValue.value === 'undefined' &&
    value.value !== 'null'
  ) {
    setValue(value.value)
  }
})
</script>

<style lang="scss">
.indicator-option {
  width: 100%;
  max-width: 200px;

  .form-control {
    width: 100%;
  }
}
</style>
