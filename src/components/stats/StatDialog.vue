<template>
  <Dialog :open="open" @clickOutside="close">
    <template v-slot:header>
      <div>
        <div class="title">BUCKET</div>
        <div class="subtitle">{{ name }}</div>
      </div>
    </template>
    <div class="column mb8">
      <div class="form-group  -fill">
        <label>Name</label>
        <input
          type="text"
          class="form-control"
          :value="name"
          @change="
            $store.dispatch(paneId + '/updateBucket', {
              id: bucketId,
              prop: 'name',
              value: $event.target.value
            })
          "
        />
      </div>
      <div class="form-group -end mtauto" ref="colorContainer">
        <verte
          picker="square"
          menuPosition="left"
          model="rgb"
          :value="color"
          @input="
            $store.dispatch(paneId + '/updateBucket', {
              id: bucketId,
              prop: 'color',
              value: $event
            })
          "
        ></verte>
      </div>
    </div>
    <div class="column">
      <div class="form-group mb8">
        <label>
          Window (m)
          <span class="icon-info" title="Sum over given interval (eg: 30s or 10m or 1h)" v-tippy></span>
        </label>
        <input
          type="text"
          class="form-control"
          :value="window"
          :placeholder="getHms($store.state[paneId].window) + ' (default)'"
          @change="
            $store.dispatch(paneId + '/updateBucket', {
              id: bucketId,
              prop: 'window',
              value: $event.target.value
            })
          "
        />
      </div>
      <div class="form-group mb8">
        <label>
          Precision
          <span class="icon-info" title="Decimal precision" v-tippy></span>
        </label>
        <editable
          class="form-control"
          placeholder="auto"
          :content="precision"
          @output="
            $store.dispatch(paneId + '/updateBucket', {
              id: bucketId,
              prop: 'precision',
              value: $event
            })
          "
        ></editable>
      </div>
    </div>
    <div class="form-group">
      <label for
        >Value
        <span
          class="icon-info"
          title="/!\Javascript syntax/!\<br>use build in variable such as vbuy/vsell (volume) cbuy/csell (trade count) lbuy/lsell (liquidation volume)"
          v-tippy
        ></span
      ></label>
      <textarea
        class="form-control"
        rows="5"
        :value="input"
        @change="
          $store.dispatch(paneId + '/updateBucket', {
            id: bucketId,
            prop: 'input',
            value: $event.target.value
          })
        "
      ></textarea>
      <small class="help-text mt-8">
        Sum <code>{{ input }}</code> over {{ getHms(window) }} window
      </small>
    </div>
    <hr />
    <div class="column">
      <div class="form-group">
        <label
          class="checkbox-control -on-off"
          v-tippy="{ placement: 'bottom' }"
          :title="enabled ? 'Disable' : 'Enable'"
          @change="disable(bucketId, $event)"
        >
          <input type="checkbox" class="form-control" :checked="enabled" />
          <div></div>
          <span>
            {{ enabled ? 'Active' : 'Disabled' }}
          </span>
        </label>
      </div>
      <button class="btn -red" @click="remove">
        <i class="icon-trash"></i>
      </button>
    </div>
  </Dialog>
</template>

<script>
import store from '@/store'
import { getHms } from '@/utils/helpers'

import Dialog from '@/components/framework/Dialog.vue'
import DialogMixin from '@/mixins/dialogMixin'

export default {
  props: ['paneId', 'bucketId'],
  mixins: [DialogMixin],
  components: {
    Dialog
  },
  computed: {
    color: function() {
      return store.state[this.paneId].buckets[this.bucketId].color
    },
    enabled: function() {
      return store.state[this.paneId].buckets[this.bucketId].enabled
    },
    name: function() {
      return store.state[this.paneId].buckets[this.bucketId].name
    },
    input: function() {
      return store.state[this.paneId].buckets[this.bucketId].input
    },
    precision: function() {
      return store.state[this.paneId].buckets[this.bucketId].precision || null
    },
    window: function() {
      const window = store.state[this.paneId].buckets[this.bucketId].window

      if (window) {
        return getHms(window)
      } else {
        return null
      }
    }
  },
  methods: {
    getHms(value) {
      return getHms(value)
    },
    disable(id, event) {
      this.$store.dispatch(this.paneId + '/updateBucket', { id: id, prop: 'enabled', value: event.target.checked })
      this.close()
    },
    async remove() {
      await this.close()

      this.$store.commit(this.paneId + '/REMOVE_BUCKET', this.bucketId)
    }
  }
}
</script>
