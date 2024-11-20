<template>
  <div
    class="indicator-options hide-scrollbar"
    :class="[
      tab && `indicator-options--tab`,
      column && `indicator-options--column`
    ]"
  >
    <div
      v-if="showSearch"
      class="indicator-search input-group"
      :class="[navigation.optionsQuery && 'indicator-search--active']"
    >
      <input
        type="text"
        class="form-control"
        placeholder="search option..."
        v-model="navigation.optionsQuery"
      />
      <button
        v-if="navigation.optionsQuery"
        type="button"
        class="btn -text -small"
        @click="navigation.optionsQuery = ''"
      >
        <i class="icon-cross"></i>
      </button>
    </div>
    <div
      v-if="navigation.optionsQuery.length"
      class="indicator-options__list indicator-search__results"
    >
      <indicator-option
        v-for="key in queryOptionsKeys"
        :key="key"
        :name="key"
        :pane-id="paneId"
        :indicator-id="indicatorId"
        :plot-types="indicatorOptions.plotTypes"
      />
      <p v-if="!queryOptionsKeys.length">No results</p>
    </div>
    <template v-else>
      <ToggableSection
        v-if="indicatorOptions.script.length"
        :badge="indicatorOptions.script.length"
        title="Script"
        :id="getSectionId('indicator-left-script')"
      >
        <div class="indicator-options__grid">
          <indicator-option
            v-for="key in indicatorOptions.script"
            :key="key"
            class="indicator-options__option"
            :name="key"
            :pane-id="paneId"
            :indicator-id="indicatorId"
            :plot-types="indicatorOptions.plotTypes"
            ensure
          />
        </div>
      </ToggableSection>
      <ToggableSection
        v-if="indicatorOptions.colors.length"
        :badge="indicatorOptions.colors.length"
        title="Colors"
        :id="getSectionId('indicator-left-colors')"
      >
        <div class="indicator-options__grid">
          <indicator-option
            v-for="key in indicatorOptions.colors"
            :key="key"
            class="indicator-options__option"
            :name="key"
            :pane-id="paneId"
            :indicator-id="indicatorId"
            :plot-types="indicatorOptions.plotTypes"
          />
        </div>
      </ToggableSection>
      <ToggableSection
        v-if="indicatorOptions.default.length"
        :badge="indicatorOptions.default.length"
        title="Other options"
        :id="getSectionId('indicator-left-other')"
      >
        <div class="indicator-options__grid">
          <indicator-option
            v-for="key in indicatorOptions.default"
            :key="key"
            class="indicator-options__option"
            :name="key"
            :pane-id="paneId"
            :indicator-id="indicatorId"
            :plot-types="indicatorOptions.plotTypes"
          />
        </div>
      </ToggableSection>
      <div v-if="column" class="mx8">
        <IndicatorScaleButton
          class="form-control -outline btn d-flex -gap8 w-100 -arrow"
          :indicator-id="indicatorId"
          :pane-id="paneId"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import ToggableSection from '@/components/framework/ToggableSection.vue'
import IndicatorOption from '@/components/chart/IndicatorOption.vue'

import { useIndicatorNavigation } from './useIndicatorNavigation'
import { computed } from 'vue'
import { useIndicatorOptions } from './useIndicatorOptions'
import IndicatorScaleButton from './IndicatorScaleButton.vue'
const { navigation } = useIndicatorNavigation()

const props = defineProps({
  paneId: String,
  indicatorId: String,
  column: Boolean,
  tab: Boolean,
  showSearch: Boolean
})

const getSectionId = id => {
  if (props.column) {
    return null
  }

  return id
}

// Assuming navigation and keys are already defined as reactive properties or refs
const queryOptionsKeys = computed(() => {
  if (!navigation.optionsQuery.length) {
    return []
  }

  const query = new RegExp(navigation.optionsQuery, 'i')

  // Combine script, default, and color keys and filter by query
  return [
    ...indicatorOptions.script,
    ...indicatorOptions.default,
    ...indicatorOptions.colors
  ].filter(key => query.test(key))
})

// inject

const { indicatorOptions } = useIndicatorOptions(
  props.paneId,
  props.indicatorId
)
</script>

<style lang="scss" scoped>
.indicator-search {
  backdrop-filter: blur(0.25rem);
  background-color: var(--theme-background-o75);
  position: sticky;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1;

  input {
    border: 0;
    background: 0;
    color: inherit;
    padding: 1rem;
    border-radius: 0;
  }

  &__results {
    padding: 1rem;
  }
}

.indicator-options {
  position: relative;

  &--tab {
    display: block;
    overflow: auto;
    flex-grow: 1;
  }

  &--column {
    width: 15rem;
    flex-shrink: 0;
    flex-direction: column;
    display: none;
    overflow-y: auto;
    max-height: 100%;

    .dialog--small & {
      width: 100%;
      display: none;
    }

    @media screen and (min-width: 768px) {
      display: flex;
    }
  }

  &__grid {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: center;
    justify-content: stretch;
    container-type: inline-size;

    .indicator-options__option {
      margin: 0;
      flex-basis: 0;
      min-width: 150px;
      flex-shrink: 0;
      flex-grow: 1;

      @container (min-width: 0px) {
        max-width: none;
        min-width: 0;
        flex-grow: 0;
        flex-basis: 100%;
        width: 100%;
      }

      @container (min-width: 420px) {
        flex-basis: calc(50% - 0.5rem);
        width: calc(50% - 0.5rem);
      }

      @container (min-width: 580px) {
        flex-basis: calc(33% - 0.66rem);
        width: calc(33% - 0.66rem);
      }

      @container (min-width: 768px) {
        flex-basis: calc(25% - 0.75rem);
        width: calc(25% - 0.75rem);
      }
    }
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
}
</style>
