<template>
  <div class="timeframe-dropdown">
    <div class="dropdown-item timeframe-dropdown__header" @click.stop>
      <timeframe-input
        @input="onInput"
        @submit="addTimeframe"
        placeholder="enter tf."
        class="timeframe-dropdown__input"
      />
      <div
        v-if="typeaheadTimeframe && typeaheadTimeframe.value"
        class="text-nowrap text-monospace text-muted"
      >
        ~ {{ typeaheadTimeframe.label }}
      </div>
      <button type="button" class="btn -text" @click="toggleEdit">
        <i :class="editing ? 'icon-cross' : 'icon-edit'"></i>
      </button>
    </div>
    <section
      v-for="group in groups"
      :key="group.title"
      class="section section--small"
    >
      <div
        v-if="timeframeGroups.indexOf(group.title) !== -1"
        class="section__content"
      >
        <button
          v-for="timeframe in group.timeframes"
          :key="timeframe.value"
          type="button"
          class="dropdown-item dropdown-item--space-between"
          @click="$emit('timeframe', timeframe.value)"
        >
          <span>{{ timeframe.label }}</span>

          <i
            v-if="editing"
            class="icon-trash"
            @click.stop="removeTimeframe(timeframe.value)"
          ></i>
          <i
            v-else
            class="icon-star"
            :class="{ 'icon-star-filled': favoriteTimeframes[timeframe.value] }"
            @click.stop="toggleFavoriteTimeframe(timeframe.value)"
          ></i>
        </button>
      </div>
      <div class="section__title" @click.stop="toggleGroup(group)">
        {{ group.title }} <i class="icon-up-thin"></i>
      </div>
    </section>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import TimeframeInput from '@/components/chart/TimeframeInput.vue'
import { getTimeframeForHuman } from '@/utils/helpers'

@Component({
  name: 'TimeframeDropdown',
  components: {
    TimeframeInput
  },
  props: {
    paneId: {
      type: String,
      required: true
    }
  }
})
export default class extends Vue {
  private paneId: string
  editing = false
  typeaheadTimeframe = null

  get timeframes() {
    return this.$store.state.settings.timeframes
  }

  get favoriteTimeframes() {
    return this.$store.state.settings.favoriteTimeframes
  }

  get timeframeGroups() {
    return this.$store.state.settings.timeframeGroups
  }

  created() {
    console.log('create timeframe dropdown')
  }

  mounted() {
    console.log('mount timeframe dropdown')
  }

  get groups() {
    console.log('get timeframe sections')
    const units = ['seconds', 'minutes', 'hours', 'ticks']
    let unit = -1
    const minute = 60
    const hour = minute * 60
    const day = hour * 24

    const typeahead = this.typeaheadTimeframe

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

  toggleGroup(group) {
    this.$store.commit('settings/TOGGLE_TIMEFRAME_GROUP', group.title)
  }

  toggleFavoriteTimeframe(timeframe) {
    this.$store.commit('settings/TOGGLE_FAVORITE_TIMEFRAME', timeframe)
  }

  addTimeframe(value) {
    if (!value) {
      return
    }

    this.$store.commit(this.paneId + '/SET_TIMEFRAME', value)

    if (!this.timeframes.find(timeframe => timeframe.value == value)) {
      this.$store.commit('settings/ADD_TIMEFRAME', value)

      this.$store.dispatch('app/showNotice', {
        title: `Added timeframe ${getTimeframeForHuman(value)} to the list !`
      })
    }
  }

  removeTimeframe(value) {
    this.$store.commit('settings/REMOVE_TIMEFRAME', value)
  }

  toggleEdit() {
    this.editing = !this.editing
  }

  async onInput(event) {
    this.typeaheadTimeframe = event

    await this.$nextTick()

    const groupsIds = Object.keys(this.groups)

    if (
      groupsIds.length === 1 &&
      this.timeframeGroups.indexOf(this.groups[groupsIds[0]].title) === -1
    ) {
      this.toggleGroup(this.groups[groupsIds[0]])
    }
  }
}
</script>
<style lang="scss" scoped>
.timeframe-dropdown {
  &__header {
    &.dropdown-item {
      padding: 0;
    }

    button {
      visibility: hidden;
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

.section {
  background: 0;

  &__content {
    margin: -0.5rem;
  }

  &__title {
    opacity: 0.5;
  }

  &:hover {
    .section__title {
      opacity: 1;
    }
  }
}

.dropdown-item {
  .icon-star {
    display: none;

    &.icon-star-filled {
      display: block;
      color: var(--theme-buy-100);
    }
  }

  &:hover {
    .icon-star {
      display: block;
    }
  }
}
</style>
