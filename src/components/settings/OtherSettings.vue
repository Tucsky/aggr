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
        <input type="checkbox" class="form-control" :checked="disableAnimations" @change="$store.commit('settings/TOGGLE_ANIMATIONS')" />
        <div></div>
        <span>Animation are {{ disableAnimations ? 'disabled globally 🚀' : 'enabled ✨' }}</span>
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
  get decimalPrecision() {
    return this.$store.state.settings.decimalPrecision
  }

  get disableAnimations() {
    return this.$store.state.settings.disableAnimations
  }
}
</script>
