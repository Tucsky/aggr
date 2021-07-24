<template>
  <Dialog @clickOutside="hide" class="-timeframe">
    <template v-slot:header>
      <div>
        <div class="title">Timeframe</div>
        <div class="subtitle pl0" v-text="paneName"></div>
      </div>

      <div class="column -center"></div>
    </template>
    <form @submit.prevent="submit">
      <div class="text-center">
        <div contenteditable class="form-control w-100" ref="input" @input="onInput" @keydown="onKeyDown" :placeholder="placeholder"></div>
      </div>

      <div class="timeframe-for-human">
        <code v-if="valid" class="text-muted" v-text="'= ' + timeframeForHuman"></code>
        <code v-else class="form-feedback">Unknown timeframe</code>
      </div>

      <footer>
        <button type="submit" class="btn -green ml8 -large">Go</button>
      </footer>
    </form>
  </Dialog>
</template>

<script>
import DialogMixin from '@/mixins/dialogMixin'
import { getTimeframeForHuman } from '@/utils/helpers'

export default {
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
      const normalized = this.format(this.newTimeframe)

      return getTimeframeForHuman(normalized)
    },
    valid() {
      return this.timeframeForHuman !== null
    }
  },
  watch: {
    '$store.state.app.showSearch': function(value) {
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
  mounted() {
    this.$nextTick(() => {
      this.$refs.input.focus()
    })
  },
  methods: {
    onInput(event) {
      this.newTimeframe = event.currentTarget.innerText
    },
    onKeyDown(event) {
      if (this.disabled || event.which === 13) {
        event.preventDefault()

        this.submit()

        return
      }
    },
    submit() {
      if (!this.valid) {
        return
      }

      const timeframe = this.format(this.newTimeframe)

      this.$store.commit(this.paneId + '/SET_TIMEFRAME', timeframe)

      this.hide()
    },
    hide() {
      this.$store.dispatch('app/hideSearch')
    },
    format(input) {
      const trimmed = input.trim()

      let output

      if (/t$|ticks?$/i.test(trimmed)) {
        return (output = parseInt(trimmed) + 't')
      } else {
        if (/ms$/.test(trimmed)) {
          output = parseFloat(trimmed) / 1000
        } else if (/h$/.test(trimmed)) {
          output = parseFloat(trimmed) * 60 * 60
        } else if (/m$/.test(trimmed)) {
          output = parseFloat(trimmed) * 60
        } else {
          output = parseFloat(trimmed)
        }
      }

      return output
    }
  }
}
</script>
<style lang="scss">
.dialog.-timeframe {
  .dialog-content {
    min-width: 0;

    .form-control {
      font-size: 2rem;
      font-family: $font-monospace;
      text-align: center;
      padding: 0.5em;
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
