<template>
  <Dialog @clickOutside="close" class="-sticky-footer -small">
    <template v-slot:header>
      <div class="title">
        Settings
        <div class="subtitle" v-if="hits"><i class="icon-bolt"></i> <strong v-text="hits"></strong> Messages per seconds</div>
      </div>
      <div class="column -center"></div>
    </template>
    <section class="section" v-if="workspace">
      <dropdown :options="workspaceMenu" placeholder="Workspaces" title="Workspace tools" selectionClass="-blue -large w-100 column" v-tippy>
        <template v-slot:selection>
          <i class="icon-dashboard -center mr16"></i>

          <div class="-fill text-left">
            <div class="column">
              <div class="-center">{{ workspace.name }}</div>
              <small
                ><code class="-center">{{ workspace.id }}</code></small
              >
              <div class="-fill"></div>
            </div>
            <small class="text-muted">created {{ workspace.createdAt }} ago</small>
          </div>
          <i class="icon-menu"></i>
        </template>
        <template v-slot:option="{ value }">
          <span>{{ value.label }}</span>
          <i :class="'icon-' + value.icon"></i>
        </template>
      </dropdown>

      <dropdown
        class="-left mt16"
        v-if="workspaces.length > 1"
        :options="workspaces"
        placeholder="Workspaces"
        @output="loadWorkspace"
        title="Load another workspace"
        selectionClass="-blue -small"
        v-tippy
      >
        <template v-slot:selection>
          <i class="icon-search"></i>
          <span class="ml4">Load workspaces ({{ workspaces.length }}) </span>
        </template>
        <template v-slot:option="{ value }">
          <i class="icon-trash -action mr16" @mousedown.stop @click.stop="removeWorkspace(value.id)"></i>
          <div class="flex-grow-1">
            <div class="dropdown-option__title">
              {{ value.name }} <code>{{ value.id }}</code>
            </div>
            <div v-if="value.updatedAt" class="dropdown-option__description text-muted" v-text="'last used ' + ago(value.updatedAt) + ' ago'"></div>
          </div>
          <i class="icon-external-link-square-alt ml4"></i>
        </template>
      </dropdown>

      <div class="section__title">
        Workspace
      </div>
    </section>

    <section class="section">
      <div v-if="settings.indexOf('list') > -1" class="settings-section settings-trades">
        <div class="form-group mb8">
          <label class="checkbox-control -aggr" @change="$store.commit('settings/TOGGLE_AGGREGATION', $event.target.checked)">
            <input type="checkbox" class="form-control" :checked="aggregateTrades" />
            <div></div>
            <span>Trades aggregation is {{ aggregateTrades ? 'enabled' : 'disabled' }}</span>
          </label>
        </div>

        <div class="form-group mb8">
          <label
            class="checkbox-control -slippage"
            :title="
              calculateSlippage === 'price'
                ? 'Show slippage in $'
                : calculateSlippage === 'bps'
                ? 'Show slippage in basis point (bps)'
                : 'Slippage disabled'
            "
            v-tippy="{ placement: 'left' }"
          >
            <input type="checkbox" class="form-control" :checked="calculateSlippage" @change="$store.commit('settings/TOGGLE_SLIPPAGE')" />
            <div></div>
            <span v-if="calculateSlippage === 'price'"> Calculate slippage in price change (<i class="icon-dollar"></i>) </span>
            <span v-if="calculateSlippage === 'bps'"> Calculate slippage in bps <i class="icon-bps"></i> </span>
            <span v-if="!calculateSlippage">Do not show slippage</span>
          </label>
        </div>

        <div class="form-group">
          <label class="checkbox-control checkbox-control-input -auto" v-tippy="{ placement: 'left' }" title="Size display preference">
            <input
              type="checkbox"
              class="form-control"
              :checked="preferQuoteCurrencySize"
              @change="$store.commit('settings/SET_QUOTE_AS_PREFERED_CURRENCY', $event.target.checked)"
            />
            <span>Size in</span>
            <div on="quote currency" off="base currency"></div>
            <span>(<i :class="preferQuoteCurrencySize ? 'icon-quote' : 'icon-base'"></i>)</span>
          </label>
        </div>
      </div>
      <div class="section__title" @click="$store.commit('settings/TOGGLE_SETTINGS_PANEL', 'list')">
        Trades list
        <i class="icon-up"></i>
      </div>
    </section>

    <section class="section">
      <audio-settings v-if="settings.indexOf('audio') > -1"></audio-settings>
      <div class="section__title" @click="$store.commit('settings/TOGGLE_SETTINGS_PANEL', 'audio')">
        Audio
        <i class="icon-up"></i>
      </div>
    </section>

    <section class="section">
      <div v-if="settings.indexOf('chart') > -1" class="settings-section settings-chart">
        <div class="form-group mb16">
          <label class="checkbox-control flex-left">
            <input
              type="checkbox"
              class="form-control"
              :checked="!!timezoneOffset"
              @change="$store.commit('settings/SET_TIMEZONE_OFFSET', !timezoneOffset ? new Date().getTimezoneOffset() * 60000 * -1 : 0)"
            />
            <div></div>
            <span>Show local time</span>
          </label>
        </div>
        <div class="form-group column mb8">
          <verte :value="backgroundColor" @input="$event !== backgroundColor && $store.dispatch('settings/setBackgroundColor', $event)"></verte>
          <label class="-fill -center ml8">Background color</label>
        </div>
        <div class="form-group column mb8">
          <verte
            picker="square"
            menuPosition="left"
            model="rgb"
            :value="textColor"
            @input="$event !== textColor && $store.commit('settings/SET_CHART_COLOR', $event)"
          ></verte>
          <label for="" class="-fill -center ml8"
            >Text color <a><i class="icon-cross text-small" v-if="textColor" @click="$store.commit('settings/SET_CHART_COLOR', null)"></i></a
          ></label>
        </div>
      </div>
      <div class="section__title" @click="$store.commit('settings/TOGGLE_SETTINGS_PANEL', 'chart')">
        Chart
        <i class="icon-up"></i>
      </div>
    </section>

    <section class="section">
      <div class="form-group" v-if="settings.indexOf('exchanges') > -1">
        <div class="settings-exchanges">
          <Exchange v-for="exchangeId of exchanges" :key="exchangeId" :id="exchangeId" />
        </div>
      </div>
      <div class="section__title" @click="$store.commit('settings/TOGGLE_SETTINGS_PANEL', 'exchanges')">
        Exchanges
        <i class="icon-up"></i>
      </div>
    </section>

    <section class="section">
      <other-settings v-if="settings.indexOf('other') > -1"></other-settings>
      <div class="section__title" @click="$store.commit('settings/TOGGLE_SETTINGS_PANEL', 'other')">
        Other
        <i class="icon-up"></i>
      </div>
    </section>

    <section class="section mt16 settings__footer">
      <div class="form-group">
        <div v-if="version" class="column">
          <div class="-grow">
            <button class="btn -text">
              v{{ version }} <sup class="version-date">{{ buildDate }}</sup>
            </button>
          </div>
          <button class="btn -text" @click="reset()">reset</button>
          <i class="pipe -center">|</i>
          <span>
            <dropdown :options="donationMenu" title="Support the project" placeholder="donate" class="-top -text-left" selectionClass="-text" v-tippy>
              <template v-slot:option="{ value }">
                <i :class="'icon-' + value.icon" class="-fill"></i>

                <span class="ml4">{{ value.label }}</span>
              </template>
            </dropdown>
          </span>
        </div>
      </div>
    </section>
  </Dialog>
