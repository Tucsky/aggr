<template>
  <Dialog @clickOutside="close" class="indicator-library-dialog">
    <template v-slot:header>
      <div class="dialog__title">Add indicator</div>
      <div class="column -center"></div>
    </template>
    <canvas
      ref="preview"
      class="indicator-library-dialog__preview"
      width="420"
      height="210"
    />
    <div class="form-group">
      <div class="d-flex mb8">
        <input
          type="text"
          class="form-control"
          placeholder="search"
          v-model="query"
          v-autofocus
        />
        <div v-text="indicators.length" class="-center text-muted ml16"></div>
      </div>
      <table class="table table--inset">
        <thead>
          <tr>
            <th
              class="table-sortable"
              @click="toggleSort('name')"
              :class="[sortProperty === 'name' && 'table-sort--active']"
              width="200px"
            >
              <span>Name</span>
              <i
                v-if="sortProperty === 'name'"
                class="table-sortable__direction icon-up"
                :class="[
                  sortDirection < 0 && 'table-sortable__direction--desc'
                ]"
              ></i>
            </th>
            <th
              class="indicator-library-dialog__desktop table-sortable"
              @click="toggleSort('description')"
              width="200px"
            >
              <span>Description</span>
              <i
                v-if="sortProperty === 'description'"
                class="table-sortable__direction icon-up"
                :class="[
                  sortDirection < 0 && 'table-sortable__direction--desc'
                ]"
              ></i>
            </th>
            <th
              class="indicator-library-dialog__desktop table-sortable"
              @click="toggleSort('updatedAt')"
            >
              <span>Date</span>
              <i
                v-if="sortProperty === 'updatedAt'"
                class="table-sortable__direction icon-up"
                :class="[
                  sortDirection < 0 && 'table-sortable__direction--desc'
                ]"
              ></i>
            </th>
            <th></th>
          </tr>
        </thead>
        <tbody
          v-if="filteredIndicators.length"
          @mousemove="movePreview"
          @mouseleave="clearPreview"
        >
          <tr
            v-for="indicator of filteredIndicators"
            :key="indicator.id"
            @click="selectIndicator(indicator)"
            @mouseenter="showPreview($event, indicator)"
            class="-action"
            :title="indicator.id"
            v-tippy="{ placement: 'left', boundary: 'window' }"
          >
            <td class="table-input text-color-base">
              {{
                (indicator.displayName || indicator.name).replace(
                  /\{[\w_]+\}/g,
                  ''
                )
              }}
            </td>
            <td class="indicator-library-dialog__desktop table-input">
              <span class="text-muted">{{ indicator.description }}</span>
            </td>
            <td
              class="indicator-library-dialog__desktop table-input"
              @click.stop="showIndicatorActivity(indicator)"
            >
              <span>{{ ago(indicator.updatedAt) }}</span>
            </td>
            <td
              class="table-action -hover"
              @click.stop="toggleDropdown($event, indicator)"
            >
              <button class="btn -text -small">
                <i class="icon-more"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <dropdown v-model="dropdownTrigger">
      <button type="button" class="dropdown-item" @click="selectIndicator()">
        <i class="icon-plus"></i>
        <span>Add to chart</span>
      </button>
      <button
        type="button"
        class="dropdown-item"
        @click="duplicateIndicator(selectedIndicator)"
      >
        <i class="icon-copy-paste"></i>
        <span>Duplicate</span>
      </button>
      <button
        type="button"
        class="dropdown-item"
        @click="downloadIndicator(selectedIndicator)"
      >
        <i class="icon-download"></i>
        <span>Download</span>
      </button>
      <button
        type="button"
        class="dropdown-item"
        @click="refreshPreview(selectedIndicator)"
      >
        <i class="icon-refresh"></i>
        <span>Preview</span>
      </button>
      <div class="dropdown-divider"></div>
      <button
        type="button"
        class="dropdown-item"
        @click="removeIndicator(selectedIndicator)"
      >
        <i class="icon-trash"></i>
        <span>Remove</span>
      </button>
    </dropdown>
    <template v-slot:footer>
      <button class="btn -blue -large -cases -file">
        <input
          type="file"
          class="input-file"
          @change="handleFile"
          ref="importButton"
        />
        Import <i class="icon-upload ml8"></i>
      </button>
      <button
        class="mlauto btn -green -large -cases"
        @click="promptCreateIndicator"
      >
        Create new <i class="icon-plus ml8"></i>
      </button>
    </template>
  </Dialog>
