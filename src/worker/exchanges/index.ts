import Exchange from '../exchange'

import Aggr from './aggr'
import Bitmex from './bitmex'
import BinanceFutures from './binance_futures'
import BinanceUs from './binance_us'
import Kraken from './kraken'
import Huobi from './huobi'
import Binance from './binance'
import Bitfinex from './bitfinex'
import Bitstamp from './bitstamp'
import Coinbase from './coinbase'
import Hitbtc from './hitbtc'
import Okex from './okex'
import Poloniex from './poloniex'
import Deribit from './deribit'
import Bybit from './bybit'
import Phemex from './phemex'
import Dydx from './dydx'
import Uniswap from './uniswap'
import Kucoin from './kucoin'
import Bitget from './bitget'
import Bitunix from './bitunix'
import Mexc from './mexc'
import Gateio from './gateio'
import CryptoCom from './cryptocom'
import Bitmart from './bitmart'

export const exchanges = [
  new Aggr(),
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
  new Uniswap(),
  new Kucoin(),
  new Bitget(),
  new Bitunix(),
  new Mexc(),
  new Gateio(),
  new CryptoCom(),
  new Bitmart()
] as Exchange[]

export function getExchangeById(id: string) {
  for (const exchange of exchanges) {
    if (exchange.id.toLowerCase() === id.toLowerCase()) {
      return exchange
    }
  }
}
