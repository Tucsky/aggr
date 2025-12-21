/**
 * MEXC Spot-specific message handling
 * Handles protobuf and JSON WebSocket messages for spot trading
 * Endpoint: wss://wbs-api.mexc.com/ws
 * Based on official MEXC protobuf schema: https://github.com/mexcdevelop/websocket-proto
 */

import protobuf from 'protobufjs'

// Define the proto schema inline (matches backup implementation)
const protoSchema = `
syntax = "proto3";

message PublicAggreDealsV3ApiItem {
  string price = 1;
  string quantity = 2;
  int32 tradeType = 3;
  int64 time = 4;
}

message PublicAggreDealsV3Api {
  repeated PublicAggreDealsV3ApiItem deals = 1;
  string eventType = 2;
}

message PublicAggreDepthV3ApiItem {
  string price = 1;
  string quantity = 2;
}

message PublicAggreDepthsV3Api {
  repeated PublicAggreDepthV3ApiItem asks = 1;
  repeated PublicAggreDepthV3ApiItem bids = 2;
  string eventType = 3;
  string fromVersion = 4;
  string toVersion = 5;
}

message PushDataV3ApiWrapper {
  string channel = 1;
  optional string symbol = 3;
  optional string symbolId = 4;
  optional int64 createTime = 5;
  optional int64 sendTime = 6;
  PublicAggreDealsV3Api publicAggreDeals = 314;
  PublicAggreDepthsV3Api publicAggreDepths = 318;
}
`

let PushDataV3ApiWrapper: protobuf.Type | null = null

// Parse and cache the proto schema
function initProtobuf() {
  if (PushDataV3ApiWrapper) {
    return PushDataV3ApiWrapper
  }

  try {
    const root = protobuf.parse(protoSchema, { keepCase: false }).root
    PushDataV3ApiWrapper = root.lookupType('PushDataV3ApiWrapper')
  } catch (error) {
    console.error('[MEXC Protobuf] Failed to initialize:', error)
    throw error
  }

  return PushDataV3ApiWrapper
}

/**
 * Decode MEXC protobuf message from ArrayBuffer
 * @param arrayBuffer - Raw protobuf data from WebSocket
 * @returns Decoded message or null if error
 */
export function decodeMexcProtobuf(arrayBuffer: ArrayBuffer): any | null {
  try {
    const decoder = initProtobuf()
    if (!decoder) {
      return null
    }

    const uint8Array = new Uint8Array(arrayBuffer)
    const message = decoder.decode(uint8Array)
    const err = decoder.verify(message)

    if (err) {
      console.error('[MEXC Protobuf] Verification error:', err)
      return null
    }

    return message
  } catch (error) {
    console.error('[MEXC Protobuf] Decode error:', error)
    return null
  }
}

/**
 * Extract trades from decoded MEXC protobuf message
 * @param message - Decoded PushDataV3ApiWrapper message
 * @param pair - Trading pair symbol
 * @returns Array of formatted trades
 */
export function extractTradesFromProtobuf(message: any, pair: string) {
  if (!message.publicAggreDeals || !message.publicAggreDeals.deals) {
    return []
  }

  const deals = message.publicAggreDeals.deals
  const symbol = message.symbol || pair

  return deals.map((deal: any) => {
    // MEXC protobuf quantity field is in base currency (e.g., BTC for BTCUSDT)
    const price = parseFloat(deal.price)
    const quantity = parseFloat(deal.quantity)
    return {
      exchange: 'MEXC',
      pair: symbol,
      timestamp: parseInt(deal.time, 10),
      price: price,
      size: quantity,
      side: deal.tradeType === 1 ? 'buy' : 'sell'
    }
  })
}

/**
 * Handle spot JSON message (subscription confirmations and PONG only)
 * Actual trade data comes via protobuf (ArrayBuffer)
 * @param json - Parsed JSON message
 * @returns true if handled, falsy otherwise
 */
export function handleSpotJsonMessage(json: any) {
  // Handle subscription confirmations and PONG
  if (json.id !== undefined && json.msg) {
    return true
  }

  return false
}
