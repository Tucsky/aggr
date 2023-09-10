const fs = require('fs')
const path = require('path')
const ServiceWorkerWebpackPlugin = require('serviceworker-webpack-plugin')
const WebpackPwaManifest = require('webpack-pwa-manifest')
const gitprocess = require('child_process')

// Make build date
const makeBuildDate = function () {
  const date = new Date(
    gitprocess
      .execSync('git log -1 --date=format:"%Y/%m/%d %T" --format="%ad"')
      .toString()
  )
  return (
    `${date.getDate()} ` +
    `${date.toLocaleString('en-US', { month: 'short' }).toLowerCase()}`
  )
}

// App version
const { version: appVersion } = require('./package.json')

// Make string with available exchanges from workers
const makeExchangeList = () => {
  const exchanges = []
  fs.readdirSync('./src/worker/exchanges/').forEach(file => {
    if (/\w+\.ts$/.test(file) && file !== 'index.ts') {
      exchanges.push(file.replace(/\.ts$/, ''))
    }
  })
  return exchanges.join(',')
}

const {
  NODE_ENV,
  API_URL,
  PROXY_URL,
  API_SUPPORTED_PAIRS,
  API_SUPPORTED_TIMEFRAMES,
  PUBLIC_PATH,
  PUBLIC_VAPID_KEY
} = process.env

process.env.VUE_APP_VERSION = appVersion
process.env.VUE_APP_EXCHANGES = makeExchangeList()

switch (NODE_ENV) {
  case 'production':
    process.env.VUE_APP_PROXY_URL = PROXY_URL
	process.env.VUE_APP_BUILD_DATE = makeBuildDate ()
    break
  case 'development':
    process.env.VUE_APP_PROXY_URL = PROXY_URL
	process.env.VUE_APP_BUILD_DATE = new Date().toLocaleDateString
    break
}

process.env.VUE_APP_API_URL = API_URL || ''
process.env.VUE_APP_API_SUPPORTED_PAIRS = API_SUPPORTED_PAIRS || ''
process.env.VUE_APP_API_SUPPORTED_TIMEFRAMES = API_SUPPORTED_TIMEFRAMES || ''
process.env.VUE_APP_PUBLIC_VAPID_KEY = PUBLIC_VAPID_KEY || ''
process.env.VUE_APP_PUBLIC_PATH = PUBLIC_PATH || '/'

module.exports = {
  productionSourceMap: false,
  publicPath: process.env.VUE_APP_PUBLIC_PATH,
  configureWebpack: {
    devServer: {
      watchOptions: {
        ignored: /node_modules/,
        aggregateTimeout: 300,
        poll: 500
      }
    },
    devtool: 'source-map',
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
