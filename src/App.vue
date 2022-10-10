
<template>
<div class="app">
    <div class="toolbar">
      <vs-switch class="switch" v-model="isActive" vs-icon-off="edit" vs-icon-on="edit">
      </vs-switch>
      <vs-button radius color="primary" type="border" icon="close" @click="clearPolygons"></vs-button>
      <vs-select
        label="Mode of transport"
        v-model="mode_of_transport"
        >
        <vs-select-item
            :key="index"
            :value="item.value"
            :text="item.text"
            v-for="(item, index) in modes_of_transport"
        />
      </vs-select>
      <vs-select
        multiple
        label="Category"
        v-model="categories"
      >
        <vs-select-item
            :key="index"
            :value="item.value"
            :text="item.text"
            v-for="(item, index) in categories_options"
        />
      </vs-select>
      <vs-select
        label="Metric"
        v-model="metric"
      >
        <vs-select-item
            :key="index"
            :value="item.value"
            :text="item.text"
            v-for="(item, index) in metric_options"
        />
      </vs-select>
      <vs-button radius color="success" type="border" icon="check" @click="DoCalc"></vs-button>
    </div>
    <l-map
        style="height: 900px"
        :zoom="zoom"
        :center="center"
        @update:center="centerUpdated"
        @update:zoom="zoomUpdated"
    >
      <l-tile-layer :url="url" ></l-tile-layer>
      <l-freedraw
          v-model="polygons"
          :mode="mode"
          :max-polygons="1"
      />
      <l-polygon
          v-for="(polygon, index) in polygons"
          :key="index"
          :lat-lngs="polygon"
          :style="polygon_style"
      ></l-polygon>
      <l-geo-json
        :geojson="result"
        :optionsStyle="styleFunction"
      />
    </l-map>
</div>
</template>

<script>
import { NONE, ALL } from 'leaflet-freedraw';
import {LMap, LTileLayer, LPolygon, LGeoJson} from 'vue2-leaflet';

export default {
  components: {
    LMap,
    LTileLayer,
    LPolygon,
    LGeoJson,
  },
  data () {
    return {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      zoom: 15,
      center: [51.505, -0.159],
      modes_of_transport:[
        {text:'Walk',value:'walk'},
        {text:'Car',value:'car'},
        {text:'Bike',value:'bike'},
      ],
      categories_options: [],
      metric_options: [
        {text:'Proximity',value:'proximity'},
      ],
      polygons: [],
      polygon_style: { color: "red", weight: 5 },
      isActive: false,
      mode_of_transport: "walk",
      categories: ["convenience"],
      metric: "proximity",
      result: null
    };
  },
  computed: {
    mode() {
      return this.isActive ? ALL: NONE;
    }
  },
  watch: {
    center: {
      handler: function (val) {
        localStorage.setItem('center', JSON.stringify(val));
      },
    },
    zoom: {
      handler: function (val) {
        localStorage.setItem('zoom', JSON.stringify(val));
      },
    },
  },
  mounted() {
    const center = localStorage.getItem('center');
    if (center) {
      this.center = JSON.parse(center);
    }
    const zoom = localStorage.getItem('zoom');
    if (zoom) {
      this.zoom = JSON.parse(zoom);
    }
    this.getCategories();
  },
  methods: {
    getCategories() {
      const self = this;
      fetch(`${process.env.VUE_APP_SERVER_ADDRESS}/categories`)
        .then(response => response.json())
        .then(data => {
          self.categories_options = data.categories;
        });
    },
    styleFunction(x) {
        return {
            color: x["properties"]["stroke"],
            weight: x["properties"]["stroke-width"],
            fillColor: x["properties"]["fill"],
            opacity: 0.6,
        }
    },
    centerUpdated(center) {
      this.center = center;
    },
    zoomUpdated(zoom) {
      this.zoom = zoom;
    },
    flipActive() {
      this.isActive = !this.isActive;
    },
    clearPolygons() {
      this.polygons = [];
    },
    DoCalc() {
      var self = this
      // Convert the polygon to a GeoJSON Polygon object
      var polygon = {
        "type": "Polygon",
        "coordinates": this.polygons[0].map(function (point) {
          return [point.lng, point.lat];
        })
      };
      // Make request to the backend /process_request endpoint with body {area, categories, metric, mode_of_transportation}
      fetch(`${process.env.VUE_APP_SERVER_ADDRESS}/process_request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          area: polygon,
          categories: this.categories,
          metric: this.metric,
          mode_of_transport: this.mode_of_transport
        })
      })
        .then(response => response.json())
        .then(data => {
          self.$vs.loading()
          // Get id from result and check every 5 seconds until the status will be "done"
          // request url /process_request/<id>
          var id = data.id;
          var interval = setInterval(function () {
            fetch(`${process.env.VUE_APP_SERVER_ADDRESS}/process_request/` + id)
              .then(response => response.json())
              .then(data => {
                if (data.status === "done") {
                  // When the status is "done" stop the interval and show the result
                  clearInterval(interval);
                  // Request completed result from /process_request/<id>/result and store it in the variable result
                  fetch(`${process.env.VUE_APP_SERVER_ADDRESS}/process_request/` + id + '/result')
                    .then(response => response.json())
                    .then(data => {
                      self.result = data;
                      self.$vs.loading.close()
                    })
                    .catch(() => {
                      self.$vs.loading.close()
                    });
                }
                if (data.status === "error") {
                  // When the status is "error" stop the interval and show the error
                  clearInterval(interval);
                  alert("Got error while processing request");
                  self.$vs.loading.close()
                }
              }).catch(error => {
                alert(error);
                clearInterval(interval);
                self.$vs.loading.close()
              })
          }, 5000);
        })
        .catch((error) => {
          console.error('Error:', error);
          alert(error);
        });

    }
  }
}
</script>

<style scoped>
  .toolbar {
    display: flex;
    justify-content: start;
    align-items: flex-end;
    padding: 15px 30px;
  }
  .toolbar > * {
    margin-right: 30px;
  }
/*  Make .switch 2 times bigger */
  .switch {
    scale: 1.3;
    top: -8px;
  }
</style>
