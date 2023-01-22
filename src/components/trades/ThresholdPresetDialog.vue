<template>
  <Dialog @clickOutside="close">
    <template v-slot:header>
      <div class="dialog__title">Configure preset</div>
    </template>
    <form @submit.prevent="submit">
      <div class="form-group mb8">
        <label>Choose what to include in preset</label>

        <label class="checkbox-control mt16">
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
    </form>

    <template v-slot:footer>
      <button type="button" class="btn -text mr8" @click="close(false)">
        Cancel
      </button>
      <button type="button" @click="submit" class="btn -large -green">
        <i class="icon-check mr4"></i> Submit
      </button>
    </template>
  </Dialog>
</template>

<script>
import DialogMixin from '@/mixins/dialogMixin'

export default {
  mixins: [DialogMixin],
  data: () => ({
    includeAmounts: false,
    includeColors: true,
    includeAudio: true
  }),
  methods: {
    submit() {
      this.close({
        amounts: this.includeAmounts,
        colors: this.includeColors,
        audios: this.includeAudio
      })
    }
  }
}
</script>
