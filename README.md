
# SignificantTrade

Cryptocurrency market trades aggregator./

Currently supporting Kucoin, BitMEX, Bitfinex, Binance, Coinbase, Bitstamp, Deribit, Huobi, Okex, Hitbtc, Poloniex, Bybit, Bitget, Bitunix, Mexc, Gate.io and Crypto.com ([see src/exchanges/](src/exchanges) for detail)

![screenshot](https://i.imgur.com/nHJxsdL.gif)

## What it does

This tool shows **markets orders** LIVE on the crypto market(s) of your choice.

- Show live trades from exchanges on a specific pair
- Filter noise by aggregating trades with the same timestamp
- Calculate rolling sums over defined periods
- Chart whatever is received from api (so only trades data for now)
- Dynamic audio based on trade volume and size 

Checkout [CHANGELOG.md](CHANGELOG.md) for details about the recent updates.

## How it works

![](https://i.imgur.com/chxtEwb.png)

The application is developed using Vue.js and utilizes the JavaScript WebSocket interface to establish connections with exchange APIs and listen for trade events.

The core functionality involves an aggregator that processes raw trades within a dedicated Worker for each Exchange. The aggregator's main objective is to group trades based on time, market, and trade side. Periodically, the worker sends the aggregated trades to the user interface (UI), accompanied by relevant statistics regarding market activity. These statistics include volume sums, trade counts categorized by sides, and information about liquidations.

## Local Installation and Execution Instructions

To begin, we highly recommend utilizing Volta, a node and npm version manager. We provide a convenient script to automate its installation process. This script is compatible with the bash shell, which is available on all major operating systems including Windows, macOS, and Linux.

```bash
	./scripts/install-volta.sh
```

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
npm run cors
```

This will start a cors proxy for your development environment

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
docker-compose -f "docker\docker-compose.yml" up -d --build # prod
```
 If you want to use aggr-server as your local data source, load the docker-compose.dev.yml instead.

## Configuration

SignificantTrades is now using Vue Cli which allows you to configure the client using .env file.

Create a <code>.env.local</code> or <code>.env.development</code> or <code>.env.production</code> (.env.local if you don't know) file inside root folder.

  
|key| description |default value|
|--|--|--|
|<code>API_URL</code>|Server instance url.<br>We use it to fetch historical data for the chart component.<br>Example: http://localhost:3000/ |null|
|<code>PROXY_URL</code>|Redirect HTTP requests from app through a proxy<br>If the <code>PROXY_URL</code> is set to https://cors.aggr.trade/, the app will retrieve Binance's products through this url : https://cors.aggr.trade/https://api.binance.com/api/v3/exchangeInfo |http://localhost:8080/|

## Implement historical data
You can use this project without historical data just by opening the app in your browser, as getting trades from exchanges is made directly in the browser using websocket api.

In order to show historical data YOU WILL need to setup your own server to provide the data using aggr-server.

See [aggr-server repository](https://github.com/Tucsky/aggr-server).

Let's say you have a server instance running on port 3000, start the client with an environment variable `API_URL=http://localhost:3000/ npm run serve`

## Community

Discord: https://discord.com/invite/MYMUEgMABs

## Disclaimer

If you plan to use real money with this, USE AT YOUR OWN RISK.

## Support this project!

BTC bc1q3f5ndx2zww3pw5c5vctw7t4wfgv05fdsc2graj<br>
SOL FKMNaBJqdpNA1d33hiUEjHaovQ5AiBGACqRuKuxA9q3D<br>
ETH 0x83bBC120a998cF7dFcBa1518CDDCb68Aa0D0c158<br>
COINBASE https://commerce.coinbase.com/checkout/c58bd003-5e47-4cfb-ae25-5292f0a0e1e8
