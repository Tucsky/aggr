import Vue from 'vue'
import Tuna from 'tunajs'
import store from '../store'
import { findClosingBracketMatchIndex } from '@/utils/helpers'

export type AudioFunction = (
  play: (frequency: number, gain: number, duration: number, length?: number, slope?: number, osc?: string) => Promise<void>,
  percent: number,
  side: 'buy' | 'sell',
  level: number
) => void

class SfxService {
  timestamp: number
  context: AudioContext
  tuna: any

  queued: any[] = []
  output: any
  volume: number

  _play: (frequency: number, gain: number, duration: number, length?: number, slope?: number, osc?: string) => Promise<void>

  constructor() {
    this._play = this.playOrQueue.bind(this)
  }

  connect() {
    console.log(`[sfx] connect`)
    if (this.context) {
      console.debug(`[sfx] context already exists -> abort`)
      return
    }

    this.timestamp = +new Date()
    this.queued.splice(0, this.queued.length)

    this.setVolume(store.state.settings.audioVolume)

    Vue.nextTick(() => {
      this.bindContext()
      this.bindOutput()
    })
  }

  bindContext() {
    this.context = new AudioContext()

    let checkInProgress = false

    if (this.context.state === 'suspended') {
      const application = document.body

      setTimeout(() => {
        application.focus()
      }, 500)

      const resumeOnFocus = (event => {
        if (checkInProgress) {
          return
        }

        checkInProgress = true

        console.log('[sfx] Yet another try to start AudioContext')

        if (this.context && store.state.settings.useAudio) {
          this.context.resume()
        }

        setTimeout(() => {
          if (!store.state.settings.useAudio || this.context.state !== 'suspended') {
            if (store.state.settings.useAudio) {
              store.dispatch('app/showNotice', {
                id: 'audio',
                type: 'success',
                title: 'Audio resumed successfully 🔊'
              })

              console.info(`[sfx] AudioContext resumed successfully during the "${event.type}" event.`)
            }

            window.removeEventListener('focus', resumeOnFocus)
            window.removeEventListener('blur', resumeOnFocus)
            application.removeEventListener('click', resumeOnFocus)
          } else if (this.context.state === 'suspended') {
            store.dispatch('app/showNotice', {
              id: 'audio',
              type: 'error',
              title: 'Browser prevented audio from starting 😣<br>Click somewhere to retry.'
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

    if (store.state.settings.audioPingPong) {
      effects.push(
        new this.tuna.PingPongDelay({
          wetLevel: 0.6, //0 to 1
          feedback: 0.01, //0 to 1
          delayTimeLeft: 175, //1 to 10000 (milliseconds)
          delayTimeRight: 100 //1 to 10000 (milliseconds)
        })
      )
    }

    if (store.state.settings.audioFilter) {
      effects.push(
        new this.tuna.Filter({
          frequency: 800, //20 to 22050
          Q: 10, //0.001 to 100
          gain: -10, //-40 to 40 (in decibels)
          filterType: 'highpass', //lowpass, highpass, bandpass, lowshelf, highshelf, peaking, notch, allpass
          bypass: 0
        })
      )
    }

    if (store.state.settings.audioDelay) {
      effects.push(
        new this.tuna.Delay({
          feedback: 0.3, //0 to 1+
          delayTime: 80, //1 to 10000 milliseconds
          wetLevel: 0.3, //0 to 1+
          dryLevel: 0.5, //0 to 1+
          cutoff: 2000, //cutoff frequency of the built in lowpass-filter. 20 to 22050
          bypass: 1
        })
      )
    }

    if (store.state.settings.audioCompressor) {
      effects.push(
        new this.tuna.Compressor({
          threshold: -1, //-100 to 0
          makeupGain: 1, //0 and up (in decibels)
          attack: 1, //0 to 1000
          release: 0, //0 to 3000
          ratio: 4, //1 to 20
          knee: 5, //0 to 40
          automakeup: true, //true/false
          bypass: 0
        })
      )
    }

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

  playOrQueue(options) {
    if (this.queued.length) {
      this.queued.push(options)
      return
    }

    this.queued.push(options)

    return this.playTilEmpty(options)
  }

  async playTilEmpty(options) {
    await this.play(options)

    if (this.queued.length) {
      this.playTilEmpty.call(this, this.queued[0])
    }
  }

  async play([frequency, gain, duration, length, slope, osc]) {
    if (this.context.state !== 'running') {
      this.queued.shift()
      return
    }

    const time = this.context.currentTime
    const oscillatorNode = this.context.createOscillator()
    const gainNode = this.context.createGain()
    gain = Math.min(1, gain) * this.volume

    oscillatorNode.frequency.value = frequency
    oscillatorNode.type = osc || 'triangle'

    oscillatorNode.onended = () => {
      oscillatorNode.disconnect()
      gainNode.disconnect()
    }

    gainNode.connect(this.output)
    oscillatorNode.connect(gainNode)

    const decay = duration * 0.618

    gainNode.gain.value = gain
    gainNode.gain.exponentialRampToValueAtTime(slope || 0.001, time + decay)

    oscillatorNode.start(time)
    oscillatorNode.stop(time + decay)

    const timeout = length || duration * 1000
    // const timeout = (length || duration * 1000) - this.queued.length * 0.5

    return new Promise<void>(resolve => {
      setTimeout(() => {
        this.queued.shift()
        resolve()
      }, timeout)
    })
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
  buildAudioFunction(litteral, side, notice = false) {
    litteral = `'use strict'; 
    var duration = .2 + percent + level;
    var gain = (percent + level) / 4;
    
    ${litteral}`

    const FUNCTION_LOOKUP_REGEX = new RegExp(`play\\([^[]`, 'g')
    let functionMatch = null

    do {
      if ((functionMatch = FUNCTION_LOOKUP_REGEX.exec(litteral))) {
        const inlineParameters = litteral.slice(
          functionMatch.index + functionMatch[0].length - 1,
          findClosingBracketMatchIndex(litteral, functionMatch.index + functionMatch[0].length - 2)
        )

        litteral = litteral.replace('(' + inlineParameters, '([' + inlineParameters + ']')
      }
    } while (functionMatch)

    return new Function('play', 'percent', 'side', 'level', litteral) as AudioFunction
  }

  setVolume(value: number) {
    this.volume = Math.log(1 + value)
  }
}

export default new SfxService()
