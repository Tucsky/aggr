import Vue from 'vue'
import App from './App.vue'
import VueTippy, { TippyComponent } from 'vue-tippy'
import './assets/sass/app.scss'
import store from './store'

Vue.use(VueTippy, {
  maxWidth: '200px',
  duration: 0,
  arrow: false,
  animation: 'none',
  size: 'small',
  delay: [200, 0],
  animateFill: false,
  theme: 'blue'
})

import Verte from '@/components/framework/picker/Verte.vue'
import Editable from '@/components/framework/Editable.vue'
import Dropdown from '@/components/framework/Dropdown.vue'
import Presets from '@/components/framework/Presets.vue'
Vue.component('tippy', TippyComponent)
Vue.component('verte', Verte)
Vue.component('dropdown', Dropdown)
Vue.component('editable', Editable)
Vue.component('presets', Presets)

import backgroundDirective from './directives/backgroundDirective'
Vue.directive('background', backgroundDirective)

new Vue({
  el: '#app',
  // router,
  store,
  render: h => h(App),
  props: ['initialized']
})
