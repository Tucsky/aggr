<template>
  <div>
    <div class="form-group mb8">
      <label class="checkbox-control">
        <input
          type="checkbox"
          class="form-control"
          :checked="!!decimalPrecision"
          @change="$store.commit('settings/SET_DECIMAL_PRECISION', decimalPrecision ? null : 2)"
        />
        <div></div>
        <span @click.stop.prevent="$event.currentTarget.children[0].focus()">
          Round up to
          <editable placeholder="auto" :content="decimalPrecision" @output="$store.commit('settings/SET_DECIMAL_PRECISION', $event)"></editable
          >&nbsp;decimal(s)
        </span>
      </label>
    </div>
    <div class="form-group mb8">
      <label class="checkbox-control">
        <input type="checkbox" class="form-control" :checked="autoHideHeaders" @change="$store.commit('settings/TOGGLE_AUTO_HIDE_HEADERS')" />
        <div></div>
        <span>Auto hide headers</span>
      </label>
    </div>
    <div class="form-group mb8">
      <label class="checkbox-control -animations">
        <input type="checkbox" class="form-control" :checked="animationsEnabled" @change="$store.commit('settings/TOGGLE_ANIMATIONS')" />
        <div></div>
        <span>
          <small class="d-block text-muted" v-text="animationsEnabled ? 'UI animations are enabled ✨' : 'UI animations are disabled 🚀'"></small>
          <span class="d-block mt4" v-text="animationsEnabled ? 'Disable animations' : 'Enable animations'"></span>
        </span>
      </label>
    </div>
    <div class="form-group mb8">
      <label class="checkbox-control -animations">
        <input type="checkbox" class="form-control" :checked="locked" @change="$store.commit('panes/TOGGLE_LAYOUT')" />
        <div></div>
        <span>
          <small class="d-block text-muted" v-text="locked ? 'Workspace grid is locked' : 'Workspace grid is unlocked'"></small>
          <span class="d-block mt4" v-text="locked ? 'Unlock layout' : 'Lock layout'"></span>
        </span>
      </label>
    </div>
    <div class="form-group mb8">
      <label class="checkbox-control -animations">
        <input type="checkbox" class="form-control" :checked="normalizeWatermarks" @change="$store.commit('settings/TOGGLE_NORMAMIZE_WATERMARKS')" />
        <div></div>
        <span v-text="normalizeWatermarks ? 'Show normalized watermarks' : 'Show detailed watermark'"></span>
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

  get decimalPrecision() {
    return this.$store.state.settings.decimalPrecision
  }

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
}
</script>
