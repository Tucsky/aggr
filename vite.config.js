import { defineConfig, loadEnv } from 'vite'
import { qrcode } from 'vite-plugin-qrcode'
import { visualizer } from 'rollup-plugin-visualizer'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'fs'
import gitprocess from 'child_process'
import monacoEditorPlugin from 'vite-plugin-monaco-editor'
import path from 'path'
import svgLoader from 'vite-svg-loader'
import vue from '@vitejs/plugin-vue2'

import crypto from 'crypto'

let date

if (typeof gitprocess === 'function') {
  date = new Date(
    gitprocess
      .execSync('git log -1 --date=format:"%Y/%m/%d %T" --format="%ad"')
      .toString()
  )
} else {
  date = new Date()
}

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
  const env = {
    ...process.env,
    ...loadEnv(mode, process.cwd(), '')
  }

  const processEnvValues = {
    'process.env': Object.entries(env).reduce((prev, [key, val]) => {
      return {
        ...prev,
        [key]: val
      }
    }, {})
  }

  const hash = crypto
    .createHash('md5')
    .update('aggr')
    .digest('hex')
    .substring(0, 7)

  return {
    define: {
      ...processEnvValues
    },
    base: mode === 'github' ? env.VITE_APP_BASE_PATH : '/',
    plugins: [
      vue(),
      svgLoader({
        defaultImport: 'url' // 👈
      }),
      visualizer(),
      VitePWA({
        srcDir: path.join(__dirname, 'src'),
        filename: 'sw.js',
        registerType: 'autoUpdate',
        strategies: 'injectManifest',
        injectRegister: mode === 'development' ? 'auto' : null,
        includeAssets: [
          'favicon-32x32.png',
          'favicon-16x16.png',
          'apple-touch-icon.png',
          'safari-pinned-tab.svg'
        ],
        devOptions: {
          enabled: true
        },
        workbox: {
          swDest: 'dist/sw.js',
          swSrc: 'src/sw.js'
        },
        manifest: {
          swDest: 'dist/sw.js',
          swSrc: 'src/sw.js',
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
      }),
      monacoEditorPlugin.default({}),
      qrcode() // only applies in dev mode
    ],
    build: {
      rollupOptions: {
        output: {
          entryFileNames: `[name].` + hash + `.js`,
          chunkFileNames: `[name].` + hash + `.js`,
          assetFileNames: `[name].` + hash + `.[ext]`
        }
      }
    },
    server: {
      port: 8080,
      host: '0.0.0.0'
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
      devSourcemap: true,
      preprocessorOptions: {
        scss: {
          additionalData: `@import "@/assets/sass/variables.scss";`
        }
      }
    }
  }
})
