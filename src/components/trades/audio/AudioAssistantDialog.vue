<template>
  <transition name="dialog" :duration="300" @after-leave="close">
    <Dialog v-if="opened" @close="hide" class="pane-dialog -auto">
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
        <button
          class="btn -file -blue -large -cases w-100"
          @change="handleFile"
        >
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
            <input
              type="checkbox"
              class="form-control"
              v-model="dynamicLength"
            />
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
              >Delay
              <i class="icon-info" v-tippy :title="descriptions.delay"></i
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
            @click="emit('test', { event: $event, litteral: litteral })"
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
          @click="emit('stop')"
          v-tippy
          title="Restart audio service (clear ALL queue)"
        >
          <i class="icon-refresh mr8"></i> Restart audio
        </a>
        <a href="javascript:void(0);" class="btn -text mr8" @click="hide(false)"
          >Cancel</a
        >
        <button class="btn -large" @click="submit">
          <i class="icon-check mr4"></i> Ok
        </button>
      </template>
    </Dialog>
  </transition>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount, defineEmits } from 'vue'
import Slider from '@/components/framework/picker/Slider.vue'
import DropdownButton from '@/components/framework/DropdownButton.vue'
import importService from '@/services/importService'
import workspacesService from '@/services/workspacesService'
import {
  audioDefaultParameters,
  audioParametersDescriptions
} from '@/services/audioService'
import { useDialog } from '@/composables/useDialog'

const DYNAMIC_GAIN_PROPERTIES = ['gain']
const DYNAMIC_LENGTH_PROPERTIES = ['holdDuration', 'fadeIn', 'fadeOut']

const props = defineProps({
  type: {
    required: true,
    type: String
  },
  error: {
    required: false,
    type: String
  }
})
const emit = defineEmits(['append', 'close', 'test', 'stop'])
const { close, hide, opened } = useDialog()

const url = ref<string | null>(null)
const frequencyHz = ref<number | null>(null)
const gain = ref<number | null>(null)
const fadeOut = ref<number | null>(null)
const delay = ref<number | null>(null)
const fadeIn = ref<number | null>(null)
const holdDuration = ref<number | null>(null)
const osc = ref<any | null>(null)
const startGain = ref<number | null>(null)
const endGain = ref<number | null>(null)
const dynamicGain = ref(true)
const dynamicLength = ref(true)
const uploadedSound = ref<string | null>(null)
const showAdvanced = ref(false)

const descriptions = audioParametersDescriptions

const title = computed(() =>
  props.type === 'play' ? 'Synthetize sound' : 'Import your own'
)

const frequency = computed<number>({
  get() {
    return frequencyHz.value
  },
  set(val: string | number) {
    if (isNaN(Number(val))) {
      frequencyHz.value = noteToFrequency(String(val))
    } else {
      frequencyHz.value = +val
    }
  }
})

const litteral = computed(() => {
  const defaultAudioAttributes = audioDefaultParameters[props.type]
  const keys = Object.keys(defaultAudioAttributes)

  const args = keys.map(key => {
    if (
      (dynamicGain.value && DYNAMIC_GAIN_PROPERTIES.includes(key)) ||
      (dynamicLength.value && DYNAMIC_LENGTH_PROPERTIES.includes(key))
    ) {
      return key && gain.value
        ? `gain*${gain.value}`
        : defaultAudioAttributes[key] !== 0
          ? 0
          : null
    } else {
      return gain.value !== defaultAudioAttributes[key] ? gain.value : null
    }
  })

  for (let i = args.length - 1; i >= 0; i--) {
    if (args[i] === null) {
      args.splice(i, 1)
    } else {
      break
    }
  }

  return `${props.type}(${args.map(a => (a === null ? '' : a))})`
})

const noteToFrequency = (note: string) => {
  // Array representing the notes of an octave starting from C
  const notes = [
    'C',
    'C#',
    'D',
    'D#',
    'E',
    'F',
    'F#',
    'G',
    'G#',
    'A',
    'A#',
    'B'
  ]

  // Extract the octave from the note string and parse it as an integer
  const octave = parseInt(note.slice(-1), 10)
  if (isNaN(octave)) {
    throw new Error(
      `Invalid format: the note "${note}" should end with a number representing the octave.`
    )
  }

  // Extract the note part without the octave
  const noteWithoutOctave = note.slice(0, -1).toUpperCase()

  // Find the index of the note in the notes array
  const keyIndex = notes.indexOf(noteWithoutOctave)
  if (keyIndex === -1) {
    throw new Error(
      `Invalid note: "${noteWithoutOctave}" is not a recognized musical note.`
    )
  }

  // Calculate the total key number based on the note and its octave
  // A4 (440 Hz) is the 49th key on a standard piano keyboard
  const totalKeyNumber = keyIndex + octave * 12

  // Adjust the totalKeyNumber so that C0 is 1 (or index 0 in an array)
  const a4KeyNumber = 9 + 4 * 12 // 'A' at octave 4
  const referenceFrequency = 440

  // Calculate the frequency using the 12-TET (Twelve-Tone Equal Temperament) formula
  const frequency =
    referenceFrequency * Math.pow(2, (totalKeyNumber - a4KeyNumber) / 12)

  // Return the frequency rounded to two decimal places
  return +frequency.toFixed(2)
}

async function handleFile(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files ? target.files[0] : null
  if (!file) return

  try {
    const sound = await importService.importSound(file)
    if (sound) {
      if (uploadedSound.value)
        await workspacesService.removeSound(uploadedSound.value)
      uploadedSound.value = url.value = sound.name
    } else {
      url.value = file.name
    }
  } catch (error: any) {
    console.error(error)
  }
}

function reset(prop: string) {
  const defaultValue = audioDefaultParameters[props.type][prop]
  gain.value = defaultValue
}

function submit() {
  emit('append', {
    litteral: litteral.value,
    uploadedSound: uploadedSound.value
  })
  uploadedSound.value = null
  hide()
}

onBeforeUnmount(() => {
  if (uploadedSound.value) {
    workspacesService.removeSound(uploadedSound.value).then(() => {
      console.log(`Deleted ${uploadedSound.value} (canceled)`)
    })
  }
})
</script>
