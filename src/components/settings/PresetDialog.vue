<template>
  <Dialog @clickOutside="close">
    <template v-slot:header>
      <div class="title">
        <div @dblclick="renamePreset" v-text="name"></div>
        <div class="subtitle" v-text="preset.type"></div>
      </div>
    </template>

    <form @submit.prevent="apply">
      <p class="mt0">What's included :</p>
      <ul>
        <li v-for="prop of dataProperties" :key="prop">
          <code v-text="prop"></code>
        </li>
      </ul>

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
  data() {
    return {
      dataProperties: []
    }
  },
  computed: {
    name() {
      return this.preset.name.split(':').pop()
    }
  },
  created() {
    this.retrieveDataProperties(this.preset.data)
  },
  methods: {
    async deletePreset() {
      if (await dialogService.confirm('Delete preset ' + this.preset.name + ' ?')) {
        await workspacesService.removePreset(this.preset.name)

        this.close()
      }
    },
    downloadPreset() {
      downloadJson(this.preset, this.preset.type + '_' + slugify(this.name))
    },
    retrieveDataProperties(obj) {
      for (const prop in obj) {
        if (isNaN(prop) && this.dataProperties.indexOf(prop) === -1) {
          this.dataProperties.push(prop)
        }

        if (obj[prop] && typeof obj[prop] === 'object') {
          this.retrieveDataProperties(obj[prop])
        }
      }
    },
    apply() {
      this.close(true)
    },
    async renamePreset() {
      const name = await dialogService.prompt({
        action: 'Rename',
        input: this.name
      })

      if (name && name !== this.name) {
        await workspacesService.removePreset(this.preset.name)

        this.preset.name = this.preset.type + ':' + name

        await workspacesService.savePreset(this.preset)
      }
    }
  }
}
</script>
