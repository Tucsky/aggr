import { AggregatorPayload } from '@/types/test'
import { randomString } from './utils'

let pending = 0

export function dispatchAsync(payload: AggregatorPayload) {
  const trackingId = randomString(8)

  if (pending > 5) {
    console.warn(`[worker.dispatchAsync] there is ${pending} messages still waiting answer from service.`)
  }

  pending++

  return new Promise(resolve => {
    console.debug('[worker] send to service (with tracking)', payload, trackingId)

    const listener = ({ data }: { data: AggregatorPayload }) => {
      if (data.trackingId === payload.trackingId) {
        pending--
        console.debug('[worker] tracking message match', 'resolving', trackingId)
        self.removeEventListener('message', listener)
        resolve(data.data)
      }
    }

    self.addEventListener('message', listener)

    payload.trackingId = trackingId
    ;((self as unknown) as Worker).postMessage(payload)
  })
}
