<template>
  <transition name="dialog" :duration="300" @after-leave="close">
    <Dialog v-if="opened" @close="close" class="pane-dialog -auto">
      <template #header>
        <div class="d-flex">
          <div class="dialog__title -center">Threshold</div>
          <code class="ml4 -filled">
            <small>{{ formatAmount(threshold.amount) }}</small>
          </code>
        </div>
      </template>
      <div class="form-group mb16">
        <label> When buy </label>
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
        <label> When sell </label>
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
        <a href="javascript:void(0);" class="btn -text mr8" @click="hide(false)"
          >Cancel</a
        >
        <button class="btn -large -green" @click="saveInputs()">
          <i class="icon-check mr4"></i> Save
        </button>
      </template>
    </Dialog>
  </transition>
</template>
<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useDialog } from '@/composables/useDialog'
import {
  findClosingBracketMatchIndex,
  parseFunctionArguments
} from '@/utils/helpers'
import { formatAmount } from '@/services/productsService'
import audioService, {
  audioParametersDefinitions,
  audioParametersDescriptions
} from '@/services/audioService'
import dialogService from '@/services/oldDialogService'
import AudioAssistantDialog from './AudioAssistantDialog.vue'
import panesSettings from '@/store/panesSettings'
import workspacesService from '@/services/workspacesService'
import importService from '@/services/importService'
import store from '@/store'

defineEmits(['close'])

const { hide, close, opened } = useDialog()
defineExpose({ hide, close })

const buyAudio = ref('')
const sellAudio = ref('')
const buyError = ref<string | null>(null)
const sellError = ref<string | null>(null)
const focusedSide = ref<string | null>(null)
const loopingSide = ref<string | null>(null)
const dropping = ref<string | null>(null)
const liveAnnotation = ref<string | null>(null)
const uploadedSounds = ref<string[]>([])

const props = defineProps<{
  paneId: string
  thresholds: Array<{
    id: string
    amount: number
    buyAudio?: string
    sellAudio?: string
  }>
  thresholdId: string
}>()

const threshold = computed(() =>
  props.thresholds.find(t => t.id === props.thresholdId)
)

const amounts = computed(() => props.thresholds.map(t => t.amount))

const audioPitch = computed(() => store.state[props.paneId].audioPitch)
const audioVolume = computed(() => store.state[props.paneId].audioVolume)

const index = computed(() =>
  amounts.value.indexOf(threshold.value?.amount || 0)
)

const min = computed(() => threshold.value?.amount || 0)

const max = computed(
  () => amounts.value[index.value + 1] || amounts.value[index.value] * 2
)

onMounted(() => {
  if (!threshold.value) {
    return hide(false)
  }

  buyAudio.value = threshold.value.buyAudio || ''
  sellAudio.value = threshold.value.sellAudio || ''
})

onBeforeUnmount(() => {
  if (loopingTimeout) {
    clearTimeout(loopingTimeout)
  }

  uploadedSounds.value.forEach(name => {
    workspacesService.removeSound(name).then(() => {
      store.dispatch('app/showNotice', {
        title: `Deleted ${name} (canceled)`,
        type: 'info'
      })
    })
  })
})

let loopingTimeout: ReturnType<typeof setTimeout> | false = false
let liveAnnotationTimeout: ReturnType<typeof setTimeout> | null = null

function saveInputs() {
  if (!validate(true)) {
    return
  }

  store.commit(`${props.paneId}/SET_THRESHOLD_AUDIO`, {
    id: props.thresholdId,
    buyAudio: buyAudio.value,
    sellAudio: sellAudio.value
  })

  uploadedSounds.value.splice(0, uploadedSounds.value.length)

  hide(true)
}

