import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue2'
// import { createVuePlugin } from 'vite-plugin-vue2' // Vue <= 2.6
import { visualizer } from 'rollup-plugin-visualizer'
import { VitePWA } from 'vite-plugin-pwa'
import svgLoader from 'vite-svg-loader'

import eslint from 'vite-plugin-eslint';


import fs from 'fs'
import path from 'path'
// const ServiceWorkerWebpackPlugin = require('serviceworker-webpack-plugin')
// const WebpackPwaManifest = require('webpack-pwa-manifest')
import gitprocess from 'child_process'

// Make build date
const makeBuildDate = function (): string {
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

// Make string with available exchanges from workers
const makeExchangeList = (): string => {
  const exchanges: string[] = []
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
  DEV_PROXY_URL,
  API_SUPPORTED_PAIRS,
  API_SUPPORTED_TIMEFRAMES,
  PUBLIC_PATH,
  PUBLIC_VAPID_KEY
} = process.env

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    define: {
      VITE_APP_BUILD_DATE: makeBuildDate(),
      VITE_APP_PROXY_URL: env.PROXY_URL,
      VITE_APP_API_URL: env.API_URL
    },
    plugins: [
	  eslint(),
      vue(),
      // createVuePlugin(), // Vue <= 2.6
      svgLoader({
        defaultImport: 'url', // 👈
      }),
      visualizer(),
      VitePWA({
        srcDir: 'src',
        filename: 'sw.js',
        registerType: 'autoUpdate',
        includeAssets: [
          'favicon-32x32.png',
          'favicon-16x16.png',
          'apple-touch-icon.png',
          'safari-pinned-tab.svg'
        ],
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
	outputDir:{

	},
    css: {
      preprocessorOptions: {
        scss: {
          // example : additionalData: `@import "./src/design/styles/variables";`
          // dont need include file extend .scss
          additionalData: `@import "@/assets/sass/variables.scss";`
        }
      }
    }
  }
})
