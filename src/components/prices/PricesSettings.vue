<template>
  <div>
    <section class="section">
      <div v-if="sections.indexOf('display') > -1">
        <div class="form-group mb8">
          <label class="checkbox-control">
            <input
              type="checkbox"
              class="form-control"
              :checked="showExchange"
              @change="$store.commit(paneId + '/TOGGLE_EXCHANGE')"
            />
            <div></div>
            <span>Logos</span>
          </label>
        </div>

        <div class="form-group mb8">
          <label
            class="checkbox-control"
            v-tippy="{ placement: 'left' }"
            title="ex: BTC-USD"
          >
            <input
              type="checkbox"
              class="form-control"
              :checked="showPairs"
              @change="$store.commit(paneId + '/TOGGLE_PAIRS')"
            />
            <div></div>
            <span>Symbols</span>
          </label>
        </div>

        <div class="form-group mb8">
          <label class="checkbox-control">
            <input
              type="checkbox"
              class="form-control"
              :checked="showVolume"
              @change="$store.commit(paneId + '/TOGGLE_VOLUME')"
            />
            <div></div>
            <span>Volume</span>
          </label>
        </div>

        <div class="form-group mb8">
          <label class="checkbox-control">
            <input
              type="checkbox"
              class="form-control"
              :checked="showVolumeDelta"
              @change="$store.commit(paneId + '/TOGGLE_VOLUME_DELTA')"
            />
            <div></div>
            <span>Volume Δ</span>
          </label>
        </div>

        <div class="form-group mb8">
          <label class="checkbox-control">
            <input
              type="checkbox"
              class="form-control"
              :checked="showPrice"
              @change="$store.commit(paneId + '/TOGGLE_PRICE')"
            />
            <div></div>
            <span>Price</span>
          </label>
        </div>

        <div class="form-group mb8">
          <label class="checkbox-control">
            <input
              type="checkbox"
              class="form-control"
              :checked="showChange"
              @change="$store.commit(paneId + '/TOGGLE_CHANGE')"
            />
            <div></div>
            <span>Change %</span>
          </label>
        </div>

        <div class="form-group mb8">
          <label class="checkbox-control">
            <input
              type="checkbox"
              class="form-control"
              :checked="animateSort"
              @change="$store.commit(paneId + '/TOGGLE_SORT_ANIMATION')"
            />
            <div></div>
            <span>Animation</span>
          </label>
        </div>

        <div class="form-group mb8">
          <label class="checkbox-control">
            <input
              type="checkbox"
              class="form-control"
              :checked="animateSort"
              @change="$store.commit(paneId + '/TOGGLE_SORT_ANIMATION')"
            />
            <div></div>
            <span>Animation</span>
          </label>
        </div>
      </div>
      <div class="section__title" @click="toggleSection('display')">
        Columns <i class="icon-up-thin"></i>
      </div>
    </section>

    <div class="form-group mb16 mt16">
      <label
        >Period
        <span
          class="icon-info"
          title="Reset stats after certain time"
          v-tippy
        ></span
      ></label>
      <dropdown-button
        v-model="period"
        :options="{
          0: 'No period',
          1: '1m',
          15: '15m',
          30: '30m',
          60: '1h',
          240: '4h'
        }"
        class="-outline form-control -arrow w-100"
        placeholder="Period"
        @input="$store.commit(paneId + '/SET_PERIOD', $event)"
      ></dropdown-button>
    </div>

    <div class="form-group mb16">
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
            @change="$store.commit(paneId + '/TOGGLE_SORT_ORDER')"
          />
          <div v-tippy title="Switch order"></div>
        </label>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import PricesSortDropdown from '@/components/prices/PricesSortDropdown.vue'
import DropdownButton from '@/components/framework/DropdownButton.vue'

@Component({
  components: {
    PricesSortDropdown,
    DropdownButton
  },
  name: 'PricesSettings',
  props: {
    paneId: {
      type: String,
      required: true
    }
  }
})
export default class extends Vue {
  paneId: string
  sections = []

  get showExchange() {
    return this.$store.state[this.paneId].showExchange
  }

  get showPairs() {
    return this.$store.state[this.paneId].showPairs
  }

  get showVolume() {
    return this.$store.state[this.paneId].showVolume
  }

  get showPrice() {
    return this.$store.state[this.paneId].showPrice
  }

  get showVolumeDelta() {
    return this.$store.state[this.paneId].showVolumeDelta
  }

  get period() {
    return this.$store.state[this.paneId].period
  }

  get showChange() {
    return this.$store.state[this.paneId].showChange
  }

  get animateSort() {
    return this.$store.state[this.paneId].animateSort
  }

  get sortType() {
    return this.$store.state[this.paneId].sortType
  }

  get sortOrder() {
    return this.$store.state[this.paneId].sortOrder
  }

  get volumeFilter() {
    return this.$store.state[this.paneId].volumeFilter
  }

  selectSortType(option) {
    if (option === this.sortType) {
      this.$store.commit(this.paneId + '/TOGGLE_SORT_ORDER')
    }

    this.$store.commit(this.paneId + '/SET_SORT_TYPE', option)
  }

  toggleSection(id) {
    const index = this.sections.indexOf(id)

    if (index === -1) {
      this.sections.push(id)
    } else {
      this.sections.splice(index, 1)
    }
  }
}
</script>
