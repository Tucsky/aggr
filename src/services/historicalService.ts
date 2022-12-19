import EventEmitter from 'eventemitter3'
import { getApiUrl } from '../utils/helpers'

interface DataResponse {
  id: string
  market: string
  timeframe: number
  prop: string
  from: number
  to: number
  points: number[]
}

class HistoricalService extends EventEmitter {
  url: string
  ws: WebSocket

  _idleTimeout: number
  _promiseOfWsOpen: Promise<void>
  _promisesOfData: { [id: string]: (res: DataResponse) => void } = {}

  constructor() {
    super()

    this.url = getApiUrl().replace('http', 'ws')
  }

  createWs() {
    if (this._promiseOfWsOpen) {
      return this._promiseOfWsOpen
    }

    this._promiseOfWsOpen = new Promise(resolve => {
      this.ws = new WebSocket(this.url)

      this.ws.onopen = () => {
        resolve()
      }

      this.ws.onmessage = this.onMessage.bind(this)
    })
  }

  onMessage(event) {
    const json: DataResponse = JSON.parse(event.data)

    if (this._promisesOfData[json.id]) {
      this._promisesOfData[json.id](json)
      delete this._promisesOfData[json.id]
    }
  }

  async getData(id: string): Promise<DataResponse> {
    const [market, timeframe, prop, from, to] = id.split('#')

    if (!this.ws) {
      await this.createWs()
    }

    this.ws.send(
      JSON.stringify({
        op: 'historical',
        params: {
          id,
          market,
          timeframe,
          prop,
          from,
          to
        }
      })
    )

    return new Promise(resolve => {
      this._promiseOfWsOpen[id] = resolve
    })
  }
}

export default new HistoricalService()
