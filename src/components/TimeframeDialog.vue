<template>
  <transition name="dialog" :duration="300" @after-leave="close">
    <Dialog v-if="opened" @close="hide" class="-timeframe">
      <template v-slot:header>
        <div class="dialog__title">Timeframe</div>
      </template>
      <form @submit.prevent="submit" ref="form">
        <div class="text-center">
          <timeframe-input
            :placeholder="placeholder"
            @update:modelValue="onTimeframe"
            @submit="submit"
            class="form-control w-100"
          />
        </div>

        <div class="timeframe-for-human">
          <code
            v-if="valid"
            class="text-muted"
            v-text="'= ' + timeframeForHuman"
          ></code>
          <code v-else class="form-feedback">Unknown timeframe</code>
        </div>
      </form>

      <template v-slot:footer>
        <button type="button" class="btn -green ml8 -large" @click="submit">
          Go
        </button>
      </template>
    </Dialog>
  </transition>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useDialog } from '@/composables/useDialog'
import Dialog from '@/components/framework/Dialog.vue'
import TimeframeInput from './chart/TimeframeInput.vue'
import { getTimeframeForHuman } from '@/utils/helpers'
import store from '@/store'

// Initialize dialog logic
const { opened, close, hide } = useDialog()
defineExpose({ close })

// Props
const props = defineProps({
  timeframe: {
    type: String,
    required: false
  }
})

// Reactive state
const newTimeframe = ref('')
const paneId = ref<string | null>(null)
const placeholder = ref<string | null>(null)

const timeframeForHuman = computed(() =>
  getTimeframeForHuman(newTimeframe.value)
)
const valid = computed(() => timeframeForHuman.value !== null)

// Watchers
watch(
  () => store.state.app.showSearch,
  value => {
    if (!value) {
      hide(false)
    }
  }
)

// Lifecycle hooks
onMounted(() => {
  paneId.value = store.state.app.focusedPaneId

  if (props.timeframe) {
    newTimeframe.value = props.timeframe
  }

  placeholder.value = store.state[paneId.value]?.timeframe || null
})

// Methods
const onTimeframe = (timeframe: any) => {
  newTimeframe.value = timeframe ? timeframe.value : null
}

const submit = () => {
  if (!valid.value) {
    return
  }

  store.commit(`${paneId.value}/SET_TIMEFRAME`, newTimeframe.value)
  hide()
}
</script>

<style lang="scss">
.dialog.-timeframe {
  .dialog__content {
    min-width: 0;

    .form-control {
      font-size: 2rem;
      font-family: $font-monospace;
      text-align: center;
      padding: 0.5rem;
      border: 0;
    }

    .timeframe-for-human {
      padding: 0.5rem 1rem 0;
      text-align: center;
      font-size: 1.125rem;
    }
  }
}
</style>
