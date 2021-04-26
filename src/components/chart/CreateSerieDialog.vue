<template>
  <Dialog :open="open" @clickOutside="close">
    <template v-slot:header>
      <div class="title">new serie</div>
      <div class="column -center"></div>
    </template>
    <template v-if="inactiveSeries.length">
      <div class="form-group">
        <label>Choose from existing serie</label>
        <dropdown
          class="form-control -left"
          :options="inactiveSeries"
          :alwaysShowPlaceholder="true"
          :placeholder="inactiveSeries.length + ' serie' + (inactiveSeries.length > 1 ? 's' : '')"
          @output="enableSerie"
        >
          <template v-slot:option="{ value }">
            <div class="serie-dropdown-control">
              <span>{{ value.name }}</span>
              <i class="icon-trash -action" @click.stop="$store.dispatch(paneId + '/removeSerie', value.id)"></i>
            </div>
          </template>
        </dropdown>
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
import { slugify, uniqueName, getSerieSettings } from '@/utils/helpers'
import Dialog from '@/components/framework/Dialog.vue'
import DialogMixin from '@/mixins/dialogMixin'

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
    priceScaleId: 'right'
  }),
  computed: {
    series() {
      const series = Object.keys(this.$store.state[this.paneId].series).map(serieId => getSerieSettings(this.paneId, serieId))

      return series
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
    },
    inactiveSeries() {
      const series = this.series.filter(serie => {
        return serie.enabled === false
      })

      return series
    }
  },
  mounted() {
    this.getSerieId(this.name)
  },
  beforeDestroy() {
    if (this.editor) {
      this.editor.destroy()
    }
  },
  methods: {
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
    enableSerie(index) {
      const option = this.inactiveSeries[index]

      this.$store.dispatch(this.paneId + '/toggleSerie', option.id)

      this.close(null)
    }
  }
}
</script>
