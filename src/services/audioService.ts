import Vue from 'vue'
import Tuna from 'tunajs'
import store from '../store'
import {
  findClosingBracketMatchIndex,
  parseFunctionArguments
} from '@/utils/helpers'
import workspacesService from './workspacesService'

export type AudioFunction = (audioService: AudioService, ratio: number) => void

export const audioParametersDescriptions = {
  frequency: 'Tone frequency of the note you want to play (Hz)',
  gain: `Determine how loud it should be (0 to 1 to avoid saturation)`,
  fadeOut: `Duration of the OUT transition (in seconds, default is 1)`,
  delay: `Wait n seconds before play the note`,
  fadeIn: `Duration of the IN transition (in seconds, default is 0)`,
  holdDuration: `Hold the note for n seconds (default 0)`,
  osc: `Type of wave used for the note (can be triangle, square, sawtooth, sin etc)`,
  startGain: `Initial gain (before fadeIn)`,
  endGain: `Final gain (after fadeOut)`,
  url: `Direct link to song (.mp3, .wav, .ogg) or name of already imported file`,
  startTime: `Offset the start of the song at second n (to play only a part of it)`
}

export const audioParametersDefinitions = {
  play: [
    'frequency',
    'gain',
    'fadeOut',
    'delay',
    'fadeIn',
    'holdDuration',
    'osc',
    'startGain',
    'endGain'
  ],
  playurl: [
    'url',
    'gain',
    'holdDuration',
    'delay',
    'startTime',
    'fadeIn',
    'fadeOut',
    'startGain',
    'endGain'
  ]
}

export const audioDefaultParameters = {
  play: {
    frequency: 329.63,
    gain: 1,
    fadeOut: 1,
    delay: 0,
    fadeIn: 0,
    holdDuration: 0,
    osc: `'triangle'`,
    startGain: 0.001,
    endGain: 0.001
  },
  playurl: {
    url: "'https://d7d3471nr939s.cloudfront.net/DeepHouseSessions_Noiz_SP/MP3/One+Shots/Bongo_08_73_SP.mp3?cb=6cfb91bb-f15f-432a-bfae-17ef22b22005'",
    gain: 1,
    holdDuration: 1,
    delay: 0,
    startTime: 0,
    fadeIn: 0,
    fadeOut: 0,
    startGain: 0.00001,
    endGain: 0.00001
  }
}

class AudioService {
  static savedAudioBuffers = {}

  filtersOptions = {
    PingPongDelay: {
      wetLevel: 0.5, //0 to 1
      feedback: 0.01, //0 to 1
      delayTimeLeft: 175, //1 to 10000 (milliseconds)
      delayTimeRight: 100 //1 to 10000 (milliseconds)
    },
    HighPassFilter: {
      frequency: 700, //20 to 22050
      Q: 10, //0.001 to 100
      gain: -10, //-40 to 40 (in decibels)
      filterType: 'highpass', //lowpass, highpass, bandpass, lowshelf, highshelf, peaking, notch, allpass
      bypass: 0
    },
    LowPassFilter: {
      frequency: 1500, //20 to 22050
      Q: 1, //0.001 to 100
      gain: 0, //-40 to 40 (in decibels)
      filterType: 'lowpass', //lowpass, highpass, bandpass, lowshelf, highshelf, peaking, notch, allpass
      bypass: 0
    },
    Compressor: {
      threshold: -1, //-100 to 0
      makeupGain: 1, //0 and up (in decibels)
      attack: 1, //0 to 1000
      release: 0, //0 to 3000
      ratio: 4, //1 to 20
      knee: 5, //0 to 40
      automakeup: true, //true/false
      bypass: 0
    },
    Delay: {
      feedback: 0.33, //0 to 1+
      delayTime: 400 //1 to 10000 milliseconds
    },
    Chorus: {
      rate: 1.5, //0.01 to 8+
      feedback: 0.4, //0 to 1+
      depth: 0.7, //0 to 1
      delay: 0.0045, //0 to 1
      bypass: 0 //the value 1 starts the effect as bypassed, 0 or 1
    }
  }

  context: AudioContext
  tuna: any

  output: any
  count = 0
  minTime = 0
  gainNode: any

  connect() {
    console.log(`[sfx] connect`)
    if (this.context) {
      console.debug(`[sfx] context already exists -> abort`)
      return
    }

    this.minTime = 0
    this.count = 0

    Vue.nextTick(() => {
      this.bindContext()
      this.bindOutput()
    })
  }

