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
      <label class="checkbox-control">
        <input type="checkbox" class="form-control" v-model="responsiveEnabled" @change="toggleResponsive" />
        <div></div>
        <span>
          <small class="d-block text-muted" v-text="responsiveEnabled ? 'Responsive layouts are enabled' : 'Keep same layout'"></small>
          <span class="d-block mt4" v-text="responsiveEnabled ? 'Disable responsive' : 'Enable responsive'"></span>
        </span>
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

  created() {
    this.responsiveEnabled = Object.keys(this.$store.state.panes.layouts).length > 1
  }

  async toggleResponsive() {
    const success = await this.$store.dispatch('panes/toggleResponsive')

    console.log('success', success)

    if (!success) {
      this.responsiveEnabled = !this.responsiveEnabled
    }
  }
}
</script>
