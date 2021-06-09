<template>
  <Dialog @clickOutside="close" class="serie-dialog" :mask="false" :startPosition="{ x: 0.33 }">
    <template v-slot:header>
      <div class="title">
        Documentation
        <div class="subtitle">Indicators</div>
      </div>
    </template>
    <section class="section">
      <div class="help-block" v-if="sections.indexOf('formula') > -1">
        <strong>Writing script</strong><br />
        <p>
          Use variables such as <code v-tippy title="Current bar object">bar</code>, <code v-tippy title="Buy volume">vbuy</code>,
          <code v-tippy title="Sell volume">vsell</code>, <code v-tippy title="Buy liquidation (liquidated short)">lbuy</code>,
          <code v-tippy title="Sell liquidation (liquidated long)">lsell</code>, <code v-tippy title="Number of buy">cbuy</code>,
          <code v-tippy title="Number of sell">csell</code>, <code v-tippy title="Open price">open</code>,
          <code v-tippy title="High price">high</code>, <code v-tippy title="Low price">low</code> and <code v-tippy title="Close price">close</code>.
        </p>
        <p>
          Pass the variables to
          <a href="https://github.com/Tucsky/aggr/blob/master/src/components/chart/serieUtils.ts" target="_blank">built-in functions</a> such as
          <code>sma</code>, <code>ema</code> or <code>ohlc</code>.
        </p>
        <p>
          Examples<br />
          <code v-tippy title="Output moving average of the input number">plotline(sma(BITMEX:XBTUSD.close, 50))</code><br />
          <code v-tippy title="Output exponential moving average of the input number">plotline(ema(BITMEX:XBTUSD.close, 50))</code><br />
          <code v-tippy title="Average all sources in bar">plotline(avg_close(bar))</code><br />
        </p>
      </div>
      <div class="section__title" @click="toggleSection('formula')">Scripting <i class="icon-up"></i></div>
    </section>
    <section class="section">
      <div class="help-block" v-if="sections.indexOf('rendering') > -1">
        <strong>Render data</strong><br />
        <p>
          Use plot functions to render the data defined above. As of only 6 plot types are availables. This is due to the limitation of the underlying
          charting library used here (Lightweight Charts from TradingView).<br />
        </p>
        <ul>
          <li><code>plotline</code> Render line chart</li>
          <li><code>plothistogram</code> Render histogram</li>
          <li><code>plotcandlestick</code> Render candlestick chart</li>
          <li><code>plotbar</code> Bar chart</li>
          <li><code>plotarea</code> Area chart</li>
          <li><code>plotcloudarea</code> Channel area</li>
        </ul>
        <p>
          Examples<br />
          <code>plotcandlestick(avg_ohlc(bar))</code><br />
          <code>plotline(cum(vbuy - vsell), color=yellow, lineWidth=2)</code>
        </p>
        <p>Use any plot function you want in a single indicator.</p>
      </div>
      <div class="section__title" @click="toggleSection('rendering')">Rendering <i class="icon-up"></i></div>
    </section>

    <section class="section">
      <div class="help-block" v-if="sections.indexOf('options') > -1">
        <strong>Options</strong><br />
        <p>
          You can access serie options with options.<code>nameOfOption</code>.
        </p>
        <p>
          Example<br />
          <code v-tippy title="Output simple moving average of the input number using length defined in option 'myCustomOption'">
            sma(avg_close(bar),options.myCustomOption)
          </code>
        </p>
        <p>
          This will create a new option below called "myCustomOption", just fill with a valid number for the serie to compile properly.
        </p>
      </div>
      <div class="section__title" @click="toggleSection('options')">Options <i class="icon-up"></i></div>
    </section>
    <section class="section">
      <div class="help-block" v-if="sections.indexOf('sources') > -1">
        <strong>Querying sources</strong><br />

        <p>
          Using source bar object
          <code v-tippy title="Reference an active market (active = connected to app, connected to pane, not hidden or anyting)"
            >BINANCE:btcusdt</code
          >
          or any property of the source
          <code v-tippy title="A market is just a bar object, which contain all the basic property described in the scripting section"
            >BINANCE:btcusdt.vbuy</code
          >,
          <code v-tippy title="A market is just a bar object, which contain all the basic property described in the scripting section"
            >BINANCE:btcusdt.high</code
          ><br /><br />
          Or by combining sources <code>avg_ohlc({sources:{BYBITBTCUSD:BYBIT:BTCUSD,BITMEXXBTUSD:BITMEX:XBTUSD}})</code>
        </p>
        <p>
          Example<br />
          <code>plotline(BITFINEX:BTCUSD.close, color=#8bc34a)</code><br />
          <code>plotline(BINANCE:btcusdt.close, color=#8bc34a)</code><br />
          <code>plotline(OKEX:BTC-USDT.close, color=#8bc34a)</code><br />
          <code>plotline(KRAKEN:XBT/USD.close, color=#8bc34a)</code><br />
          <code>plotline(COINBASE:BTC-USD.close, color=#8bc34a)</code><br />
          <code>plotline(POLONIEX:USDT_BTC.close, color=#8bc34a)</code><br />
          <code>plotline(HUOBI:btcusdt.close, color=#8bc34a)</code><br />
          <code>plotline(BITSTAMP:btcusd.close, color=#8bc34a)</code><br />
          <code>plotline(BITMEX:XBTUSD.close, color=#ba68c8)</code><br />
          <code>plotline(BITFINEX:BTCF0:USTF0.close, color=#ba68c8)</code><br />
          <code>plotline(OKEX:BTC-USD-SWAP.close, color=#ba68c8)</code><br />
          <code>plotline(BINANCE_FUTURES:btcusdt.close, color=#ba68c8)</code><br />
          <code>plotline(BINANCE_FUTURES:btcusd_perp.close, color=#ba68c8)</code><br />
          <code>plotline(HUOBI:BTC-USD.close, color=#ba68c8)</code><br />
          <code>plotline(KRAKEN:PI_XBTUSD.close, color=#ba68c8)</code><br />
          <code>plotline(DERIBIT:BTC-PERPETUAL.close, color=#ba68c8)</code><br />
          <code>plotline(FTX:BTC-PERP.close, color=#ba68c8)</code><br />
          <code>plotline(BYBIT:BTCUSD.close, color=#ba68c8)</code>
        </p>
      </div>
      <div class="section__title" @click="toggleSection('sources')">Sources <i class="icon-up"></i></div>
    </section>
    <section class="section">
      <div class="help-block" v-if="sections.indexOf('series') > -1">
        <strong>Reference other serie</strong><br />

        <p>Make use of ID of the other serie in this code block to reference it's value.</p>
        <strong>If you care about performance, this is the way.</strong>
        <p>
          Given the serie with id <code>price</code> that shows an ohlc, use
          <code v-tippy title="Output a 50 simple moving average taking close property of another serie">sma($price.close, 50)</code> in a any new
          serie to show the 50 simple moving average of that. Note that a script itself can only output 1 serie on the chart (one line, one ohlc serie
          etc).
        </p>
      </div>
      <div class="section__title" @click="toggleSection('series')">Series <i class="icon-up"></i></div>
    </section>
  </Dialog>
</template>

<script>
import DialogMixin from '../../mixins/dialogMixin'

export default {
  mixins: [DialogMixin],
  data: () => ({
    sections: []
  }),
  methods: {
    toggleSection(id) {
      const index = this.sections.indexOf(id)

      if (index === -1) {
        this.sections.push(id)
      } else {
        this.sections.splice(index, 1)
      }
    }
  }
}
</script>
