import Vue from 'vue'
import Tuna from 'tunajs'
import store from '../store'
import { findClosingBracketMatchIndex, parseFunctionArguments } from '@/utils/helpers'

export type AudioFunction = (
  play: (frequency: number, gain: number, duration: number, length?: number, ramp?: number, osc?: string) => Promise<void>,
  ratio: number,
  side: 'buy' | 'sell',
  level: number
) => void

class AudioService {
  context: AudioContext
  tuna: any

  output: any

  _play: (frequency: number, gain: number, duration: number, length?: number, ramp?: number, osc?: string) => Promise<void>
  count = 0
  minTime = 0

  constructor() {
    this._play = this.play.bind(this)
  }

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

  async play([frequency, gain, duration, delay, ramp, osc]) {
    if (this.context.state !== 'running') {
      return
    }

    const oscillatorNode = this.context.createOscillator()
    const gainNode = this.context.createGain()
    gain = Math.min(1, gain)

    oscillatorNode.frequency.value = frequency
    oscillatorNode.type = osc || 'triangle'

    oscillatorNode.onended = () => {
      oscillatorNode.disconnect()
      gainNode.disconnect()
      this.count--
    }

    this.count++

    gainNode.connect(this.output)
    oscillatorNode.connect(gainNode)

    if (ramp) {
      gainNode.gain.value = 0.0001
      gainNode.gain.exponentialRampToValueAtTime(gain, this.context.currentTime + delay + ramp)
      setTimeout(() => {
        gainNode.gain.exponentialRampToValueAtTime(0.0001, this.context.currentTime + duration)
      }, (delay + ramp) * 1000)

      oscillatorNode.start(this.context.currentTime + delay)
      oscillatorNode.stop(this.context.currentTime + delay + ramp + duration)
    } else {
      if (!this.minTime) {
        this.minTime = this.context.currentTime
      } else {
        this.minTime = Math.max(this.minTime, this.context.currentTime)

        if (!delay) {
          this.minTime += this.count > 10 ? (this.count > 20 ? (this.count > 100 ? 0.01 : 0.02) : 0.04) : 0.08
        }
      }

      const time = this.minTime + delay

      gainNode.gain.setValueAtTime(gain, time)
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration)

      oscillatorNode.start(time)
      oscillatorNode.stop(0.2 + time + duration)
    }
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
  buildAudioFunction(litteral, side, frequencyMultiplier: number = null, gainMultiplier: number = null, test = false) {
    litteral = `'use strict'; 
    
    ${litteral}`

    const FUNCTION_LOOKUP_REGEX = new RegExp(`play\\([^[]`, 'g')
    let functionMatch = null

    if (gainMultiplier === null) {
      gainMultiplier = store.state.settings.audioVolume
    }

    do {
      if ((functionMatch = FUNCTION_LOOKUP_REGEX.exec(litteral))) {
        const originalParameters = litteral.slice(
          functionMatch.index + functionMatch[0].length - 1,
          findClosingBracketMatchIndex(litteral, functionMatch.index + functionMatch[0].length - 2)
        )

        const functionArguments = parseFunctionArguments(originalParameters)

        if (+functionArguments[0] && frequencyMultiplier && frequencyMultiplier !== 1) {
          functionArguments[0] *= frequencyMultiplier
        }

        if (gainMultiplier && gainMultiplier !== 1) {
          if (+functionArguments[1]) {
            functionArguments[1] *= gainMultiplier
          } else {
            functionArguments[1] = gainMultiplier + '*(' + functionArguments[1] + ')'
          }
        }

        const finalParameters = functionArguments.join(',')

        litteral = litteral.replace('(' + originalParameters, '([' + finalParameters + ']')
      }
    } while (functionMatch)

    try {
      return new Function('play', 'ratio', 'side', 'level', litteral) as AudioFunction
    } catch (error) {
      console.warn('invalid audio script', litteral)

      if (test) {
        throw error
      } else {
        store.dispatch('app/showNotice', {
          id: 'audio-script-error',
          type: 'error',
          title: `Please check that ${side} audio script is syntactically correct. `,
          timeout: 60000
        })

        return new Function() as AudioFunction
      }
    }
  }
}

export default new AudioService()
