export enum AlertEventType {
  CREATED,
  ACTIVATED,
  DELETED,
  STATUS,
  DEACTIVATED,
  TRIGGERED,
  UPDATED
}

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

export interface MarketAlerts {
  market: string
  alerts: MarketAlert[]
}

export interface MarketAlert {
  price: number
  market: string
  message?: string
  active?: boolean
  timestamp?: number
  triggered?: boolean
}
