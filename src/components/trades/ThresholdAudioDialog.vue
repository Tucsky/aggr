<template>
  <Dialog @clickOutside="close" class="pane-dialog" @mousedown="clickOutsideClose = false" @mouseup="clickOutsideClose = true">
    <template v-slot:header>
      <div class="title">
        <div>Threshold</div>

        <div class="subtitle">{{ thresholdId }} {{ formatAmount(threshold.amount) }}</div>
      </div>
    </template>
    <div class="d-flex mb16">
      <p class="help-text mx0 -center">
        <i class="icon-info mr4"></i><span v-text="`Play a song when a ${formatAmount(this.min)} - ${formatAmount(this.max)} trade occur.`"></span>
      </p>
      <button class="btn -text mlauto" @click="showHelp = !showHelp"><i class="icon-down" :class="{ 'icon-up': this.showHelp }"></i> help</button>
    </div>
    <div class="help-block mb16" v-if="showHelp">
      Write a sequence of sounds using the play() function

      <blockquote>
        <code>
          play(<br /><span class="ml8" v-tippy title="Frequency (hz)">frequency: number</span>,<br />
          <span class="ml8" v-tippy title="Gain (volume, 0 is muted and 1 is a loud)">gain: number</span>,<br />
          <span class="ml8" v-tippy title="Duration (duration of the song in seconds)">duration: number</span>,<br />
          <span class="ml8" v-tippy title="Delay song by n second">wait?: number</span>,<br />
          <span class="ml8" v-tippy title="Fade in/out (duration in second)">fadeInDuration?: number</span>,<br />
          <span class="ml8" v-tippy title="Oscillator type (default to sine, either sine, square, triangle, or sawtooth)"
            >oscillatorType?: 'sine' | 'triangle' | 'square' | 'sawtooth'</span
          ><br />
          )
        </code>
      </blockquote>
      <br /><br />

      Example<br />

      <blockquote>
        // trigger 2 different 600ms frequency sounds, 80ms at a time<br />
        <code
          >play(<span v-tippy title="Frequency">659.26</span>,
          <span v-tippy title="Calculated gain (from trade size relative to thresholds)">gain * 0.5</span>,
          <span v-tippy title="Calculated duration (from trade size relative to thresholds)">duration</span>,
          <span v-tippy title="Wait (.08s before playing)">80</span>)</code
        ><br />
        <code
          >play(<span v-tippy title="Frequency">830.6</span>,
          <span v-tippy title="Calculated gain (from trade size relative to thresholds)">gain * 1.25</span>,
          <span v-tippy title="Calculated duration (from trade size relative to thresholds)">duration</span>,
          <span v-tippy title="Wait (.08s before playing)">80</span>)</code
        ><br />
      </blockquote>

      <blockquote>
        // using js Math functions<br />
        <code>play(1256, Math.log(1 + gain / 10) , 1, 0, .1, 'square')</code>
      </blockquote>
    </div>
    <div class="form-group mb16">
      <label for>
        When buy
      </label>
      <div class="d-flex">
        <textarea ref="behaveBuy" class="form-control" :value="buyAudio" @blur="setInput($event.target.value, 'buy')" spellcheck="false"></textarea>
        <button class="btn -green" @click="test('buy')">
          <i class="icon-volume-high"></i>
        </button>
      </div>
      <p v-if="buyError" class="form-feedback"><i class="icon-warning mr4"></i> {{ buyError }}</p>
    </div>
    <div class="form-group mb16">
      <label for>
        When sell
      </label>
      <div class="d-flex">
        <textarea
          ref="behaveSell"
          class="form-control"
          :value="sellAudio"
          @blur="setInput($event.target.value, 'sell')"
          spellcheck="false"
        ></textarea>
        <button class="btn -red" @click="test('sell')">
          <i class="icon-volume-high"></i>
        </button>
      </div>
      <p v-if="sellError" class="form-feedback"><i class="icon-warning mr4"></i> {{ sellError }}</p>
    </div>
    <footer>
      <a href="javascript:void(0);" class="btn -text" @click="close(false)">Cancel</a>
      <button class="btn -large" @click="saveInputs()"><i class="icon-check mr4"></i> Save</button>
    </footer>
  </Dialog>
