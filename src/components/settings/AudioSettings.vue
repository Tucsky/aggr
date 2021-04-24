<template>
  <div class="settings-audio -activable column" :class="{ active: useAudio }">
    <div class="form-group -tight">
      <label class="checkbox-control -on-off checkbox-control-input flex-right" v-tippy="{ placement: 'bottom' }" title="Enable audio">
        <input type="checkbox" class="form-control" :checked="useAudio" @change="$store.commit('settings/TOGGLE_AUDIO', $event.target.checked)" />
        <div></div>
      </label>
    </div>
    <div class="form-group -tight">
      <label class="checkbox-control checkbox-control-input flex-right" v-tippy title="Include orders down to 10% of significant orders">
        <input
          type="checkbox"
          class="form-control"
          :checked="audioIncludeInsignificants"
          @change="$store.commit('settings/TOGGLE_AUDIO_TEN_PERCENT', $event.target.checked)"
        />
        <div class="icon-sound-wave"></div>
      </label>
    </div>
    <div class="form-group -fill">
      <slider
        :min="0"
        :max="10"
        :step="0.1"
        :editable="false"
        :value="audioVolume"
        @change="$store.dispatch('settings/setAudioVolume', $event.target.value)"
        @reset="$store.dispatch('settings/setAudioVolume', 1.5)"
      ></slider>
    </div>
    <div class="form-group -fill">
      <slider
        :min="0.25"
        :max="2.5"
        :step="0.05"
        :editable="false"
        :value="audioPitch"
        @change="$store.commit('settings/SET_AUDIO_PITCH', $event.target.value)"
        @reset="$store.commit('settings/SET_AUDIO_PITCH', 1)"
      ></slider>
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

  get audioIncludeInsignificants() {
    return this.$store.state.settings.audioIncludeInsignificants
  }

  get audioVolume() {
    return this.$store.state.settings.audioVolume
  }

  get audioPitch() {
    return this.$store.state.settings.audioPitch
  }
}
</script>