</template>

<script>
import { ago } from '../../utils/helpers'

import Exchange from './Exchange.vue'
import SettingsImportConfirmation from './ImportConfirmation.vue'

import dialogService from '../../services/dialogService'
import AudioSettings from './AudioSettings.vue'
import OtherSettings from './OtherSettings.vue'
import workspacesService from '@/services/workspacesService'
import Dropdown from '../framework/Dropdown.vue'
import aggregatorService from '@/services/aggregatorService'
import { APPLICATION_START_TIME } from '@/utils/constants'

import Dialog from '@/components/framework/Dialog.vue'
import DialogMixin from '@/mixins/dialogMixin'

export default {
  mixins: [DialogMixin],
  components: {
    Dialog,
    Exchange,
    AudioSettings,
    OtherSettings,
    Dropdown
  },
  data() {
    return {
      workspace: null,
      workspaces: [],
      hits: null
    }
  },
  computed: {
    exchanges() {
      return this.$store.getters['exchanges/getExchanges']
    },

    version() {
      return this.$store.state.app.version
    },

    buildDate() {
      return this.$store.state.app.buildDate
    },

    settings() {
      return this.$store.state.settings.settings
    },

    timezoneOffset() {
      return this.$store.state.settings.timezoneOffset
    },

    backgroundColor() {
      return this.$store.state.settings.backgroundColor
    },

    textColor() {
      return this.$store.state.settings.textColor
    },

    aggregateTrades() {
      return this.$store.state.settings.aggregateTrades
    },

    preferQuoteCurrencySize() {
      return this.$store.state.settings.preferQuoteCurrencySize
    },

    calculateSlippage() {
      return this.$store.state.settings.calculateSlippage
    }
  },

  async created() {
    this.createMenus()
    await this.getWorkspaces()

    if (process.env.NODE_ENV !== 'production') {
      this.getHits()
    }
  },

  mounted() {
    this.bindDrop()
  },

  beforeDestroy() {
    this.unbindDrop()

    if (this._hitsTimeout) {
      clearTimeout(this._hitsTimeout)
    }
  },
  methods: {
    bindDrop() {
      document.body.addEventListener('drop', this.handleDrop)
      document.body.addEventListener('dragover', this.handleDrop)
    },

    unbindDrop() {
      document.body.removeEventListener('drop', this.handleDrop)
      document.body.removeEventListener('dragover', this.handleDrop)
    },

    createMenus() {
      this.donationMenu = [
        {
          label: 'with Bitcoin',
          icon: 'bitcoin',
          click: () => window.open('bitcoin:3PK1bBK8sG3zAjPBPD7g3PL14Ndux3zWEz')
        },
        {
          label: 'with Monero',
          icon: 'xmr',
          click: () => window.open('monero:48NJj3RJDo33zMLaudQDdM8G6MfPrQbpeZU2YnRN2Ep6hbKyYRrS2ZSdiAKpkUXBcjD2pKiPqXtQmSZjZM7fC6YT6CMmoX6')
        },
        {
          label: 'with other coin',
          icon: 'COINBASE',
          click: () => window.open('https://commerce.coinbase.com/checkout/c58bd003-5e47-4cfb-ae25-5292f0a0e1e8')
        }
      ]

      this.workspaceMenu = [
        {
          icon: 'trash',
          label: 'Remove',
          click: this.removeWorkspace
        },
        {
          icon: 'edit',
          label: 'Rename',
          click: this.renameWorkspace
        },
        {
          icon: 'download',
          label: 'Download',
          click: this.exportWorkspace
        },
        {
          icon: 'copy-paste',
          label: 'Duplicate',
          click: this.duplicateWorkspace
        },
        {
          icon: 'upload',
          label: 'Upload',
          click: this.uploadWorkspace
        }
      ]
    },

    getHits() {
      if (this.hits === null) {
        this.hits = '...'
      }

      this._hitsTimeout = setTimeout(async () => {
        const hits = await aggregatorService.dispatchAsync({ op: 'hits' })
        const elapsed = +new Date() - APPLICATION_START_TIME
        this.hits = (hits / (elapsed / 1000)).toFixed()

        this.getHits()
      }, 1000)
    },

    handleDrop(e) {
      e.preventDefault()

      if (e.type !== 'drop') {
        return false
      }

      const files = e.dataTransfer.files

      if (!files || !files.length) {
        return
      }

      const reader = new FileReader()

      reader.onload = async ({ target }) => {
        const workspace = this.validateWorkspaceImport(target.result)

        if (!workspace) {
          return
        }

        if (
          (await workspacesService.getWorkspace(workspace.id)) &&
          !(await dialogService.confirm({
            message: `Workspace ${workspace.id} already exists`,
            ok: 'Import anyway',
            cancel: 'Annuler'
          }))
        ) {
          return
        }

        if (
          await dialogService.openAsPromise(SettingsImportConfirmation, {
            workspace
          })
        ) {
          this.importWorkspace(workspace)
        }
      }
      reader.readAsText(files[0])
    },

    async importWorkspace(workspace) {
      await workspacesService.setCurrentWorkspace(await workspacesService.importWorkspace(workspace))

      this.getWorkspaces()
    },

    async getWorkspaces() {
      const workspaces = await workspacesService.getWorkspaces()

      this.workspaces = workspaces

      const workspace = workspacesService.workspace

      this.workspace = {
        name: workspace.name,
        id: workspace.id,
        updatedAt: ago(workspace.updatedAt),
        createdAt: ago(workspace.createdAt),
        states: null
      }
    },

    validateWorkspaceImport(raw) {
      let workspace = null

      try {
        workspace = JSON.parse(raw)
      } catch (error) {
        this.$store.dispatch('app/showNotice', {
          type: 'error',
          title: `The workspace you provided couldn't be parsed<br>${error.message}`
        })

        return
      }

      if (!workspace.id) {
        this.$store.dispatch('app/showNotice', {
          type: 'error',
          title: `The workspace you provided has no ID`
        })
        return
      }

      if (!workspace.name) {
        this.$store.dispatch('app/showNotice', {
          type: 'error',
          title: `The workspace you provided has no name`
        })
        return
      }

      if (!workspace.states || Object.keys(workspace.states).length === 0) {
        this.$store.dispatch('app/showNotice', {
          type: 'error',
          title: `The workspace you provided is empty`
        })
        return
      }

      return workspace
    },

    async loadWorkspace(index) {
      const id = this.workspaces[index].id

      const workspace = await workspacesService.getWorkspace(id)

      await workspacesService.setCurrentWorkspace(workspace)

      this.getWorkspaces()
    },

    async removeWorkspace(id) {
      let workspace

      if (typeof id === 'string') {
        workspace = await workspacesService.getWorkspace(id)
      } else {
        workspace = this.workspace
      }

      const isCurrent = this.workspace && this.workspace.id === workspace.id

      if (!(await dialogService.confirm(`Delete workspace ${workspace.name} ?`))) {
        return
      }

      await workspacesService.removeWorkspace(workspace.id)

      if (isCurrent) {
        let nextWorkspace = this.workspaces.find(w => w.id !== workspace.id)

        if (!nextWorkspace) {
          nextWorkspace = await workspacesService.createWorkspace()
        }

        await workspacesService.setCurrentWorkspace(nextWorkspace)
      }

      return this.getWorkspaces()
    },

    async createWorkspace() {
      const workspace = await workspacesService.createWorkspace()
      await workspacesService.setCurrentWorkspace(workspace)
    },

    async exportWorkspace() {
      workspacesService.downloadWorkspace()
    },

    async duplicateWorkspace() {
      workspacesService.duplicateWorkspace()
    },

    async uploadWorkspace() {
      const input = document.createElement('input')
      input.type = 'file'

      input.onchange = e => {
        const file = e.target.files[0]
        // setting up the reader
        const reader = new FileReader()
        reader.readAsText(file, 'UTF-8')

        // here we tell the reader what to do when it's done reading...
        reader.onload = readerEvent => {
          const content = readerEvent.target.result // this is the content!
          const workspace = this.validateWorkspaceImport(content)
          if (!workspace) {
            return
          }
          if (
            workspacesService.getWorkspace(workspace.id) &&
            !dialogService.confirm({ message: `Workspace ${workspace.id} already exists`, ok: 'Import anyway', cancel: 'Annuler' })
          ) {
            return
          }
          if (dialogService.openAsPromise(SettingsImportConfirmation, { workspace })) {
            this.importWorkspace(workspace)
          }
        }
      }

      input.click()
    },

    async renameWorkspace() {
      const name = await dialogService.prompt({
        action: 'Rename',
        input: this.workspace.name
      })

      if (name) {
        await workspacesService.renameWorkspace(name)
      }

      this.getWorkspaces()
    },

    async reset() {
      if (
        await dialogService.confirm({
          title: 'Reset ?',
          message: `This will remove your <strong>${this.workspaces.length} workspace${
            this.workspaces.length > 1 ? 's' : ''
          }</strong>.<br>All associated data will be lost forever.`
        })
      ) {
        await workspacesService.reset()

        window.location.reload()
      }
    },

    ago(timestamp) {
      return ago(timestamp)
    }
  }
}
</script>

