<template>
  <Dialog @clickOutside="close">
    <template v-slot:header>
      <div>
        <div class="title">
          <div @dblclick="renamePreset" v-text="name"></div>
        </div>
        <div class="subtitle" v-text="preset.type"></div>
      </div>
    </template>

    <div class="d-flex flex-middle">
      <i class="icon-info mr16"></i>
      <div class="mr16">
        <small class="text-muted">Created at</small>
        <div>{{ createdAt }} ago</div>
      </div>
      <div>
        <small class="text-muted">Updated at</small>
        <div>{{ updatedAt }} ago</div>
      </div>
    </div>

    <p>
      What's included :
      <button type="button" class="btn -text" v-text="showDetails ? 'hide' : 'show'" @click="showDetails = !showDetails"></button>
    </p>

    <ul v-if="showDetails">
      <li v-for="prop of dataProperties" :key="prop">
        <code v-text="prop"></code>
      </li>
    </ul>

    <footer>
      <button type="button" class="btn -text mrauto ml0" @click="downloadPreset"><i class="icon-download mr8"></i> Export</button>
      <button type="button" class="btn -text -red ml8" @click="deletePreset"><i class="icon-cross mr8"></i> Delete</button>
      <button type="button" class="btn -blue -large ml16" @click="updatePreset"><i class="icon-edit mr4"></i> Update</button>
    </footer>
  </Dialog>
</template>

<script>
import DialogMixin from '@/mixins/dialogMixin'
import workspacesService from '@/services/workspacesService'
import { downloadJson, slugify, ago } from '@/utils/helpers'
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
      dataProperties: [],
      createdAt: 'N/A',
      updatedAt: 'N/A',
      showDetails: false
    }
  },
  computed: {
    name() {
      return this.preset.name.split(':').pop()
    }
  },
  created() {
    this.retrieveDataProperties(this.preset.data)

    if (this.preset.updatedAt) {
      this.updatedAt = ago(this.preset.updatedAt)
    }

    if (this.preset.createdAt) {
      this.createdAt = ago(this.preset.createdAt)
    }
  },
  methods: {
    async deletePreset() {
      await workspacesService.removePreset(this.preset.name)

      this.close()
    },
    downloadPreset() {
      downloadJson(this.preset, this.preset.type + '_' + slugify(this.name))
    },
    retrieveDataProperties(obj) {
      for (const prop in obj) {
        if (obj[prop] && typeof obj[prop] === 'object') {
          this.retrieveDataProperties(obj[prop])
        } else if (isNaN(prop) && this.dataProperties.indexOf(prop) === -1) {
          this.dataProperties.push(prop)
        }
      }
    },
    updatePreset() {
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
