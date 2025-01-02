<template>
  <div class="prices-settings">
    <ToggableSection
      title="Customization"
      id="watchlist-settings-columns"
      inset
    >
      <toggable-group
        class="mb8 mt16"
        :modelValue="showPairs"
        label="Show Symbols"
        @change="store.commit(paneId + '/TOGGLE_PAIRS')"
        small
      >
        <div class="form-group">
          <label class="checkbox-control -small">
            <input
              type="checkbox"
              class="form-control"
              :checked="shortSymbols"
              @change="store.commit(paneId + '/TOGGLE_SHORT_SYMBOLS')"
            />
            <div></div>
            <span>
              Ticker only
              <i class="icon-info" v-tippy title="BTCUSDT → BTC"></i>
            </span>
          </label>
        </div>
      </toggable-group>

      <div class="form-group mb8">
        <label class="checkbox-control -small">
          <input
            type="checkbox"
            class="form-control"
            :checked="showVolume"
            @change="store.commit(paneId + '/TOGGLE_VOLUME')"
          />
          <div></div>
          <span>Show volume</span>
        </label>
      </div>

      <div class="form-group mb8">
        <label class="checkbox-control -small">
          <input
            type="checkbox"
            class="form-control"
            :checked="showVolumeDelta"
            @change="store.commit(paneId + '/TOGGLE_VOLUME_DELTA')"
          />
          <div></div>
          <span>Show volume Δ</span>
        </label>
      </div>

      <div class="form-group mb8">
        <label class="checkbox-control -small">
          <input
            type="checkbox"
            class="form-control"
            :checked="showPrice"
            @change="store.commit(paneId + '/TOGGLE_PRICE')"
          />
          <div></div>
          <span>Show price</span>
        </label>
      </div>

      <div class="form-group mb8">
        <label class="checkbox-control -small">
          <input
            type="checkbox"
            class="form-control"
            :checked="showChange"
            @change="store.commit(paneId + '/TOGGLE_CHANGE')"
          />
          <div></div>
          <span>Show price change</span>
        </label>
      </div>
    </ToggableSection>

    <ToggableSection id="watchlist-settings-extra" inset>
      <template #title>
        <div class="toggable-section__title">
          Filter
          <span v-if="volumeThreshold" class="badge -red ml8">{{
            formatAmountHelper(volumeThreshold)
          }}</span>
        </div>
      </template>
      <div class="form-group mb8 mt16">
        <label>Volume filter</label>
        <editable
          placeholder="Enter amount"
          class="form-control pl16 w-100"
          :modelValue="formatAmountHelper(volumeThreshold)"
          @update:modelValue="
            store.commit(paneId + '/SET_VOLUME_THRESHOLD', $event)
          "
        />
      </div>
      <div class="form-group mb8">
        <label>Sort by</label>
        <div class="column">
          <prices-sort-dropdown
            :pane-id="paneId"
            class="-outline form-control -arrow flex-grow-1"
          />
          <label
            class="checkbox-control -sort ml8"
            v-if="sortType"
            :title="sortOrder === 1 ? 'ASC' : 'DESC'"
          >
            <input
              type="checkbox"
              class="form-control"
              :checked="sortOrder === 1"
              @change="store.commit(paneId + '/TOGGLE_SORT_ORDER')"
            />
            <div v-tippy title="Switch order"></div>
          </label>
        </div>
      </div>
      <div class="form-group mb8">
        <label class="checkbox-control -small">
          <input
            type="checkbox"
            class="form-control"
            :checked="animateSort"
            @change="store.commit(paneId + '/TOGGLE_SORT_ANIMATION')"
          />
          <div></div>
          <span>Sort animation</span>
        </label>
      </div>
    </ToggableSection>

    <ToggableSection id="watchlist-settings-period" inset>
      <template #title>
        <div class="toggable-section__title">
          Period
          <span v-if="period" class="badge -red ml8">
            {{ periods[period] }}
          </span>
          <span v-if="avgPeriods" class="badge -red ml8">AVERAGED</span>
        </div>
      </template>
      <div class="form-group mb8 mt16">
        <label>
          Period
          <span
            class="icon-info"
            title="Automatically clear the data at predetermined intervals"
            v-tippy
          ></span>
        </label>
        <dropdown-button
          :modelValue="period"
          :options="periods"
          class="-outline form-control -arrow w-100 -cases"
          placeholder="No period"
          @update:modelValue="store.commit(paneId + '/SET_PERIOD', $event)"
        ></dropdown-button>
      </div>
      <div class="form-group mb8">
        <label class="checkbox-control -small">
          <input
            type="checkbox"
            class="form-control"
            :checked="avgPeriods"
            @change="store.commit(paneId + '/TOGGLE_AVG_PERIODS')"
          />
          <div></div>
          <span>
            Avg. periods
            <i
              class="icon-info"
              v-tippy
              title="Average the previous period data into the new"
            ></i>
          </span>
        </label>
      </div>
    </ToggableSection>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import PricesSortDropdown from '@/components/prices/PricesSortDropdown.vue'
import ToggableSection from '@/components/framework/ToggableSection.vue'
import ToggableGroup from '@/components/framework/ToggableGroup.vue'
import DropdownButton from '@/components/framework/DropdownButton.vue'
import { formatAmount } from '@/services/productsService'
import store from '@/store'

// Define props
const props = defineProps({
  paneId: {
    type: String,
    required: true
  }
})

// Helper functions
const formatAmountHelper = formatAmount

// Data
const periods = {
  0: 'No period',
  1: '1m',
  5: '5m',
  15: '15m',
  30: '30m',
  60: '1h',
  240: '4h'
}

// Computed properties
const showPairs = computed(() => store.state[props.paneId].showPairs)
const showVolume = computed(() => store.state[props.paneId].showVolume)
const showPrice = computed(() => store.state[props.paneId].showPrice)
const showVolumeDelta = computed(
  () => store.state[props.paneId].showVolumeDelta
)
const period = computed(() => store.state[props.paneId].period)
const showChange = computed(() => store.state[props.paneId].showChange)
const animateSort = computed(() => store.state[props.paneId].animateSort)
const sortType = computed(() => store.state[props.paneId].sortType)
const sortOrder = computed(() => store.state[props.paneId].sortOrder)
const shortSymbols = computed(() => store.state[props.paneId].shortSymbols)
const volumeThreshold = computed(
  () => store.state[props.paneId].volumeThreshold
)
const avgPeriods = computed(() => store.state[props.paneId].avgPeriods)
</script>
