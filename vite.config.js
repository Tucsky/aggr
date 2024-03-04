import { defineConfig, loadEnv } from 'vite'
import { qrcode } from 'vite-plugin-qrcode'
import { visualizer } from 'rollup-plugin-visualizer'
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
      monacoEditorPlugin.default({}),
      qrcode() // only applies in dev mode
      // Add the terser plugin for production builds to remove console.log
    ],
    build: {
      minify: 'terser',
      rollupOptions: {
        output: {
          entryFileNames: `[name].` + hash + `.js`,
          chunkFileNames: `[name].` + hash + `.js`,
          assetFileNames: `[name].` + hash + `.[ext]`
        }
      },
      terserOptions: {
        compress: {
          drop_console: true
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
