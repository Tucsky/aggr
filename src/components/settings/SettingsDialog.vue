<template>
  <Dialog @clickOutside="close" class="-sticky-footer" contentClass="settings">
    <template v-slot:header
      ><div>
        <div class="title">Settings</div>
        <div class="subtitle" v-if="hits"><i class="icon-bolt"></i> <code v-text="hits"></code> messages /s</div>
      </div>
      <div class="column -center"></div>
    </template>
    <section class="section" v-if="workspace">
      <div v-if="settings.indexOf('workspaces') > -1">
        <div class="column">
          <dropdown :options="activeWorkspaceMenu" selectionClass="-blue -large -cases w-100 column" class="w-100">
            <template v-slot:selection>
              <i class="icon-dashboard -center mr16"></i>

              <div class="-fill text-left">
                <div class="column">
                  <div class="-center">{{ workspace.name }}</div>
                  <small class="-center">
                    <code>{{ workspace.id }}</code>
                  </small>
                  <div class="-fill"></div>
                </div>
                <small class="text-muted">created {{ workspace.createdAt }} ago</small>
              </div>
              <i class="icon-cog"></i>
            </template>
            <template v-slot:option="{ value }">
              <i :class="'icon-' + value.icon"></i>
              <span>{{ value.label }}</span>
            </template>
          </dropdown>
          <dropdown :options="workspacesToolsMenu" selectionClass="-text">
            <template v-slot:selection>
              <i class="icon-plus" title="New template" v-tippy></i>
            </template>
            <template v-slot:option="{ value }">
              <i :class="'icon-' + value.icon"></i>
              <span>{{ value.label }}</span>
            </template>
          </dropdown>
        </div>
        <table v-if="workspaces.length" class="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Use</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="workspace of workspaces" :key="workspace.id" class="option -action" @click="openWorkspace(workspace.id)">
              <td
                class="table-input table-ellipsis text-nowrap"
                v-text="workspace.name"
                :title="workspace.name"
                v-tippy="{ placement: 'right' }"
              ></td>
              <td class="table-input table-min">{{ ago(workspace.updatedAt) }} ago</td>
              <td class="table-action -hover">
                <button class="btn -small" @click.stop="openWorkspace(workspace.id, true)">
                  <i class="icon-external-link-square-alt"></i>
                </button>
              </td>
              <td class="table-action -hover">
                <button class="btn -red -small" @click.stop="removeWorkspace(workspace.id)"><i class="icon-trash"></i></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="section__title" @click="$store.commit('settings/TOGGLE_SETTINGS_PANEL', 'workspaces')">
        Workspaces
        <small>your templates</small>
        <i class="icon-up-thin"></i>
      </div>
    </section>

    <section class="section">
      <div v-if="settings.indexOf('list') > -1" class="settings-trades">
        <div class="form-group column mb8">
          <label class="checkbox-control -aggr -auto flex-grow-1">
            <input type="checkbox" class="form-control" :checked="true" @click.prevent="$store.commit('settings/TOGGLE_AGGREGATION')" />
            <div :on="aggregationLength + 'ms'" off="No aggregation"></div>
            <span v-if="aggregationLength">{{ aggregationLength }}ms aggregation</span>
            <span v-else>No aggregation</span>
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
        Trades
        <small>aggregation, slippage, currency</small>
        <i class="icon-up-thin"></i>
      </div>
    </section>

    <section class="section">
      <audio-settings v-if="settings.indexOf('audio') > -1"></audio-settings>
      <div class="section__title" @click="$store.commit('settings/TOGGLE_SETTINGS_PANEL', 'audio')">
        Audio
        <small>main volume</small>
        <i class="icon-up-thin"></i>
      </div>
    </section>

    <section class="section">
      <div v-if="settings.indexOf('chart') > -1" class="settings-chart">
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
            @input="$event !== textColor && $store.dispatch('settings/setTextColor', $event)"
          ></verte>
          <label for="" class="-fill -center ml8"
            >Text color <a><i class="icon-cross text-small" v-if="textColor" @click="$store.commit('settings/SET_CHART_COLOR', null)"></i></a
          ></label>
        </div>
      </div>
      <div class="section__title" @click="$store.commit('settings/TOGGLE_SETTINGS_PANEL', 'chart')">
        Chart
        <small>background color, timezone</small>
        <i class="icon-up-thin"></i>
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
        <small>enable/disable exchange globally</small>
        <i class="icon-up-thin"></i>
      </div>
    </section>

    <section class="section">
      <other-settings v-if="settings.indexOf('other') > -1"></other-settings>
      <div class="section__title" @click="$store.commit('settings/TOGGLE_SETTINGS_PANEL', 'other')">
        Other
        <i class="icon-up-thin"></i>
      </div>
    </section>

    <footer class="section mt16 settings__footer">
      <div class="form-group">
        <div v-if="version" class="column">
          <div class="-grow">
            <button class="btn -text pl0">
              v{{ version }} <sup class="version-date">{{ buildDate }}</sup>
            </button>
          </div>
          <a class="btn -text" href="https://github.com/Tucsky/aggr" target="_blank">github</a>
          <i class="pipe -center">|</i>
          <span>
            <dono-dropdown class="-top -text-left" />
          </span>
          <i class="pipe -center">|</i>
          <span>
            <dropdown :options="databaseMenu" placeholder="Reset" selectionClass="-text -arrow">
              <template v-slot:option="{ value }">
                <i :class="'icon-' + value.icon" class="-fill"></i>

                <span class="ml4">{{ value.label }}</span>
              </template>
            </dropdown>
          </span>
        </div>
      </div>
    </footer>
  </Dialog>
