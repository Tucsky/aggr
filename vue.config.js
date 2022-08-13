const fs = require('fs')
const path = require('path')
const ServiceWorkerWebpackPlugin = require('serviceworker-webpack-plugin')
const WebpackPwaManifest = require('webpack-pwa-manifest')
const gitprocess = require('child_process')

const date = new Date(
  gitprocess
    .execSync('git log -1 --date=format:"%Y/%m/%d %T" --format="%ad"')
    .toString()
)
process.env.VUE_APP_VERSION = require('./package.json').version
process.env.VUE_APP_BUILD_DATE =
  date.getDate() +
  ' ' +
  date.toLocaleString('en-US', { month: 'short' }).toLowerCase()
const exchanges = []

fs.readdirSync('./src/worker/exchanges/').forEach(file => {
  if (/\w+\.ts$/.test(file) && file !== 'index.ts') {
    exchanges.push(file.replace(/\.ts$/, ''))
  }
})

process.env.VUE_APP_EXCHANGES = exchanges.join(',')
process.env.VUE_APP_PROXY_URL =
  typeof process.env.PROXY_URL !== 'undefined' ? process.env.PROXY_URL : ''
process.env.VUE_APP_API_URL =
  typeof process.env.API_URL !== 'undefined' ? process.env.API_URL : ''
process.env.VUE_APP_API_SUPPORTED_PAIRS =
  typeof process.env.API_SUPPORTED_PAIRS !== 'undefined'
    ? process.env.API_SUPPORTED_PAIRS
    : ''
process.env.VUE_APP_API_SUPPORTED_TIMEFRAMES =
  typeof process.env.API_SUPPORTED_TIMEFRAMES !== 'undefined'
    ? process.env.API_SUPPORTED_TIMEFRAMES
    : ''
process.env.VUE_APP_PUBLIC_VAPID_KEY =
  typeof process.env.PUBLIC_VAPID_KEY !== 'undefined'
    ? process.env.PUBLIC_VAPID_KEY
    : ''

process.env.VUE_APP_PUBLIC_PATH = process.env.PUBLIC_PATH || '/'

module.exports = {
  productionSourceMap: true,
  publicPath: process.env.VUE_APP_PUBLIC_PATH,
  configureWebpack: {
    plugins: [
      new ServiceWorkerWebpackPlugin({
        entry: path.join(__dirname, 'src/sw.js'),
        publicPath: process.env.VUE_APP_PUBLIC_PATH
      }),
      new WebpackPwaManifest({
        start_url: process.env.VUE_APP_PUBLIC_PATH,
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
        orientation: 'omit',
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

    const svgRule = config.module.rule('svg')

    svgRule.uses.clear()

    svgRule
      .use('url-loader')
      .loader('url-loader')
      .options({
        limit: 1024,
        esModule: false
      })
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
