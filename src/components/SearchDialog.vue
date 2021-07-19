<template>
  <Dialog @clickOutside="hide" class="-sticky-footer -auto" bodyClass="d-flex mobile-dir-col-desktop-dir-row">
    <template v-slot:header>
      <div v-if="paneId">
        <div class="title">{{ paneName }}'s MARKETS</div>
        <div class="subtitle">Choose which markets <u>this pane</u> should listen to</div>
      </div>
      <div v-else>
        <div class="title">
          SELECT MARKETS (ALL)
        </div>
        <div class="subtitle">Choose which markets <u>all</u> panes should listen to</div>
      </div>
      <div class="column -center"></div>
    </template>
    <div class="search">
      <div class="form-group">
        <div class="mb0 d-flex">
          <div class="input-group flex-grow-1">
            <input ref="input" type="text" class="form-control" placeholder="eg: BITMEX:XBTUSD" v-model="query" />
            <!--<button v-if="canFeelLucky" class="btn -text" title="I'm feeling lucky 🍀" v-tippy @click="imFeelingLucky">
              <i class="icon-magic"></i>
            </button>-->
          </div>
          <dropdown
            :options="searchFilters"
            placeholder="Filter"
            @output="toggleFilter($event)"
            :auto-close="false"
            :selection-class="!hasFilters ? '-text' : 'ml8 -green'"
          >
            <template v-slot:selection> filter <i class="ml4" :class="hasFilters ? 'icon-check' : 'icon-plus'"></i> </template>
            <template v-slot:option="{ index, value }">
              <i class="icon-check mr8" v-if="value"></i>

              {{ index }}
            </template>
          </dropdown>
          <dropdown
            :options="otherPanes"
            placeholder="Filter"
            title="Filters"
            v-tippy="{ placement: 'top' }"
            @output="selectPaneMarkets($event)"
            selectionClass="-text"
          >
            <template v-slot:selection> panes <i class="icon-pile ml4"></i></template>
            <template v-slot:option="{ value }">
              {{ value.name || value.id }}
            </template>
          </dropdown>
        </div>
      </div>
      <div class="search__results hide-scrollbar">
        <table v-if="results.length" class="table">
          <thead>
            <tr>
              <th></th>
              <th>exchange</th>
              <th>pair</th>
              <th>type</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(market, index) of results"
              :key="market.id"
              @click="selectMarket(market.id)"
              :class="{ active: activeIndex === index }"
              class="-action"
            >
              <td class="icon search__exchange text-center" :class="'icon-' + market.exchange"></td>
              <td v-text="market.exchange"></td>
              <td v-text="market.pair"></td>
              <td v-text="market.type"></td>
              <td class="text-center">
                <i v-if="historicalMarkets.indexOf(market.id) !== -1" class="icon-candlestick icon-lower"></i>
              </td>
            </tr>
            <tr v-if="results.length > 0 && results.length <= 25" class="-action" @click="addAll">
              <td colspan="100%">add all ({{ results.length }}) ☝</td>
            </tr>
          </tbody>
        </table>
        <div class="text-danger search__no-result" v-else>
          <p class="mt0 mb0 px16 pb0">
            No results
            <template v-if="hasFilters"> (<button class="btn -text color-100 pl0 pr0" @click="clearFilters">delete filters</button>)</template>
          </p>
          <div v-if="searchFilters.historical" class="color-100 px16 pt0">
            <p class="color-100 mb0">In need for more historical data ?</p>
            <p class="mt0 color-100">
              <a class="btn -text" href="https://github.com/Tucsky/aggr-server" target="_blank">Run your own aggr</a>
              <dono-dropdown label="support the project" class="-left " />
              <a class="btn -text" href="https://github.com/Tucsky/aggr/discussions" target="_blank"
                >Suggest it on github <i class="icon-github"></i
              ></a>
            </p>
          </div>
        </div>
      </div>
    </div>
    <hr class="-horizontal" />
    <hr class="-vertical mb8 ml0 mr0 pl0 pr0" />
    <div class="form-group selection hide-scrollbar">
      <label class="text-nowrap mt16 mr16 mb0 ml16" for="ok"
        >Selection <code v-if="paneId" class="-filled" v-text="paneName"></code>
        <button class="btn -text" @click="clearSelection"><i class="icon-cross"></i></button
        ><button class="btn -text" @click="copySelection"><i class="icon-stamp"></i></button
      ></label>
      <transition-group
        :name="transitionGroupName"
        @beforeEnter="beforeEnter"
        @enter="enter"
        @afterEnter="afterEnter"
        @beforeLeave="beforeLeave"
        @leave="leave"
        class="selection__items"
        tag="div"
      >
        <div v-for="market of selection" :key="market">
          <button
            class="mb4 btn -small  -accent mr4"
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
import DonoDropdown from '@/components/settings/DonoDropdown.vue'
import DialogMixin from '@/mixins/dialogMixin'
import { copyTextToClipboard, getBucketId } from '@/utils/helpers'
import dialogService from '@/services/dialogService'
import aggregatorService from '@/services/aggregatorService'

