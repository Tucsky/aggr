# Changelog

All notable changes to this project will be documented in this file.

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
