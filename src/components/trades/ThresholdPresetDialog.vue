<template>
  <Dialog @clickOutside="close">
    <template v-slot:header>
      <div class="title">Configure preset</div>
    </template>
    <form @submit.prevent="submit">
      <div class="form-group mb8">
        <label>Choose type</label>

        <label class="checkbox-control mt8">
          <input
            type="checkbox"
            class="form-control"
            v-model="includeThresholds"
          />
          <div></div>
          <span>Trades</span>
        </label>
      </div>
      <div class="form-group mb8">
        <label class="checkbox-control">
          <input
            type="checkbox"
            class="form-control"
            v-model="includeLiquidations"
          />
          <div></div>
          <span>Liquidations</span>
        </label>
      </div>
      <div class="form-group mb8 mt16">
        <label>Choose what to include in preset</label>

        <label class="checkbox-control mt8">
          <input
            type="checkbox"
            class="form-control"
            v-model="includeAmounts"
          />
          <div></div>
          <span>Amounts</span>
        </label>
      </div>
      <div class="form-group mb8">
        <label class="checkbox-control">
          <input type="checkbox" class="form-control" v-model="includeColors" />
          <div></div>
          <span>Colors</span>
        </label>
      </div>
      <div class="form-group mb8">
        <label class="checkbox-control">
          <input type="checkbox" class="form-control" v-model="includeAudio" />
          <div></div>
          <span>Audio</span>
        </label>
      </div>

      <footer>
        <a
          href="javascript:void(0);"
          class="btn -text mr8"
          @click="close(false)"
          >Cancel</a
        >
        <button type="submit" class="btn -large -green">
          <i class="icon-check mr4"></i> Submit
        </button>
      </footer>
    </form>
  </Dialog>
</template>

<script>
import DialogMixin from '@/mixins/dialogMixin'

export default {
  mixins: [DialogMixin],
  data: () => ({
    includeThresholds: true,
    includeLiquidations: true,
    includeAmounts: false,
    includeColors: true,
    includeAudio: true
  }),
  methods: {
    submit() {
      this.close({
        thresholds: this.includeThresholds,
        liquidations: this.includeLiquidations,
        amounts: this.includeAmounts,
        colors: this.includeColors,
        audios: this.includeAudio
      })
    }
  }
}
</script>
