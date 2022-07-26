<template>
  <Dialog @clickOutside="close">
    <template v-slot:header>
      <div class="title">Configure preset</div>
    </template>
    <form @submit.prevent="submit">
      <div class="form-group mb8">
        <label>Choose what to include in preset</label>

        <label class="checkbox-control mt16">
          <input type="checkbox" class="form-control" v-model="includeColors" />
          <div></div>
          <span>Colors</span>
        </label>
      </div>
      <div class="form-group mb8">
        <label class="checkbox-control">
          <input type="checkbox" class="form-control" v-model="includeValues" />
          <div></div>
          <span>Options</span>
        </label>
      </div>
      <div class="form-group mb8">
        <label class="checkbox-control">
          <input type="checkbox" class="form-control" v-model="includeScript" />
          <div></div>
          <span>Script</span>
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
          <i class="icon-check mr8"></i> Submit
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
    includeColors: true,
    includeValues: false,
    includeScript: false
  }),
  methods: {
    submit() {
      this.close({
        colors: this.includeColors,
        values: this.includeValues,
        script: this.includeScript
      })
    }
  }
}
</script>
