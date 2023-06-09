<template>
  <dropdown v-model="value">
    <div class="timeframe-dropdown">
      <div class="dropdown-item timeframe-dropdown__header" @click.stop>
        <timeframe-input
          @input="onInput"
          @submit="addTimeframe"
          placeholder="ex 1m"
          class="timeframe-dropdown__input"
        />
        <div
          v-if="typeaheadTimeframe && typeaheadTimeframe.value"
          class="text-nowrap text-monospace text-muted"
        >
          ~ {{ typeaheadTimeframe.label }}
        </div>
        <button
          v-if="!typeaheadTimeframe"
          type="button"
          class="btn -text"
          @click="toggleEdit"
        >
          <i :class="editing ? 'icon-cross' : 'icon-edit'"></i>
        </button>
        <button
          v-else
          type="button"
          class="btn -text"
          @click="addTimeframe(typeaheadTimeframe.value, true)"
        >
          <i class="icon-save"></i>
        </button>
      </div>
      <ToggableSection
        v-for="group in groups"
        :key="group.title"
        :id="`timeframe-${group.title}`"
        :title="group.title"
        small
      >
        <button
          v-for="timeframe in group.timeframes"
          :key="timeframe.value"
          type="button"
          class="dropdown-item dropdown-item--space-between timeframe-option"
          @click="$store.dispatch(`${paneId}/setTimeframe`, timeframe.value)"
        >
          <span>{{ timeframe.label }}</span>

          <i
            v-if="editing"
            class="icon-trash"
            @click.stop="removeTimeframe(timeframe.value)"
          ></i>
          <i
            v-else
            :class="[
              favoriteTimeframes[timeframe.value] && 'icon-star-filled',
              !favoriteTimeframes[timeframe.value] && 'icon-star'
            ]"
            @click.stop="toggleFavoriteTimeframe(timeframe.value)"
          ></i>
        </button>
      </ToggableSection>
    </div>
  </dropdown>
</template>

<script lang="ts">
import TimeframeInput from '@/components/chart/TimeframeInput.vue'
import { getTimeframeForHuman } from '@/utils/helpers'
import ToggableSection from '@/components/framework/ToggableSection.vue'

export default {
  name: 'TimeframeDropdown',
  components: {
    TimeframeInput,
    ToggableSection
  },
  props: {
    paneId: {
      type: String,
      required: true
    },
    value: {
      type: HTMLButtonElement,
      default: null
    }
  },
  data: () => ({
    editing: false,
    typeaheadTimeframe: null
  }),
  computed: {
    timeframes() {
      return this.$store.state.settings.timeframes
    },

    favoriteTimeframes() {
      return this.$store.state.settings.favoriteTimeframes
    },

    groups() {
      const units = ['seconds', 'minutes', 'hours', 'ticks']
      let unit = -1
      const minute = 60
      const hour = minute * 60
      const day = hour * 24

      const typeahead = this.typeaheadTimeframe

      // eslint-disable-next-line vue/no-side-effects-in-computed-properties
      return this.timeframes
        .sort((a, b) => {
          const x = a.value && a.value[a.value.length - 1] === 't'
          const y = b.value && b.value[b.value.length - 1] === 't'
          let order = x === y ? 0 : x ? 100000 : -100000

          order += parseFloat(a.value) - parseFloat(b.value)
          return order
        })
        .reduce((acc, timeframe) => {
          if (
            typeahead &&
            typeahead.value != timeframe.value &&
            timeframe.label.indexOf(typeahead.label) === -1
          ) {
            return acc
          }

          let currentUnit
          if (+timeframe.value < minute) {
            currentUnit = 0
          } else if (+timeframe.value < hour) {
            currentUnit = 1
          } else if (+timeframe.value <= day) {
            currentUnit = 2
          } else {
            currentUnit = 3
          }

          if (currentUnit > unit) {
            acc.push({
              title: units[currentUnit],
              timeframes: []
            })

            unit = currentUnit
          }

          acc[acc.length - 1].timeframes.push(timeframe)

          return acc
        }, [])
    }
  },
  methods: {
    toggleFavoriteTimeframe(timeframe) {
      this.$store.commit('settings/TOGGLE_FAVORITE_TIMEFRAME', timeframe)
    },

    addTimeframe(value, save?: boolean) {
      if (!value) {
        return
      }

      this.$store.commit(this.paneId + '/SET_TIMEFRAME', value)

      if (
        save &&
        !this.timeframes.find(timeframe => timeframe.value == value)
      ) {
        this.$store.commit('settings/ADD_TIMEFRAME', value)

        this.$store.dispatch('app/showNotice', {
          title: `Added timeframe ${getTimeframeForHuman(value)} to the list !`
        })
      }
    },

    removeTimeframe(value) {
      this.$store.commit('settings/REMOVE_TIMEFRAME', value)
    },

    toggleEdit() {
      this.editing = !this.editing
    },

    onInput(event) {
      this.typeaheadTimeframe = event
    }
  }
}
</script>
<style lang="scss" scoped>
.timeframe-dropdown {
  &__header {
    &.dropdown-item {
      padding: 0;
      background-color: var(--theme-background-150);
    }

    button {
      visibility: hidden;
      color: var(--theme-color-100);

      &:hover {
        color: var(--theme-color-base);
      }
    }

    &:hover {
      button {
        visibility: visible;
      }
    }
  }

  &__input {
    padding: 0.5rem;
  }
}

.dropdown-item {
  .icon-star {
    display: none;
    color: var(--theme-color-o50);

    &.icon-star-filled {
      display: block;
      color: var(--theme-buy-100);
    }
  }

  &:hover {
    .icon-star {
      display: block;

      &:hover {
        color: var(--theme-color-base);
      }
    }
  }
}
</style>
