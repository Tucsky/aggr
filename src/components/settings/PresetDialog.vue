<template>
  <Dialog @clickOutside="close">
    <template v-slot:header>
      <div class="title">
        <span v-text="name"></span>
        <div class="subtitle" v-text="preset.type"></div>
      </div>
    </template>

    <form @submit.prevent="apply">
      <div class="form-group">
        <label>Rename preset</label>
        <input ref="input" type="text" class="form-control w-100" :value="name" @change="renamePreset" />
      </div>

      <footer>
        <button type="button" class="btn -text -red mrauto ml0" @click="deletePreset"><i class="icon-cross mr4"></i> Delete</button>
        <button type="button" class="btn -text" @click="downloadPreset"><i class="icon-download mr4"></i> Download</button>
        <button type="submit" class="btn -large"><i class="icon-check mr4"></i> Apply</button>
      </footer>
    </form>
  </Dialog>
</template>

<script>
import DialogMixin from '@/mixins/dialogMixin'
import workspacesService from '@/services/workspacesService'
import { downloadJson, slugify } from '@/utils/helpers'
import dialogService from '@/services/dialogService'

export default {
  mixins: [DialogMixin],
  props: {
    preset: {
      required: true
    }
  },
  computed: {
    name() {
      return this.preset.name.split(':').pop()
    }
  },
  methods: {
    async deletePreset() {
      if (await dialogService.confirm('Delete preset ' + this.preset.name + ' ?')) {
        await workspacesService.removePreset(this.preset.name)

        this.close()
      }
    },
    async renamePreset(event) {
      const name = event.target.value.trim()

      if (!name.length) {
        return
      }

      await workspacesService.removePreset(this.preset.name)

      this.preset.name = this.preset.type + ':' + name

      await workspacesService.savePreset(this.preset)
    },
    downloadPreset() {
      downloadJson(this.preset, this.preset.type + '_' + slugify(this.name))
    },
    apply() {
      this.close(true)
    }
  }
}
</script>
