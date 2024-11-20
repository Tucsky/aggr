<template>
  <dropdown :value="value" @input="$emit('input', $event)">
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
<script setup lang="ts">
import { ref, computed, defineProps } from 'vue'
import TimeframeInput from '@/components/chart/TimeframeInput.vue'
import ToggableSection from '@/components/framework/ToggableSection.vue'
import { getTimeframeForHuman } from '@/utils/helpers'
import store from '@/store'

// Define props
const props = defineProps<{
  paneId: string
  value: HTMLButtonElement | null
}>()

// Reactive state
const editing = ref(false)
const typeaheadTimeframe = ref<any>(null)

// Computed properties
const timeframes = computed(() => store.state.settings.timeframes)
const favoriteTimeframes = computed(
  () => store.state.settings.favoriteTimeframes
)

const groups = computed(() => {
  const minute = 60
  const hour = minute * 60
  const units = ['seconds', 'minutes', 'hours', 'ticks', 'bps', 'vol']

  return timeframes.value
    .map((timeframe: any) => {
      const modifier = timeframe.value[timeframe.value.length - 1]
      let weight
      if (modifier === 't') weight = 3
      else if (modifier === 'b') weight = 4
      else if (modifier === 'v') weight = 5
      else if (timeframe.value >= hour) weight = 2
      else if (timeframe.value >= minute) weight = 1
      else weight = 0

      return { ...timeframe, weight }
    })
    .sort((a: any, b: any) => {
      if (a.weight !== b.weight) return a.weight - b.weight
      return parseFloat(a.value) - parseFloat(b.value)
    })
    .reduce((acc: any[], timeframe: any) => {
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
})

// Methods
function toggleFavoriteTimeframe(timeframe: any) {
  store.commit('settings/TOGGLE_FAVORITE_TIMEFRAME', timeframe)
}

function addTimeframe(value: any, save?: boolean) {
  if (!value) return

  store.commit(`${props.paneId}/SET_TIMEFRAME`, value)

  if (
    save &&
    !timeframes.value.find((timeframe: any) => timeframe.value == value)
  ) {
    store.commit('settings/ADD_TIMEFRAME', value)
    store.dispatch('app/showNotice', {
      title: `Added timeframe ${getTimeframeForHuman(value)} to the list!`
    })
  }
}

function removeTimeframe(value: any) {
  store.commit('settings/REMOVE_TIMEFRAME', value)
}

function toggleEdit() {
  editing.value = !editing.value
}

function onInput(event: any) {
  typeaheadTimeframe.value = event
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

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      .icon-star {
        display: block;

        &:hover {
          color: var(--theme-color-base);
        }
      }
    }
  }

  @media (hover: none) and (pointer: coarse) {
    .icon-star {
      display: block;
    }
  }
}
</style>
