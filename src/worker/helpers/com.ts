import { AggregatorPayload } from '@/types/test'
import { randomString } from './utils'

export function dispatchAsync(payload: AggregatorPayload) {
  const trackingId = randomString(8)

  return new Promise(resolve => {
    const listener = ({ data }: { data: AggregatorPayload }) => {
      if (data.trackingId === payload.trackingId) {
        self.removeEventListener('message', listener)
        resolve(data.data)
      }
    }

    self.addEventListener('message', listener)

    payload.trackingId = trackingId
    ;((self as unknown) as Worker).postMessage(payload)
  })
}
