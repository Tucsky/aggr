<template>
  <div>
    <div class="form-group mb8">
      <label class="checkbox-control">
        <input
          type="checkbox"
          class="form-control"
          :checked="autoHideHeaders"
          @change="store.commit('settings/TOGGLE_AUTO_HIDE_HEADERS')"
        />
        <div></div>
        <span>Floating headers</span>
      </label>
    </div>
    <TransitionHeight :duration="5000">
      <div v-if="autoHideHeaders" key="a" class="form-group mb8">
        <label class="checkbox-control">
          <input
            type="checkbox"
            class="form-control"
            :checked="autoHideNames"
            @change="store.commit('settings/TOGGLE_AUTO_HIDE_NAMES')"
          />
          <div></div>
          <span>Auto hide names</span>
        </label>
      </div>
    </TransitionHeight>
    <div class="form-group mb8">
      <label class="checkbox-control -animations">
        <input
          type="checkbox"
          class="form-control"
          :checked="animationsEnabled"
          @change="store.commit('settings/TOGGLE_ANIMATIONS')"
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
          @change="store.commit('panes/TOGGLE_LAYOUT')"
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
          @change="store.commit('settings/TOGGLE_NORMAMIZE_WATERMARKS')"
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
            store.commit(
              'settings/SET_TIMEZONE_OFFSET',
              !timezoneOffset ? new Date().getTimezoneOffset() * 60000 * -1 : 0
            )
          "
        />
        <div></div>
        <span>Use local time for charts</span>
      </label>
    </div>
    <div class="form-group mb8">
      <label class="checkbox-control flex-left">
        <input
          type="checkbox"
          class="form-control"
          :checked="!showThresholdsAsTable"
          @change="store.commit('settings/TOGGLE_THRESHOLDS_TABLE')"
        />
        <div></div>
        <span>Use slider for thresholds</span>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import store from '@/store'
import TransitionHeight from '@/components/framework/TransitionHeight.vue'

const animationsEnabled = computed(
  () => !store.state.settings.disableAnimations
)
const autoHideHeaders = computed(() => store.state.settings.autoHideHeaders)
const autoHideNames = computed(() => store.state.settings.autoHideNames)
const locked = computed(() => store.state.panes.locked)
const normalizeWatermarks = computed(
  () => store.state.settings.normalizeWatermarks
)
const timezoneOffset = computed(() => store.state.settings.timezoneOffset)
const showThresholdsAsTable = computed(
  () => store.state.settings.showThresholdsAsTable
)
</script>