  bindContext() {
    // this.context = new AudioContext()
    this.context = new ((window as any).AudioContext ||
      (window as any).webkitAudioContext)()

    let checkInProgress = false

    if (this.context.state === 'suspended') {
      const application = document.body

      setTimeout(() => {
        application.focus()
      }, 500)

      const resumeOnFocus = (() => {
        if (checkInProgress) {
          return
        }

        checkInProgress = true

        console.log('[sfx] Yet another try to start AudioContext')

        if (this.context && store.state.settings.useAudio) {
          this.context.resume()
        }

        setTimeout(() => {
          if (
            !store.state.settings.useAudio ||
            this.context.state !== 'suspended'
          ) {
            if (store.state.settings.useAudio) {
              store.dispatch('app/showNotice', {
                id: 'audio',
                type: 'success',
                title: 'Audio resumed successfully 🔊'
              })
            }

            window.removeEventListener('focus', resumeOnFocus)
            window.removeEventListener('blur', resumeOnFocus)
            application.removeEventListener('click', resumeOnFocus)
          } else if (this.context.state === 'suspended') {
            store.dispatch('app/showNotice', {
              id: 'audio',
              type: 'error',
              title:
                'Browser prevented audio from playing\nClick somewhere to resume.'
            })
          }

          checkInProgress = false
        }, 500)
      }).bind(this)

      window.addEventListener('blur', resumeOnFocus)
      window.addEventListener('focus', resumeOnFocus)
      application.addEventListener('click', resumeOnFocus)
    } else {
      store.dispatch('app/showNotice', {
        id: 'audio',
        type: 'success',
        title: 'Audio enabled 🔊'
      })
    }

    return this.context
  }

  bindOutput() {
    if (!this.context) {
      return
    }

    if (this.output) {
      this.output.disconnect()
      this.output = null
    }

    this.tuna = new Tuna(this.context)

    const effects = []

    for (const id in this.filtersOptions) {
      if (!store.state.settings.audioFilters[id]) {
        continue
      }

      let name = id

      if (id === 'HighPassFilter' || id === 'LowPassFilter') {
        name = 'Filter'
      }

      effects.push(new this.tuna[name](this.filtersOptions[id]))
    }

    this.gainNode = new this.tuna.Gain({
      gain: store.state.settings.audioVolume
    })

    effects.push(this.gainNode)

    if (effects.length) {
      let source

      for (const effect of effects) {
        if (source) {
          source.connect(effect)
        }

        source = effect
      }

      source.connect(this.context.destination)

      console.debug(`[sfx] created output with ${effects.length} effect(s)`)

      this.output = effects[0]
    } else {
      console.debug(`[sfx] created output (no effect)`)
      this.output = this.context.destination
    }
  }

  setVolume(gain: number) {
    if (!this.gainNode) {
      return
    }

    this.gainNode.gain.value = gain
  }

  fetchArrayBuffer(url: string) {
    return fetch(url).then(res => res.arrayBuffer())
  }

  async retrieveArrayBuffer(name: string) {
    const savedSound = await workspacesService.getSound(name)

    if (!savedSound) {
      return null
    }

    const blob = savedSound.data
    const reader = new FileReader()

    return new Promise<ArrayBuffer>(resolve => {
      reader.onloadend = event => resolve(event.target.result as ArrayBuffer)
      reader.readAsArrayBuffer(blob)
    })
  }

  async loadSoundBuffer(url) {
    if (AudioService.savedAudioBuffers[url]) {
      return AudioService.savedAudioBuffers[url]
    }

    let arrayBuffer: ArrayBuffer

    if (url.indexOf('/') !== -1) {
      arrayBuffer = await this.fetchArrayBuffer(url)
    } else {
      arrayBuffer = await this.retrieveArrayBuffer(url)
    }

    if (!arrayBuffer) {
      return false
    }

    AudioService.savedAudioBuffers[url] =
      await this.context.decodeAudioData(arrayBuffer)

    return true
  }

