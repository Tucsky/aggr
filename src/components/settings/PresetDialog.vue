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
      <dropdown class="-left -text-left" :options="menu" selectionClass="-text -large mrauto" placeholder="Options">
        <template v-slot:selection>Manage preset</template>
        <template v-slot:option="{ value }">
          <i :class="[value.icon === 'trash' && 'text-danger', 'icon-' + value.icon]"> </i>
          <span :class="value.icon === 'trash' ? 'text-danger' : ''">{{ value.label }}</span>
        </template>
      </dropdown>
      <button type="button" class="btn -blue -large ml16 mlauto" @click="replacePreset"><i class="icon-check mr4"></i> Set</button>
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
      name: null,
      type: null,
      cat: null,
      menu: [
        {
          icon: 'swap',
          label: 'Override',
          click: this.replacePreset
        },
        {
          icon: 'external-link-square-alt',
          label: 'Export',
          click: this.downloadPreset
        },
        {
          icon: 'trash',
          label: 'Delete',
          click: this.deletePreset
        }
      ],
      dataProperties: [],
      createdAt: 'N/A',
      updatedAt: 'N/A',
      showDetails: false
    }
  },
  created() {
    const [, type, cat, name] = this.preset.name.match(/^([a-z-]+):?([a-z-]+)?:(.*)/)
    this.type = type
    this.cat = cat
    this.name = name

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
      downloadJson(this.preset, slugify(this.preset.name))
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
    replacePreset() {
      this.close('replace')
    },
    async renamePreset() {
      const name = await dialogService.prompt({
        action: 'Rename',
        input: this.name
      })

      if (name && name !== this.name) {
        await workspacesService.removePreset(this.preset.name)

        this.preset.name = this.type + ':' + (this.cat ? ':' + this.cat : '') + name

        await workspacesService.savePreset(this.preset)
      }
    }
  }
}
</script>
