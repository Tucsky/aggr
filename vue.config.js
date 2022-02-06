const fs = require('fs')
const path = require('path')
const ServiceWorkerWebpackPlugin = require('serviceworker-webpack-plugin')
const WebpackPwaManifest = require('webpack-pwa-manifest')

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
process.env.VUE_APP_ALERT_URL = process.env.ALERT_URL
process.env.VUE_APP_PUBLIC_VAPID_KEY = process.env.PUBLIC_VAPID_KEY
process.env.VUE_APP_API_URL = process.env.API_URL
process.env.VUE_APP_API_SUPPORTED_PAIRS = process.env.API_SUPPORTED_PAIRS
process.env.VUE_APP_API_SUPPORTED_TIMEFRAMES = process.env.API_SUPPORTED_TIMEFRAMES

const publicPath = process.env.PUBLIC_PATH || '/'

module.exports = {
  productionSourceMap: false,
  publicPath: publicPath,
  configureWebpack: {
    plugins: [
      new ServiceWorkerWebpackPlugin({
        entry: path.join(__dirname, 'src/sw.js'),
        publicPath: publicPath
      }),
      new WebpackPwaManifest({
        start_url: publicPath,
        name: 'SignificantTrades',
        short_name: 'AGGR',
        icons: [
          {
            src: path.resolve('public/android-chrome-192x192.png'),
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: path.resolve('public/android-chrome-512x512.png'),
            sizes: '512x512',
            type: 'image/png'
          }
        ],
        theme_color: '#171b29',
        background_color: '#171b29',
        display: 'standalone'
      })
    ]
  },
  pluginOptions: {
    webpackBundleAnalyzer: {
      openAnalyzer: false
    }
  },
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
