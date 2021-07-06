import Vue from 'vue'
import Tuna from 'tunajs'
import store from '../store'
import { findClosingBracketMatchIndex, parseFunctionArguments, randomString } from '@/utils/helpers'

export type AudioFunction = (
  play: (
    frequency?: number,
    gain?: number,
    fadeOut?: number,
    delay?: number,
    fadeIn?: number,
    holdDuration?: number,
    osc?: string,
    startGain?: number,
    endGain?: number
  ) => Promise<void>,
  ratio: number,
  side: 'buy' | 'sell',
  level: number
) => void

class AudioService {
  context: AudioContext
  tuna: any

  output: any

  _play: (
    frequency?: number,
    gain?: number,
    fadeOut?: number,
    delay?: number,
    fadeIn?: number,
    holdDuration?: number,
    osc?: string,
    startGain?: number,
    endGain?: number
  ) => Promise<void>
  count = 0
  minTime = 0
  debug = false

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
    // this.context = new AudioContext()
    this.context = new ((window as any).AudioContext || (window as any).webkitAudioContext)()

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

    const oscillatorNode = this.context.createOscillator()
    const gainNode = this.context.createGain()

    oscillatorNode.frequency.value = frequency
    oscillatorNode.type = osc || 'triangle'

    const id = randomString()

    oscillatorNode.onended = () => {
      oscillatorNode.disconnect()
      gainNode.disconnect()
      this.count--
      this.debug && console.log(id, 'ended.', this.context.currentTime.toFixed(2) + 's')
    }

    if (this.debug) {
      console.log(
        id,
        '[' + this.context.currentTime.toFixed(2) + ', ' + this.count + ']',
        'play',
        'frequency',
        frequency,
        'gain',
        gain,
        'holdDuration',
        holdDuration,
        'delay',
        delay,
        'fadeIn',
        fadeIn,
        'startGain',
        startGain,
        'fadeOut',
        fadeOut,
        'endGain',
        endGain,
        'osc',
        osc
      )
    }

    gainNode.connect(this.output)
    oscillatorNode.connect(gainNode)

    if (!this.minTime || !this.count) {
      this.minTime = this.context.currentTime
    } else {
      this.minTime = Math.max(this.minTime, this.context.currentTime)

      if (!delay) {
        const cueTime = this.count > 10 ? (this.count > 20 ? (this.count > 100 ? 0.01 : 0.02) : 0.04) : 0.08

        console.log('add cue time', cueTime, this.count)
        this.minTime += cueTime
      }
    }
    this.count++

    const time = this.minTime + delay
    const offset = time - this.context.currentTime
    this.debug && console.log(id, `\t offset === ${offset.toFixed(2) + 's'}`)
    oscillatorNode.start(time)
    oscillatorNode.stop(time + fadeIn + holdDuration + fadeOut)
    this.debug && console.log(id, `\t start at ${time.toFixed(2) + 's'}, end at ${(time + fadeIn + holdDuration + fadeOut).toFixed(2) + 's'}`)

    if (fadeIn) {
      gainNode.gain.setValueAtTime(startGain, this.context.currentTime)

      gainNode.gain.exponentialRampToValueAtTime(gain, time + fadeIn)
      if (this.debug) {
        console.log(
          id,
          `\t [${this.context.currentTime.toFixed(2)}] exponentialRampToValueAtTime ${startGain} -> ${gain} (${time.toFixed(2) + 's'} to ${(
            time + fadeIn
          ).toFixed(2) + 's'})`
        )
      }

      if (fadeOut) {
        gainNode.gain.setValueAtTime(gain, time + fadeIn + holdDuration)

        gainNode.gain.exponentialRampToValueAtTime(endGain, time + fadeIn + holdDuration + fadeOut)

        setTimeout(() => {
          if (this.debug) {
            console.log(
              id,
              `\t[${this.context.currentTime.toFixed(2)}] exponentialRampToValueAtTime ${gain} -> ${endGain} (${(
                time +
                fadeIn +
                holdDuration
              ).toFixed(2)}s to ${(this.context.currentTime + fadeOut).toFixed(2)}s)`
            )
          }
        }, (offset + fadeIn + holdDuration) * 1000)
      }
    } else {
      this.debug && console.log(id, `\t set base gain ${gain}`)
      gainNode.gain.setValueAtTime(gain, time)

      if (fadeOut) {
        if (this.debug) {
          console.log(
            id,
            `\t [${this.context.currentTime.toFixed(2)}] exponentialRampToValueAtTime ${gain} -> ${endGain} (${time.toFixed(2) + 's'} to ${(
              time +
              fadeIn +
              holdDuration +
              fadeOut
            ).toFixed(2)}s)`
          )
        }

        gainNode.gain.exponentialRampToValueAtTime(endGain, time + fadeIn + holdDuration + fadeOut)
      }
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

    const FUNCTION_LOOKUP_REGEX = /play\(/g
    let functionMatch = null

    if (gainMultiplier === null) {
      gainMultiplier = store.state.settings.audioVolume
    }

    do {
      if ((functionMatch = FUNCTION_LOOKUP_REGEX.exec(litteral))) {
        const originalParameters = litteral.slice(
          functionMatch.index + functionMatch[0].length,
          findClosingBracketMatchIndex(litteral, functionMatch.index + functionMatch[0].length - 1)
        )

        const functionArguments = parseFunctionArguments(originalParameters)

        const defaultArguments = [
          329.63, // frequency
          1, // gain
          1, // fadeOut
          0, // delay
          0, // fadeIn
          0, // holdDuration
          `'triangle'`, // osc
          0.0001, // startGain
          0.0001 // endGain
        ]

        for (let i = 0; i < defaultArguments.length; i++) {
          let argumentValue = defaultArguments[i]
          if (typeof functionArguments[i] !== 'undefined') {
            if (typeof functionArguments[i] === 'string') {
              functionArguments[i] = functionArguments[i].trim()

              if (/^('|").*('|")$/.test(functionArguments[i]) && typeof defaultArguments[i] === 'number') {
                functionArguments[i] = defaultArguments[i]
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

          functionArguments[i] = argumentValue
        }

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

        litteral = litteral.replace('(' + originalParameters + ')', '(' + finalParameters + ')')
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
