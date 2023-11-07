import { MarketAlertEntity } from '../types'

export default class Alert implements MarketAlertEntity {
  price: number
  market: string
  active: boolean
  message?: string
  timestamp?: number
  triggered?: boolean
}
