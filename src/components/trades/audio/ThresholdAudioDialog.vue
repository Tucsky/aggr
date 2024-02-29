<template>
  <Dialog
    @clickOutside="close"
    class="pane-dialog -auto"
    @mousedown="clickOutsideClose = false"
    @mouseup="clickOutsideClose = true"
  >
    <template #header>
      <div class="d-flex">
        <div class="dialog__title -center">Threshold</div>
        <code class="ml4 -filled">
          <small>{{ formatAmount(threshold.amount) }}</small>
        </code>
      </div>
    </template>
    <div class="form-group mb16">
      <label for> When buy </label>
      <div
        class="live-annotation"
        v-if="liveAnnotation && focusedSide === 'buy'"
      >
        <div class="live-annotation__tooltip">{{ liveAnnotation }}</div>
      </div>
      <div
        class="d-flex"
        @drop="handleDrop($event, 'buy')"
        @dragover="handleDrop($event, 'buy')"
        @dragenter="handleDropEnter('buy')"
        @dragleave="handleDropLeave"
      >
        <button
          v-if="buyAudio !== threshold.buyAudio"
          class="btn -green mr8"
          @click="testOriginal('buy', $event)"
          title="Original"
          v-tippy
        >
          <i class="icon-volume-high"></i>
        </button>
        <textarea
          class="form-control -code"
          v-model="buyAudio"
          :class="[dropping === 'buy' && '-dropping']"
          @blur="liveAnnotation = null"
          @focus="scheduleLiveAnnotation($event, 'buy')"
          @keyup="scheduleLiveAnnotation($event, 'buy')"
          @click="scheduleLiveAnnotation($event, 'buy')"
        ></textarea>
        <button
          class="btn -green ml8"
          :class="[loopingSide === 'buy' && 'shake-hard']"
          @click="testCustom('buy', $event)"
          @dblclick="loopSide('buy')"
          title="Custom"
        >
          <i class="icon-volume-high"></i>
        </button>
      </div>

      <div v-if="focusedSide === 'buy'" class="mt8 d-flex">
        <button
          class="btn -green -small"
          @click="openSoundAssistant('play', 'buy')"
        >
          <i class="icon-music-note mr8"></i> Synthetize sound
        </button>
        <button
          class="btn -green -small ml8 mr8"
          @click="openSoundAssistant('playurl', 'buy')"
        >
          <i class="icon-upload mr8"></i> Import audio
        </button>
        <button class="btn -small -red mlauto -text" @click="reset('buy')">
          <i class="icon-eraser mr8"></i> Reset
        </button>
      </div>

      <p v-if="buyError" class="form-feedback">
        <i class="icon-warning mr4"></i> {{ buyError }}
      </p>
    </div>
    <div class="form-group mb16">
      <label for> When sell </label>
      <div
        class="live-annotation"
        v-if="liveAnnotation && focusedSide === 'sell'"
      >
        <div class="live-annotation__tooltip">{{ liveAnnotation }}</div>
      </div>
      <div
        class="d-flex"
        @drop="handleDrop($event, 'sell')"
        @dragover="handleDrop($event, 'sell')"
        @dragenter="handleDropEnter('sell')"
        @dragleave="handleDropLeave"
      >
        <button
          v-if="sellAudio !== threshold.sellAudio"
          class="btn -red mr8"
          @click="testOriginal('sell', $event)"
          title="Original"
          v-tippy
        >
          <i class="icon-volume-high"></i>
        </button>
        <textarea
          class="form-control -code"
          v-model="sellAudio"
          :class="[dropping === 'sell' && '-dropping']"
          @blur="liveAnnotation = null"
          @focus="scheduleLiveAnnotation($event, 'sell')"
          @keyup="scheduleLiveAnnotation($event, 'sell')"
          @click="scheduleLiveAnnotation($event, 'sell')"
        ></textarea>
        <button
          class="btn -red ml8"
          :class="[loopingSide === 'sell' && 'shake-hard']"
          @click="testCustom('sell', $event)"
          @dblclick="loopSide('sell')"
        >
          <i class="icon-volume-high"></i>
        </button>
      </div>

      <div v-if="focusedSide === 'sell'" class="mt8 d-flex">
        <button
          class="btn -red -small"
          @click="openSoundAssistant('play', 'sell')"
        >
          <i class="icon-music-note mr8"></i> Synthetize sound
        </button>
        <button
          class="btn -red -small ml8 mr8"
          @click="openSoundAssistant('playurl', 'sell')"
        >
          <i class="icon-upload mr8"></i> Import audio
        </button>
        <button class="btn -small -red mlauto -text" @click="reset('sell')">
          <i class="icon-eraser mr8"></i> Reset
        </button>
      </div>

      <p v-if="sellError" class="form-feedback">
        <i class="icon-warning mr4"></i> {{ sellError }}
      </p>
    </div>
    <template v-slot:footer>
      <a
        href="javascript:void(0);"
        class="btn -text mrauto"
        @click="restartWebAudio()"
        v-tippy
        title="Restart audio service (clear ALL queue)"
      >
        <i class="icon-refresh mr8"></i> Restart audio
      </a>
      <a href="javascript:void(0);" class="btn -text mr8" @click="close(false)"
        >Cancel</a
      >
      <button class="btn -large -green" @click="saveInputs()">
        <i class="icon-check mr4"></i> Save
      </button>
    </template>
  </Dialog>
