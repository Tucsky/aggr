<template>
  <div>
    <div class="form-group mb8">
      <label class="checkbox-control" v-tippy="{ placement: 'left' }" title="eg: BTC-USD">
        <input type="checkbox" class="form-control" :checked="showPairs" @change="$store.commit(paneId + '/TOGGLE_PAIRS')" />
        <div></div>
        <span>Ticker names are {{ showPairs ? 'visible' : 'hidden' }}</span>
      </label>
    </div>
    <div class="form-group mb8">
      <label class="checkbox-control">
        <input type="checkbox" class="form-control" :checked="boldFont" @change="$store.commit(paneId + '/TOGGLE_BOLD_FONT')" />
        <div></div>
        <span>{{ boldFont ? 'Bold' : 'Thin' }} text</span>
      </label>
    </div>

    <div class="form-group mb8">
      <label class="checkbox-control">
        <input type="checkbox" class="form-control" :checked="animateSort" @change="$store.commit(paneId + '/TOGGLE_SORT_ANIMATION')" />
        <div></div>
        <span>Order change animations are {{ animateSort ? 'enabled' : 'disabled' }}</span>
      </label>
    </div>

    <!--<small v-if="animateSort && disableAnimations" class="help-text mt8 mb16">
      Animations are disabled globaly !
      <a href="javascript:void(0);" @click="$store.commit('settings/TOGGLE_ANIMATIONS')">Enable animations</a>
    </small>-->
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import Slider from '../framework/picker/Slider.vue'
import Thresholds from '../settings/Thresholds.vue'

@Component({
  components: { Thresholds, Slider },
  name: 'PricesSettings',
  props: {
    paneId: {
      type: String,
      required: true
    }
  }
})
export default class extends Vue {
  paneId: string

  get showPairs() {
    return this.$store.state[this.paneId].showPairs
  }

  get boldFont() {
    return this.$store.state[this.paneId].boldFont
  }

  get animateSort() {
    return this.$store.state[this.paneId].animateSort
  }
}
</script>
