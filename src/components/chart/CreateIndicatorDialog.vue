<template>
  <Dialog @clickOutside="close" class="-auto">
    <template v-slot:header>
      <div class="title">Add indicator</div>
      <div class="column -center"></div>
    </template>
    <div class="d-flex mobile-dir-col-desktop-dir-row">
      <template v-if="indicators.length">
        <div class="form-group">
          <label>Choose from existing indicator</label>
          <div class="d-flex mb8">
            <input type="text" class="form-control" placeholder="search" v-model="query" />
            <div v-text="indicators.length" class="-center text-muted ml16"></div>
          </div>
          <table v-if="filteredIndicators.length" class="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="indicator of filteredIndicators" :key="indicator.id" @click="selectIndicator(indicator)" class="-action">
                <td class="table-input" v-text="indicator.displayName || indicator.name"></td>
                <td class="table-input" v-text="indicator.updatedAt ? ago(indicator.updatedAt) + ' ago' : 'Never'"></td>
                <td class="table-action" @click.stop="removeIndicator(indicator)">
                  <button class="btn  -red -small"><i class="icon-cross"></i></button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="divider -horizontal">Or</div>
        <div class="divider -vertical">Or</div>
      </template>
      <div class="-unshrinkable">
        <div class="form-group mb16">
          <label>Create indicator</label>
          <input class="form-control" :value="name" @input="getIndicatorId($event.target.value)" placeholder="Name of indicator / serie" />
          <p>
            ID: <code class="-filled">{{ indicatorId }}</code>
          </p>
        </div>
        <div class="form-group mb16">
          <label>Scale with</label>
          <dropdown
            class="-left -center"
            :selected="priceScaleId"
            :options="availableScales"
            placeholder="Default scale"
            selectionClass="-outline form-control"
            @output="priceScaleId = $event"
          ></dropdown>
        </div>
      </div>
    </div>
    <footer>
      <a href="javascript:void(0);" class="btn -text mr16" @click="close(false)">Cancel</a>
      <button class="btn -large" @click="create">Create</button>
    </footer>
  </Dialog>
</template>

<script>
import { ago, slugify, uniqueName } from '@/utils/helpers'
import Dialog from '@/components/framework/Dialog.vue'
import DialogMixin from '@/mixins/dialogMixin'
import dialogService from '@/services/dialogService'
import workspacesService from '@/services/workspacesService'
import IndicatorDialog from './IndicatorDialog.vue'

export default {
  mixins: [DialogMixin],
  props: {
    paneId: {
      type: String,
      required: true
    }
  },
  components: {
    Dialog
  },
  data: () => ({
    name: '',
    indicatorId: null,
    priceScaleId: 'right',
    query: '',
    indicators: []
  }),
  computed: {
    queryFilter: function() {
      return new RegExp(this.query.replace(/\W/, '.*'), 'i')
    },
    filteredIndicators: function() {
      return this.indicators.filter(
        a => !this.$store.state[this.paneId].indicators[a.id] && (this.queryFilter.test(a.name) || this.queryFilter.test(a.displayName))
      )
    },
    availableScales: function() {
      return this.indicators
        .map(s => s.options && s.options.priceScaleId)
        .reduce(
          (scales, priceScaleId) => {
            if (!priceScaleId || scales[priceScaleId]) {
              return scales
            }

            scales[priceScaleId] = priceScaleId
            return scales
          },
          {
            '': 'Own scale',
            right: 'Main scale (right)'
          }
        )
    }
  },
  async created() {
    await this.getIndicators()
  },
  beforeDestroy() {
    if (this.editor) {
      this.editor.destroy()
    }
  },
  methods: {
    async getIndicators() {
      this.indicators = await workspacesService.getIndicators()
      this.getIndicatorId(this.name)
    },
    getIndicatorId(name) {
      if (!name || !name.length) {
        if (!this.name || !this.name.lengt) {
          name = 'Untitled'
        } else {
          name = this.name
        }
      }

      this.indicatorId = uniqueName(
        slugify(name),
        this.indicators.map(i => i.id)
      )

      this.name = name
    },
    async create() {
      if (!this.name || this.name.length < 3) {
        return
      }

      const slug = slugify(this.name)

      const id = await workspacesService.saveIndicator({
        id: this.indicatorId,
        name: this.name,
        priceScaleId: this.priceScaleId || slug
      })

      const indicator = await workspacesService.getIndicator(id)

      this.$store.dispatch(this.paneId + '/addIndicator', indicator)

      dialogService.open(IndicatorDialog, { paneId: this.paneId, indicatorId: indicator.id }, 'indicator')

      this.close(null)
    },
    selectIndicator(indicator) {
      this.$store.dispatch(this.paneId + '/addIndicator', indicator)
      this.close(null)
    },
    async removeIndicator(indicator) {
      if (await dialogService.confirm(`Delete ${indicator.name} permanently ?`)) {
        workspacesService.deleteIndicator(indicator.id)

        this.indicators.splice(this.indicators.indexOf(indicator), 1)

        this.getIndicatorId()
      }
    },
    ago(timestamp) {
      return ago(timestamp)
    }
  }
}
</script>