function validate(alert = false) {
  for (const side of ['buy', 'sell'] as const) {
    const litteral = side === 'buy' ? buyAudio.value : sellAudio.value

    try {
      emulateAudioFunction(litteral, side)
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
}

async function testCustom(
  side: 'buy' | 'sell',
  event?: Event,
  litteral?: string
) {
  if (loopingTimeout) {
    stopLoop()
  }

  if (!litteral) {
    litteral = side === 'buy' ? buyAudio.value : sellAudio.value
  }

  return await test(litteral, side, event)
}

function testOriginal(side: 'buy' | 'sell', event: Event) {
  if (loopingTimeout) {
    stopLoop()
  }

  const litteral = threshold.value ? threshold.value[`${side}Audio`] : ''

  test(litteral, side, event)
}

function stopLoop() {
  if (!loopingTimeout) {
    return
  }

  clearTimeout(loopingTimeout)
  loopingTimeout = false
  loopingSide.value = null
}

function loopSide(side: 'buy' | 'sell') {
  if (!loopingTimeout) {
    loopingSide.value = side
  }

  loopingTimeout = setTimeout(() => {
    testCustom(side)

    loopSide(side)
  }, Math.random() * 100)
}

function restartWebAudio() {
  audioService.reconnect()
}

async function test(litteral: string, side: 'buy' | 'sell', event?: Event) {
  let percent = 1
  let amount

  const range = max.value - min.value

  if ((event && (event as any).shiftKey) || !range) {
    amount = min.value
  } else {
    amount = min.value + Math.random() * range
    percent = amount / (amounts.value[1] || 1)
  }

  if (amount) {
    const success = await emulateAudioFunction(litteral, side, percent)

    if (success && event) {
      store.dispatch('app/showNotice', {
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
}

async function emulateAudioFunction(
  litteral: string,
  side: 'buy' | 'sell',
  percent?: number
) {
  try {
    const adapter = await audioService.buildAudioFunction(
      litteral,
      side,
      audioPitch.value,
      audioVolume.value,
      true
    )

    if (typeof percent !== 'undefined') {
      adapter(audioService, percent)
    }

    side === 'buy' ? (buyError.value = null) : (sellError.value = null)

    return true
  } catch (error: any) {
    side === 'buy'
      ? (buyError.value = error.message)
      : (sellError.value = error.message)

    return false
  }
}

function openSoundAssistant(type: string, side: 'buy' | 'sell') {
  dialogService.open(AudioAssistantDialog, {
    type,
    error: side === 'buy' ? buyError.value : sellError.value,
    onTest({ event, litteral }) {
      testCustom(side, event, litteral)
    },
    onStop() {
      restartWebAudio()
    },
    onAppend({ litteral, uploadedSound }) {
      if (uploadedSound) {
        uploadedSounds.value.push(uploadedSound)
      }

      if ((side === 'buy' ? buyAudio.value : sellAudio.value).trim().length) {
        side === 'buy'
          ? (buyAudio.value += `\n${litteral}`)
          : (sellAudio.value += `\n${litteral}`)
      } else {
        side === 'buy'
          ? (buyAudio.value = litteral)
          : (sellAudio.value = litteral)
      }
    }
  })
}

function handleDropEnter(side: 'buy' | 'sell') {
  dropping.value = side
}

function handleDropLeave(event: DragEvent) {
  if (event.target === event.currentTarget) {
    dropping.value = null
  }
}

async function handleDrop(event: DragEvent, side: 'buy' | 'sell') {
  if (!event.dataTransfer?.files || !event.dataTransfer.files.length) {
    return
  }

  event.preventDefault()
  event.stopPropagation()

  if (event.type !== 'drop') {
    return false
  }

  for (const file of event.dataTransfer.files) {
    await importSound(file, side)
  }

  dropping.value = null
}

async function importSound(file: File, side: 'buy' | 'sell') {
  try {
    const uploadedSound = await importService.importSound(file)

    if (uploadedSound) {
      uploadedSounds.value.push(uploadedSound.name)
    }

    const instruction = `playurl(${file.name})`

    if ((side === 'buy' ? buyAudio.value : sellAudio.value).trim().length) {
      side === 'buy'
        ? (buyAudio.value += `\n${instruction}`)
        : (sellAudio.value += `\n${instruction}`)
    } else {
      side === 'buy'
        ? (buyAudio.value = instruction)
        : (sellAudio.value = instruction)
    }
  } catch (error: any) {
    store.dispatch('app/showNotice', {
      title: error.message,
      type: 'error'
    })
  }
}

async function scheduleLiveAnnotation(event: Event, side: 'buy' | 'sell') {
  focusedSide.value = side

  if (liveAnnotationTimeout) {
    clearTimeout(liveAnnotationTimeout)
  }

  liveAnnotationTimeout = setTimeout(
    findCurrentParameter.bind(
      null,
      event.currentTarget as HTMLTextAreaElement,
      side
    ),
    200
  )
}

function findCurrentParameter(input: HTMLTextAreaElement) {
  liveAnnotationTimeout = null

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
          showParameterAnnotation(type, i)
          return
        }

        currentPosition += args[i].length + 1
      }
    }
  } while (functionMatch)

  if (liveAnnotation.value) {
    liveAnnotation.value = null
  }
}

function showParameterAnnotation(type: string, i: number) {
  let annotation

  const prop = audioParametersDefinitions[type][i]

  if (!prop) {
    annotation = `Too many parameters on ${type}() !`
  } else {
    annotation = `${prop.toUpperCase()} : ${audioParametersDescriptions[prop]}`
  }

  liveAnnotation.value = annotation // triggers reactivity check
}

function reset(side: 'buy' | 'sell') {
  const defaultSettings = JSON.parse(
    JSON.stringify(
      panesSettings[store.state.panes.panes[props.paneId].type].state
    )
  )

  if (defaultSettings.thresholds[Math.min(index.value, 3)]) {
    const audio =
      defaultSettings.thresholds[Math.min(index.value, 3)][side + 'Audio']
    side === 'buy' ? (buyAudio.value = audio) : (sellAudio.value = audio)
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
