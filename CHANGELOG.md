# Changelog

All notable changes to this project will be documented here.

## [3.6.1] - 2024-08-14

- Fix Dockerfile and startup instructions
- Fix Binance Futures wicks of death
- Show weighted average price in trade feed (instead of last price)
- Accurate slippage aggregation

## [3.6.0-hotfix.0] - 2024-08-22

- Update Coinbase Spot endpoint

## [3.6.0] - 2024-06-11

- Add support for -INTX pairs on COINBASE
- Add lastTradeTimestamp to chart's Renderer base model
- Fix MEXC Futures ws endpoints

## [3.5.5] - 2024-04-21

- Make sure that the path to `Index.html` is compatible with different operating systems when using the local distribution server.

## [3.5.4] - 2024-03-29

- Updated Okex API domain
- Updated Huobi API domain

### [3.5.3] - 2024-03-05

- Ensure lightweight charts is packed with last version on build
- Fix enabled by default (star icon) reactivity
- Fix Panes layout reactivity on initial workspace load
- Fix indicatorOrder mismatch in Chart component on boot

### [3.5.2] - 2024-03-05

## [3.5.1] - 2024-03-02

### Changed

Improve fast threshold coloring in trades settings

### Bug Fixes:

Improve Editable increment algo
Set market from draggable #391
Step attr not being respected in range option

## [3.5.0] - 2024-02-29

### Added:

Added MACD to default indicators list (commit: 153eb62d)
Added Liquidity to default indicators list
Added "mbps tf" (commit: 77a5ce01)
Added "FDUSD" stablecoin (commit: 03c92982)
Added pane rename input validation on pressing enter (commit: be782eef)
Added option to unlock raw trades (commit: 39ba778a)
Added custom script options (commit: 76234165)

### Changed

Overhauled search dialog pagination (commit: 43d16b0d)
Indicator ordering

### Bug Fixes:

Fixed an issue with PromptDialog's cancel button (commit: 8bfce9d2)
Prevented double dialog close after the escape key press (commit: e5a43d2d)
Fixed push notifications for Service Workers (commit: 9d4631c)
Fixed editor undo (commit: 4bd175bb)
Fixed a bug related to search dialog content deletion (commit: 8c744a32)

### Chore/Configuration:

Added QR code Vite plugin (commit: 9136be55)
Added CSS sourcemap for development (commit: f99135bf)
Improved bug report GitHub issue template (commit: c47e5097)
Improved feature request GitHub issue template (commit: 45c72234)
Changed Prettier configuration file format to .cjs (commit: de4ea7cd)
Cleaned up vite/vue config files (commit: c3e5d8f9)

## [3.4.0] - 2023-09-10

### Added

- New exchange: Bitmart
- Double-click on pane's name to maximize
- TradesLite: Show price and pair simultaneously
- Chart:Keep timeframe visible next to chart name
- Add .npmrc file to skip Puppetteer installation by default causing the `npm install` to fail
- A dist-server to test production build locally
- An installation script for volta

### Changed

- Upgrade docker base images Node version to 20.2
- Add Dockerfile and docker-compose for development
- Replace Webpack with Vite
- Add dist-server to render dist folder
- Fix npm installation script for smooth installation
- Add .npmrc file
- Fix bunch of lint issues
- Perf/refactor: merge svg fonts into one file
- Trades: Fix dynamic co
- Merge svg fonts into one file

## [3.3.3] - 2023-06-08

### Added

- Gate.io
- source() script function

## [3.3.2] - 2023-03-24

### Added

- Kucoin perp
- Alerts message (SHIFT+CLICK)
- Measurement tool (ALT+CLICK)
- Chart context menu
- Drag market from pane to another
- Mexc

### Changed

- Split pane head for charts & watchlist

## [3.3.1] - 2023-02-24

### Added

- Bitget
- Alerts pane

## [3.3] - 2023-01-11

### Added

- Kucoin spot
- Detect US blocked ip

### Changed

- Bug fix

## [3.2] - 2022-07-09

### Added

- Trades feed lite
- Global buy / sell color

### Changed

- Dropdown design refacto

## [3.1.4] - 2022-06-21

### Added

- Set market from url
- Custom workspace url

## [3.1.3] - 2022-06-05

### Added

- Add volume delta to markets pane
- Add period (reset counts upon every 1m / 15m / 30m / 1h / 4h) to markets pane