export default {
  mixins: [DialogMixin],
  components: {
    Dialog,
    DonoDropdown
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
    activeIndex: null
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
        return this.$store.state.panes.panes[this.paneId].name || this.paneId
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
    canFeelLucky() {
      return this.query.replace(/\W/g, '').length > 4
    },
    searchFilters() {
      return this.$store.state.app.searchFilters
    },
    hasFilters() {
      const hasHistorical = this.searchFilters.historical
      const hasSpot = this.searchFilters.spots
      const hasPerpetuals = this.searchFilters.perpetuals
      const hasFutures = this.searchFilters.futures
      return hasHistorical || hasSpot || hasPerpetuals || hasFutures
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
      const multiQuery = this.query.replace(/[ ,]/g, '|')

      if (this.searchFilters.normalize) {
        return new RegExp('^' + multiQuery, 'i')
      } else {
        return new RegExp(multiQuery, 'i')
      }
    },
    filteredProducts() {
      const hasHistorical = this.searchFilters.historical
      const hasSpot = this.searchFilters.spots
      const hasPerpetuals = this.searchFilters.perpetuals
      const hasFutures = this.searchFilters.futures
      const hasTypeFilters = hasSpot || hasPerpetuals || hasFutures

      return this.flattenedProducts.filter(a => {
        if (hasHistorical && this.historicalMarkets.indexOf(a.id) === -1) {
          return false
        }

        if (hasTypeFilters) {
          if ((hasFutures && a.type === 'future') || (hasPerpetuals && a.type === 'perp') || (hasSpot && a.type === 'spot')) {
            return true
          }

          return false
        }

        return true
      })
    },
    results: function() {
      const isNormalized = this.searchFilters.normalize

      return this.filteredProducts
        .filter(a => this.selection.indexOf(a.id) === -1 && (isNormalized ? this.queryFilter.test(a.local) : this.queryFilter.test(a.id)))
        .slice(0, 50)
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

    document.addEventListener('paste', this.onPaste)
    document.addEventListener('keydown', this.onKeydown)
  },
  beforeDestroy() {
    document.removeEventListener('paste', this.onPaste)
    document.removeEventListener('keydown', this.onKeydown)
  },
  methods: {
    containMultipleMarketsConfigurations() {
      return (
        Object.keys(this.$store.state.panes.panes)
          .map(id => getBucketId(this.$store.state.panes.panes[id].markets))
          .filter((v, i, a) => a.indexOf(v) === i).length > 1
      )
    },
    selectPaneMarkets(paneId) {
      const pane = this.otherPanes[paneId]

      for (let i = 0; i < pane.markets.length; i++) {
        if (this.selection.indexOf(pane.markets[i]) !== -1) {
          continue
        }

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
      this.$store.commit('app/TOGGLE_SEARCH_FILTER', key)
    },

    beforeEnter(element) {
      element.style.height = '0px'
      element.style.width = '0px'
    },

    enter(element) {
      const wrapper = element.children[0]

      const height = wrapper.offsetHeight + 'px'
      const width = wrapper.offsetWidth + 'px'

      element.dataset.height = height
      element.dataset.width = width

      setTimeout(() => {
        element.style.height = height
        element.style.width = width
      }, 100)
    },

    afterEnter(element) {
      element.style.height = ''
      element.style.width = ''
    },

    beforeLeave(element) {
      if (typeof element.dataset.height === 'undefined') {
        const wrapper = element.children[0]

        element.dataset.height = wrapper.offsetHeight + 'px'
      }
      element.style.height = element.dataset.height

      if (typeof element.dataset.width === 'undefined') {
        const wrapper = element.children[0]

        element.dataset.width = wrapper.offsetWidth + 'px'
      }

      element.style.width = element.dataset.width
    },

    leave(element) {
      setTimeout(() => {
        element.style.height = '0px'
        element.style.width = '0px'
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
    },

    copySelection() {
      copyTextToClipboard(this.selection.join(','))

      this.$store.dispatch('app/showNotice', {
        id: 'products-clipboard',
        title: `Copied ${this.selection.length} product(s) to clipboard`
      })
    },

    clearFilters() {
      this.$store.commit('app/CLEAR_SEARCH_FILTERS')
    },

    onPaste(event) {
      if (document.activeElement) {
        if (document.activeElement.tagName === 'INPUT') {
          return
        }
      }

      const raw = event.clipboardData.getData('text/plain')
      const markets = raw.split(',').filter(a => /^.{3,}:.{4,32}$/.test(a))

      if (!markets.length) {
        return
      }

      this.selection = markets
    },

    onKeydown(event) {
      switch (event.key) {
        case 'Enter':
          event.preventDefault()
          if (this.results[this.activeIndex]) {
            this.selectMarket(this.results[this.activeIndex].id)
          }
          break

        case 'ArrowDown':
        case 'ArrowUp':
          if (this.results.length) {
            if (event.key === 'ArrowUp') {
              this.activeIndex = Math.max(0, this.activeIndex - 1)
            } else {
              if (this.activeIndex === null) {
                this.activeIndex = 0
              } else {
                this.activeIndex = Math.min(this.results.length - 1, this.activeIndex + 1)
              }
            }
          }
          break
      }
    },

    addAll() {
      for (let i = 0; i < this.results.length; i++) {
        if (this.selection.indexOf(this.results[i].id) !== -1) {
          continue
        }

        this.selection.push(this.results[i].id)

        i--
      }
    }
  }
}
</script>
<style lang="scss" scoped>
.selection {
  place-self: stretch;
  padding-bottom: 90px;
  width: 240px;
  max-width: 240px;
  overflow: auto;
  max-height: 59vh;
  padding: 0;

  .slide-notice-enter-active {
    transition: all 0.2s $ease-elastic, height 0.2s $ease-out-expo;
  }
  .slide-notice-leave-active {
    transition: all 0.2s $ease-out-expo;
  }

  @media screen and (min-width: 768px) {
    text-align: right;
  }

  &__items {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    padding: 1rem;
    flex-wrap: wrap;
    justify-content: flex-end;

    .btn {
      text-transform: none;

      i {
        display: none;
      }
    }
  }
}
.search {
  max-height: 59vh;
  padding: 0;
  flex-grow: 1;
  display: flex;
  flex-direction: column;

  table {
    border: 0;
    border-collapse: collapse;
    width: 100%;
  }

  tr.active {
    background-color: rgba(black, 0.2) !important;
  }

  td:first-child,
  th:first-child {
    padding-left: 1rem;
  }

  td:last-child,
  th:last-child {
    padding-right: 1rem;
  }

  td {
    padding: 0.35em 0.5em 0.6em;
  }

  &__exchange {
    background-position: right;
  }

  .form-group {
    padding: 1rem;
  }

  .search__results {
    overflow: auto;
    min-height: 100px;
  }

  @media screen and (min-width: 768px) {
    .search__results,
    .search__no-result {
      height: 100%;
    }
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
    max-width: none;

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
    width: 100%;

    &__copy {
      display: none;
    }
  }
  footer {
    order: 3;
  }
}
</style>
