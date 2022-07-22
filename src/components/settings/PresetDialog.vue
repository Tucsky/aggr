<template>
  <Dialog @clickOutside="close">
    <template v-slot:header>
      <div>
        <div class="title">
          <div @dblclick="renamePreset" v-text="meta.name"></div>
        </div>
        <div class="subtitle" v-text="meta.type"></div>
      </div>
    </template>

    <div
      class="d-flex flex-middle mb8"
      v-if="this.preset.createdAt || this.preset.updatedAt"
    >
      <i class="icon-info mr16"></i>
      <div class="mr16" v-if="this.preset.createdAt">
        <small class="text-muted">Created at</small>
        <div>{{ createdAt }} ago</div>
      </div>
      <div v-if="this.preset.updatedAt">
        <small class="text-muted">Updated at</small>
        <div>{{ updatedAt }} ago</div>
      </div>
    </div>

    <p class="mt0">
      What's included :
      <button
        type="button"
        class="btn -text"
        v-text="showDetails ? 'hide' : 'show'"
        @click="showDetails = !showDetails"
      ></button>
    </p>

    <ul v-if="showDetails">
      <li v-for="prop of dataProperties" :key="prop">
        <code v-text="prop"></code>
      </li>
    </ul>

    <footer>
      <button
        type="button"
        class="btn -text -arrow"
        @click="$refs.presetDropdown.toggle($event.currentTarget)"
      >
        <i class="icon-cog mr4"></i>
        Manage
      </button>
      <dropdown ref="presetDropdown">
        <button type="button" class="dropdown-item" @click="downloadPreset">
          <i class="icon-download"></i>
          <span>Download</span>
        </button>
        <button
          type="button"
          class="dropdown-item"
          v-tippy
          title="Replace with current settings"
          @click="replacePreset"
        >
          <i class="icon-refresh"></i>
          <span>Replace</span>
        </button>
        <div class="dropdown-divider"></div>
        <button type="button" class="dropdown-item" @click="deletePreset">
          <i class="icon-trash"></i>
          <span>Delete</span>
        </button>
      </dropdown>
      <button type="button" class="btn -text -large mlauto" @click="copyPreset">
        <i class="icon-copy-paste mr4"></i> Copy
      </button>
      <button
        type="button"
        class="btn -blue -large ml16"
        @click="replacePreset"
      >
        <i class="icon-check mr4"></i> Set
      </button>
    </footer>
  </Dialog>
</template>

<script>
import DialogMixin from '@/mixins/dialogMixin'
import workspacesService from '@/services/workspacesService'
import {
  downloadAnything,
  slugify,
  ago,
  copyTextToClipboard
} from '@/utils/helpers'
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
  computed: {
    meta() {
      const [, type, cat, name] = this.preset.name.match(
        /^([a-z-]+):?([a-z-]+)?:(.*)/
      )

      return {
        type,
        cat,
        name
      }
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
      downloadAnything(this.preset, slugify(this.preset.name))
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
    async copyPreset() {
      await copyTextToClipboard(JSON.stringify(this.preset))

      this.$store.dispatch('app/showNotice', {
        id: 'preset-clipboard',
        title: `Copied preset ${this.preset.name} to clipboard`
      })
    },
    async renamePreset() {
      const name = await dialogService.prompt({
        action: 'Rename',
        input: this.name
      })

      if (name && name !== this.meta.name) {
        await workspacesService.removePreset(this.preset.name)

        this.preset.name =
          this.meta.type +
          ':' +
          (this.meta.cat ? this.meta.cat + ':' : '') +
          name

        await workspacesService.savePreset(this.preset)
      }
    }
  }
}
</script>
