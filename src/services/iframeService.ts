import { syncCrosshair } from '@/components/chart/common'
import { INFRAME } from '@/utils/constants'

class IframeService {
  constructor() {
    this.listen()
  }

  listen() {
    window.addEventListener('message', event => {
      if (
        !event.data ||
        typeof event.data !== 'string' ||
        !event.data.startsWith('{') ||
        !event.data.endsWith('}')
      ) {
        return
      }

      const json = JSON.parse(event.data)

      if (!json || !json.op) {
        return
      }

      switch (json.op) {
        case 'crosshair':
          syncCrosshair(json.data)
          break
      }
    })
  }

  send(op: string, data: any) {
    window.parent.postMessage(
      JSON.stringify({
        op,
        data
      }),
      '*'
    )
  }
}

export default INFRAME ? new IframeService() : null
