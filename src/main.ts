import { createApp } from 'vue';
import App from './App.vue';
import './assets/sass/app.scss';
import store from './store';

// Import VueTippy and its component
import { plugin as VueTippy } from 'vue-tippy';
import 'tippy.js/dist/tippy.css';

// Import global components
import Editable from '@/components/framework/Editable.vue';
import DropdownComponent from '@/components/framework/Dropdown.vue';
import Presets from '@/components/framework/Presets.vue';

// Import directives
import autofocus from '@/directives/autofocusDirective';
import draggableMarket from '@/directives/draggableMarketDirective';
import {
  commitDirective,
  dispatchDirective,
} from './directives/commitDirective';

// Create the Vue app
const app = createApp(App);

// Install VueTippy
app.use(VueTippy, {
  maxWidth: '200px',
  duration: 0,
  arrow: true,
  animation: 'none',
  delay: [200, 0],
  animateFill: false,
  theme: 'dark',
  boundary: 'window',
  distance: 24
});

// Register global components
app.component('dropdown', DropdownComponent);
app.component('editable', Editable);
app.component('presets', Presets);

// Register directives
app.directive('autofocus', autofocus);
app.directive('draggable-market', draggableMarket);
app.directive('commit', commitDirective);
app.directive('dispatch', dispatchDirective);

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const base_url = import.meta.env.VITE_APP_BASE_PATH || '/';
    navigator.serviceWorker.register(`${base_url}sw.js`);
  });
}

// Mount the app
app.use(store).mount('#app');
