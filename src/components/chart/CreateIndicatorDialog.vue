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
                <th class="min-768">Description</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="indicator of filteredIndicators" :key="indicator.id" @click="selectIndicator(indicator)" class="-action">
                <td class="table-input">{{ (indicator.displayName || indicator.name).replace(/\{[\w_]+\}/g, '') }}</td>
                <td class="min-768 table-input">
                  <span class="text-muted">{{ indicator.description }}</span>
                </td>
                <td class="table-action -hover" @click.stop="removeIndicator(indicator)">
                  <button class="btn -text -small"><i class="icon-trash text-danger"></i></button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <hr class="-single -horizontal" />
        <hr class="-single -vertical" />
      </template>
      <div class="-unshrinkable">
        <div class="form-group mb16">
          <label>Import indicator</label>
          <button class="btn -blue -large -cases w-100 -file">
            <i class="icon-upload mr8"></i> Browse
            <input type="file" @change="handleFile" />
          </button>
          <div class="divider -horizontal" style="display: flex">Or</div>
          <label>Create blank indicator</label>
          <input class="form-control" v-model="name" placeholder="Name it" />
        </div>
        <div class="form-group mb16">
          <label>Scale with</label>
          <dropdown
            class="-left -center"
            :selected="priceScaleId"
            :options="availableScales"
            placeholder="Default scale"
            selectionClass="-outline form-control -arrow"
            @output="priceScaleId = $event"
          ></dropdown>
        </div>
        <div class="text-right">
          <button class="btn -large -green ml16" @click="createIndicator()">Create <i class="icon-plus ml8"></i></button>
        </div>
      </div>
    </div>
  </Dialog>
</template>

<script>
import { ago, slugify, uniqueName } from '@/utils/helpers'
import Dialog from '@/components/framework/Dialog.vue'
import DialogMixin from '@/mixins/dialogMixin'
import dialogService from '@/services/dialogService'
import workspacesService from '@/services/workspacesService'
import IndicatorDialog from './IndicatorDialog.vue'
import importService from '@/services/importService'

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
    priceScaleId: 'right',
    query: '',
    indicators: []
  }),
  computed: {
    indicatorId: function() {
      return uniqueName(
        slugify(this.name),
        this.indicators.map(i => i.id)
      )
    },
    queryFilter: function() {
      return new RegExp(this.query.replace(/\W/, '.*'), 'i')
    },
    filteredIndicators: function() {
      return this.indicators.filter(a => this.queryFilter.test(a.name) || this.queryFilter.test(a.displayName))
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
      this.indicators = (await workspacesService.getIndicators()).sort((a, b) => (b.uses || 0) - (a.uses || 0))
    },
    async handleFile(event) {
      try {
        const preset = await importService.getJSON(event.target.files[0])

        if (!preset.data) {
          throw new Error('indicator is empty')
        }

        if (preset.type !== 'indicator') {
          throw new Error('not an indicator')
        }

        this.createIndicator({
          name: preset.name
            .split(':')
            .slice(1)
            .join(':'),
          script: preset.data.script || '',
          options: preset.data.options || {}
        })
      } catch (error) {
        this.$store.dispatch('app/showNotice', {
          title: error.message,
          type: 'error'
        })
      }
    },
    async createIndicator(indicator) {
      if (!indicator) {
        indicator = {}
      }

      if (indicator.name) {
        this.name = indicator.name
      } else if (!this.name) {
        this.name = 'Untitled'
      }

      indicator.id = this.indicatorId
      indicator.name = this.name

      if (!indicator.priceScaleId) {
        const slug = slugify(indicator.name)

        indicator.priceScaleId = this.priceScaleId || slug
      }

      this.$store.dispatch(this.paneId + '/addIndicator', indicator)

      dialogService.open(IndicatorDialog, { paneId: this.paneId, indicatorId: this.indicatorId }, 'indicator')

      this.close(null)
    },
    selectIndicator(indicator) {
      workspacesService.incrementIndicatorUsage(indicator.id)

      this.$store.dispatch(this.paneId + '/addIndicator', indicator)
      this.close(null)
    },
    async removeIndicator(indicator) {
      if (await dialogService.confirm(`Delete indicator "${indicator.name}" ?`)) {
        workspacesService.deleteIndicator(indicator.id)

        this.indicators.splice(this.indicators.indexOf(indicator), 1)
      }
    },
    ago(timestamp) {
      return ago(timestamp)
    }
  }
}
</script>
