import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue2'
import { visualizer } from 'rollup-plugin-visualizer'
import { VitePWA } from 'vite-plugin-pwa'
// import svgLoader from 'vite-svg-loader' // vue 3
import { createSvgPlugin } from 'vite-plugin-vue2-svg' //vue 2

import fs from 'fs'
import path from 'path'
import gitprocess from 'child_process'

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

function makeExchangeList() {
  const exchanges = []

  fs.readdirSync('./src/worker/exchanges/').forEach(file => {
    if (/\w+\.ts$/.test(file) && file !== 'index.ts') {
      exchanges.push(file.replace(/\.ts$/, ''))
    }
  })

  return exchanges.join(',')
}

process.env.VITE_APP_EXCHANGES = makeExchangeList()

export default defineConfig(({ mode }) => {
  const env = {...process.env, ...loadEnv(mode, process.cwd(), '')}

  const processEnvValues = {
    'process.env': Object.entries(env).reduce((prev, [key, val]) => {
      return {
        ...prev,
        [key]: val
      }
    }, {})
  }

  return {
    define: {
      ...processEnvValues,
    },
    plugins: [
      vue(),
      // svgLoader(), // vue 3
      createSvgPlugin(), // vue 2
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
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@import "@/assets/sass/variables.scss";`
        }
      }
    }
  }
})
