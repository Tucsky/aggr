import { AggregatorPayload } from '@/types/types'

import Aggregator from './aggregator'

addEventListener('message', (event: any) => {
  const payload = event.data as AggregatorPayload
  if (typeof aggregator[payload.op] === 'function') {
    aggregator[payload.op](payload.data, payload.trackingId)
  }
})

const aggregator = new Aggregator(self as any)
