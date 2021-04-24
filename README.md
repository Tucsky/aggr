# SignificantTrades [![Build Status](https://travis-ci.org/Tucsky/SignificantTrades.svg?branch=master)](https://travis-ci.org/Tucsky/SignificantTrades)

Live cryptocurrency trades visualizer.<br>
Currently supporting BitMEX, Bitfinex, Binance & Binance Futures, Gdax, Bitstamp, Deribit, Huobi, Okex, Hitbtc, Poloniex, Bybit and FTX ([see src/exchanges/](src/exchanges) for detail)

![screenshot](https://i.imgur.com/nHJxsdL.gif)

## What it do

This tool shows **markets orders filling limit orders** LIVE on the crypto markets.

- Show LIVE trades from exchanges on a specific pair (default BTCUSD)
- Filter noise by aggregating trades with the same timestamp (timeout based aggregation)
- Chart averaged price, buy & sell volume, price sma, volume ema ([lightweight-chart](https://github.com/tradingview/lightweight-charts) was used)
- Play audio when trade show up based on volume
- Scroll through historical data (when available)

Checkout [CHANGELOG.md](CHANGELOG.md) for details about the recent updates.

## How it works

The app is written in Vue.js, use the javascript WebSocket interface to connect to the exchanges API and listen to the trades events.
The raw trades are then dispatched to the chart component, while it aggregate trades for the list component.
Periodically a summary of market activity (volume, counts and liquidations) is sent to the stats & counters components.

## How to install & run locally

1. Clone the repo

```bash
git clone https://github.com/Tucsky/SignificantTrades
```

2. Install dependencies

```bash
npm install
```

3. Run dev mode

Dev mode is

```bash
npm run serve
```

This will automatically open a browser window at localhost:8080

Otherwise can build the application

```bash
npm run build
```

and access the dist/index.html directly in the browser later without having to run a command

...

5. Profit !

## Configuration

SignificantTrades is now using Vue Cli which allows you to configure the client using .env file.
Create a _.env.local_ or _.env.development_ or _.env.production_ file inside <code>/</code> folder.

| key                 | description                                                                          | example value                                                      |
| ------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| PROXY_URL           | what proxy url to use when fetching data from exchange's REST APIs                   | http://localhost:8080/                                             |
| API_URL             | define main historical endpoint                                                      | http://192.168.0.50:3000/{pair}/historical/{from}/{to}/{timeframe} |
| API_SUPPORTED_PAIRS | define when app should be trying to fetch historical data depending on selected pair | BTCUSD, ETHUSD                                                     |

## Implement historical data

You can use this project without historical data just by opening the app in your browser, as getting trades from exchanges is made directly in the browser using websocket api.

However, in order to show historical data you will need to setup your own server that will collect and distribute data on demand.

The current code for the server part is located in the [feature/server](https://github.com/Tucsky/SignificantTrades/tree/feature/server) branch.
Let's say you have a server instance running on port 3000, start the client with an environment variable `API_URL=http://localhost:3000/{pair}/historical/{from}/{to}/{timeframe} npm run serve`.

## Donate

BTC [3PK1bBK8sG3zAjPBPD7g3PL14Ndux3zWEz](bitcoin:3PK1bBK8sG3zAjPBPD7g3PL14Ndux3zWEz)<br>
XMR 48NJj3RJDo33zMLaudQDdM8G6MfPrQbpeZU2YnRN2Ep6hbKyYRrS2ZSdiAKpkUXBcjD2pKiPqXtQmSZjZM7fC6YT6CMmoX6
