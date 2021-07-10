import Vue from 'vue'
import Tuna from 'tunajs'
import store from '../store'
import { findClosingBracketMatchIndex, parseFunctionArguments } from '@/utils/helpers'

export type AudioFunction = (audioService: AudioService, ratio: number, side: 'buy' | 'sell', level: number) => void

class AudioService {
  static savedAudioBuffers = {}
  context: AudioContext
  tuna: any

  output: any
  count = 0
  minTime = 0

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

  loadSoundBuffer(url) {
    return new Promise((resolve, reject) => {
      if (AudioService.savedAudioBuffers[url] === undefined || !(AudioService.savedAudioBuffers[url] instanceof AudioBuffer)) {
        fetch(url)
          .then(res => res.arrayBuffer())
          .then(arrayBuffer => {
            this.context
              .decodeAudioData(arrayBuffer)
              .then(audioBuffer => {
                AudioService.savedAudioBuffers[url] = audioBuffer
                resolve(audioBuffer)
              })
              .catch(error => {
                reject(error)
              })
          })
          .catch(error => {
            reject(error)
          })
      } else {
        resolve(AudioService.savedAudioBuffers[url])
      }
    })
  }

  async playurl(
    url?: string,
    gain?: number,
    startTime?: number,
    fadeOut?: number,
    delay?: number,
    fadeIn?: number,
    holdDuration?: number,
    startGain?: number,
    endGain?: number
  ) {
    if (this.context.state !== 'running') {
      return
    }
    // Create a gain node and buffersource
    const gainNode = this.context.createGain()
    const source = this.context.createBufferSource()

    this.loadSoundBuffer(url).then((buffer: AudioBuffer) => {
      source.buffer = buffer
      // Connect the source to the gain node.
      source.connect(gainNode)
      // Connect the gain node to the destination.
      gainNode.connect(this.output)

      source.onended = () => {
        gainNode.disconnect()
        this.count--
      }
      this.count++

      let cueTime = 0

      if (!this.minTime) {
        this.minTime = this.context.currentTime
      } else {
        this.minTime = Math.max(this.minTime, this.context.currentTime)
        if (!delay) {
          cueTime = this.count > 10 ? (this.count > 20 ? (this.count > 100 ? 0.01 : 0.02) : 0.04) : 0.08
        }
      }

      const time = this.minTime + cueTime + delay

      this.minTime += cueTime

      const offset = time - this.context.currentTime

      source.start(time, startTime)
      source.stop(0.2 + time + holdDuration)

      if (fadeIn) {
        gainNode.gain.setValueAtTime(startGain, this.context.currentTime)

        gainNode.gain.exponentialRampToValueAtTime(gain, time + fadeIn)

        if (fadeOut) {
          gainNode.gain.setValueAtTime(gain, time + fadeIn + holdDuration)

          setTimeout(() => {
            gainNode.gain.exponentialRampToValueAtTime(endGain, time + fadeIn + holdDuration + fadeOut)
          }, (offset + fadeIn + holdDuration) * 1000)
        }
      } else {
        gainNode.gain.setValueAtTime(gain, time)

        if (fadeOut) {
          gainNode.gain.exponentialRampToValueAtTime(endGain, time + fadeIn + holdDuration + fadeOut)
        }
      }
    })
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

    oscillatorNode.onended = () => {
      oscillatorNode.disconnect()
      gainNode.disconnect()
      this.count--
    }

    gainNode.connect(this.output)
    oscillatorNode.connect(gainNode)
    this.count++

    let cueTime = 0

    if (!this.minTime) {
      this.minTime = this.context.currentTime
    } else {
      this.minTime = Math.max(this.minTime, this.context.currentTime)
      if (!delay) {
        cueTime = this.count > 10 ? (this.count > 20 ? (this.count > 100 ? 0.01 : 0.02) : 0.04) : 0.08
      }
    }

    const time = this.minTime + cueTime + delay

    this.minTime += cueTime

    const offset = time - this.context.currentTime
    oscillatorNode.start(time - 0.05)
    oscillatorNode.stop(time + fadeIn + holdDuration + fadeOut)

    if (fadeIn) {
      gainNode.gain.setValueAtTime(startGain, time - 0.05)

      gainNode.gain.exponentialRampToValueAtTime(gain, time + fadeIn)

      if (fadeOut) {
        gainNode.gain.setValueAtTime(gain, time + fadeIn + holdDuration)

        setTimeout(() => {
          gainNode.gain.exponentialRampToValueAtTime(endGain, time + fadeIn + holdDuration + fadeOut)
        }, (offset + fadeIn + holdDuration) * 1000)
      }
    } else {
      gainNode.gain.setValueAtTime(gain, time - 0.05)

      if (fadeOut) {
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
  async buildAudioFunction(litteral, side, frequencyMultiplier: number = null, gainMultiplier: number = null, test = false) {
    litteral = `'use strict'; 
    var gain = Math.sqrt(ratio);
    ${litteral}`

    const FUNCTION_LOOKUP_REGEX = /(play|playurl)\(/g
    let functionMatch = null

    if (gainMultiplier === null) {
      gainMultiplier = store.state.settings.audioVolume
    }

    try {
      do {
        if ((functionMatch = FUNCTION_LOOKUP_REGEX.exec(litteral))) {
          // console.log(functionMatch)
          const originalParameters = litteral.slice(
            functionMatch.index + functionMatch[0].length,
            findClosingBracketMatchIndex(litteral, functionMatch.index + functionMatch[0].length - 1)
          )

          const functionArguments = parseFunctionArguments(originalParameters)

          if (!functionArguments) {
            throw new Error('invalid argument(s) for ' + functionMatch[0] + ' function')
          }

          let defaultArguments

          if (functionMatch[1] === 'play') {
            defaultArguments = [
              329.63, // frequency
              1, // gain
              1, // fadeOut
              null, // delay
              0, // fadeIn
              0, // holdDuration
              `'triangle'`, // osc
              0.0001, // startGain
              0.0001 // endGain
            ]
          } else {
            defaultArguments = [
              `'https://ia902807.us.archive.org/27/items/blackpinkepitunes01boombayah/01.%20DDU-DU%20DDU-DU%20%28BLACKPINK%20ARENA%20TOUR%202018%20_SPECIAL%20FINAL%20IN%20KYOCERA%20DOME%20OSAKA_%29.mp3'`, // url
              1, // gain
              0, // startTime
              1, // fadeOut
              null, // delay
              0, // fadeIn
              0.1, // holdDuration
              0.00001, // startGain
              0.00001 // endGain
            ]
          }

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

            if (argumentValue === null) {
              functionArguments[i] = 'null'
            } else {
              functionArguments[i] = argumentValue
            }
          }

          if (functionMatch[1] === 'play') {
            if (+functionArguments[0] && frequencyMultiplier && frequencyMultiplier !== 1) {
              functionArguments[0] *= frequencyMultiplier
            }
          } else {
            await this.loadSoundBuffer(functionArguments[0].slice(1, functionArguments[0].length - 1))
          }

          if (gainMultiplier && gainMultiplier !== 1) {
            for (let i = 1; i <= 2; i++) {
              if (+functionArguments[1]) {
                functionArguments[1] *= gainMultiplier
              } else {
                functionArguments[1] = gainMultiplier + '*(' + functionArguments[1] + ')'
              }
            }
          }

          const finalParameters = functionArguments.join(', ')

          litteral = litteral.replace('(' + originalParameters + ')', '(' + finalParameters + ')')
        }
      } while (functionMatch)

      litteral = litteral.replaceAll('play(', "audioService['play'](")
      litteral = litteral.replaceAll('playurl(', "audioService['playurl'](")

      return new Function('audioService', 'ratio', 'side', 'level', litteral) as AudioFunction
    } catch (error) {
      console.warn('invalid audio script', litteral)

      if (test) {
        throw error
      } else {
        store.dispatch('app/showNotice', {
          id: 'audio-script-error',
          type: 'error',
          title: `Please check that ${side} audio script is syntactically correct.` + (error.message ? `<br>${error.message}` : ''),
          timeout: 60000
        })

        return new Function() as AudioFunction
      }
    }
  }
}

export default new AudioService()