<style lang="scss">
.settings__footer {
  margin-top: auto;
  background: 0 !important;

  .form-group {
    flex-basis: auto;
    max-width: none;
    flex-grow: 1;
  }

  .version-date {
    opacity: 0.75;
    line-height: 1;
    position: relative;
    top: -0.5em;
    left: 0.25em;
  }

  .pipe {
    opacity: 0.5;
    margin: 0 0.25rem;
    line-height: 1;
  }

  .settings__browse-import {
    position: relative;
    input[type='file'] {
      opacity: 0;
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      width: 100%;
      max-width: 100%;
      overflow: hidden;

      &,
      &::-webkit-file-upload-button {
        cursor: pointer;
      }
    }
  }
}

.settings-audio {
  align-items: center;

  label {
    margin: 0;
  }

  input[type='range'] {
    width: 100%;
    margin: 0;
  }
}

.settings-exchanges {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: flex-start;
}

.settings-chart {
  &__sub-settings {
    margin-left: 2.4em;
    margin-bottom: 0.5em;

    > div {
      + div {
        margin-top: 0.75em;
      }
    }

    > div + div {
      margin-top: 0.75em;
    }

    input[type='range'] {
      font-size: 0.5em;
      vertical-align: middle;
    }
  }
}

#app.-light {
  .section__title {
    opacity: 1;
  }

  .form-group {
    .checkbox-control {
      opacity: 1;
    }
  }
}

.selection {
  position: sticky;
  top: 0;

  &__items {
    display: flex;
    flex-direction: column;
    place-items: flex-end;
  }

  .btn {
    text-transform: none;

    i {
      display: none;
    }

    &.-added {
      &:after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        opacity: 0;
        background-color: white;
        animation: 1s $ease-out-expo highlight;
        pointer-events: none;
      }
    }
  }

  @media screen and (min-width: 768px) {
    text-align: right;
  }

  @media screen and (max-width: 767px) {
    flex-direction: row;
    flex-wrap: wrap;

    .btn {
      margin-right: 4px;
    }
  }
}
.search {
  flex-grow: 1;

  table {
    border: 0;
    border-collapse: collapse;
    width: 100%;
  }

  td {
    padding: 0.25rem 0.33rem;
  }

  tr:hover {
    background-color: rgba(white, 0.1);
    cursor: pointer;
  }

  &__exchange {
    background-position: right;
  }
}

#app.-light .search tr:hover {
  background-color: rgba(black, 0.1);
}
</style>
