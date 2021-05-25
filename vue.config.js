const date = new Date()

process.env.VUE_APP_VERSION = require('./package.json').version
process.env.VUE_APP_BUILD_DATE = date.getDate() + ' ' + date.toLocaleString('en-US', { month: 'short' }).toLowerCase()
process.env.VUE_APP_PROXY_URL = process.env.PROXY_URL
process.env.VUE_APP_API_URL = process.env.API_URL
process.env.VUE_APP_API_SUPPORTED_PAIRS = process.env.API_SUPPORTED_PAIRS

module.exports = {
  productionSourceMap: false,
  publicPath: '/public/',
  chainWebpack: config => {
    config.optimization.minimizer('terser').tap(args => {
      args[0].terserOptions.compress.drop_console = true
      return args
    })

    config.module.rule('js').exclude.add(/\.worker$/)

    config.module
      .rule('worker')
      .test(/\.worker$/)
      .use('worker-loader')
      .loader('worker-loader')
      .tap(options => ({
        ...options,
        worker: 'Worker'
      }))
      .end()
  },
  devServer: {
    // progress: true,
    // https: true,
    // port: 8081,
    proxy: [
      'https://futures.kraken.com',
      'https://api.kraken.com',
      'https://api.binance.com',
      'https://api.bitfinex.com',
      'https://api.gdax.com',
      'https://api.pro.coinbase.com',
      'https://api.prime.coinbase.com',
      'https://www.bitstamp.net',
      'https://api.hitbtc.com',
      'https://www.poloniex.com',
      'https://www.okex.com',
      'https://api.huobi.pro',
      'https://www.bitmex.com',
      'https://www.deribit.com',
      'https://fapi.binance.com',
      'https://dapi.binance.com',
      'https://api.hbdm.com',
      'https://ftx.com',
      'https://api.bybit.com'
    ].reduce((obj, domain) => {
      const reg = `${domain}`

      obj[reg] = {
        target: domain,
        secure: false,
        changeOrigin: true,
        pathRewrite: {
          [domain]: ''
        }
      }

      return obj
    }, {})
  },
  css: {
    loaderOptions: {
      sass: {
        prependData: `@import "@/assets/sass/variables.scss";`
      }
    }
  },
  pwa: {
    name: 'SignificantTrades',
    themeColor: '#43a047',
    msTileColor: '#43a047'
  }
}
