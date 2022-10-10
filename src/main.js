import Vue from 'vue'
import App from './App.vue'
import { LMap, LTileLayer, LMarker, LPolygon, LGeoJson } from 'vue2-leaflet';
import Vuesax from 'vuesax'
import LFreeDraw from 'vue2-leaflet-freedraw';
import 'leaflet/dist/leaflet.css';
import 'material-icons/iconfont/material-icons.css';
import 'vuesax/dist/vuesax.css';


Vue.component('l-map', LMap);
Vue.component('l-tile-layer', LTileLayer);
Vue.component('l-marker', LMarker);
Vue.component('l-polygon', LPolygon);
Vue.component('l-freedraw', LFreeDraw);
Vue.component('l-geojson', LGeoJson);
Vue.use(Vuesax)

new Vue({
  render: (h) => h(App)
}).$mount('#app')
