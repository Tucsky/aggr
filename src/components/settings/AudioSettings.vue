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
              @change="
                $store.commit('settings/TOGGLE_AUDIO', $event.target.checked)
              "
            />
            <div></div>
          </label>
        </div>
        <div class="form-group -fill -center">
          <slider
            :min="0"
            :max="3"
            :step="0.01"
            :label="true"
            :value="audioVolume"
            @input="$store.dispatch('settings/setAudioVolume', $event)"
            @reset="$store.dispatch('settings/setAudioVolume', 1)"
            log
          ></slider>
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
              :checked="$store.state.settings.audioFilters[filter]"
              @change="
                $store.commit('settings/SET_AUDIO_FILTER', {
                  id: filter,
                  value: $event.target.checked
                })
              "
            />
            <div :on="filter" :off="filter"></div>
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import audioService from '@/services/audioService'
import { Component, Vue } from 'vue-property-decorator'
import Slider from '../framework/picker/Slider.vue'

@Component({
  components: { Slider },
  name: 'AudioSettings'
})
export default class AudioSettings extends Vue {
  filters: string[] = []
  filtersDescriptions = {
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

  get useAudio() {
    return this.$store.state.settings.useAudio
  }

  get audioVolume() {
    return this.$store.state.settings.audioVolume
  }

  created() {
    this.filters = Object.keys(audioService.filtersOptions)
  }
}
</script>
<style lang="scss" scoped>
.checkbox-control.-auto > div {
  padding: 0.25rem;
}
</style>
