<template>
  <div class="indicator" :class="{ '-error': !!error, '-disabled': !visible }">
    <div class="indicator__name" @click="edit">{{ name }}</div>

    <div class="indicator__controls">
      <template v-if="!error">
        <button class="btn -small" @click="toggleVisibility" v-tippy :title="visible ? 'Hide' : 'Show'">
          <i :class="{ 'icon-visible': !visible, 'icon-hidden': visible }"></i>
        </button>
        <button class="btn -small" @click="edit" v-tippy title="Edit"><i class="icon-edit"></i></button>
      </template>
      <button class="btn -small" @click="resize" v-tippy title="Resize"><i class="icon-resize-height"></i></button>
      <button class="btn -small" @click="remove" v-tippy title="Disable"><i class="icon-cross"></i></button>
    </div>
    <div v-if="showLegend" class="indicator__legend">
      <div v-for="serie of series" :key="serie" :id="indicator.id + serie"></div>
    </div>
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
    series: function() {
      return this.indicator.series
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
      this.$store.dispatch(this.paneId + '/resizeIndicator', this.indicatorId)
    }
  }
}
</script>

<style lang="scss">
.indicator {
  display: flex;
  width: 0;
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
    cursor: pointer;
  }

  &__legend {
    color: lighten($green, 20%);
    margin-left: 0.4em;
    font-family: $font-monospace;
    pointer-events: none;
    line-height: 1.75em;
    letter-spacing: 0px;
    order: 2;
    transition: visibility;
    transition-delay: 1s;
    font-size: 0.75em;

    text-shadow: 1px 1px black;

    > div {
      display: inline-block;
      line-height: 1.5;
      margin: 0.26em 0 0 0.26em;
    }
  }

  &__controls {
    padding-left: 1rem;
    margin-left: -0.5rem;
    display: none;
    align-items: center;
    pointer-events: none;
    order: 1;

    &:hover {
      display: inline-flex;
    }

    > .btn {
      background-color: rgba($dark, 0.8);
      color: white;
      border-radius: 0;
      padding: 0.2rem 0.4rem;

      &:hover {
        background-color: $green;
      }

      &:first-child {
        border-top-left-radius: 3px;
        border-bottom-left-radius: 3px;
      }

      &:last-child {
        border-top-right-radius: 3px;
        border-bottom-right-radius: 3px;
      }
    }
  }

  &:hover {
    .indicator__controls {
      display: inline-flex;
      pointer-events: all;
    }
  }
}

#app.-light {
  .indicator__legend {
    color: $green;
    text-shadow: none;
  }
}
</style>
