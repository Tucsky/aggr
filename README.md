
# SignificantTrades [![Build Status](https://travis-ci.org/Tucsky/aggr.svg?branch=master)](https://travis-ci.org/Tucsky/aggr)

  

Cryptocurrency market trades aggregator.<br>

Currently supporting BitMEX, Bitfinex, Binance & Binance Futures, Coinbase, Bitstamp, Deribit, Huobi, Okex, Hitbtc, Poloniex, Bybit and FTX ([see src/exchanges/](src/exchanges) for detail)

  

![screenshot](https://i.imgur.com/nHJxsdL.gif)

  

## What it do
This tool shows **markets orders** LIVE on the crypto market(s) of your choice.

- Show live trades from exchanges on a specific pair
- Filter noise by aggregating trades with the same timestamp
- Calculate rolling sums over defined periods
- Chart whatever is received from api (so only trades data for now)
- Dynamic audio based on trade volume and side 

Checkout [CHANGELOG.md](CHANGELOG.md) for details about the recent updates.

## How it works

![](https://i.imgur.com/chxtEwb.png)

The app is written in Vue.js, use the javascript WebSocket interface to connect to the exchanges API and listen to the trades events.

The aggregator are process raw trades in the Worker for each Exchange, whose purpose is to group the trades by time, market and side of trade. The worker regularly send the aggregated trades to the UI along with some statistics about the market activity (sums of volume, counts by sides and liquidations).

## How to install & run locally

If you want to use with your own data, edit /.env.local with <code>API_URL=your url</code> and build the app (<code>npm run build</code>).

For development, just as any vuejs project

1. Clone the repo

```bash
git clone https://github.com/Tucsky/aggr
```

2. Install dependencies

```bash
npm install
```

3. Run it

  

Development mode
```bash
npm run serve
```

This will automatically open a browser window at localhost:8080


```bash
npm run build
```

and access the dist/index.html directly in the browser later without having to run a command

### Docker

build your own aggr client docker:

```bash
git clone https://github.com/Tucsky/aggr
cd aggr
docker build -t aggr-chart .
```
you need to set the API_URL as environment variable for your own installation, if you want to use that.

## Configuration
SignificantTrades is now using Vue Cli which allows you to configure the client using .env file.

Create a <code>.env.local</code> or <code>.env.development</code> or <code>.env.production</code> (.env.local if you don't know) file inside root folder.

  
|key| description |default value|
|--|--|--|
|<code>API_SUPPORTED_PAIRS</code>|Markets supported by the server instance provided in <code>API_URL</code><br>Write the full market names separated by a comma COINBASE:BTC-USD,BINANCE:btcusdt|null|
|<code>API_SUPPORTED_TIMEFRAMES</code>|Timeframes supported by the server instance provided in <code>API_URL</code><br>Write the timeframe (seconds) separated by a comma 5,10,15,30,60,180,300,900,1800,3600,7200,14400,21600,86400|null|
|<code>API_URL</code>|Server instance url.<br>As of now only used to fetch historical data for the chart component.<br>Example: http://localhost:3000/historical/{from}/{to}/{timeframe}/{markets} |null|
|<code>PROXY_URL</code>|Redirect HTTP requests from app through a proxy<br>If the <code>PROXY_URL</code> is set to https://cors.aggr.trade/, the app will retrieve Binance's products through this url : https://cors.aggr.trade/https://api.binance.com/api/v3/exchangeInfo |http://localhost:8080/|

## Implement historical data
You can use this project without historical data just by opening the app in your browser, as getting trades from exchanges is made directly in the browser using websocket api.

In order to show historical data YOU WILL need to setup your own server to provide the data using aggr-server.

See [aggr-server repository](https://github.com/Tucsky/aggr-server).

Let's say you have a server instance running on port 3000, start the client with an environment variable `API_URL=http://localhost:3000/{from}/{to}/{timeframe}/{markets} npm run serve`

## Disclaimer
If you plan to use real money with this, USE AT YOUR OWN RISK.

## Support this project !
ETH [0xe3c893cdA4bB41fCF402726154FB4478Be2732CE](https://etherscan.io/address/0xe3c893cdA4bB41fCF402726154FB4478Be2732CE)<br>
BTC [3PK1bBK8sG3zAjPBPD7g3PL14Ndux3zWEz](bitcoin:3PK1bBK8sG3zAjPBPD7g3PL14Ndux3zWEz)<br>
XMR 48NJj3RJDo33zMLaudQDdM8G6MfPrQbpeZU2YnRN2Ep6hbKyYRrS2ZSdiAKpkUXBcjD2pKiPqXtQmSZjZM7fC6YT6CMmoX6<br>
COINBASE
https://commerce.coinbase.com/checkout/c58bd003-5e47-4cfb-ae25-5292f0a0e1e8
