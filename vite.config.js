import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue2'
// import { createVuePlugin } from 'vite-plugin-vue2' // Vue <= 2.6
import visualizer from 'rollup-plugin-visualizer'
import { VitePWA } from 'vite-plugin-pwa';
import svgLoader from 'vite-svg-loader'
import {comlink} from 'vite-plugin-comlink'

const fs = require('fs')
const path = require('path')
// const ServiceWorkerWebpackPlugin = require('serviceworker-webpack-plugin')
// const WebpackPwaManifest = require('webpack-pwa-manifest')
const gitprocess = require('child_process')

const date = new Date(
  gitprocess
    .execSync('git log -1 --date=format:"%Y/%m/%d %T" --format="%ad"')
    .toString()
)
process.env.VITE_APP_VERSION = require('./package.json').version
process.env.VITE_APP_BUILD_DATE =
  date.getDate() +
  ' ' +
  date.toLocaleString('en-US', { month: 'short' }).toLowerCase()
const exchanges = []

fs.readdirSync('./src/worker/exchanges/').forEach(file => {
  if (/\w+\.ts$/.test(file) && file !== 'index.ts') {
    exchanges.push(file.replace(/\.ts$/, ''))
  }
})

process.env.VITE_APP_EXCHANGES = exchanges.join(',')
process.env.VITE_APP_PROXY_URL =
  process.env.NODE_ENV === 'production'
    ? typeof process.env.PROXY_URL !== 'undefined'
      ? process.env.PROXY_URL
      : ''
    : typeof process.env.DEV_PROXY_URL !== 'undefined'
    ? process.env.DEV_PROXY_URL
    : ''
process.env.VITE_APP_API_URL =
  typeof process.env.API_URL !== 'undefined' ? process.env.API_URL : ''
process.env.VITE_APP_API_SUPPORTED_PAIRS =
  typeof process.env.API_SUPPORTED_PAIRS !== 'undefined'
    ? process.env.API_SUPPORTED_PAIRS
    : ''
process.env.VITE_APP_API_SUPPORTED_TIMEFRAMES =
  typeof process.env.API_SUPPORTED_TIMEFRAMES !== 'undefined'
    ? process.env.API_SUPPORTED_TIMEFRAMES
    : ''
process.env.VITE_APP_PUBLIC_VAPID_KEY =
  typeof process.env.PUBLIC_VAPID_KEY !== 'undefined'
    ? process.env.PUBLIC_VAPID_KEY
    : ''

process.env.VITE_APP_PUBLIC_PATH = process.env.PUBLIC_PATH || '/'

module.exports = defineConfig({
  worker: {
    plugins: [comlink()]
  },
  plugins: [
    vue(),
    // createVuePlugin(), // Vue <= 2.6
    svgLoader(),
    visualizer(),
    comlink(),
    VitePWA({ 
      srcDir: "src",
      filename: "sw.js",
      registerType: 'autoUpdate',
      includeAssets: ['favicon-32x32.png', 'favicon-16x16.png', 'apple-touch-icon.png', 'safari-pinned-tab.svg'],
      manifest: {
        name: 'SignificantTrades',
        short_name: 'AGGR',
        description: 'Cryptocurrency market trades aggregator',
        theme_color: '#171b29',
        icons: [
          {
            src: 'android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  server: {
    port: 8080
  },
  resolve: {
    alias: [
      {
        find: '@',
        replacement: path.resolve(__dirname, 'src')
      }
    ]
  },
  css: {
    preprocessorOptions: {
      scss: { 
         // example : additionalData: `@import "./src/design/styles/variables";`
         // dont need include file extend .scss
         additionalData: `@import "@/assets/sass/variables.scss";` 
     },
    },
  },
})

// const vueCliConfig = {
//   productionSourceMap: false,
//   publicPath: process.env.VITE_APP_PUBLIC_PATH,
//   configureWebpack: {
//     plugins: [
//       new ServiceWorkerWebpackPlugin({
//         entry: path.join(__dirname, 'src/sw.js'),
//         publicPath: process.env.VITE_APP_PUBLIC_PATH
//       }),
//       new WebpackPwaManifest({
//         start_url: process.env.VITE_APP_PUBLIC_PATH,
//         name: 'SignificantTrades',
//         short_name: 'AGGR',
//         icons: [
//           {
//             src: path.resolve('public/android-chrome-192x192.png'),
//             sizes: '192x192',
//             type: 'image/png'
//           },
//           {
//             src: path.resolve('public/android-chrome-512x512.png'),
//             sizes: '512x512',
//             type: 'image/png'
//           }
//         ],
//         theme_color: '#171b29',
//         background_color: '#171b29',
//         orientation: 'omit',
//         display: 'standalone'
//       })
//     ]
//   },
//   pluginOptions: {
//     webpackBundleAnalyzer: {
//       openAnalyzer: false
//     }
//   },
//   chainWebpack: config => {
//     config.optimization.minimizer('terser').tap(args => {
//       args[0].terserOptions.compress.drop_console = true
//       return args
//     })

//     config.module.rule('js').exclude.add(/\.worker$/)

//     config.module
//       .rule('worker')
//       .test(/\.worker$/)
//       .use('worker-loader')
//       .loader('worker-loader')
//       .tap(options => ({
//         ...options,
//         worker: 'Worker'
//       }))
//       .end()
//   },
//   css: {
//     loaderOptions: {
//       sass: {
//         prependData: `@import "@/assets/sass/variables.scss";`
//       }
//     }
//   },
//   pwa: {
//     name: 'AGGR',
//     themeColor: '#43a047',
//     msTileColor: '#43a047'
//   }
// }
