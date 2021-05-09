<template>
  <Dialog :open="open" @clickOutside="close">
    <template v-slot:header>
      <div class="title">new serie</div>
      <div class="column -center"></div>
    </template>
    <template v-if="series.length">
      <div class="form-group">
        <label>Choose from existing serie</label>
        <div class="d-flex mb4">
          <input type="text" class="form-control" placeholder="search" v-model="query" />
          <div v-text="series.length" class="-center text-muted ml16"></div>
        </div>
        <table v-if="filteredSeries.length" class="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Last updated</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="serie of filteredSeries"
              :key="serie.id"
              @click="selectSerie(serie)"
              :title="serie.id"
              v-tippy="{ placement: 'right' }"
              class="-action"
            >
              <td class="table-input">
                {{ serie.name }}
              </td>
              <td class="table-input">{{ ago(serie.updatedAt) }}</td>
              <td class="btn -red -small" @click.stop="removeSerie(serie)"><i class="icon-trash"></i></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="divider">Or</div>
    </template>
    <div class="form-group mb16">
      <label>Name</label>
      <input class="form-control" :value="name" @input="getSerieId($event.target.value)" />
      <small class="help-text mt4">
        ID will be: {{ serieId }} <span class="icon-info ml4" :title="`Use \'$${serieId}\' to reference it in other series`" v-tippy></span
      ></small>
    </div>
    <div class="form-group mb16">
      <label>Align serie with</label>
      <dropdown
        class="form-control -left -center"
        :selected="priceScaleId"
        :options="availableScales"
        placeholder="Default scale"
        @output="priceScaleId = $event"
      ></dropdown>
    </div>
    <footer>
      <a href="javascript:void(0);" class="btn -text mr16" @click="close(false)">Cancel</a>
      <button class="btn -large" @click="create">Create</button>
    </footer>
  </Dialog>
</template>

<script>
import store from '@/store'
import { ago, slugify, uniqueName } from '@/utils/helpers'
import Dialog from '@/components/framework/Dialog.vue'
import DialogMixin from '@/mixins/dialogMixin'
import workspacesService from '@/services/workspacesService'

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
    serieId: null,
    name: 'Untitled',
    priceScaleId: 'right',
    query: '',
    series: []
  }),
  computed: {
    queryFilter: function() {
      return new RegExp(this.query.replace(/\W/, '.*'), 'i')
    },
    filteredSeries: function() {
      return this.series.filter(a => !this.$store.state[this.paneId].series[a.id] && this.queryFilter.test(a.name))
    },
    availableScales: function() {
      return this.series
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
    await this.getSeries()
  },
  beforeDestroy() {
    if (this.editor) {
      this.editor.destroy()
    }
  },
  methods: {
    async getSeries() {
      this.series = await workspacesService.getSeries()
      this.getSerieId(this.name)
    },
    getSerieId(name) {
      if (name.length) {
        this.serieId = uniqueName(slugify(name), Object.keys(store.state[this.paneId].series))
        this.name = name
      }
    },
    create() {
      this.close({
        id: this.serieId,
        name: this.name,
        priceScaleId: this.priceScaleId || this.serieId
      })
    },
    selectSerie(serie) {
      this.$store.dispatch(this.paneId + '/addSerie', serie)
      this.close(null)
    },
    removeSerie(serie) {
      workspacesService.deleteSerie(serie.id)

      this.series.splice(this.series.indexOf(serie), 1)
    },
    ago(timestamp) {
      return ago(timestamp)
    }
  }
}
</script>
