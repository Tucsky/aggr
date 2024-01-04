<template>
  <table class="table indicator-table__table">
    <canvas
      ref="preview"
      class="indicator-table__preview"
      :width="PREVIEW_SIZE.displayWidth * pxRatio"
      :height="PREVIEW_SIZE.displayHeight * pxRatio"
      :style="{
        width: `${PREVIEW_SIZE.displayWidth}px`,
        height: `${PREVIEW_SIZE.displayHeight}px`
      }"
    />
    <thead>
      <tr>
        <th
          class="table-sortable table-min"
          @click="toggleSort('name')"
          :class="[sortProperty === 'name' && 'table-sort--active']"
        >
          <span>Name</span>
          <i
            v-if="sortProperty === 'name'"
            class="table-sortable__direction icon-up"
            :class="[sortDirection < 0 && 'table-sortable__direction--desc']"
          ></i>
        </th>
        <th
          class="-dialog-min-m table-sortable w-100"
          @click="toggleSort('description')"
        >
          <span>Description</span>
          <i
            v-if="sortProperty === 'description'"
            class="table-sortable__direction icon-up"
            :class="[sortDirection < 0 && 'table-sortable__direction--desc']"
          ></i>
        </th>
        <th
          class="-dialog-min-m table-sortable text-right"
          @click="toggleSort('updatedAt')"
        >
          <span>Date</span>
          <i
            v-if="sortProperty === 'updatedAt'"
            class="table-sortable__direction icon-up"
            :class="[sortDirection < 0 && 'table-sortable__direction--desc']"
          ></i>
        </th>
        <th class="table-min" v-if="showDropdown"></th>
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
        @click="$emit('selected', indicator)"
        @mouseenter="showPreview($event, indicator)"
        class="-action"
      >
        <td class="table-input text-color-base table-min">
          {{
            (indicator.displayName || indicator.name).replace(/\{[\w_]+\}/g, '')
          }}
        </td>
        <td class="-dialog-min-m table-input table-ellipsis">
          <span class="text-muted">{{ indicator.description }}</span>
        </td>
        <td
          class="-dialog-min-m table-input table-min text-right"
          @click.stop="showIndicatorActivity(indicator)"
        >
          <span>{{ ago(indicator.updatedAt) }}</span>
        </td>
        <td
          v-if="showDropdown"
          class="table-action -hover table-min"
          @click.stop="$emit('dropdown', [$event, indicator])"
        >
          <button class="btn -text -small">
            <i class="icon-more"></i>
          </button>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script lang="ts">
import { ago, getEventCords } from '@/utils/helpers'

const PREVIEW_SIZE = {
  originalWidth: 500,
  originalHeight: 100,
  displayWidth: 300,
  displayHeight: 100
}

export default {
  props: {
    indicators: {
      type: Array,
      required: true
    },
    query: {
      type: String,
      default: ''
    },
    showDropdown: {
      type: Boolean,
      default: false
    }
  },
  data() {
    const pxRatio = window.devicePixelRatio || 1

    return {
      pxRatio,
      PREVIEW_SIZE,
      ago,
      sortDirection: -1,
      sortProperty: 'updatedAt'
    }
  },
  computed: {
    queryFilter() {
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
            this.queryFilter.test(a.description) ||
            this.queryFilter.test(a.name)
        )
        .sort(sortFunction)
    }
  },
  mounted() {
    document.getElementById('app').appendChild(this.$refs.preview)
    const ctx = this.$refs.preview.getContext('2d')
    ctx.imageSmoothingEnabled = false
  },
  beforeDestroy() {
    if (this.$refs.preview) {
      this.$refs.preview.remove()
    }
  },
  methods: {
    toggleSort(name) {
      if (name === this.sortProperty) {
        this.sortDirection = this.sortDirection * -1
      }

      this.sortProperty = name
    },
    async showPreview(event, indicator) {
      if (!indicator.preview) {
        if (indicator.imagePath) {
          indicator.preview = await fetch(
            `${import.meta.env.VITE_APP_LIB_URL}${indicator.imagePath}`
          ).then(response => {
            if (!response.ok) {
              indicator.imagePath = null
              throw new Error('Network response was not ok')
            }
            return response.blob()
          })
        }

        if (!indicator.preview) {
          this.clearPreview()
          return
        }
      }

      if (indicator.id !== this._previewId) {
        const ctx = this.$refs.preview.getContext(
          '2d'
        ) as CanvasRenderingContext2D

        this.clearPreview()

        this._previewId = indicator.id

        if (indicator.preview instanceof Blob) {
          this._previewUrl = URL.createObjectURL(indicator.preview)
          this._previewImageHandler = () => {
            const { width, height } = this._previewImageElement
            const ratio = this.pxRatio
            ctx.drawImage(
              this._previewImageElement,
              width - PREVIEW_SIZE.displayWidth * ratio,
              height / 2 - (PREVIEW_SIZE.displayHeight / 2) * ratio,
              PREVIEW_SIZE.displayWidth * ratio,
              PREVIEW_SIZE.displayHeight * ratio,
              0,
              0,
              PREVIEW_SIZE.displayWidth * ratio,
              PREVIEW_SIZE.displayHeight * ratio
            )
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
        coordinates.x - PREVIEW_SIZE.displayWidth / 2
      }px, ${coordinates.y - PREVIEW_SIZE.displayHeight}px)`
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
    }
  }
}
</script>
<style lang="scss" scoped>
.indicator-table {
  &__preview {
    position: fixed;
    top: -1rem;
    left: 0;
    pointer-events: none;
    z-index: 11;
    border-radius: 0.75rem;
  }
}
</style>
