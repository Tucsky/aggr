<template>
  <Dialog @clickOutside="hide" class="-timeframe">
    <template v-slot:header>
      <div class="dialog__title">Timeframe</div>
    </template>
    <form @submit.prevent="submit" ref="form">
      <div class="text-center">
        <timeframe-input
          :placeholder="placeholder"
          @input="onTimeframe"
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
</template>

<script>
import DialogMixin from '@/mixins/dialogMixin'
import { getTimeframeForHuman } from '@/utils/helpers'
import TimeframeInput from './chart/TimeframeInput.vue'

export default {
  components: { TimeframeInput },
  props: {
    timeframe: {
      type: String
    }
  },
  mixins: [DialogMixin],
  data: () => ({
    newTimeframe: '',
    paneId: null
  }),
  computed: {
    paneName() {
      return this.$store.state.panes.panes[this.paneId].name || this.paneId
    },
    timeframeForHuman() {
      return getTimeframeForHuman(this.newTimeframe)
    },
    valid() {
      return this.timeframeForHuman !== null
    }
  },
  watch: {
    '$store.state.app.showSearch': function (value) {
      if (!value) {
        this.close(false)
      }
    }
  },
  created() {
    this.paneId = this.$store.state.app.focusedPaneId

    if (this.timeframe) {
      this.newTimeframe = this.timeframe
    }

    this.placeholder = this.$store.state[this.paneId].timeframe
  },
  methods: {
    hide() {
      this.$store.dispatch('app/hideSearch')
    },
    onTimeframe(timeframe) {
      this.newTimeframe = timeframe ? timeframe.value : null
    },
    submit() {
      if (!this.valid) {
        return
      }

      this.$store.commit(this.paneId + '/SET_TIMEFRAME', this.newTimeframe)

      this.hide()
    }
  }
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
