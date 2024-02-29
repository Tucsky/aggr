<template>
  <Dialog
    @clickOutside="close"
    class="pane-dialog -auto"
    @mousedown="clickOutsideClose = false"
    @mouseup="clickOutsideClose = true"
  >
    <template v-slot:header>
      <div class="dialog__title">{{ title }}</div>
    </template>

    <div v-if="type === 'play'" class="form-group mb16">
      <label for="audio-assistant-source">
        <i class="icon-music-note mr8"></i> Frequency
        <i class="icon-info" v-tippy :title="descriptions.frequency"></i
      ></label>
      <div class="column">
        <slider
          class="mrauto -fill mt8 mb8"
          :min="0"
          :max="8902"
          :step="1"
          :label="true"
          :show-completion="true"
          :value="frequency"
          @input="frequency = $event"
          @reset="reset('frequency')"
        ></slider>
        <editable
          class="-center text-nowrap ml8"
          style="line-height: 1"
          :value="frequency"
          @input="frequency = $event"
        ></editable>
      </div>
    </div>
    <div v-else class="form-group mb16">
      <label for="audio-assistant-source">
        <i class="icon-music-note mr8"></i> Source
      </label>
      <button class="btn -file -blue -large -cases w-100" @change="handleFile">
        <i class="icon-upload mr8"></i> Browse
        <input type="file" class="input-file" accept="audio/*" />
      </button>
    </div>

    <div class="form-group mb16">
      <label
        >Gain <i class="icon-info" v-tippy :title="descriptions.gain"></i
      ></label>

      <div class="column">
        <slider
          :min="0"
          :max="2"
          :step="0.01"
          :label="true"
          :show-completion="true"
          :value="gain"
          @input="gain = $event"
          @reset="reset('gain')"
        ></slider>
        <label
          class="checkbox-control checkbox-control-input"
          title="Dynamic"
          v-tippy
        >
          <input type="checkbox" class="form-control" v-model="dynamicGain" />
          <div></div>
        </label>
      </div>
    </div>

    <div class="form-group mb16">
      <label
        >Duration
        <i class="icon-info" v-tippy :title="descriptions.holdDuration"></i
      ></label>

      <div class="column">
        <slider
          :min="0"
          :max="10"
          :step="0.1"
          :label="true"
          :show-completion="true"
          :value="holdDuration"
          @input="holdDuration = $event"
          @reset="reset('holdDuration')"
        ></slider>
        <label
          class="checkbox-control checkbox-control-input"
          title="Dynamic"
          v-tippy
        >
          <input type="checkbox" class="form-control" v-model="dynamicLength" />
          <div></div>
        </label>
      </div>
    </div>

    <section class="section">
      <div v-if="showAdvanced">
        <div class="form-group mb16" v-if="type === 'play'">
          <label
            >Wave type (<a
              href="https://developer.mozilla.org/en-US/docs/Web/API/OscillatorNode/type"
              >learn more</a
            >)</label
          >
          <dropdown-button
            v-model="osc"
            :options="[`'triangle'`, `'square'`, `'sine'`, `'sawtooth'`]"
            class="-outline form-control -arrow"
            @input="osc = $event"
          >
            <template v-slot:selection>
              {{ osc.replace(/'/g, '') }}
            </template>
            <template v-slot:option="{ value }">
              {{ value.replace(/'/g, '') }}
            </template>
          </dropdown-button>
        </div>

        <div class="column mb16">
          <div class="form-group -fill">
            <label
              >Fade In
              <i class="icon-info" v-tippy :title="descriptions.fadeIn"></i
            ></label>

            <slider
              :min="0"
              :max="10"
              :step="0.1"
              :label="true"
              :show-completion="true"
              class="mt8"
              :value="fadeIn"
              @input="fadeIn = $event"
              @reset="reset('fadeIn')"
            ></slider>
          </div>

          <div class="ml8 form-group -fill">
            <label
              >Fade Out
              <i class="icon-info" v-tippy :title="descriptions.fadeOut"></i
            ></label>

            <slider
              :min="0"
              :max="10"
              :step="0.1"
              :label="true"
              :show-completion="true"
              class="mt8"
              :value="fadeOut"
              @input="fadeOut = $event"
              @reset="reset('fadeOut')"
            ></slider>
          </div>
        </div>

        <div class="column mb16">
          <div class="form-group -fill">
            <label
              >Start Gain
              <i class="icon-info" v-tippy :title="descriptions.startGain"></i
            ></label>

            <slider
              :min="0.0001"
              :max="1"
              :step="0.001"
              :label="true"
              :show-completion="true"
              class="mt8"
              :value="startGain"
              @input="startGain = $event"
              @reset="reset('startGain')"
            ></slider>
          </div>

          <div class="ml8 form-group -fill">
            <label
              >End Gain
              <i class="icon-info" v-tippy :title="descriptions.endGain"></i
            ></label>

            <slider
              :min="0.0001"
              :max="1"
              :step="0.001"
              :label="true"
              :show-completion="true"
              class="mt8"
              :value="endGain"
              @input="endGain = $event"
              @reset="reset('endGain')"
            ></slider>
          </div>
        </div>

        <div class="form-group mb16">
          <label
            >Delay <i class="icon-info" v-tippy :title="descriptions.delay"></i
          ></label>

          <slider
            :min="0"
            :max="10"
            :step="0.1"
            :label="true"
            :show-completion="true"
            class="mt8"
            :value="delay"
            @input="delay = $event"
            @reset="reset('delay')"
          ></slider>
        </div>
      </div>

      <div class="section__header" @click="showAdvanced = !showAdvanced">
        Advanced
        <i class="icon-up-thin"></i>
      </div>
    </section>

    <div class="form-group mt16">
      <label for="audio-assistant-output"> Output </label>
      <div class="d-flex">
        <textarea
          id="audio-assistant-output -code"
          cols="20"
          rows="4"
          ref="output"
          class="form-control"
          :value="litteral"
          spellcheck="false"
          readonly
        ></textarea>
        <button
          class="btn -red ml8"
          @click="$emit('test', { event: $event, litteral: litteral })"
        >
          <i class="icon-volume-high"></i>
        </button>
      </div>

      <p v-if="error" class="form-feedback">
        <i class="icon-warning mr4"></i> {{ error }}
      </p>
    </div>
    <template v-slot:footer>
      <a
        href="javascript:void(0);"
        class="btn -text mrauto"
        @click="$emit('stop')"
        v-tippy
        title="Restart audio service (clear ALL queue)"
      >
        <i class="icon-refresh mr8"></i> Restart audio
      </a>
      <a href="javascript:void(0);" class="btn -text mr8" @click="close(false)"
        >Cancel</a
      >
      <button class="btn -large" @click="submit">
        <i class="icon-check mr4"></i> Ok
      </button>
    </template>
  </Dialog>
</template>

<script>
import DialogMixin from '@/mixins/dialogMixin'
import Slider from '@/components/framework/picker/Slider.vue'
import importService from '@/services/importService'
import workspacesService from '@/services/workspacesService'
import {
  audioDefaultParameters,
  audioParametersDescriptions
} from '@/services/audioService'

const DYNAMIC_GAIN_PROPERTIES = ['gain']
const DYNAMIC_LENGTH_PROPERTIES = ['holdDuration', 'fadeIn', 'fadeOut']

import DropdownButton from '@/components/framework/DropdownButton.vue'

export default {
  components: {
    Slider,
    DropdownButton
  },
  props: {
    type: {
      required: true,
      type: String
    },
    error: {
      required: false,
      type: String
    }
  },
  mixins: [DialogMixin],
  data: () => ({
    url: null,
    frequencyHz: null,
    gain: null,
    fadeOut: null,
    delay: null,
    fadeIn: null,
    holdDuration: null,
    osc: null,
    startGain: null,
    endGain: null,
    startTime: null,
    dynamicGain: true,
    dynamicLength: true,
    uploadedSound: null,
    showAdvanced: false
  }),
  computed: {
    title() {
      return this.type === 'play' ? 'Synthetize sound' : 'Import your own'
    },
    descriptions() {
      return audioParametersDescriptions
    },
    frequency: {
      get() {
        return this.frequencyHz
      },
      set(val) {
        if (isNaN(val)) {
          this.frequencyHz = this.noteToFrequency(val)
          return
        }

        this.frequencyHz = +val
      }
    },
    litteral() {
      const defaultAudioAttributes = audioDefaultParameters[this.type]
      const keys = Object.keys(defaultAudioAttributes)

      const args = keys.map(key => {
        if (
          (this.dynamicGain && DYNAMIC_GAIN_PROPERTIES.indexOf(key) !== -1) ||
          (this.dynamicLength && DYNAMIC_LENGTH_PROPERTIES.indexOf(key) !== -1)
        ) {
          return this[key]
            ? 'gain*' + this[key]
            : 0 != defaultAudioAttributes[key]
            ? 0
            : null
        } else {
          return this[key] != defaultAudioAttributes[key] ? this[key] : null
        }
      })

      for (let i = args.length - 1; i >= 0; i--) {
        if (args[i] === null) {
          args.splice(i, 1)
        } else {
          break
        }
      }

      return `${this.type}(${args.map(a => (a === null ? '' : a))})`
    }
  },
  created() {
    this.setDefaultAudioAttributes()
  },
  beforeDestroy() {
    if (this.uploadedSound) {
      workspacesService.removeSound(this.uploadedSound).then(() => {
        this.$store.dispatch('app/showNotice', {
          title: `Deleted ${this.uploadedSound} (canceled)`,
          type: 'info'
        })
      })
    }
  },
  methods: {
    setDefaultAudioAttributes() {
      const defaultAudioAttributes = audioDefaultParameters[this.type]

      for (const key in defaultAudioAttributes) {
        this[key] = defaultAudioAttributes[key]
      }
    },
    noteToFrequency(note) {
      const notes = [
        'A',
        'A#',
        'B',
        'C',
        'C#',
        'D',
        'D#',
        'E',
        'F',
        'F#',
        'G',
        'G#'
      ]
      let octave
      let keyNumber

      if (note.length === 3) {
        octave = note.charAt(2)
      } else {
        octave = note.charAt(1)
      }

      keyNumber = notes.indexOf(note.slice(0, -1))

      if (keyNumber < 3) {
        keyNumber = keyNumber + 12 + (octave - 1) * 12 + 1
      } else {
        keyNumber = keyNumber + (octave - 1) * 12 + 1
      }

      // Return frequency of note
      return +(440 * Math.pow(2, (keyNumber - 49) / 12)).toFixed(2)
    },
    async handleFile(event) {
      const file = event.target.files[0]

      if (!file) {
        return
      }

      try {
        const uploadedSound = await importService.importSound(file)

        if (uploadedSound) {
          if (this.uploadedSound) {
            workspacesService.removeSound(this.uploadedSound)
          }

          this.uploadedSound = this.url = uploadedSound.name
        } else {
          this.url = file.name
        }
      } catch (error) {
        this.$store.dispatch('app/showNotice', {
          title: error.message,
          type: 'error'
        })
        return
      }
    },
    reset(prop) {
      const defaultValue = audioDefaultParameters[this.type][prop]

      this[prop] = defaultValue
    },
    submit() {
      this.$emit('append', {
        litteral: this.litteral,
        uploadedSound: this.uploadedSound
      })

      this.uploadedSound = null

      this.close()
    }
  }
}
</script>
