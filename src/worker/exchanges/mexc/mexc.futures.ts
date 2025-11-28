/**
 * MEXC Futures-specific message handling
 * Handles JSON WebSocket messages for perpetual/futures contracts
 * Endpoint: wss://contract.mexc.com/edge
 */

/**
 * Handle futures JSON message
 * @param json - Parsed JSON message
 * @param contractSizes - Map of pair to contract size
 * @param inversed - Map of pair to inverse flag
 * @returns Formatted trades array, true if handled, or falsy
 */
export function handleFuturesMessage(
  json: any,
  contractSizes: { [pair: string]: number },
  inversed: { [pair: string]: boolean }
) {
  // Futures trade messages
  if (json.channel === 'push.deal' && json.data && Array.isArray(json.data)) {
    return json.data.map(trade =>
      formatFuturesTrade(trade, json.symbol, contractSizes, inversed)
    )
  }

  // Handle futures subscription responses and pong
  if (json.channel === 'rs.sub.deal' || json.channel === 'pong') {
    return true
  }

  return false
}

/**
 * Format a single futures trade
 * @param trade - Raw trade data from WebSocket
 * @param pair - Trading pair
 * @param contractSizes - Map of pair to contract size
 * @param inversed - Map of pair to inverse flag
 * @returns Formatted trade object
 */
function formatFuturesTrade(
  trade: any,
  pair: string,
  contractSizes: { [pair: string]: number },
  inversed: { [pair: string]: boolean }
) {
  // MEXC Futures: trade.v is number of contracts
  const contractSize = contractSizes[pair] || 1
  const isInverse = inversed[pair]

  // For linear (USDT): v * contractSize = base amount (BTC)
  // For inverse (USD): v * contractSize = USD value, divide by price for base
  const size = isInverse
    ? (+trade.v * contractSize) / +trade.p
    : +trade.v * contractSize

  return {
    exchange: 'MEXC',
    pair: pair,
    timestamp: trade.t,
    price: +trade.p,
    size: size,
    side: trade.T === 1 ? 'buy' : 'sell'
  }
}
