# Adding a New Exchange to Aggr

This guide provides a comprehensive step-by-step process for adding a new cryptocurrency exchange to the Aggr trading aggregator, based on the WhiteBIT integration (PR #429).

## Prerequisites

Before starting, ensure the exchange meets these requirements:

1. **Public WebSocket API** - The exchange must provide a public WebSocket API for real-time trade data
2. **Public REST API** - Must have a markets/products endpoint to fetch available trading pairs
3. **No Authentication Required** - The APIs should be accessible without API keys for public market data
4. **Proper Documentation** - Clear API documentation for both REST and WebSocket endpoints

## Step-by-Step Process

### 1. Research and Validation

1. **Study the Exchange API Documentation**
   - Identify the WebSocket endpoint URL
   - Find the REST API endpoint for markets/products
   - Understand the message format for trade subscriptions
   - Check if the API requires any special headers or parameters

2. **Test the APIs**
   - Verify the REST endpoint returns market data
   - Test WebSocket connection and trade subscription
   - Ensure the APIs are publicly accessible (no CORS issues)

### 2. Asset Preparation

1. **Download Exchange Assets**
   - Get the exchange logo/icon in high quality
   - Preferred format: SVG or high-resolution PNG

2. **Convert to Icon Font Format**
   - Use [IcoMoon.io](https://icomoon.io/) to convert the logo to SVG format
   - Ensure the SVG is optimized and clean
   - The icon should be recognizable at small sizes

### 3. Code Implementation

#### 3.1 Create the Exchange Class

Create a new file: `src/worker/exchanges/{exchangename}.ts`

```typescript
import Exchange from '../exchange'

export default class EXCHANGENAME extends Exchange {
  id = 'EXCHANGENAME'

  protected endpoints = {
    PRODUCTS: 'https://api.exchange.com/v1/markets'
  }

  async getUrl() {
    return 'wss://api.exchange.com/ws'
  }

  formatProducts(response) {
    // Parse the API response and return array of trading pairs
    return response.map(product => product.symbol)
  }

  async subscribe(api, pair) {
    if (!(await super.subscribe(api, pair))) {
      return
    }

    api.send(JSON.stringify({
      method: 'SUBSCRIBE',
      params: [`${pair}@trade`]
    }))

    return true
  }

  async unsubscribe(api, pair) {
    if (!(await super.unsubscribe(api, pair))) {
      return
    }

    api.send(JSON.stringify({
      method: 'UNSUBSCRIBE',
      params: [`${pair}@trade`]
    }))

    return true
  }

  formatTrade(market, trade) {
    return {
      exchange: this.id,
      pair: market,
      timestamp: trade.timestamp,
      price: +trade.price,
      size: +trade.quantity,
      side: trade.side
    }
  }

  onMessage(event, api) {
    const json = JSON.parse(event.data)
    
    if (json.stream && json.stream.includes('@trade')) {
      const market = json.stream.split('@')[0]
      return this.emitTrades(api.id, [
        this.formatTrade(market, json.data)
      ])
    }
  }

  // Optional: Add keepalive/ping functionality
  onApiCreated(api) {
    this.startKeepAlive(api, { ping: Date.now() }, 30000)
  }

  onApiRemoved(api) {
    this.stopKeepAlive(api)
  }
}
```

#### 3.2 Register the Exchange

1. **Add to exchanges index** (`src/worker/exchanges/index.ts`):
```typescript
import ExchangeName from './exchangename'

export const exchanges = [
  // ... existing exchanges
  new ExchangeName()
] as Exchange[]
```

#### 3.3 Add Exchange Assets

1. **Add SVG logo** to `src/assets/exchanges/EXCHANGENAME.svg`
2. **Add SVG icon** to `src/assets/svg/EXCHANGENAME.svg` (for icon font generation)
3. **Update exchanges index** (`src/assets/exchanges/index.ts`):
```typescript
import EXCHANGENAME from './EXCHANGENAME.svg'

export default {
  // ... existing exchanges
  EXCHANGENAME
}
```

### 4. Generate Icon Fonts

Run the icon font generation script:

```bash
npm run svg2font
```

This script will:
- Generate icon font files (`.eot`, `.ttf`, `.woff`, `.woff2`)
- Update `src/assets/sass/icons.scss` with new icon classes
- Update `src/assets/sass/variables.scss` with icon variables

### 5. Testing

1. **Start the development server**:
```bash
npm run serve
```

2. **Test the integration**:
   - Check if the exchange appears in the settings
   - Verify the icon displays correctly
   - Test market data fetching
   - Confirm WebSocket connection and trade streaming

### 6. Additional Considerations

#### Product Parsing
If the exchange has complex product formats, you may need to update `src/services/productsService.ts` to handle specific parsing logic.

**When to modify `productsService.ts`:**
- Exchange uses non-standard symbol formats (e.g., `BTC_USDT_PERP` instead of `BTCUSDT`)
- Need custom logic for identifying perpetuals, futures, or spot markets
- Exchange has unique naming conventions that need normalization
- Special handling for stablecoins or base/quote currency detection

**Example modifications:**
```typescript
// Add exchange-specific regex patterns
const EXCHANGENAME_PERP_REGEX = /_PERP$/
const EXCHANGENAME_FUTURES_REGEX = /_\d{4}$/

// Add to the parsing logic in getMarketProduct function
if (exchange === 'EXCHANGENAME') {
  // Custom parsing logic for this exchange
  if (EXCHANGENAME_PERP_REGEX.test(pair)) {
    type = 'perp'
    pair = pair.replace(EXCHANGENAME_PERP_REGEX, '')
  }
}
```

#### Error Handling
Ensure your exchange class handles:
- Connection failures
- Invalid responses
- Rate limiting
- Reconnection logic

#### Performance
Consider:
- `maxConnectionsPerApi` - Limit concurrent connections
- `delayBetweenMessages` - Add delays between subscriptions

## File Checklist

When adding a new exchange, ensure these files are created/modified:

### Required Files
- [ ] `src/worker/exchanges/{exchangename}.ts` - Main exchange implementation
- [ ] `src/worker/exchanges/index.ts` - Register exchange in imports and exports array
- [ ] `src/assets/exchanges/EXCHANGENAME.svg` - Logo for imports
- [ ] `src/assets/exchanges/index.ts` - Export logo
- [ ] `src/assets/svg/EXCHANGENAME.svg` - Icon for font generation

### Auto-Generated Files (via `npm run svg2font`)
- [ ] `src/assets/fonts/icon.eot` - Icon font (EOT format)
- [ ] `src/assets/fonts/icon.ttf` - Icon font (TTF format)
- [ ] `src/assets/fonts/icon.woff` - Icon font (WOFF format)
- [ ] `src/assets/fonts/icon.woff2` - Icon font (WOFF2 format)
- [ ] `src/assets/fonts/icon.svg` - Icon font (SVG format)
- [ ] `src/assets/fonts/icon.symbol.svg` - Icon symbol definitions
- [ ] `src/assets/sass/icons.scss` - Icon CSS classes (automatically updated)
- [ ] `src/assets/sass/variables.scss` - SCSS icon variables (automatically updated between header/footer markers)

### Optional Files
- [ ] `src/services/productsService.ts` - Add custom product parsing logic if needed

### Final Steps
- [ ] Run `npm run svg2font` to generate icon fonts and update CSS
- [ ] Test the implementation thoroughly
- [ ] Verify all icons display correctly in the UI

## Common Issues

1. **CORS Errors**: Some exchanges may block browser requests. Check if a proxy is needed.
2. **Rate Limiting**: Implement proper delays and connection limits.
3. **Message Format**: Ensure trade data is correctly parsed and formatted.
4. **Reconnection**: Handle WebSocket disconnections gracefully.

## Exchange Class Methods Reference

### Required Methods

#### `getUrl(): Promise<string>`
Returns the WebSocket URL for the exchange.

#### `formatProducts(response: any): string[]`
Parses the REST API response and returns an array of trading pair names.

#### `subscribe(api: WebSocket, pair: string): Promise<boolean>`
Subscribes to trade updates for a specific trading pair.

#### `unsubscribe(api: WebSocket, pair: string): Promise<boolean>`
Unsubscribes from trade updates for a specific trading pair.

#### `onMessage(event: MessageEvent, api: WebSocket): void`
Handles incoming WebSocket messages and emits trade data.

#### `formatTrade(market: string, trade: any): TradeData`
Formats raw trade data into the standard Aggr trade format:
```typescript
{
  exchange: string,    // Exchange ID
  pair: string,        // Trading pair
  timestamp: number,   // Unix timestamp in milliseconds
  price: number,       // Trade price
  size: number,        // Trade size/volume
  side: 'buy' | 'sell' // Trade side
}
```

### Optional Methods

#### `onApiCreated(api: WebSocket): void`
Called when a WebSocket connection is established. Use for keepalive setup.

#### `onApiRemoved(api: WebSocket): void`
Called when a WebSocket connection is closed. Use for cleanup.

#### `validateProducts(data: any): boolean`
Custom validation for products data.

### Configuration Properties

#### `protected endpoints`
Define REST API endpoints:
```typescript
protected endpoints = {
  PRODUCTS: 'https://api.exchange.com/markets',
  // Can also be an array for multiple endpoints
  PRODUCTS: [
    'https://api.exchange.com/spot/markets',
    'https://api.exchange.com/futures/markets'
  ]
}
```

#### `protected maxConnectionsPerApi: number`
Maximum number of trading pairs per WebSocket connection (default: unlimited).

#### `protected delayBetweenMessages: number`
Delay in milliseconds between subscription messages (default: 0).

## Common Patterns

### Multiple Endpoints
Some exchanges have separate endpoints for different market types:

```typescript
protected endpoints = {
  PRODUCTS: [
    'https://api.exchange.com/spot/markets',
    'https://api.exchange.com/futures/markets'
  ]
}

formatProducts(responses) {
  const [spotResponse, futuresResponse] = responses
  const products = []

  if (spotResponse?.data) {
    products.push(...spotResponse.data.map(p => p.symbol))
  }

  if (futuresResponse?.data) {
    products.push(...futuresResponse.data.map(p => p.symbol))
  }

  return [...new Set(products)] // Remove duplicates
}
```

### Keepalive/Ping Implementation
Many exchanges require periodic ping messages:

```typescript
onApiCreated(api) {
  // Send ping every 30 seconds
  this.startKeepAlive(api, { ping: Date.now() }, 30000)
}

onApiRemoved(api) {
  this.stopKeepAlive(api)
}
```

### Complex Message Handling
Handle different message types:

```typescript
onMessage(event, api) {
  const json = JSON.parse(event.data)

  // Handle pong responses
  if (json.pong) {
    return
  }

  // Handle subscription confirmations
  if (json.result === 'success') {
    return
  }

  // Handle trade updates
  if (json.method === 'trades_update') {
    const [market, trades] = json.params
    return this.emitTrades(
      api.id,
      trades.map(trade => this.formatTrade(market, trade))
    )
  }
}
```

## Testing Your Implementation

### Manual Testing Steps

1. **Check Exchange Registration**:
   - Open browser dev tools
   - Look for your exchange in the console logs during startup
   - Verify no errors during exchange initialization

2. **Test Product Fetching**:
   - Check network tab for REST API calls
   - Verify products are loaded correctly
   - Look for any CORS or authentication errors

3. **Test WebSocket Connection**:
   - Monitor WebSocket connections in dev tools
   - Verify subscription messages are sent
   - Check for proper trade data reception

4. **UI Integration**:
   - Confirm exchange appears in settings panel
   - Verify icon displays correctly
   - Test enabling/disabling the exchange

### Debug Console Commands

```javascript
// Check if exchange is registered
console.log(window.aggregatorService.exchanges.find(e => e.id === 'EXCHANGENAME'))

// Check exchange products
console.log(window.aggregatorService.exchanges.find(e => e.id === 'EXCHANGENAME').products)

// Monitor trade events
window.aggregatorService.on('trades', (trades) => {
  console.log('Trades:', trades.filter(t => t.exchange === 'EXCHANGENAME'))
})
```

## Troubleshooting

### Common Issues and Solutions

1. **Exchange not appearing in UI**:
   - Check if properly registered in `src/worker/exchanges/index.ts`
   - Verify the exchange class is exported correctly
   - Look for JavaScript errors in console

2. **Icon not displaying**:
   - Ensure SVG is added to `src/assets/svg/`
   - Run `npm run svg2font` after adding the SVG
   - Check if icon class exists in generated CSS

3. **No trade data**:
   - Verify WebSocket URL is correct
   - Check subscription message format
   - Ensure `onMessage` correctly parses trade data
   - Look for WebSocket errors in network tab

4. **CORS errors**:
   - Some exchanges block browser requests
   - May need to use the CORS proxy server
   - Check if exchange provides CORS headers

5. **Rate limiting**:
   - Add delays between subscriptions
   - Limit concurrent connections
   - Implement proper error handling

## Example Implementation

Refer to the WhiteBIT implementation in `src/worker/exchanges/whitebit.ts` for a complete working example that demonstrates:
- Multiple endpoint handling
- Proper trade formatting
- Keepalive implementation
- Error handling patterns
