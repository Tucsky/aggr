<template>
  <dropdown
    :value="modelValue"
    @input="onInput"
    @after-closed="emit('after-closed')"
    interactive
    on-sides
  >
    <div class="dropdown-divider" :data-label="indicatorName"></div>
    <div class="px8 d-flex -column -gap8">
      <div class="form-group w-100">
        <label>
          Scale
          <i
            class="icon-info"
            v-tippy
            title="Determine the scale to align this indicator with"
          />
        </label>
        <PriceScaleButton
          :indicator-id="indicatorId"
          :pane-id="paneId"
          class="w-100"
        />
      </div>
      <div class="d-flex -gap8">
        <div class="form-group">
          <label>
            Format
            <i
              class="icon-info"
              v-tippy
              title="Determine the type of scale to use"
            />
          </label>
          <dropdown-button
            :value="type"
            :options="['price', 'volume', 'percent']"
            class="mr8 -outline form-control -arrow"
            @input="setPriceFormat($event, precision)"
            v-tippy
            title="Volume uses abbreviation for Million and Thousand"
          ></dropdown-button>
        </div>
        <div class="form-group">
          <label>
            Precision
            <i
              class="icon-info"
              v-tippy
              title="Determine the number of digits after the decimal point"
            />
          </label>
          <div class="d-flex -gap8">
            <editable
              ref="editableRef"
              class="form-control w-100"
              :value="precision"
              :editable="!isAuto"
              placeholder="auto"
              @input="setPriceFormat(type, $event)"
            ></editable>
            <Checkbox
              small
              :value="isAuto"
              title="Auto"
              v-tippy
              @input="toggleAuto"
            ></Checkbox>
          </div>
        </div>
      </div>
    </div>
  </dropdown>
</template>
<script setup lang="ts">
import { computed, defineProps, nextTick, ref } from 'vue'
import DropdownButton from '@/components/framework/DropdownButton.vue'
import PriceScaleButton from '@/components/indicators/PriceScaleButton.vue'
import { ChartPaneState, IndicatorSettings } from '@/store/panesSettings/chart'
import store from '@/store'
import Checkbox from '../framework/Checkbox.vue'
import Editable from '../framework/Editable.vue'
import aggregatorService from '@/services/aggregatorService'

// Define props
const props = defineProps<{
  modelValue: HTMLButtonElement | null
  paneId: string
  indicatorId: string | null
}>()

const editableRef = ref<InstanceType<typeof Editable> | null>(null)

const emit = defineEmits(['update:modelValue', 'after-closed'])

function onInput(event) {
  emit('update:modelValue', event.target.value)
}
// Computed properties
const indicator = computed(() => {
  return store.state[props.paneId].indicators[
    props.indicatorId
  ] as IndicatorSettings
})

const indicatorName = computed(() => {
  return `${indicator.value.name}'s format`
})

const priceFormat = computed(() => ({
  type: 'price',
  precision: null,
  auto: null,
  ...(store.state[props.paneId] as ChartPaneState).priceScales[
    indicator.value.options.priceScaleId
  ]?.priceFormat,
  ...indicator.value.options.priceFormat
}))

const isAuto = computed(() => priceFormat.value.auto || false)

const precision = computed(() => {
  if (isAuto.value) {
    return 'auto'
  }
  return typeof priceFormat.value.precision === 'number'
    ? priceFormat.value.precision
    : 2
})

const type = computed(() => {
  return (priceFormat.value && priceFormat.value.type) || 'price'
})

const toggleAuto = async () => {
  const value = isAuto.value ? 2 : 'auto'

  setPriceFormat(type.value, value)

  await nextTick()

  if (value !== 'auto') {
    editableRef.value.focus()
  } else {
    aggregatorService.emit('decimals')
  }
}

// Method to set the price format
function setPriceFormat(typeInput: string, precisionInput: string | number) {
  let auto = false
  let precision = Math.round(Number(precisionInput))

  if (precisionInput === '' || isNaN(precision)) {
    auto = true
    precision = 2
  }

  const priceFormat = {
    type: typeInput,
    precision: precision,
    minMove: 1 / Math.pow(10, precision),
    auto
  }

  // Dispatch to update the indicator option
  store.dispatch(props.paneId + '/setIndicatorOption', {
    id: props.indicatorId,
    key: 'priceFormat',
    value: priceFormat
  })

  // Commit to persist preference at the priceScale level
  store.commit(props.paneId + '/SET_PRICE_SCALE', {
    id: indicator.value.options.priceScaleId,
    priceScale: {
      ...store.state[props.paneId].priceScales[
        indicator.value.options.priceScaleId
      ],
      priceFormat
    }
  })
}
</script>
