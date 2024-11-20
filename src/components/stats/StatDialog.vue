<template>
  <transition name="dialog" :duration="300" @after-leave="close">
    <Dialog v-if="opened" @close="hide">
      <template #header>
        <div class="d-flex">
          <div class="dialog__title -center">BUCKET</div>
          <code class="-filled ml4">
            <small>{{ name }}</small>
          </code>
        </div>

        <dropdown-button
          v-model="type"
          :options="availableTypes"
          class="mlauto"
          button-class="-text -arrow"
          @input="
            $store.dispatch(paneId + '/updateBucket', {
              id: bucketId,
              prop: 'type',
              value: $event
            })
          "
        ></dropdown-button>
      </template>
      <div class="column mb8">
        <div class="form-group -fill">
          <label>Name</label>
          <input
            type="text"
            class="form-control"
            :value="name"
            v-dispatch="paneId + '/renameBucket'"
          />
        </div>
        <div
          v-if="!conditionnalColor"
          class="form-group -end mtauto -tight"
          ref="colorContainer"
        >
          <color-picker-control
            :value="color"
            @input="
              $store.dispatch(paneId + '/updateBucket', {
                id: bucketId,
                prop: 'color',
                value: $event
              })
            "
          ></color-picker-control>
        </div>
        <div v-if="type === 'histogram'" class="form-group -tight -end mtauto">
          <label
            class="checkbox-control checkbox-control-input -auto flex-right"
            v-tippy="{ placement: 'bottom' }"
            title="Enable onditionnal color"
          >
            <input
              type="checkbox"
              class="form-control"
              :checked="conditionnalColor"
              @change="
                $store.commit(
                  paneId + '/TOGGLE_BUCKET_COLOR_CONDITION',
                  bucketId
                )
              "
            />
            <div on="dynamic" off="fixed"></div>
          </label>
        </div>
      </div>
      <div v-if="conditionnalColor" class="form-group mb8">
        <label>
          Color condition
          <span
            class="icon-info"
            title="ex: value > 0 ? 'red' : 'white'"
            v-tippy
          ></span
        ></label>
        <textarea
          class="form-control -code"
          rows="2"
          spellcheck="false"
          :value="color"
          v-dispatch="[
            paneId + '/updateBucket',
            value => ({
              id: bucketId,
              prop: 'color',
              value
            })
          ]"
        ></textarea>
      </div>
      <div class="column">
        <div class="form-group mb8">
          <label>
            Window (m)
            <span
              class="icon-info"
              title="Sum over given interval (ex: 30s or 10m or 1h)"
              v-tippy
            ></span>
          </label>
          <input
            type="text"
            class="form-control"
            :value="window"
            :placeholder="getHms($store.state[paneId].window) + ' (default)'"
            v-commit="[
              paneId + '/UPDATE_BUCKET',
              v => ({
                id: bucketId,
                prop: 'window',
                value: v
              })
            ]"
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
            :value="precision"
            @input="
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
        <label>
          Value
          <span
            class="icon-info"
            title="/!\Javascript syntax/!\<br>use build in variable such as vbuy/vsell (volume) cbuy/csell (trade count) lbuy/lsell (liquidation volume)"
            v-tippy
          ></span
        ></label>
        <textarea
          class="form-control -code"
          rows="5"
          spellcheck="false"
          :value="input"
          v-dispatch="[
            paneId + '/updateBucket',
            v => ({
              id: bucketId,
              prop: 'input',
              value: v
            })
          ]"
        ></textarea>
        <p class="help-text mt-8">
          Sum <code>{{ input }}</code> over {{ window }} window
        </p>
      </div>
      <div class="column">
        <div class="form-group">
          <label
            class="checkbox-control"
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
  </transition>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import store from '@/store'
import { getHms } from '@/utils/helpers'
import Dialog from '@/components/framework/Dialog.vue'
import DropdownButton from '@/components/framework/DropdownButton.vue'
import ColorPickerControl from '../framework/picker/ColorPickerControl.vue'
import { useDialog } from '@/composables/useDialog'

const props = defineProps({
  paneId: {
    required: true,
    type: String
  },
  bucketId: {
    required: true,
    type: String
  }
})
const { hide, close, opened } = useDialog()

defineEmits(['close'])

const color = computed(
  () => store.state[props.paneId].buckets[props.bucketId].color
)
const conditionnalColor = computed(() => {
  const bucket = store.state[props.paneId].buckets[props.bucketId]
  if (typeof bucket.conditionnalColor === 'undefined') {
    setConditionnalColor(false)
  }
  return bucket.conditionnalColor
})
const enabled = computed(
  () => store.state[props.paneId].buckets[props.bucketId].enabled
)
const name = computed(
  () => store.state[props.paneId].buckets[props.bucketId].name
)
const type = computed(
  () => store.state[props.paneId].buckets[props.bucketId].type
)
const input = computed(
  () => store.state[props.paneId].buckets[props.bucketId].input
)
const precision = computed(
  () => store.state[props.paneId].buckets[props.bucketId].precision || null
)
const window = computed(() => {
  const window = store.state[props.paneId].buckets[props.bucketId].window
  return window ? getHms(window) : null
})

const availableTypes = { line: 'Line', area: 'Area', histogram: 'Histogram' }

function disable(bucketId: string, event: Event) {
  store.dispatch(props.paneId + '/updateBucket', {
    id: bucketId,
    prop: 'enabled',
    value: (event.target as HTMLInputElement).checked
  })
  hide()
}

async function remove() {
  await hide()
  store.commit(props.paneId + '/REMOVE_BUCKET', props.bucketId)
}

function setConditionnalColor(value) {
  const bucket = store.state[props.paneId].buckets[props.bucketId]
  bucket.conditionnalColor = value
}
</script>
