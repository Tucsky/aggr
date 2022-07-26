<template>
  <div class="indicator" :class="{ '-error': !!error, '-disabled': !visible }">
    <button type="button" class="indicator__name pane-overlay" @click="onClick">
      {{ name }}
    </button>

    <div class="indicator__controls">
      <button
        class="btn"
        @click="toggleVisibility"
        :title="visible ? 'Hide' : 'Show'"
      >
        <i :class="{ 'icon-visible': !visible, 'icon-hidden': visible }"></i>
      </button>

      <button
        class="btn"
        @click="
          $emit('action', { indicatorId, actionName: 'menu', event: $event })
        "
        title="Menu"
      >
        <i class="icon-more"></i>
      </button>
    </div>
    <div
      class="indicator__legend pane-overlay"
      :id="paneId + indicator.id"
    ></div>
    <div v-if="error">
      <i class="icon-warning ml4 mr8"></i>
      {{ error }}
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import Component from 'vue-class-component'

@Component({
  name: 'IndicatorControl',
  props: {
    paneId: {
      required: true
    },
    indicatorId: {
      required: true
    }
  }
})
export default class extends Vue {
  private paneId: string
  private indicatorId: string

  get indicator() {
    return this.$store.state[this.paneId].indicators[this.indicatorId]
  }
  get showLegend() {
    return this.$store.state[this.paneId].showLegend
  }

  get name() {
    if (this.indicator.displayName) {
      return this.indicator.displayName
    } else if (this.indicator.name) {
      return this.indicator.name
    } else {
      return this.indicatorId
    }
  }

  get visible() {
    return !this.indicator.options ||
      typeof this.indicator.options.visible === 'undefined'
      ? true
      : this.indicator.options.visible
  }

  get error() {
    return this.$store.state[this.paneId].indicatorsErrors[this.indicatorId]
  }

  onClick(event) {
    if (event.shiftKey) {
      this.$emit('action', {
        actionName: 'resize',
        indicatorId: this.indicatorId
      })

      return
    }

    this.$emit('action', { indicatorId: this.indicatorId })
  }

  toggleVisibility() {
    this.$nextTick(() => {
      this.$store.dispatch(
        this.paneId + '/toggleSerieVisibility',
        this.indicatorId
      )
    })
  }
}
</script>

<style lang="scss" scoped>
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

    .indicator__legend {
      display: none;
    }
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
    color: var(--theme-buy-100);
    font-family: $font-monospace;
    pointer-events: none;
    line-height: 1.75em;
    letter-spacing: 0px;
    position: absolute;
    font-size: 0.75em;
    margin: 0 0 0 1em;
    left: 100%;
    padding: 0 0.5em;
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
</style>
