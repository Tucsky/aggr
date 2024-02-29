interface ImportMetaEnv {
  VITE_APP_BUILD_DATE: string
  VITE_APP_EXCHANGES: string
  VITE_APP_PROXY_URL: string
  VITE_APP_API_URL: string
  VITE_APP_API_SUPPORTED_PAIRS: string
  VITE_APP_API_SUPPORTED_TIMEFRAMES: string
  VITE_APP_PUBLIC_VAPID_KEY: string
  VITE_APP_BASE_PATH: string
  VITE_APP_VERSION: string
}

interface ImportMeta {
  env: ImportMetaEnv
}
