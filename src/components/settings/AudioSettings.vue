<template>
  <div class="settings-audio" :class="{ active: useAudio }">
    <div class="-fill">
      <div class="column">
        <div class="form-group -tight">
          <label
            class="checkbox-control checkbox-control-input flex-right"
            v-tippy="{ placement: 'bottom' }"
            title="Enable audio"
          >
            <input
              type="checkbox"
              class="form-control"
              :checked="useAudio"
              @change="toggleAudio"
            />
            <div></div>
          </label>
        </div>
        <div class="form-group -fill -center">
          <Slider
            :min="0"
            :max="3"
            :step="0.01"
            :label="true"
            :value="audioVolume"
            @input="setAudioVolume"
            @reset="resetAudioVolume"
            log
          />
        </div>
      </div>

      <div class="mt8" v-if="useAudio">
        <div class="btn -text px0" v-for="filter of filters" :key="filter">
          <label
            class="checkbox-control checkbox-control-input -auto"
            v-tippy
            :title="filtersDescriptions[filter]"
          >
            <input
              type="checkbox"
              class="form-control"
              :checked="audioFilters[filter]"
              @change="toggleAudioFilter(filter, $event)"
            />
            <div :on="filter" :off="filter"></div>
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import store from '@/store'
import Slider from '../framework/picker/Slider.vue'
import audioService from '@/services/audioService'

// Define a constant for filtersDescriptions
const filtersDescriptions: Record<string, string> = {
  HighPassFilter:
    'High-Pass Filter passes frequencies above its cutoff frequency and attenuates frequencies below its cutoff frequency',
  LowPassFilter:
    'Low-Pass Filter passes frequencies below its cutoff frequency and attenuates frequencies above its cutoff frequency. This effect can therefore be used to reduce high pitched noise',
  Compressor:
    'A compressor has the ability to reduce the difference in order for the quiet notes to be louder and the peak notes to be quieter',
  Delay:
    'A delay effect is similar to an echo, in that the sound is repeated one or more times after the original sound',
  PingPongDelay:
    'Ping Pong Delay is a time-sensitive delay that pans the delay to the left and right speakers one after the other',
  Chorus:
    'An equal mix of the wet and dry signal is used with the wet signal being delayed and pitch modulated'
}

// Initialize filters as a reactive array
const filters = ref<string[]>([])

// Populate filters on component creation
onMounted(() => {
  filters.value = Object.keys(audioService.filtersOptions)
})

// Computed property to access useAudio from the store
const useAudio = computed(() => store.state.settings.useAudio)

// Computed property to access audioVolume from the store
const audioVolume = computed(() => store.state.settings.audioVolume)

// Computed property to access audioFilters from the store
const audioFilters = computed(() => store.state.settings.audioFilters)

// Method to toggle the useAudio state
const toggleAudio = () => {
  store.commit('settings/TOGGLE_AUDIO')
}

// Method to set the audio volume
const setAudioVolume = (value: number) => {
  store.dispatch('settings/setAudioVolume', value)
}

// Method to reset the audio volume to 1
const resetAudioVolume = () => {
  store.dispatch('settings/setAudioVolume', 1)
}

// Method to toggle individual audio filters
const toggleAudioFilter = (filter: string, event: Event) => {
  const target = event.currentTarget as HTMLInputElement
  store.commit('settings/SET_AUDIO_FILTER', {
    id: filter,
    value: target.checked
  })
}
</script>

<style lang="scss" scoped>
.checkbox-control.-auto > div {
  padding: 0.25rem;
}
</style>
