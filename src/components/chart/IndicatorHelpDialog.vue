<template>
  <Dialog @clickOutside="close" class="serie-dialog" :mask="false" :startPosition="{ x: 0.33 }">
    <template v-slot:header>
      <div class="title">Help</div>
    </template>
    <section class="section">
      <div class="help-block" v-if="sections.indexOf('formula') > -1">
        <strong>Serie formula</strong><br />
        <p>
          Use variables such as <code v-tippy title="Current bar object">bar</code>, <code v-tippy title="Buy volume">vbuy</code>,
          <code v-tippy title="Sell volume">vsell</code>, <code v-tippy title="Buy liquidation (liquidated short)">lbuy</code>,
          <code v-tippy title="Sell liquidation (liquidated long)">lsell</code>, <code v-tippy title="Number of buy">cbuy</code>,
          <code v-tippy title="Number of sell">csell</code>, <code v-tippy title="Open price">open</code>,
          <code v-tippy title="High price">high</code>, <code v-tippy title="Low price">low</code> and <code v-tippy title="Close price">close</code>.
        </p>
        <p>
          Pass the variables to
          <a href="https://github.com/Tucsky/aggr/blob/master/src/components/chart/serieUtils.ts" target="_blank">built-in functions</a>
        </p>
        <p>
          Example<br />
          <code v-tippy title="Average all sources in bar, output ohlc">avg_ohlc(bar)</code><br />
          <code v-tippy title="Output moving average of the input number">sma(BITMEX:XBTUSD.close, 50)</code><br />
          <code v-tippy title="Output exponential moving average of the input number">ema(BITMEX:XBTUSD.close, 50)</code>
        </p>
      </div>
      <div class="section__title" @click="toggleSection('formula')">Serie formula <i class="icon-up"></i></div>
    </section>
    <section class="section">
      <div class="help-block" v-if="sections.indexOf('options') > -1">
        <strong>Options</strong><br />
        <p>
          You can access serie options with options.<code>nameOfOption</code>.
        </p>
        <p>
          Exmple<br />
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
        <strong>Query source</strong><br />

        <p>
          Using any specific sources
          <code v-tippy title="Reference an active market (active = connected to app, connected to pane, not hidden or anyting)"
            >BINANCE:btcusdt</code
          >
          or <code v-tippy title="A market is just a bar object, which contain all the basic property described above">BINANCE:btcusdt.vbuy</code
          ><br /><br />
          Or by combining sources <code>avg_ohlc({sources:{BYBITBTCUSD:BYBIT:BTCUSD,BITMEXXBTUSD:BITMEX:XBTUSD}})</code>
        </p>
      </div>
      <div class="section__title" @click="toggleSection('sources')">Sources <i class="icon-up"></i></div>
    </section>
    <section class="section">
      <div class="help-block" v-if="sections.indexOf('series') > -1">
        <strong>Reference other serie</strong><br />

        <p>Make use of ID of the other serie in this code block to reference it's value.</p>
        Given the serie with id <code>price</code> that shows an ohlc, use
        <code v-tippy title="Output a 50 simple moving average taking close property of another serie">sma($price.close, 50)</code> in a any new serie
        to show the 50 simple moving average of that. Note that a script itself can only output 1 serie on the chart (one line, one ohlc serie etc).
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
