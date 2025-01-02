import { createApp } from 'vue'
import App from './App.vue'
import directives from '@/directives'
import './assets/sass/app.scss'
import store from './store'

// Import VueTippy and its component
import 'tippy.js/dist/tippy.css'

// Create the Vue app
const app = createApp(App)

// Register directives
for (const key in directives) {
  app.directive(key, directives[key])
}

// Mount the main app
app.use(store).mount('#app')

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const base_url = import.meta.env.VITE_APP_BASE_PATH || '/'
    navigator.serviceWorker.register(`${base_url}sw.js`)
  })
}
