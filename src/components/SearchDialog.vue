<template>
  <Dialog @clickOutside="hide" class="-sticky-footer -auto" bodyClass="d-flex mobile-dir-col-desktop-dir-row">
    <template v-slot:header>
      <div class="title" v-if="paneId">
        {{ paneName }}'s MARKETS
        <div class="subtitle">Choose which markets <u>this pane</u> should listen to</div>
      </div>
      <div class="title" v-else>
        SELECT MARKETS (ALL)
        <div class="subtitle">Choose which markets <u>all</u> panes should listen to</div>
      </div>
      <div class="column -center"></div>
    </template>
    <div class="search">
      <div v-if="otherPanes.length" class="form-group search__copy mb8">
        <label>Choose from other panes</label>
        <button v-for="pane of otherPanes" :key="pane.id" class="btn mb4 mr4 -accent" v-text="pane.name" @click="selectPaneMarkets(pane)"></button>
      </div>
      <div class="form-group">
        <label>All products ({{ flattenedProducts.length }})</label>
        <div class="mb8 d-flex">
          <input ref="input" type="text" class="form-control flex-grow-1" placeholder="search (eg: BITMEX:XBTUSD)" v-model="query" />
          <dropdown
            :options="filters"
            placeholder="Filter"
            title="Filters"
            v-tippy="{ placement: 'top' }"
            @output="toggleFilter($event)"
            :selectionClass="!hasFilters ? '-text' : 'ml8 -green'"
          >
            <template v-slot:selection> filter <i class="ml4" :class="hasFilters ? 'icon-check' : 'icon-plus'"></i> </template>
            <template v-slot:option="{ index, value }">
              <i class="icon-check mr8" v-if="value"></i>

              {{ index }}
            </template>
          </dropdown>
        </div>
        <table v-if="results.length" class="table">
          <tbody>
            <tr v-for="market of results" :key="market" @click="selectMarket(market)" class="-action">
              <td class="icon search__exchange text-center" :class="'icon-' + market.split(':')[0]"></td>
              <td v-text="market"></td>
              <td class=" text-center">
                <i v-if="historicalMarkets.indexOf(market) !== -1" class="icon-candlestick"></i>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="text-danger" v-else>
          <p>No results</p>
        </div>
      </div>
    </div>
    <hr class="-horizontal" />
    <hr class="-vertical mb8" />
    <div class="form-group selection hide-scrollbar">
      <label class="text-nowrap"
        >Selection <code v-if="paneId" class="-filled" v-text="paneName"></code>
        <button class="btn -text -small" @click="clearSelection"><i class="icon-cross -higher"></i></button
      ></label>
      <transition-group
        :name="transitionGroupName"
        @beforeEnter="beforeEnter"
        @enter="enter"
        @afterEnter="afterEnter"
        @beforeLeave="beforeLeave"
        @leave="leave"
        class="selection__items mt8"
        tag="div"
      >
        <div v-for="market of selection" :key="market">
          <button
            class="mb4 btn -small  -accent"
            :class="{ '-green': activeMarkets.indexOf(market) !== -1 }"
            title="Click to remove"
            @click="deselectMarket(market)"
            v-text="market"
          ></button>
        </div>
      </transition-group>
    </div>

    <footer>
      <a href="javascript:void(0);" class="btn -text" @click="hide">Cancel</a>
      <button class="btn -large ml8 -green" @click="submit" v-text="submitLabel"></button>
    </footer>
  </Dialog>
</template>

<script>
import Dialog from '@/components/framework/Dialog.vue'
import DialogMixin from '@/mixins/dialogMixin'
import { getBucketId } from '@/utils/helpers'
import dialogService from '@/services/dialogService'
import aggregatorService from '@/services/aggregatorService'

