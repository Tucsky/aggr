const fs = require('fs')
const path = require('path')
const ServiceWorkerWebpackPlugin = require('serviceworker-webpack-plugin')

process.env.VUE_APP_VERSION = require('./package.json').version

const date = new Date()
process.env.VUE_APP_BUILD_DATE = date.getDate() + ' ' + date.toLocaleString('en-US', { month: 'short' }).toLowerCase()
const exchanges = []

fs.readdirSync('./src/worker/exchanges/').forEach(file => {
  if (/\w+\.ts$/.test(file) && file !== 'index.ts') {
    exchanges.push(file.replace(/\.ts$/, ''))
  }
})
process.env.VUE_APP_EXCHANGES = exchanges.join(',')
process.env.VUE_APP_PROXY_URL = process.env.PROXY_URL
process.env.VUE_APP_API_URL = process.env.API_URL
process.env.VUE_APP_API_SUPPORTED_PAIRS = process.env.API_SUPPORTED_PAIRS
process.env.VUE_APP_API_SUPPORTED_TIMEFRAMES = process.env.API_SUPPORTED_TIMEFRAMES

module.exports = {
  productionSourceMap: false,
  publicPath: process.env.PUBLIC_PATH || '/',
  configureWebpack: {
    plugins: [
      new ServiceWorkerWebpackPlugin({
        entry: path.join(__dirname, 'src/sw.js')
      })
    ]
  },
  /*configureWebpack: config => {
    if (process.env.NODE_ENV === 'development') {
      config.devtool = 'eval-source-map'
      config.output.devtoolModuleFilenameTemplate = info =>
        info.resourcePath.match(/\.vue$/) && !info.identifier.match(/type=script/) // this is change ✨
          ? `webpack-generated:///${info.resourcePath}?${info.hash}`
          : `webpack-yourCode:///${info.resourcePath}`

      config.output.devtoolFallbackModuleFilenameTemplate = 'webpack:///[resource-path]?[hash]'
    }
  },*/
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
    /*host: 'localhost',
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
    }, {})*/
  },
  css: {
    loaderOptions: {
      sass: {
        prependData: `@import "@/assets/sass/variables.scss";`
      }
    }
  },
  pwa: {
    name: 'AGGR',
    themeColor: '#43a047',
    msTileColor: '#43a047'
  }
}
