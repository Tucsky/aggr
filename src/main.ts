import Vue from 'vue'
import App from './App.vue'
import VueTippy, { TippyComponent } from 'vue-tippy'
import './assets/sass/app.scss'
import store from './store'

import Editable from '@/components/framework/Editable.vue'
import Dropdown from '@/components/framework/Dropdown.vue'
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

Vue.component('TippyComponent', TippyComponent)
Vue.component('DropdownComponent', Dropdown)
Vue.component('EditableComponent', Editable)
Vue.component('PresetsComponent', Presets)
Vue.directive('autofocus', autofocus)
Vue.directive('draggable-market', draggableMarket)

new Vue({
  el: '#app',
  store,
  render: h => h(App)
})