</template>

<script>
import {
  ago,
  downloadAnything,
  getEventCords,
  sleep,
  slugify,
  uniqueName
} from '@/utils/helpers'
import Dialog from '@/components/framework/Dialog.vue'
import DialogMixin from '@/mixins/dialogMixin'
import dialogService from '@/services/dialogService'
import workspacesService from '@/services/workspacesService'
import importService from '@/services/importService'

export default {
  mixins: [DialogMixin],
  components: {
    Dialog
  },
  props: {
    paneId: {
      type: String,
      required: true
    }
  },
  data: () => ({
    name: '',
    query: '',
    indicators: [],
    selectedIndicator: null,
    dropdownTrigger: null,
    sortDirection: -1,
    sortProperty: 'updatedAt',
    ago
  }),
  computed: {
    queryFilter: function () {
      return new RegExp(this.query.replace(/\W/, '.*'), 'i')
    },
    sortFunction() {
      if (this.sortProperty === 'description') {
        if (this.sortDirection > 0) {
          return (a, b) =>
            (a.description || '').localeCompare(b.description || '')
        }
        return (a, b) =>
          (b.description || '').localeCompare(a.description || '')
      } else if (this.sortProperty === 'name') {
        if (this.sortDirection > 0) {
          return (a, b) => (a.name || '').localeCompare(b.name || '')
        }
        return (a, b) => (b.name || '').localeCompare(a.name || '')
      } else if (this.sortProperty === 'createdAt') {
        if (this.sortDirection > 0) {
          return (a, b) => a.createdAt - b.createdAt
        }
        return (a, b) => b.createdAt - a.createdAt
      } else if (this.sortProperty === 'updatedAt') {
        if (this.sortDirection > 0) {
          return (a, b) => a.updatedAt - b.updatedAt
        }
        return (a, b) => b.updatedAt - a.updatedAt
      }

      return (a, b) => a.id.localeCompare(b.id)
    },
    filteredIndicators() {
      const sortFunction = this.sortFunction
      return this.indicators
        .filter(
          a =>
            this.queryFilter.test(a.name) ||
            this.queryFilter.test(a.displayName)
        )
        .sort(sortFunction)
    },
    availableScales() {
      return this.indicators
        .map(indicator => indicator.options && indicator.options.priceScaleId)
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
  mounted() {
    document.getElementById('app').appendChild(this.$refs.preview)
  },
  beforeDestroy() {
    if (this.editor) {
      this.editor.destroy()
    }

    if (this.$refs.preview) {
      this.$refs.preview.remove()
    }
  },
  methods: {
    async showPreview(event, indicator) {
      if (!indicator.preview) {
        this.clearPreview()
        return
      }

      if (indicator.id !== this._previewId) {
        const ctx = this.$refs.preview.getContext('2d')

        this.clearPreview()

        this._previewId = indicator.id

        if (indicator.preview instanceof Blob) {
          this._previewUrl = URL.createObjectURL(indicator.preview)
          this._previewImageHandler = () => {
            ctx.drawImage(this._previewImageElement, 0, 0)
            URL.revokeObjectURL(this._previewUrl)
            this._previewImageHandler = null
            this._previewImageElement = null
            this._previewUrl = null
          }
          this._previewImageElement = new Image()
          this._previewImageElement.src = this._previewUrl
          this._previewImageElement.addEventListener(
            'load',
            this._previewImageHandler
          )
        }
      }
    },
    movePreview(event) {
      if (!this.$refs.preview) {
        return
      }
      const coordinates = getEventCords(event)
      this.$refs.preview.style.transform = `translate(${
        coordinates.x - this.$refs.preview.width / 2
      }px, ${coordinates.y - this.$refs.preview.height}px)`
    },
    clearPreview() {
      const ctx = this.$refs.preview.getContext('2d')
      ctx.clearRect(0, 0, this.$refs.preview.width, this.$refs.preview.height)
      this._previewId = null
      if (this._previewImageElement) {
        this._previewImageElement.removeEventListener(
          'load',
          this._previewImageHandler
        )
        this._previewImageElement.src = ''
        this._previewImageElement = null
        this._previewImageHandler = null
      }

      if (this._previewUrl) {
        URL.revokeObjectURL(this._previewUrl)
        this._previewUrl = null
      }
    },
    async getIndicators() {
      const minDate = +new Date('2021-06-07T00:00:00Z')

      this.indicators = (await workspacesService.getIndicators()).map(a => ({
        ...a,
        updatedAt: a.updatedAt || minDate
      }))
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
          name: preset.name.split(':').slice(1).join(':'),
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

      indicator.id = this.getIndicatorId(this.name)
      indicator.name = this.name

      if (!indicator.priceScaleId) {
        const slug = slugify(indicator.name)

        indicator.priceScaleId = slug
      }

      this.$store.dispatch(this.paneId + '/addIndicator', indicator)

      dialogService.openIndicator(this.paneId, indicator.id)

      this.close(null)
    },
    getIndicatorId(name) {
      return uniqueName(
        slugify(name),
        this.indicators.map(i => i.id),
        null,
        '1'
      )
    },
    selectIndicator(indicator = this.selectedIndicator) {
      workspacesService.incrementIndicatorUsage(indicator.id)

      this.$store.dispatch(this.paneId + '/addIndicator', indicator)
      this.close(null)
    },
    async removeIndicator(indicator = this.selectedIndicator) {
      if (
        await dialogService.confirm(`Delete indicator "${indicator.name}" ?`)
      ) {
        workspacesService.deleteIndicator(indicator.id)

        this.indicators.splice(this.indicators.indexOf(indicator), 1)
      }
    },
    async duplicateIndicator(indicator = this.selectedIndicator) {
      this.$store.dispatch(this.paneId + '/duplicateIndicator', {
        paneId: this.paneId,
        indicatorId: indicator.id
      })
    },
    async refreshPreview(indicator = this.selectedIndicator) {
      const alreadyAdded =
        this.$store.state[this.paneId].indicators[indicator.id]

      if (!alreadyAdded) {
        this.$store.dispatch(this.paneId + '/addIndicator', indicator)
        await sleep(250)
      }

      await this.$store.dispatch(this.paneId + '/saveIndicator', indicator.id)

      if (!alreadyAdded) {
        await sleep(250)
        this.$store.commit(this.paneId + '/REMOVE_INDICATOR', indicator.id)
      }

      await sleep(250)

      this.getIndicators()
    },
    async downloadIndicator(indicator = this.selectedIndicator) {
      await downloadAnything(
        {
          type: 'indicator',
          name: 'indicator:' + indicator.name,
          data: indicator
        },
        'indicator_' + indicator.id
      )
    },
    toggleDropdown(event, indicator) {
      if (
        event &&
        (!this.dropdownTrigger || this.selectedIndicator !== indicator)
      ) {
        this.dropdownTrigger = event.currentTarget
        this.selectedIndicator = indicator
      } else {
        this.dropdownTrigger = null
        this.selectedIndicator = null
      }
    },
    async promptCreateIndicator() {
      const payload = await dialogService.openAsPromise(
        (await import('@/components/chart/CreateIndicatorDialog.vue')).default,
        {
          availableScales: this.availableScales
        }
      )

      if (payload) {
        this.createIndicator(payload)
      }
    },
    toggleSort(name) {
      if (name === this.sortProperty) {
        this.sortDirection = this.sortDirection * -1
      }

      this.sortProperty = name
    },
    showIndicatorActivity(indicator) {
      let createdAt = 'N/A'

      if (indicator.createdAt) {
        const createdAtDate = new Date(indicator.createdAt)

        createdAt = createdAtDate.toLocaleString().replace(', ', `\u00a0`)
      }

      let updatedAt = 'N/A'

      if (indicator.updatedAt) {
        const updatedAtDate = new Date(indicator.updatedAt)

        updatedAt = updatedAtDate.toLocaleString().replace(', ', `\u00a0`)
      }

      dialogService.confirm({
        title: indicator.displayName,
        ok: null,
        cancel: null,
        html: true,
        message: `ID <code>${indicator.id}</code>
          <br>
          <ul>
            <li>Created at ${createdAt}</li>
            <br>
            <li>Updated at ${updatedAt}</li>
          </ul>`
      })
    }
  }
}
</script>
<style lang="scss">
.indicator-library-dialog {
  &__desktop {
    .dialog--small & {
      display: none;
    }
  }

  &__preview {
    position: fixed;
    top: 0;
    left: 0;
    width: 420px;
    height: 180px;
    pointer-events: none;
    z-index: 11;
  }
}
</style>
