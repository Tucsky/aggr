import Vue from 'vue'
import App from './App.vue'
import VueTippy, { TippyComponent } from 'vue-tippy'
import './assets/sass/app.scss'
import store from './store'

import Editable from '@/components/framework/Editable.vue'
import DropdownComponent from '@/components/framework/Dropdown.vue'
import Presets from '@/components/framework/Presets.vue'
import autofocus from '@/directives/autofocusDirective'
import draggableMarket from '@/directives/draggableMarketDirective'

Vue.use(VueTippy, {
  maxWidth: '200px',
  duration: 0,
  arrow: true,
  animation: 'none',
  delay: [200, 0],
  animateFill: false,
  theme: 'dark',
  boundary: 'window'
})

Vue.component('tippy', TippyComponent)
Vue.component('dropdown', DropdownComponent)
Vue.component('editable', Editable)
Vue.component('presets', Presets)
Vue.directive('autofocus', autofocus)
Vue.directive('draggable-market', draggableMarket)

Vue.config.errorHandler = function (err) {
  if (err.message.includes('Failed to fetch dynamically imported module')) {
    console.error('Vue detected an error due to component load failure:', err)
    store.dispatch('app/showNotice', {
      id: 'cache-issue',
      type: 'error',
      title: `Your app isn't up to date.<br>Click here to refresh !`,
      html: true,
      icon: 'warning',
      action: () => {
        // If you're using a service worker, you'll want to ensure it's unregistered
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then(registrations => {
            for (const registration of registrations) {
              registration.unregister()
            }
            window.location.reload()
          })
        } else {
          window.location.reload()
        }
      }
    })

    // Handle the error
  }
  // Handle other errors or re-throw them if necessary
}

new Vue({
  el: '#app',
  store,
  render: h => h(App)
})
