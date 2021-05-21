<template>
  <div class="settings-audio" :class="{ active: useAudio }">
    <div class="-fill">
      <div class="column">
        <div class="form-group -tight">
          <label class="checkbox-control checkbox-control-input flex-right" v-tippy="{ placement: 'bottom' }" title="Enable audio">
            <input type="checkbox" class="form-control" :checked="useAudio" @change="$store.commit('settings/TOGGLE_AUDIO', $event.target.checked)" />
            <div></div>
          </label>
        </div>
        <div class="form-group -fill -center">
          <slider
            :min="0"
            :max="2"
            :step="0.1"
            :editable="false"
            :value="audioVolume"
            @input="$store.dispatch('settings/setAudioVolume', $event)"
            @reset="$store.dispatch('settings/setAudioVolume', 1)"
          ></slider>
        </div>
      </div>

      <div class="column mt8" v-if="useAudio">
        <div class="form-group">
          <label
            class="checkbox-control checkbox-control-input -auto"
            v-tippy
            title="A compressor has the ability to reduce the difference in order for the quiet notes to be louder and the peak notes to be quieter"
          >
            <input
              type="checkbox"
              class="form-control"
              :checked="audioCompressor"
              @change="$store.commit('settings/TOGGLE_AUDIO_COMPRESSOR', $event.target.checked)"
            />
            <div on="compressor" off="compressor"></div>
          </label>
        </div>
        <div class="form-group">
          <label
            class="checkbox-control checkbox-control-input -auto"
            v-tippy
            title="High-Pass Filter passes frequencies above its cutoff frequency and attenuates frequencies below its cutoff frequency"
          >
            <input
              type="checkbox"
              class="form-control"
              :checked="audioFilter"
              @change="$store.commit('settings/TOGGLE_AUDIO_FILTER', $event.target.checked)"
            />
            <div on="filter" off="filter"></div>
          </label>
        </div>
        <div class="form-group">
          <label
            class="checkbox-control checkbox-control-input -auto"
            v-tippy
            title="A delay effect is similar to an echo, in that the sound is repeated one or more times after the original sound"
          >
            <input
              type="checkbox"
              class="form-control"
              :checked="audioDelay"
              @change="$store.commit('settings/TOGGLE_AUDIO_DELAY', $event.target.checked)"
            />
            <div on="delay" off="delay"></div>
          </label>
        </div>
        <div class="form-group">
          <label
            class="checkbox-control checkbox-control-input -auto"
            v-tippy
            title="Ping Pong Delay is a time-sensitive delay that pans the delay to the left and right speakers one after the other"
          >
            <input
              type="checkbox"
              class="form-control"
              :checked="audioPingPong"
              @change="$store.commit('settings/TOGGLE_AUDIO_PING_PONG', $event.target.checked)"
            />
            <div on="pingpong" off="pingpong"></div>
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import Slider from '../framework/picker/Slider.vue'

@Component({
  components: { Slider },
  name: 'AudioSettings'
})
export default class extends Vue {
  get useAudio() {
    return this.$store.state.settings.useAudio
  }

  get audioVolume() {
    return this.$store.state.settings.audioVolume
  }

  get audioCompressor() {
    return this.$store.state.settings.audioCompressor
  }

  get audioFilter() {
    return this.$store.state.settings.audioFilter
  }

  get audioPingPong() {
    return this.$store.state.settings.audioPingPong
  }

  get audioDelay() {
    return this.$store.state.settings.audioDelay
  }
}
</script>
<style lang="scss" scoped>
.checkbox-control.-auto > div {
  padding: 0.25em;
}
</style>
