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
  boundary: 'window',
  distance: 24
})

/* eslint-disable vue/multi-word-component-names */
Vue.component('tippy', TippyComponent)
Vue.component('dropdown', DropdownComponent)
Vue.component('editable', Editable)
Vue.component('presets', Presets)
Vue.directive('autofocus', autofocus)
Vue.directive('draggable-market', draggableMarket)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const base_url = import.meta.env.VITE_APP_BASE_PATH || '/'
    navigator.serviceWorker.register(`${base_url}sw.js`)
  })
}

new Vue({
  el: '#app',
  store,
  render: h => h(App)
})