</template>

<script>
import { ago, browseFile } from '../../utils/helpers'

import Exchange from './Exchange.vue'
import DonoDropdown from './DonoDropdown.vue'

import dialogService from '../../services/dialogService'
import AudioSettings from './AudioSettings.vue'
import OtherSettings from './OtherSettings.vue'
import workspacesService from '@/services/workspacesService'
import Dropdown from '../framework/Dropdown.vue'
import aggregatorService from '@/services/aggregatorService'
import { APPLICATION_START_TIME } from '@/utils/constants'

import Dialog from '@/components/framework/Dialog.vue'
import DialogMixin from '@/mixins/dialogMixin'
import importService from '@/services/importService'

export default {
  mixins: [DialogMixin],
  components: {
    Dialog,
    Exchange,
    AudioSettings,
    OtherSettings,
    DonoDropdown,
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

    aggregationLength() {
      return this.$store.state.settings.aggregationLength
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

  beforeDestroy() {
    if (this._hitsTimeout) {
      clearTimeout(this._hitsTimeout)
    }
  },

  methods: {
    createMenus() {
      this.databaseMenu = [
        {
          icon: 'warning',
          color: 'danger',
          label: 'Reset to default',
          click: this.reset
        },
        {
          icon: 'upload',
          label: 'Export database',
          click: this.exportDatabase
        }
      ]

      this.activeWorkspaceMenu = [
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
        }
      ]

      this.workspacesToolsMenu = [
        {
          icon: 'upload',
          label: 'Upload template',
          click: this.uploadWorkspace
        },
        {
          icon: 'plus',
          label: 'New workspace',
          click: this.createBlankWorkspace
        }
      ]
    },

    getHits() {
      if (this.hits === null) {
        this.hits = '...'
      }

      this._hitsTimeout = setTimeout(async () => {
        const hits = await aggregatorService.dispatchAsync({ op: 'getHits' })
        const elapsed = Date.now() - APPLICATION_START_TIME
        this.hits = (hits / (elapsed / 1000)).toFixed()

        this.getHits()
      }, 1000)
    },

    async getWorkspaces() {
      const workspaces = (await workspacesService.getWorkspaces()).filter(workspace => workspace.id !== workspacesService.workspace.id)

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

    async loadWorkspace(id) {
      await this.close()

      const workspace = await workspacesService.getWorkspace(id)

      await workspacesService.setCurrentWorkspace(workspace)

      this.getWorkspaces()
    },

    openWorkspace(id, newWindow = false) {
      const url = window.location.href.replace(this.workspace.id, id)

      if (newWindow) {
        window.open(url)
      } else {
        window.location.href = url
      }
    },

    async removeWorkspace(id) {
      let workspace

      if (typeof id === 'string') {
        workspace = await workspacesService.getWorkspace(id)
      } else {
        workspace = this.workspace
      }

      const isCurrent = this.workspace && this.workspace.id === workspace.id

      if (isCurrent) {
        await this.close()
      }

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

      if (!isCurrent) {
        return this.getWorkspaces()
      }
    },

    async exportWorkspace() {
      workspacesService.downloadWorkspace()
    },

    async duplicateWorkspace() {
      workspacesService.duplicateWorkspace()
    },

    async createBlankWorkspace() {
      await this.close()
      const workspace = await workspacesService.createWorkspace()

      await workspacesService.setCurrentWorkspace(workspace)
    },

    async uploadWorkspace() {
      try {
        const file = await browseFile()

        if (!file) {
          return
        }

        await importService.importWorkspace(file)
      } catch (error) {
        this.$store.dispatch('app/showNotice', {
          title: error.message,
          type: 'error',
          timeout: 60000
        })
      }
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

    async exportDatabase() {
      return workspacesService.exportDatabase()
    },

    async reset() {
      const sounds = await workspacesService.db.getAllKeys('sounds')
      const indicators = await workspacesService.db.getAllKeys('indicators')
      const presets = await workspacesService.db.getAllKeys('presets')
      const alerts = await workspacesService.db.getAllKeys('alerts')

      const content = []

      if (this.workspaces.length) {
        content.push(['workspace', this.workspaces.length])
      }

      if (indicators.length) {
        content.push(['indicator', indicators.length])
      }

      if (sounds.length) {
        content.push(['sound', sounds.length])
      }

      if (presets.length) {
        content.push(['preset', presets.length])
      }

      if (alerts.length) {
        content.push(['alert', alerts.length])
      }

      if (
        await dialogService.confirm({
          title: 'Reset everything ?',
          html: true,
          ok: 'Reset & reload',
          message: `Everything will be removed${
            content.length
              ? ' including : \n\t - ' +
                content.map(([thing, count]) => count + ' ' + thing + (count > 1 ? 's' : '')).join('\n\t - ') +
                '\n\n...and everything else!'
              : '.'
          }`
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
.settings {
  width: 360px;
}

.settings__footer {
  margin-top: auto;

  .version-date {
    opacity: 0.75;
    line-height: 1;
    position: relative;
    top: -0.5em;
    left: 0.25em;
  }

  .pipe {
    opacity: 0.5;
    line-height: 1;
  }

  .btn {
    background: 0 !important;
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
</style>
