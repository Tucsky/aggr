export interface MarketAlertEntity {
  price: number
  market: string
  active: boolean
  message?: string
  timestamp?: number
  triggered?: boolean
}

export interface MarketAlerts {
  market: string
  alerts: MarketAlertEntity[]
}

import { AlertEventType} from './enums'

export interface AlertEvent {
  type: AlertEventType
  price: number
  market: string
  message?: string
  timestamp?: number
  newPrice?: number
}

export interface AlertResponse {
  error?: string
  markets?: string[]
  alert?: any
  priceOffset?: number
}
