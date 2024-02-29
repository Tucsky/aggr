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
      const minute = 60
      const hour = minute * 60
      const units = ['seconds', 'minutes', 'hours', 'ticks', 'bps', 'vol']

      return this.timeframes
        .map(timeframe => {
          const modifier = timeframe.value[timeframe.value.length - 1]
          let weight
          if (modifier === 't') {
            weight = 3
          } else if (modifier === 'b') {
            weight = 4
          } else if (modifier === 'v') {
            weight = 5
          } else if (timeframe.value >= hour) {
            weight = 2
          } else if (timeframe.value >= minute) {
            weight = 1
          } else {
            weight = 0
          }

          return {
            ...timeframe,
            weight
          }
        })
        .sort((a, b) => {
          if (a.weight !== b.weight) {
            return a.weight - b.weight
          }

          return parseFloat(a.value) - parseFloat(b.value)
        })
        .reduce((acc, timeframe) => {
          let group = acc[acc.length - 1]

          if (!group || group.weight < timeframe.weight) {
            group =
              acc[
                acc.push({
                  title: units[timeframe.weight],
                  weight: timeframe.weight,
                  timeframes: []
                }) - 1
              ]
          }

          group.timeframes.push(timeframe)

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