  async playurl(
    url?: string,
    gain?: number,
    holdDuration?: number,
    delay?: number,
    startTime?: number,
    fadeIn?: number,
    fadeOut?: number,
    startGain?: number,
    endGain?: number
  ) {
    if (
      this.context.state !== 'running' ||
      !AudioService.savedAudioBuffers[url]
    ) {
      return
    }

    const time = this.getNextTime(delay)

    setTimeout(
      () => {
        const gainNode = this.context.createGain()
        const source = this.context.createBufferSource()

        source.buffer = AudioService.savedAudioBuffers[url]

        source.connect(gainNode)
        gainNode.connect(this.output)

        this.fade(
          source,
          gainNode,
          time,
          gain,
          startGain,
          fadeIn,
          holdDuration,
          fadeOut * 1.1,
          endGain,
          startTime
        )
      },
      (time - this.context.currentTime) * 1000
    )
  }

  async play(
    frequency?: number,
    gain?: number,
    fadeOut?: number,
    delay?: number,
    fadeIn?: number,
    holdDuration?: number,
    osc?: OscillatorType,
    startGain?: number,
    endGain?: number
  ) {
    if (this.context.state !== 'running') {
      return
    }

    let time = this.getNextTime(delay)

    setTimeout(
      () => {
        if (!this.context) {
          return
        }

        time = this.context.currentTime

        const source = this.context.createOscillator()
        const gainNode = this.context.createGain()
        source.frequency.value = frequency
        source.type = osc

        gainNode.connect(this.output)
        source.connect(gainNode)

        this.fade(
          source,
          gainNode,
          time,
          gain,
          startGain,
          fadeIn,
          holdDuration,
          fadeOut,
          endGain
        )
      },
      (time - this.context.currentTime) * 1000
    )
  }

  fade(
    source: OscillatorNode | AudioBufferSourceNode,
    gainNode,
    time,
    gain,
    startGain,
    fadeIn,
    holdDuration,
    fadeOut,
    endGain,
    startTime?
  ) {
    source.onended = () => {
      gainNode.disconnect()
      source.onended = null
      this.count--
    }

    if (fadeIn) {
      gainNode.gain.setValueAtTime(startGain, time)

      gainNode.gain.exponentialRampToValueAtTime(gain, time + fadeIn)

      if (fadeOut) {
        gainNode.gain.setValueAtTime(gain, time + fadeIn + holdDuration)

        setTimeout(
          () => {
            gainNode.gain.exponentialRampToValueAtTime(
              endGain,
              time + fadeIn + holdDuration + fadeOut
            )
          },
          (fadeIn + holdDuration) * 1000
        )
      }
    } else {
      gainNode.gain.setValueAtTime(gain, time)

      if (fadeOut) {
        gainNode.gain.exponentialRampToValueAtTime(
          endGain,
          time + fadeIn + holdDuration + fadeOut
        )
      }
    }

    if (typeof startTime !== 'undefined') {
      source.start(time, startTime)
    } else {
      source.start(time)
    }

    source.stop(time + fadeIn + holdDuration + fadeOut)
  }

  getNextTime(delay) {
    let cueTime = 0

    if (!this.minTime) {
      this.minTime = this.context.currentTime
    } else {
      this.minTime = Math.max(this.minTime, this.context.currentTime)
      if (!delay && this.count) {
        cueTime =
          this.count > 10
            ? this.count > 20
              ? this.count > 100
                ? 0.01
                : 0.02
              : 0.04
            : 0.08
      }
    }

    if (!cueTime && !delay) {
      cueTime = 0.08
    }

    const time = this.minTime + cueTime + delay

    this.minTime += cueTime
    this.count++

    return time
  }

  reconnect() {
    this.disconnect()
    this.connect()
  }

