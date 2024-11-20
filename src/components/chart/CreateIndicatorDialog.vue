<template>
  <transition name="dialog" :duration="300" @after-leave="close">
    <Dialog
      v-if="opened"
      @close="hide"
      class="create-indicator-dialog"
      size="small"
      :resizable="false"
    >
      <template v-slot:header>
        <div class="dialog__title">New indicator</div>
      </template>
      <form ref="form" @submit.prevent="submit">
        <div class="form-group mb16">
          <label>Create blank indicator</label>
          <input class="form-control" v-model="name" placeholder="Untitled" />
        </div>
        <div class="form-group mb16">
          <label>Scale with</label>
          <dropdown-button
            v-model="priceScaleId"
            :options="availableScales"
            placeholder="Default scale"
            class="-outline form-control -arrow"
          ></dropdown-button>
        </div>
      </form>

      <template v-slot:footer>
        <button class="btn -text mr8" @click="hide(false)">Cancel</button>
        <button type="button" @click="submit" class="btn">
          <span><i class="icon-check mr8"></i> Create</span>
        </button>
      </template>
    </Dialog>
  </transition>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useDialog } from '@/composables/useDialog'
import Dialog from '@/components/framework/Dialog.vue'
import DropdownButton from '@/components/framework/DropdownButton.vue'
import { getChartScales } from './options'
import store from '@/store'

const props = defineProps({
  paneId: {
    type: String,
    required: true
  }
})

// Initialize dialog logic
const { opened, close, hide } = useDialog()
defineExpose({ close })

const availableScales = ref<Record<string, string>>({})
const priceScaleId = ref('right')
const name = ref('')

onMounted(() => {
  availableScales.value = getChartScales(store.state[props.paneId].indicators)
})

const submit = () => {
  hide({
    name: name.value,
    priceScaleId: priceScaleId.value
  })
}
</script>
