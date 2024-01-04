<template>
  <Dialog
    @clickOutside="close"
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
      <button class="btn -text mr8" @click="close(false)">Cancel</button>
      <button type="button" @click="submit" class="btn">
        <span><i class="icon-check mr8"></i> Create</span>
      </button>
    </template>
  </Dialog>
</template>

<script>
import DialogMixin from '@/mixins/dialogMixin'
import DropdownButton from '@/components/framework/DropdownButton.vue'
import { getChartScales } from './options'

export default {
  mixins: [DialogMixin],
  components: {
    DropdownButton
  },
  props: {
    paneId: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      availableScales: {},
      priceScaleId: 'right',
      name: ''
    }
  },
  mounted() {
    this.availableScales = getChartScales(
      this.$store.state[this.paneId].indicators
    )
  },
  methods: {
    submit() {
      this.close({
        name: this.name,
        priceScaleId: this.priceScaleId
      })
    }
  }
}
</script>
