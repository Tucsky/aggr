<template>
  <dropdown :value="value" @input="$emit('input', $event)">
    <div class="dropdown-divider" :data-label="indicatorName"></div>
    <button type="button" class="dropdown-item" @click="editIndicator">
      <i class="icon-edit"></i>
      <span>Edit</span>
    </button>
    <button type="button" class="dropdown-item" @click="renameIndicator">
      <i class="icon-stamp"></i> <span>Rename</span>
    </button>
    <button type="button" class="dropdown-item" @click="downloadIndicator">
      <i class="icon-download"></i> <span>Download</span>
    </button>
    <button type="button" class="dropdown-item" @click="duplicateIndicator">
      <i class="icon-copy-paste"></i> <span>Duplicate</span>
    </button>
    <div class="dropdown-divider"></div>
    <button
      type="button"
      class="dropdown-item"
      @click="setIndicatorOrder(0)"
      v-if="isInFront"
    >
      <i class="icon-up"></i>
      <span>Send behind</span>
    </button>
    <button
      v-else
      type="button"
      class="dropdown-item"
      @click="setIndicatorOrder()"
    >
      <i class="icon-down -lower"></i>
      <span>Bring ahead</span>
    </button>
    <button type="button" class="dropdown-item" @click="resizeIndicator">
      <i class="icon-resize-height"></i> <span>Resize</span>
    </button>
    <PriceScaleButton :indicator-id="indicatorId" :pane-id="paneId" />
    <div class="dropdown-divider"></div>
    <slot />
    <button type="button" class="dropdown-item" @click="removeIndicator">
      <i class="icon-cross"></i> <span>Remove</span>
    </button>
  </dropdown>
</template>

<script lang="ts">
import { ChartPaneState } from '@/store/panesSettings/chart'
import dialogService from '@/services/dialogService'
import PriceScaleButton from '@/components/indicators/PriceScaleButton.vue'

export default {
  name: 'IndicatorDropdown',
  components: {
    PriceScaleButton
  },
  props: {
    value: {
      type: HTMLButtonElement,
      default: null
    },
    paneId: {
      type: String,
      required: true
    },
    indicatorId: {
      type: String,
      default: null
    }
  },
  data() {
    return {
      isInFront: null
    }
  },
  computed: {
    indicatorName() {
      return (this.$store.state[this.paneId] as ChartPaneState).indicators[
        this.indicatorId
      ]?.name
    },
    indicatorOrder() {
      return (this.$store.state[this.paneId] as ChartPaneState).indicatorOrder
    }
  },
  watch: {
    value(value) {
      if (value) {
        this.updateLabels()
      }
    }
  },
  mounted() {
    this.updateLabels()
  },
  methods: {
    updateLabels() {
      this.isInFront =
        this.indicatorOrder.indexOf(this.indicatorId) ===
        this.indicatorOrder.length - 1
    },
    setIndicatorOrder(position?: number) {
      this.$store.commit(`${this.paneId}/UPDATE_INDICATOR_ORDER`, {
        id: this.indicatorId,
        position:
          typeof position === 'undefined'
            ? this.indicatorOrder.length - 1
            : position
      })
    },

    removeIndicator() {
      this.$store.dispatch(this.paneId + '/removeIndicator', {
        id: this.indicatorId
      })
    },

    resizeIndicator() {
      this.$store.commit(this.paneId + '/TOGGLE_LAYOUTING', this.indicatorId)
    },

    duplicateIndicator() {
      this.$store.dispatch(
        this.paneId + '/duplicateIndicator',
        this.indicatorId
      )
    },

    downloadIndicator() {
      this.$store.dispatch(this.paneId + '/downloadIndicator', this.indicatorId)
    },

    async editIndicator() {
      dialogService.open(
        (await import('@/components/indicators/IndicatorDialog.vue')).default,
        { paneId: this.paneId, indicatorId: this.indicatorId },
        'indicator'
      )
    },

    async renameIndicator() {
      const name = await dialogService.prompt({
        action: 'Rename',
        input: this.$store.state[this.paneId].indicators[this.indicatorId].name
      })

      if (typeof name === 'string' && name !== this.name) {
        this.$store.dispatch(this.paneId + '/renameIndicator', {
          id: this.indicatorId,
          name
        })
      }
    }
  }
}
</script>
<style lang="scss" scoped></style>
