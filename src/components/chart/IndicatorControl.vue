<template>
  <div class="indicator" :class="{ '-error': !!error, '-disabled': !visible }">
    <button type="button" class="indicator__name pane-overlay" @click="edit">{{ name }}</button>

    <div class="indicator__controls">
      <template v-if="!error">
        <button class="btn -accent" @click="toggleVisibility" :title="visible ? 'Hide' : 'Show'">
          <i :class="{ 'icon-visible': !visible, 'icon-hidden': visible }"></i>
        </button>
        <button class="btn -accent" @click="resize" title="Resize"><i class="icon-resize-height"></i></button>
        <button class="btn -accent" @click="edit" title="Edit"><i class="icon-edit"></i></button>
      </template>
      <button class="btn -accent" @click="remove" title="Disable"><i class="icon-cross"></i></button>
    </div>
    <div class="indicator__legend pane-overlay" :id="paneId + indicator.id"></div>
    <div v-if="error">
      <i class="icon-warning ml4 mr8"></i>
      {{ error }}
    </div>
  </div>
</template>

<script>
import IndicatorDialog from './IndicatorDialog.vue'
import dialogService from '../../services/dialogService'

export default {
  props: ['paneId', 'indicatorId'],
  computed: {
    indicator: function() {
      return this.$store.state[this.paneId].indicators[this.indicatorId]
    },
    showLegend: function() {
      return this.$store.state[this.paneId].showLegend
    },
    name: function() {
      if (this.indicator.displayName) {
        return this.indicator.displayName
      } else if (this.indicator.name) {
        return this.indicator.name
      } else {
        return this.indicatorId
      }
    },
    visible: function() {
      return !this.indicator.options || typeof this.indicator.options.visible === 'undefined' ? true : this.indicator.options.visible
    },
    error: function() {
      return this.$store.state[this.paneId].indicatorsErrors[this.indicatorId]
    }
  },
  methods: {
    edit() {
      dialogService.open(IndicatorDialog, { paneId: this.paneId, indicatorId: this.indicatorId }, 'indicator')
    },
    toggleVisibility() {
      this.$nextTick(() => {
        this.$store.dispatch(this.paneId + '/toggleSerieVisibility', this.indicatorId)
      })
    },
    remove() {
      this.$store.dispatch(this.paneId + '/removeIndicator', { id: this.indicatorId })
    },
    resize() {
      this.$store.commit(this.paneId + '/TOGGLE_LAYOUTING', this.indicatorId)
    }
  }
}
</script>

<style lang="scss">
.indicator {
  display: flex;
  white-space: nowrap;
  height: 1.3em;

  i {
    line-height: 1.35;
  }

  &.-error {
    color: $red;
  }

  &.-disabled {
    opacity: 0.5;
  }

  &__name {
    position: relative;
    padding: 0 0.25em;
    border: 0;
    font-size: inherit;
    font-family: inherit;
    cursor: pointer;
  }

  &__legend {
    color: lighten($green, 20%);
    font-family: $font-monospace;
    pointer-events: none;
    line-height: 1.75em;
    letter-spacing: 0px;
    position: absolute;
    font-size: 0.75em;
    margin: 0.1em 0 0 1em;
    left: 100%;
  }

  &__controls {
    padding-left: 1rem;
    margin-left: -0.5rem;
    display: none;
    align-items: center;
    pointer-events: none;

    &:hover {
      display: inline-flex;
    }

    > .btn {
      color: white;
      border-radius: 0;
      padding: 0.2em 0.4em;
      font-size: 1em;
    }
  }

  &:hover {
    position: relative;
    z-index: 1;

    .indicator__controls {
      display: inline-flex;
      pointer-events: all;
    }
  }
}

#app.-light {
  .indicator__legend {
    color: darken($green, 10%);
    text-shadow: none;
  }
}
</style>
