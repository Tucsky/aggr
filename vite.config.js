import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue2'
import visualizer from 'rollup-plugin-visualizer'
import { VitePWA } from 'vite-plugin-pwa';
import svgLoader from 'vite-svg-loader'

const fs = require('fs')
const path = require('path')
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
  plugins: [
    vue(),
    svgLoader(),
    visualizer(),
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
        additionalData: `@import "@/assets/sass/variables.scss";`
      },
    },
  },
})