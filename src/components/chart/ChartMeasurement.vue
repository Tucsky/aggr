<template>
  <div
    class="chart-measurement"
    :style="styles"
    :class="[
      percent > 0 && `chart-measurement--up`,
      percent < 0 && `chart-measurement--down`,
      `chart-measurement--${size}`
    ]"
  >
    <div class="chart-measurement__line chart-measurement__line--top">
      <div class="chart-measurement__price">{{ high }}</div>
    </div>
    <div class="chart-measurement__percent">
      <i class="icon-up-thin chart-measurement__icon"></i>
      {{ percent > 0 ? '+' : '' }}{{ percent.toFixed(precision)
      }}<small>%</small>
    </div>
    <div class="chart-measurement__line chart-measurement__line--bottom">
      <div class="chart-measurement__price">{{ low }}</div>
    </div>
  </div>
</template>

<script lang="ts">
export default {
  name: 'ChartMeasurement',
  props: {
    position: {
      type: Object,
      required: true
    },
    high: {
      type: Number,
      required: true
    },
    low: {
      type: Number,
      required: true
    },
    percent: {
      type: Number,
      required: true
    }
  },
  computed: {
    showAlerts() {
      return this.$store.state.settings.alerts
    },
    size() {
      const surface = this.position.width * this.position.height

      if (surface < 10000) {
        return 'small'
      }

      if (surface < 50000) {
        return 'medium'
      }

      if (surface < 100000) {
        return 'large'
      }

      return 'extra-large'
    },
    styles() {
      return {
        top: this.position.top + 'px',
        left: this.position.left + 'px',
        width: this.position.width + 'px',
        height: this.position.height + 'px'
      }
    },
    precision() {
      const abs = Math.abs(this.percent)

      if (abs > 10) {
        return 2
      }

      if (abs > 1) {
        return 2
      }

      return 3
    }
  },
  methods: {
    toggleTimeframeDropdown(event) {
      if (this.timeframeDropdownTrigger) {
        this.timeframeDropdownTrigger = null
      } else {
        this.timeframeDropdownTrigger = event.currentTarget
      }
    },

    toggleAlertsDropdown(event) {
      if (this.alertsDropdownTrigger) {
        this.alertsDropdownTrigger = null
      } else {
        this.alertsDropdownTrigger = event.currentTarget
      }
    }
  }
}
</script>
<style lang="scss" scoped>
.chart-measurement {
  $self: &;
  position: absolute;
  background-color: var(--theme-base-o25);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: $font-monospace;

  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    opacity: 0.25;
  }

  &__icon {
    display: inline-block;
    font-size: 0.75em;
    transition: transform 0.2s $ease-out-expo;

    #{$self}--small & {
      display: none;
    }
  }

  &--up {
    color: var(--theme-buy-200);

    &:before {
      background-color: var(--theme-buy-base);
    }
  }

  &--down {
    color: var(--theme-sell-200);

    &:before {
      background-color: var(--theme-sell-base);
    }

    #{$self}__icon {
      transform: rotateZ(180deg);
    }
  }

  &__line {
    position: absolute;
    width: 100%;
    display: flex;
    align-items: flex-start;

    &::before,
    &::after {
      content: '';
      flex-grow: 1;
      height: 0.0625em;
      background-color: currentColor;
    }

    &--top {
      top: 0;
    }

    &--bottom {
      bottom: 0;
    }
  }

  &__price {
    padding: 0 0.5em;
    position: relative;
    line-height: 0;
    font-size: 0.75em;

    #{$self}--large &,
    #{$self}--extra-large & {
      font-size: 1em;
    }
  }

  &__percent {
    position: relative;
    white-space: nowrap;
    text-shadow: 1.5px 1.5px 0 var(--theme-background-base);
    font-weight: 700;

    #{$self}--medium & {
      font-size: 1em;
    }

    #{$self}--large & {
      font-size: 1.5em;
    }

    #{$self}--extra-large & {
      font-size: 2em;
    }
  }

  &__price,
  &__percent {
    z-index: 1;
  }
}
</style>