export default {
  mixins: [DialogMixin],
  components: {
    Dialog
  },
  props: {
    query: {
      default: ''
    },
    paneId: {
      required: false
    }
  },
  data: () => ({
    markets: [],
    selection: [],
    originalSelection: [],
    filters: {
      historical: false
    }
  }),
  computed: {
    transitionGroupName() {
      if (!this.$store.state.settings.disableAnimations) {
        return 'slide-notice'
      } else {
        return null
      }
    },
    otherPanes() {
      return Object.keys(this.$store.state.panes.panes)
        .filter(a => a !== this.paneId)
        .map(a => this.$store.state.panes.panes[a])
    },
    paneName() {
      if (this.paneId) {
        return this.$store.state.panes.panes[this.paneId].name
      } else {
        return null
      }
    },
    activeMarkets() {
      return this.$store.state.app.activeMarkets.map(m => m.exchange + ':' + m.pair)
    },
    paneMarkets() {
      if (!this.paneId) {
        return []
      }

      return this.$store.state.panes.panes[this.paneId].markets
    },
    toConnect() {
      if (this.paneId) {
        return this.selection.filter(a => this.paneMarkets.indexOf(a) === -1).length
      } else {
        return this.selection.filter(a => this.activeMarkets.indexOf(a) === -1).length
      }
    },
    toDisconnect() {
      return this.originalSelection.filter(a => this.selection.indexOf(a) === -1).length
    },
    submitLabel() {
      const toConnect = +this.toConnect
      const toDisconnect = +this.toDisconnect
      let label = ''

      if (toConnect) {
        label += `add ${toConnect}`
      }

      if (toDisconnect) {
        label += `${toConnect ? ' and ' : ''}remove ${toDisconnect}`
      }

      return label ? label + ' markets' : 'OK'
    },
    historicalMarkets() {
      return this.$store.state.app.historicalMarkets
    },
    indexedProducts() {
      return this.$store.state.app.indexedProducts
    },
    flattenedProducts() {
      return Array.prototype.concat(...Object.values(this.indexedProducts))
    },
    queryFilter: function() {
      return new RegExp(this.query.replace(/[ ,]/g, '|'), 'i')
    },
    filteredProducts() {
      return this.flattenedProducts.filter(a => {
        if (this.filters.historical) {
          return this.historicalMarkets.indexOf(a) !== -1
        }

        return true
      })
    },
    results: function() {
      return this.filteredProducts.filter(a => this.selection.indexOf(a) === -1 && this.queryFilter.test(a)).slice(0, 100)
    },
    hasFilters() {
      return this.filters.historical
    }
  },
  watch: {
    '$store.state.app.showSearch': function(value) {
      if (!value) {
        this.close(false)
      }
    }
  },
  created() {
    if (this.paneId) {
      this.selection = this.$store.state.panes.panes[this.paneId].markets.slice()
    } else {
      this.selection = this.activeMarkets.slice()
    }

    this.originalSelection = this.selection.slice()

    this.ensureProducts()
  },
  mounted() {
    this.$nextTick(() => {
      this.$refs.input.focus()
    })
  },
  methods: {
    containMultipleMarketsConfigurations() {
      return (
        Object.keys(this.$store.state.panes.panes)
          .map(id => getBucketId(this.$store.state.panes.panes[id].markets))
          .filter((v, i, a) => a.indexOf(v) === i).length > 1
      )
    },
    selectPaneMarkets(pane) {
      this.selection.splice(0, this.selection.length)

      for (let i = 0; i < pane.markets.length; i++) {
        this.selection.push(pane.markets[i])
      }
    },
    selectMarket(market) {
      this.selection.push(market)
    },
    deselectMarket(market) {
      const index = this.selection.indexOf(market)

      if (index !== -1) {
        this.selection.splice(index, 1)
      }
    },
    async submit() {
      if (!this.paneId) {
        if (
          this.containMultipleMarketsConfigurations() &&
          !(await dialogService.confirm('Are you sure ? Some of the panes are watching specific markets.'))
        ) {
          return
        }

        if (!Object.keys(this.$store.state.panes.panes).length) {
          await this.$store.dispatch('panes/addPane', { type: 'trades' })
        }

        this.$store.dispatch('panes/setMarketsForAll', this.selection)
      } else {
        this.$store.dispatch('panes/setMarketsForPane', {
          id: this.paneId,
          markets: this.selection
        })
      }

      this.hide()
    },
    hide() {
      this.$store.dispatch('app/hideSearch')
    },
    toggleFilter(key) {
      this.$set(this.filters, key, !this.filters[key])
    },

    beforeEnter(element) {
      element.style.height = '0px'
    },

    enter(element) {
      const wrapper = element.children[0]

      const height = wrapper.offsetHeight + 'px'

      element.dataset.height = height

      setTimeout(() => {
        element.style.height = height
      }, 100)
    },

    afterEnter(element) {
      element.style.height = ''
    },

    beforeLeave(element) {
      if (typeof element.dataset.height === 'undefined') {
        const wrapper = element.children[0]

        element.dataset.height = wrapper.offsetHeight + 'px'
      }

      element.style.height = element.dataset.height
    },

    leave(element) {
      setTimeout(() => {
        element.style.height = '0px'
      })
    },

    async ensureProducts() {
      for (const exchange of this.$store.getters['exchanges/getExchanges']) {
        if (!this.$store.state.exchanges[exchange].fetched) {
          await aggregatorService.dispatch({
            op: 'fetch-products',
            data: this.id
          })

          aggregatorService.dispatch({
            op: 'products',
            data: {
              exchange: exchange,
              data: null
            }
          })
        }
      }
    },

    clearSelection() {
      this.selection.splice(0, this.selection.length)
    }
  }
}
</script>
<style lang="scss" scoped>
.selection {
  position: sticky;
  top: 0;
  place-self: flex-start;
  padding-bottom: 90px;

  @media screen and (min-width: 768px) {
    text-align: right;
  }

  &__items {
    display: flex;
    flex-direction: column;
    place-items: flex-end;

    .btn {
      text-transform: none;

      i {
        display: none;
      }

      &.-added {
        &:after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          opacity: 0;
          background-color: white;
          animation: 1s $ease-out-expo highlight;
          pointer-events: none;
        }
      }
    }
  }
}
.search {
  flex-grow: 1;

  table {
    border: 0;
    border-collapse: collapse;
    width: 100%;
  }

  td {
    padding: 0.25rem 0.33rem;
  }

  &__exchange {
    background-position: right;
  }
}
@media screen and (max-width: 767px) {
  .selection {
    order: 0;
    flex-direction: row;
    flex-wrap: wrap;
    max-height: 140px;
    overflow: auto;
    top: -1rem;
    flex-shrink: 0;
    padding: 1rem 0;
    background-color: var(--theme-background-100);
    box-shadow: 0 1px var(--theme-background-150);
    margin-top: -1rem;
    width: 100%;
    margin-bottom: 1rem;

    &__items {
      flex-direction: row;
      flex-wrap: wrap;
      place-items: auto;
      justify-content: flex-start;

      .btn {
        margin-right: 4px;
        margin-bottom: 4px;
      }
    }
  }
  hr.-horizontal {
    display: none;
  }
  .search {
    order: 2;

    &__copy {
      display: none;
    }
  }
  footer {
    order: 3;
  }
}
</style>