  disconnect() {
    console.log(`[sfx] disconnect`)
    if (this.context && this.context.state === 'running') {
      console.debug(`[sfx] close context`)
      this.context.close()
    }

    if (this.output) {
      this.output.disconnect()
    }

    this.context = null

    this.output = null

    store.dispatch('app/showNotice', {
      id: 'audio',
      title: 'Audio disabled 🔇'
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async buildAudioFunction(
    litteral,
    side,
    frequencyMultiplier: number = null,
    gainMultiplier: number = null,
    test = false
  ) {
    litteral = `'use strict'; 
    var gain = Math.sqrt(ratio);
    ${litteral}`

    const FUNCTION_LOOKUP_REGEX = /(play|playurl)\(/g
    let functionMatch = null

    if (gainMultiplier === null) {
      gainMultiplier = 1
    }

    try {
      do {
        if ((functionMatch = FUNCTION_LOOKUP_REGEX.exec(litteral))) {
          const originalParameters = litteral.slice(
            functionMatch.index + functionMatch[0].length,
            findClosingBracketMatchIndex(
              litteral,
              functionMatch.index + functionMatch[0].length - 1
            )
          )

          const functionArguments = parseFunctionArguments(originalParameters)

          if (!functionArguments) {
            throw new Error(
              'Invalid argument(s) for ' + functionMatch[0] + ' function'
            )
          }

          const defaultArguments = Object.values(
            audioDefaultParameters[functionMatch[1] as 'play' | 'playurl']
          )

          for (let i = 0; i < defaultArguments.length; i++) {
            let argumentValue = defaultArguments[i]
            if (typeof functionArguments[i] !== 'undefined') {
              if (typeof functionArguments[i] === 'string') {
                functionArguments[i] = functionArguments[i].trim()

                const stringProvided = /^('|").*('|")$/.test(
                  functionArguments[i]
                )
                const defaultExpectedString = /^('|").*('|")$/.test(
                  defaultArguments[i] as any
                )

                if (stringProvided && !defaultExpectedString) {
                  functionArguments[i] = defaultArguments[i]
                } else if (!stringProvided && defaultExpectedString) {
                  functionArguments[i] = `'${functionArguments[i]}'`
                }
              }

              try {
                argumentValue = JSON.parse(functionArguments[i])
              } catch (error) {
                argumentValue = functionArguments[i]
              }

              if (argumentValue === null || argumentValue === '') {
                argumentValue = defaultArguments[i]
              }
            }

            if (argumentValue === null) {
              functionArguments[i] = 'null'
            } else {
              functionArguments[i] = argumentValue
            }
          }

          if (functionMatch[1] === 'play') {
            if (
              +functionArguments[0] &&
              frequencyMultiplier &&
              frequencyMultiplier !== 1
            ) {
              functionArguments[0] *= frequencyMultiplier
            }
          } else if (
            !(await this.loadSoundBuffer(
              functionArguments[0].slice(1, functionArguments[0].length - 1)
            ))
          ) {
            litteral = litteral.replace(
              functionMatch[0] + originalParameters + ')',
              ''
            )
            continue
          }

          if (gainMultiplier && gainMultiplier !== 1) {
            for (let i = 1; i <= 2; i++) {
              if (+functionArguments[1]) {
                functionArguments[1] *= gainMultiplier
              } else {
                functionArguments[1] =
                  gainMultiplier + '*(' + functionArguments[1] + ')'
              }
            }
          }

          const finalParameters = functionArguments.join(', ')

          litteral = litteral.replace(
            '(' + originalParameters + ')',
            '(' + finalParameters + ')'
          )
        }
      } while (functionMatch)

      litteral = litteral.replace(/(play|playurl)\(/g, "audioService['$1'](")

      return new Function('audioService', 'ratio', litteral) as AudioFunction
    } catch (error) {
      console.warn('invalid audio script', litteral)

      if (test) {
        throw error
      } else {
        store.dispatch('app/showNotice', {
          id: 'audio-script-error',
          type: 'error',
          title:
            `Please check that ${side} audio script is syntactically correct.` +
            (error.message ? `<br>${error.message}` : ''),
          timeout: 60000
        })

        return new Function() as AudioFunction
      }
    }
  }

  /**
   * Play a saved audio buffer by it's ID
   * @param id savedAudioBuffers key
   * @param duration in ms (optional)
   */
  async playOnce(id, duration?) {
    if (!this.context) {
      this.connect()
    }

    try {
      if (!(await this.loadSoundBuffer(id))) {
        throw new Error(`Failed to load sound buffer ${id}`)
      }

      this.count++

      const source = this.context.createBufferSource()
      source.buffer = AudioService.savedAudioBuffers[id]
      source.connect(this.output)
      const currentTime = this.context.currentTime
      source.start(0)

      if (duration && duration > 0) {
        const stopTime = currentTime + duration / 1000
        source.stop(stopTime)
      }

      await new Promise<void>(resolve => {
        source.onended = () => {
          source.disconnect()
          source.onended = null
          this.count--
          resolve()
        }
      })
    } finally {
      if (!store.state.settings.useAudio && !this.count) {
        this.disconnect()
      }
    }
  }
}

export default new AudioService()
