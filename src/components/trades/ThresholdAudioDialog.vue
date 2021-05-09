<template>
  <Dialog :open="open" @clickOutside="close" class="pane-dialog" @mousedown="clickOutsideClose = false" @mouseup="clickOutsideClose = true">
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
      <button class="btn -text -green mlauto" @click="showHelp = !showHelp">
        <i class="icon-down" :class="{ 'icon-up': this.showHelp }"></i> help
      </button>
    </div>
    <div class="help-block mb16" v-if="showHelp">
      Specify the frequency (hz), gain (0-1), decay (in sec) and stop (duration in ms, default to decay) of each sound for either it's a buy or a
      sell<br /><br />
      Exemple

      <blockquote>
        <code
          >play(<span v-tippy title="Frequency (hz)">659.26</span>, <span v-tippy title="Gain (0-1)">.5</span>,
          <span v-tippy title="Decay (seconds)">1</span>)</code
        >
        // play 111hz frequency beep for 1s
      </blockquote>
      <blockquote>
        // trigger 2 different 600ms frequency sounds, 80ms at a time<br />
        <code
          >play(<span v-tippy title="Frequency (hz)">659.26</span>, <span v-tippy title="Gain (0-1)">.5</span>,
          <span v-tippy title="Decay (seconds)">.600</span>,
          <span v-tippy title="Stop after (milliseconds, no other song will play during that time)">80</span>)</code
        ><br />
        <code
          >play(<span v-tippy title="Frequency (hz)">493.88</span>, <span v-tippy title="Gain (0-1)">.5</span>,
          <span v-tippy title="Decay (seconds)">.600</span>,
          <span v-tippy title="Stop after (milliseconds, no other song will play during that time)">80</span>)</code
        ><br />
      </blockquote>
    </div>
    <div class="form-group mb16">
      <label for>
        When buy
      </label>
      <div class="d-flex">
        <textarea ref="behaveBuy" class="form-control" rows="5" :value="buyAudio" @blur="setInput($event.target.value, 'buy')"></textarea>
        <button class="btn -green" @click="test('buy')">
          <i class="icon-volume-high"></i>
        </button>
      </div>
    </div>
    <div class="form-group mb16">
      <label for>
        When sell
      </label>
      <div class="d-flex">
        <textarea ref="behaveSell" class="form-control" rows="5" :value="sellAudio" @blur="setInput($event.target.value, 'sell')"></textarea>
        <button class="btn -red" @click="test('sell')">
          <i class="icon-volume-high"></i>
        </button>
      </div>
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
import sfxService from '@/services/sfxService'

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
    // this.$nextTick(() => this.initBehave())
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
      this.$store.commit(this.paneId + '/SET_THRESHOLD_AUDIO', {
        id: this.thresholdId,
        buyAudio: this.buyAudio,
        sellAudio: this.sellAudio
      })

      this.close(true)
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

        amount = this.min + Math.random() * range
        percent = (amount - this.min) / range
        level = i
      }

      if (amount) {
        const litteral = this[side + 'Audio']

        const adapter = sfxService.buildAudioFunction(litteral, side, this.$store.state[this.paneId].thresholds)

        adapter(sfxService.playOrQueue.bind(sfxService), percent, side, level)

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