### Changed

- use Binance's aggTrade streams instead of raw

## [3.1.2] - 2022-05-23

### Added

- last(value, length) script function
- search history

## [3.1.1] - 2022-05-16

### Added

- Custom alert sound

## [3.1.0] - 2022-04-16

### Added

- Added avg_ohlc_with_gaps for printing candle with real open price

### Changed

- Updated avg_heikinashi to use selected markets only

## [3.0.9] - 2022-02-26

### Added

- Price alerts
- All-in-one trades threshold slider

## [3.0.8] - 2022-01-10

### Added

- Indicator script syntax highlighter

## [3.0.7] - 2021-12-22

### Added

- Threshold audio assistant
- Import audio files (dragndrop)
- Configure multiple thresholds for both trade type simultaneously
- Separate gifs for both side
- Add volume to prices pane

### Changed

- Trade pane refactor

## [3.0.6] - 2021-12-05

### Added

- rma() indicator functions

### Changed

- pivot_high & pivot_low to take left & right argument
- Aggregate liquidations if trade aggregation is enabled

## [3.0.5] - 2021-09-12

### Added

- Indicator functions pivot_high + pivot_low

## [3.0.4] - 2021-08-24

### Changed

- Improved search & symbol normalization

## [3.0.3] - 2021-08-20

### Added

- Markets filter on chart
- Binance.US exchange

## [3.0.2] - 2021-07-09

### Added

- Responsive panes
- Phemex exchange
- Tick charts
- Audio playurl()

### Changed

- Audio play() accept fadeIn and fadeOut

## [3.0.1] - 2021-06-20

### Added

- Audio presets
- Pane presets
- Audio pitch
- Pane volume
- Zoom pane

## [3.0] - 2021-06-04

### Added

- Dynamic panes
- Workspaces
- Custom audio per threshold
- Liquidation threshold
- Plot function

### Changed

- Outlined icons

## [2.7] - 2021-03-21

### Changed

- Custom series
- Show / hide serie without unloading
- Dynamic series (detach activeSerie from serie type allowing infinite series on chart)

## [2.6] - 2021-03-13

### Changed

- Allow change serie input from serie dialog
- Fix remove threshold
- Never unload present chunks (> minimum visible range)
- Trim chart after 30min
- Set maximum stored bars to 100 bars * 100 chunks (10000 bars, 1 bar = 1 exchange at time)

### Added

- Inline code editor for input function
- Animate threshold reordering
- Import / export settings
- Background color option

## [2.5.7] - 2020-12-05

### Added

- Beep sound pitch adjustment

## [2.5.6] - 2020-05-08

### Changed

- Fix chart's broken cumulative data after keepalive redraw
- Fix exchange threshold (threshold x multiplier) formula
- Lowered exchange threshold slider steps (ux)
- Fix 1000k issue
- Sound varitions now match thresholds (1 bip at minimum threshold, 2 at the 2nd threshold, 4 at the third)
- Doubled sell song power
- Fixed ohlc "high" spikes at liquidation (server)

## [2.5.5] - 2020-05-06

### Added

- Products autocomplete (search)

## [2.5.4] - 2020-05-02

### Added

- Vue CLI 3
- Webpack dev server with proxy
- Stats histogram type for multi counters (when input is an array)
- Choose serie type (line, bar, candlestick, histogram) in serie dialog (experimental)

### Changed

- Fixed aggegation accuracy
- Fixed stats chart update interval (always 1s)
- Default stats now include 1h liquidation (shorts vs longs) as multi counter
- Improved threshold colors efficiency
- Big codestyle fix

## [2.5.3] - 2020-04-28

### Changed

- Fixed update of stats period
- Pause stats keepAlive when mouse over stats chart

## [2.5.2] - 2020-04-27

### Changed

- Fixed counters edition
- Chart height when exchangesBar is visible

## [2.5.1] - 2020-04-22

### Added

- Changelog !
- Stats panel is back
- Counters and stats are only updated after 1s to reduce lag
- Expose candle border colors (borderUpColor + borderDownColor) in price serie settings

### Changed

- Loading indicator now working again
- Fixed a bunch of mutations subscriptions
- Increased default chart refresh rate from 50ms to 500ms
- Enabled Huobi by default
- Disabled FTX by default
