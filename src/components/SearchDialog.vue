<template>
  <Dialog :open="open" @clickOutside="close" medium>
    <template v-slot:header>
      <div class="title" v-if="paneId">{{ paneName }}'s MARKETS</div>
      <div class="title" v-else>ALL PANES MARKETS</div>
      <div class="column -center"></div>
    </template>
    <div class="d-flex">
      <div class="form-group search">
        <label>Add markets ({{ flattenedProducts.length }})</label>
        <div class="mb4">
          <input ref="input" type="text" class="form-control" placeholder="search (eg: BITMEX:XBTUSD)" v-model="query" />
        </div>
        <table v-if="filteredMarkets.length" class="table">
          <tbody>
            <tr
              v-for="market of filteredMarkets"
              :key="market"
              @click="selectMarket(market)"
              :title="market"
              v-tippy="{ placement: 'right' }"
              class="-action"
            >
              <td class="pl0 table-input">
                {{ market }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="form-group selection">
        <label v-if="paneId">Pane {{ paneId }}</label>
        <label v-else>Workspace (all panes)</label>
        <button v-for="market of selection" :key="market" class="btn -small mr4 mb4 -green" title="Click to remove" @click="deselectMarket(market)">
          {{ market }}

          <i class="icon-check ml8" v-if="activeMarkets.indexOf(market) !== -1" title="Connected" v-tippy></i>
        </button>
      </div>
    </div>

    <footer>
      <a href="javascript:void(0);" class="btn -text mr8" @click="close(false)">Close</a>
      <button class="btn -large" @click="apply">OK</button>
    </footer>
  </Dialog>
</template>

<script>
import Dialog from '@/components/framework/Dialog.vue'
import DialogMixin from '@/mixins/dialogMixin'
import { getBucketId } from '@/utils/helpers'
import dialogService from '@/services/dialogService'

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
    selection: []
  }),
  computed: {
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
    indexedProducts() {
      return this.$store.state.app.indexedProducts
    },
    flattenedProducts() {
      return Array.prototype.concat(...Object.values(this.indexedProducts))
    },
    queryFilter: function() {
      return new RegExp(this.query.replace(/\W/, '|'), 'i')
    },
    filteredMarkets: function() {
      return this.flattenedProducts.filter(a => this.selection.indexOf(a) === -1 && this.queryFilter.test(a)).slice(0, 20)
    }
  },
  watch: {
    open(value) {
      if (!value) {
        this.$store.dispatch('app/hideSearch')
      }
    },
    showSearch(value) {
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
    selectMarket(market) {
      this.selection.push(market)
    },
    deselectMarket(market) {
      const index = this.selection.indexOf(market)

      if (index !== -1) {
        this.selection.splice(index, 1)
      }
    },
    async apply() {
      if (!this.paneId) {
        if (this.containMultipleMarketsConfigurations() && !(await dialogService.confirm('Are you sure ?'))) {
          return
        }

        this.$store.dispatch('panes/setMarketsForAll', this.selection)
      } else {
        this.$store.dispatch('panes/setMarketsForPane', {
          id: this.paneId,
          markets: this.selection
        })
      }

      this.close()
    }
  }
}
</script>
<style lang="scss" scoped>
.selection {
  flex-basis: 0;
  margin-left: 1rem;

  min-width: 200px;

  text-align: right;
}
.search {
  flex-grow: 1;
}
</style>
