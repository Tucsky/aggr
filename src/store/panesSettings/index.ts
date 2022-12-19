import chart from './chart'
import stats from './stats'
import trades from './trades'
import prices from './prices'
import counters from './counters'
import website from './website'

export type PaneType =
  | 'trades'
  | 'chart'
  | 'stats'
  | 'counters'
  | 'prices'
  | 'website'

export default {
  chart,
  stats,
  trades,
  prices,
  counters,
  website,
  'trades-lite': trades
}
