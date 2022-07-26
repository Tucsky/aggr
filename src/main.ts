import Vue from 'vue'
import App from './App.vue'
import VueTippy, { TippyComponent } from 'vue-tippy'
import './assets/sass/app.scss'
import store from './store'

import Editable from '@/components/framework/Editable.vue'
import Dropdown from '@/components/framework/Dropdown.vue'
import Presets from '@/components/framework/Presets.vue'
import autofocus from '@/directives/autofocusDirective'

import runtime from 'serviceworker-webpack-plugin/lib/runtime'

if ('serviceWorker' in navigator) {
  runtime.register()
}

Vue.use(VueTippy, {
  maxWidth: '200px',
  duration: 0,
  arrow: true,
  animation: 'none',
  delay: [200, 0],
  animateFill: false,
  theme: 'dark'
})

Vue.component('tippy', TippyComponent)
Vue.component('dropdown', Dropdown)
Vue.component('editable', Editable)
Vue.component('presets', Presets)
Vue.directive('autofocus', autofocus)

new Vue({
  el: '#app',
  store,
  render: h => h(App)
})