</template>

<script>
import DialogMixin from '../../mixins/dialogMixin'
import Behave from 'behave-js'
import { formatAmount } from '@/utils/helpers'
import audioService from '@/services/audioService'
import dialogService from '@/services/dialogService'

export default {
  props: {
    paneId: {
      required: true,
      type: String
    },
    thresholdId: {
      required: true,
      type: String
    }
  },
  mixins: [DialogMixin],
  data: () => ({
    buyAudio: '',
    sellAudio: '',
    buyError: null,
    sellError: null,
    showHelp: false
  }),
  computed: {
    threshold: function() {
      if (this.thresholdId === 'liquidations') {
        return this.$store.state[this.paneId].liquidations
      }

      return this.$store.state[this.paneId].thresholds.find(t => t.id === this.thresholdId)
    },
    amounts: function() {
      return this.$store.state[this.paneId].thresholds.map(t => t.amount)
    },
    index: function() {
      return this.amounts.indexOf(this.threshold.amount)
    },
    min: function() {
      return this.threshold.amount
    },
    max: function() {
      return this.amounts[this.index + 1] || this.amounts[this.index] * 2
    }
  },
  created() {
    this._behaves = []

    if (!this.threshold) {
      return this.$nextTick(() => this.close(false))
    }

    this.buyAudio = this.threshold.buyAudio || ''
    this.sellAudio = this.threshold.sellAudio || ''
  },
  mounted() {
    this.$nextTick(() => this.initBehave())
  },
  beforeDestroy() {
    for (const behave of this._behaves) {
      behave.destroy()
    }
  },
  methods: {
    setInput(input, side) {
      this[side + 'Audio'] = input
    },
    saveInputs() {
      if (!this.validate(true)) {
        return
      }

      this.$store.commit(this.paneId + '/SET_THRESHOLD_AUDIO', {
        id: this.thresholdId,
        buyAudio: this.buyAudio,
        sellAudio: this.sellAudio
      })

      this.close(true)
    },
    validate(alert = false) {
      for (const side of ['buy', 'sell']) {
        const litteral = this[side + 'Audio']

        try {
          this.getAdapter(litteral, side)
        } catch (error) {
          if (alert) {
            dialogService.confirm({
              message: `Please check that ${side} audio script is syntactically correct.`,
              ok: 'OK',
              cancel: false
            })
          }

          return false
        }
      }

      return true
    },
    test(side) {
      let percent
      let level
      let amount

      for (let i = 0; i < this.amounts.length; i++) {
        if (this.amounts[i] < this.threshold.amount) {
          continue
        }

        if (amount && amount < this.amounts[i]) {
          break
        }

        const range = this.max - this.min

        if (range) {
          amount = this.min + Math.random() * range
          percent = amount / this.amounts[1]
        } else {
          amount = this.min
          percent = 1
        }

        level = i
      }

      if (amount) {
        const litteral = this[side + 'Audio']

        const adapter = this.getAdapter(litteral, side)

        adapter(audioService.play.bind(audioService), percent, side, level)

        this.$store.dispatch('app/showNotice', {
          id: 'testing-threshold-audio',
          type: side === 'buy' ? 'success' : 'error',
          title: 'NOW PLAYING : ' + formatAmount(amount) + ' ' + side.toUpperCase() + ' trade',
          timeout: 1000
        })
      }
    },
    formatAmount(amount) {
      return formatAmount(amount)
    },
    getAdapter(litteral, side) {
      try {
        const adapter = audioService.buildAudioFunction(litteral, side, true)

        this[side + 'Error'] = null

        return adapter
      } catch (error) {
        this[side + 'Error'] = error.message

        throw error
      }
    },
    initBehave() {
      for (const el of [this.$refs.behaveBuy, this.$refs.behaveSell]) {
        this._behaves.push(
          new Behave({
            textarea: el,
            replaceTab: true,
            softTabs: true,
            tabSize: 2,
            autoOpen: true,
            overwrite: true,
            autoStrip: true,
            autoIndent: true,
            fence: false
          })
        )
      }
    }
  }
}
</script>
