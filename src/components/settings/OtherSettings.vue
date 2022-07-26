<template>
  <div>
    <div class="form-group mb8">
      <label class="checkbox-control">
        <input
          type="checkbox"
          class="form-control"
          :checked="autoHideHeaders"
          @change="$store.commit('settings/TOGGLE_AUTO_HIDE_HEADERS')"
        />
        <div></div>
        <span>Auto hide headers</span>
      </label>
    </div>
    <div class="form-group mb8">
      <label class="checkbox-control -animations">
        <input
          type="checkbox"
          class="form-control"
          :checked="animationsEnabled"
          @change="$store.commit('settings/TOGGLE_ANIMATIONS')"
        />
        <div></div>
        <span>
          {{
            animationsEnabled
              ? 'UI animations are enabled ✨'
              : 'UI animations are disabled 🚀'
          }}
        </span>
      </label>
    </div>
    <div class="form-group mb8">
      <label class="checkbox-control -animations">
        <input
          type="checkbox"
          class="form-control"
          :checked="locked"
          @change="$store.commit('panes/TOGGLE_LAYOUT')"
        />
        <div></div>
        <span>
          {{ locked ? 'Layout is locked 🔒' : 'Layout is unlocked' }}
        </span>
      </label>
    </div>
    <div class="form-group mb8">
      <label class="checkbox-control -animations">
        <input
          type="checkbox"
          class="form-control"
          :checked="normalizeWatermarks"
          @change="$store.commit('settings/TOGGLE_NORMAMIZE_WATERMARKS')"
        />
        <div></div>
        <span>Simple watermarks</span>
      </label>
    </div>
    <div class="form-group mb8">
      <label class="checkbox-control flex-left">
        <input
          type="checkbox"
          class="form-control"
          :checked="!!timezoneOffset"
          @change="
            $store.commit(
              'settings/SET_TIMEZONE_OFFSET',
              !timezoneOffset ? new Date().getTimezoneOffset() * 60000 * -1 : 0
            )
          "
        />
        <div></div>
        <span>Use local time for charts</span>
      </label>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'

@Component({
  name: 'OtherSettings'
})
export default class extends Vue {
  responsiveEnabled: boolean = null

  get animationsEnabled() {
    return !this.$store.state.settings.disableAnimations
  }

  get autoHideHeaders() {
    return this.$store.state.settings.autoHideHeaders
  }

  get locked() {
    return this.$store.state.panes.locked
  }

  get normalizeWatermarks() {
    return this.$store.state.settings.normalizeWatermarks
  }

  get timezoneOffset() {
    return this.$store.state.settings.timezoneOffset
  }
}
</script>
