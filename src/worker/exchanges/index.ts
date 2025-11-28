import Exchange from '../exchange'

import Aggr from './aggr'
import Aster from './aster'
import Binance from './binance'
import BinanceFutures from './binance_futures'
import BinanceUs from './binance_us'
import Bitfinex from './bitfinex'
import Bitget from './bitget'
import Bitmart from './bitmart'
import Bitmex from './bitmex'
import Bitstamp from './bitstamp'
import Bitunix from './bitunix'
import Bybit from './bybit'
import Coinbase from './coinbase'
import CryptoCom from './cryptocom'
import Deribit from './deribit'
import Dydx from './dydx'
import Gateio from './gateio'
import Hitbtc from './hitbtc'
import Huobi from './huobi'
import Hyperliquid from './hyperliquid'
import Kraken from './kraken'
import Kucoin from './kucoin'
import Mexc from './mexc/mexc'
import Okex from './okex'
import Phemex from './phemex'
import Poloniex from './poloniex'
import WhiteBIT from './whitebit'

export const exchanges = [
  new Aggr(),
  new Aster(),
  new Bitmex(),
  new BinanceFutures(),
  new BinanceUs(),
  new Kraken(),
  new Huobi(),
  new Binance(),
  new Bitfinex(),
  new Bitstamp(),
  new Coinbase(),
  new Hitbtc(),
  new Okex(),
  new Poloniex(),
  new Deribit(),
  new Bybit(),
  new Phemex(),
  new Dydx(),
  new Mexc(),
  new Kucoin(),
  new Bitget(),
  new Bitunix(),
  new Gateio(),
  new CryptoCom(),
  new Bitmart(),
  new Hyperliquid(),
  new WhiteBIT()
] as Exchange[]

export function getExchangeById(id: string) {
  for (const exchange of exchanges) {
    if (exchange.id.toLowerCase() === id.toLowerCase()) {
      return exchange
    }
  }
}