</template>

<script lang="ts">
import DialogMixin from '@/mixins/dialogMixin'
import {
  findClosingBracketMatchIndex,
  parseFunctionArguments
} from '@/utils/helpers'
import { formatAmount } from '@/services/productsService'
import audioService, {
  audioParametersDefinitions,
  audioParametersDescriptions
} from '@/services/audioService'
import dialogService from '@/services/dialogService'
import AudioAssistantDialog from './AudioAssistantDialog.vue'
import panesSettings from '@/store/panesSettings'
import workspacesService from '@/services/workspacesService'
import importService from '@/services/importService'

export default {
  props: {
    paneId: {
      required: true,
      type: String
    },
    thresholds: {
      required: true
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
    showHelp: false,
    focusedSide: null,
    loopingSide: null,
    dropping: null,
    liveAnnotation: null,
    uploadedSounds: []
  }),
  computed: {
    threshold: function () {
      return this.thresholds.find(t => t.id === this.thresholdId)
    },
    amounts: function () {
      return this.thresholds.map(t => t.amount)
    },
    audioPitch: function () {
      return this.$store.state[this.paneId].audioPitch
    },
    audioVolume: function () {
      return this.$store.state[this.paneId].audioVolume
    },
    index: function () {
      return this.amounts.indexOf(this.threshold.amount)
    },
    min: function () {
      return this.threshold.amount
    },
    max: function () {
      return this.amounts[this.index + 1] || this.amounts[this.index] * 2
    }
  },
  created() {
    if (!this.threshold) {
      return this.$nextTick().then(() => this.close(false))
    }

    this.buyAudio = this.threshold.buyAudio || ''
    this.sellAudio = this.threshold.sellAudio || ''
  },
  beforeDestroy() {
    if (this._loopingTimeout) {
      clearTimeout(this._loopingTimeout)
      this._loopingTimeout = false
    }

    for (const name of this.uploadedSounds) {
      workspacesService.removeSound(name).then(() => {
        this.$store.dispatch('app/showNotice', {
          title: `Deleted ${name} (canceled)`,
          type: 'info'
        })
      })
    }
  },
  methods: {
    setInput(input, side) {
      this[side + 'Audio'] = input
      this.liveAnnotation = null
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

      this.uploadedSounds.splice(0, this.uploadedSounds.length)

      this.close(true)
    },
    validate(alert = false) {
      for (const side of ['buy', 'sell']) {
        const litteral = this[side + 'Audio']

        try {
          this.emulateAudioFunction(litteral, side)
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
    async testCustom(side, event, litteral) {
      if (this._loopingTimeout) {
        this.stopLoop()
      }

      if (!litteral) {
        litteral = this[side + 'Audio']
      }

      return await this.test(litteral, side, event)
    },
    testOriginal(side, event) {
      if (this._loopingTimeout) {
        this.stopLoop()
      }

      const litteral = this.threshold[side + 'Audio']

      this.test(litteral, side, event)
    },
    stopLoop() {
      if (!this._loopingTimeout) {
        return
      }

      clearTimeout(this._loopingTimeout)
      this._loopingTimeout = false
      this.loopingSide = null
    },
    loopSide(side) {
      if (!this._loopingTimeout) {
        this.loopingSide = side
      }

      this._loopingTimeout = setTimeout(() => {
        this.test(this[side + 'Audio'], side)

        this.loopSide(side)
      }, Math.random() * 100)
    },
    restartWebAudio() {
      audioService.reconnect()
    },
    async test(litteral, side, event) {
      let percent = 1
      let amount

      const range = this.max - this.min

      if ((event && event.shiftKey) || !range) {
        amount = this.min
      } else {
        amount = this.min + Math.random() * range
        percent = amount / this.amounts[1]
      }

      if (amount) {
        const success = await this.emulateAudioFunction(litteral, side, percent)

        if (success && event) {
          this.$store.dispatch('app/showNotice', {
            id: 'testing-threshold-audio',
            type: side === 'buy' ? 'success' : 'error',
            title:
              'NOW PLAYING : ' +
              formatAmount(amount) +
              ' ' +
              side.toUpperCase() +
              ' trade',
            timeout: 1000
          })
        }

        return success
      }
    },
    formatAmount(amount) {
      return formatAmount(amount)
    },
    async emulateAudioFunction(litteral, side, percent) {
      try {
        const adapter = await audioService.buildAudioFunction(
          litteral,
          side,
          this.audioPitch,
          this.audioVolume,
          true
        )

        if (typeof percent !== 'undefined') {
          adapter(audioService, percent)
        }

        this[side + 'Error'] = null

        return true
      } catch (error) {
        this[side + 'Error'] = error.message

        return false
      }
    },
    openSoundAssistant(type, side) {
      const dialog = dialogService.open(AudioAssistantDialog, {
        type,
        error: this[side + 'Error']
      })

      dialog.$on('test', ({ event, litteral }) =>
        this.testCustom(side, event, litteral)
      )
      dialog.$on('stop', this.restartWebAudio)

      dialog.$on('append', ({ litteral, uploadedSound }) => {
        if (uploadedSound) {
          this.uploadedSounds.push(uploadedSound)
        }

        if (this[side + 'Audio'].trim().length) {
          this[side + 'Audio'] += `\n${litteral}`
        } else {
          this[side + 'Audio'] = litteral
        }
      })
    },
    handleDropEnter(side) {
      this.dropping = side
    },
    handleDropLeave(event) {
      if (event.target === event.currentTarget) {
        this.dropping = null
      }
    },
    async handleDrop(event, side) {
      if (!event.dataTransfer.files || !event.dataTransfer.files.length) {
        return
      }

      event.preventDefault()
      event.stopPropagation()

      if (event.type !== 'drop') {
        return false
      }

      for (const file of event.dataTransfer.files) {
        await this.importSound(file, side)
      }

      this.dropping = null
    },
    async importSound(file, side) {
      try {
        const uploadedSound = await importService.importSound(file)

        if (uploadedSound) {
          this.uploadedSounds.push(uploadedSound.name)
        }

        const instruction = `playurl(${file.name})`

        if (this[side + 'Audio'].trim().length) {
          this[side + 'Audio'] += `\n${instruction}`
        } else {
          this[side + 'Audio'] = instruction
        }
      } catch (error) {
        this.$store.dispatch('app/showNotice', {
          title: error.message,
          type: 'error'
        })
        return
      }
    },
    async scheduleLiveAnnotation(event, side) {
      this.focusedSide = side

      if (this._liveAnnotationTimeout) {
        clearTimeout(this._liveAnnotationTimeout)
      }

      this._liveAnnotationTimeout = setTimeout(
        this.findCurrentParameter.bind(this, event.currentTarget, side),
        200
      )
    },
    findCurrentParameter(input) {
      this._liveAnnotationTimeout = null

      if (!('selectionStart' in input && document.activeElement == input)) {
        return
      }

      let cursorIndex = input.selectionStart - 1
      let content = input.value.slice()

      let startLineIndex = cursorIndex

      for (startLineIndex; startLineIndex >= 0; startLineIndex--) {
        if (/\n/.test(content[startLineIndex])) {
          startLineIndex++
          break
        }

        if (startLineIndex === 0) {
          cursorIndex--
        }
      }

      if (startLineIndex >= 0) {
        content = content.slice(startLineIndex)
      }

      cursorIndex -= startLineIndex

      const endLineIndex = content.indexOf('\n')

      if (endLineIndex >= 0) {
        content = content.slice(0, endLineIndex)
      }

      if (!content.length) {
        return
      }

      const FUNCTION_REGEX = new RegExp(`(play(?:url)?)\\(`, 'g')
      let functionMatch

      do {
        if ((functionMatch = FUNCTION_REGEX.exec(content))) {
          const type = functionMatch[1]
          const start = functionMatch.index
          const end = findClosingBracketMatchIndex(content, start + type.length)

          if (cursorIndex < start + type.length || cursorIndex >= end) {
            continue
          }

          const args = parseFunctionArguments(
            content.slice(start + type.length + 1, end),
            false,
            5
          )

          let currentPosition = start + type.length + 1
          for (let i = 0; i < args.length; i++) {
            if (cursorIndex <= currentPosition + args[i].length - 1) {
              this.showParameterAnnotation(type, i)
              return
            }

            currentPosition += args[i].length + 1
          }
        }
      } while (functionMatch)

      if (this.liveAnnotation) {
        this.liveAnnotation = null
      }

      return
    },
    showParameterAnnotation(type, i) {
      let annotation

      const prop = audioParametersDefinitions[type][i]

      if (!prop) {
        annotation = `Too many parameters on ${type}() !`
      } else {
        annotation = `${prop.toUpperCase()} : ${
          audioParametersDescriptions[prop]
        }`
      }

      this.liveAnnotation = annotation // triggers reactivity check
    },
    reset(side) {
      const defaultSettings = JSON.parse(
        JSON.stringify(
          panesSettings[this.$store.state.panes.panes[this.paneId].type].state
        )
      )

      if (defaultSettings.thresholds[Math.min(this.index, 3)]) {
        this[side + 'Audio'] =
          defaultSettings.thresholds[Math.min(this.index, 3)][side + 'Audio']
      }
    }
  }
}
</script>

<style lang="scss" scoped>
div.-dropping {
  box-shadow: 0 0 0 2px #fdd835;
  border-color: transparent !important;
  pointer-events: none;
}

.live-annotation {
  position: absolute;
  left: 0;
  right: 0;

  &__tooltip {
    position: absolute;
    bottom: 0;
    transform: translate(-50%, -1rem);
    left: 50%;
    background-color: var(--theme-background-200);
    border-radius: $border-radius-base;
    font-size: 0.75rem;
    box-shadow: rgba(0, 0, 0, 0.2) 0px 18px 50px -10px;
    padding: 0.5rem;
    z-index: 1;
  }
}

.editor {
  min-width: 200px;
}
</style>
