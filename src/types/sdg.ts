interface ImportMetaEnv {
	readonly VITE_APP_BUILD_DATE: string;
	readonly VITE_APP_EXCHANGES: string;
	readonly VITE_APP_PROXY_URL: string;
	readonly VITE_APP_API_URL: string;
	readonly VITE_APP_API_SUPPORTED_PAIRS: string;
	readonly VITE_APP_API_SUPPORTED_TIMEFRAMES: string;
	readonly VITE_APP_PUBLIC_VAPID_KEY: string;
	readonly VITE_APP_PUBLIC_PATH: string;
	readonly VITE_APP_VERSION: string;
  }
  
  interface ImportMeta {
	readonly env: ImportMetaEnv;
  } 