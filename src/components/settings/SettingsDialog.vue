<template>
  <Dialog @clickOutside="close" class="-sticky-footer" contentClass="settings">
    <template v-slot:header
      ><div>
        <div class="title">Settings</div>
        <div class="subtitle" v-if="hits">
          <i class="icon-bolt"></i> <code v-text="hits"></code> messages /s
        </div>
      </div>
      <div class="column -center"></div>
    </template>
    <section class="section" v-if="currentWorkspace">
      <div v-if="settings.indexOf('workspaces') > -1">
        <div class="column">
          <button
            type="button"
            class="btn -blue -large -cases flex-grow-1 column text-ellipsis"
            @click="toggleWorkspaceDropdown($event, currentWorkspace.id)"
          >
            <i class="icon-dashboard -center mr16"></i>

            <div class="-fill text-left text-ellipsis">
              <div class="text-ellipsis">
                {{ currentWorkspace.name }}
              </div>
              <small class="text-muted">
                created {{ currentWorkspace.createdAt }} ago
              </small>
            </div>
            <i class="icon-cog"></i>
          </button>
          <dropdown v-model="workspaceDropdownTrigger">
            <button
              type="button"
              class="dropdown-item"
              @click="openWorkspace(workspaceDropdownId, true)"
            >
              <i class="icon-external-link-square-alt"></i>
              <span>Open in a new tab</span>
            </button>
            <button
              type="button"
              class="dropdown-item"
              @click="renameWorkspace(workspaceDropdownId)"
            >
              <i class="icon-edit"></i>
              <span>Rename</span>
            </button>
            <button
              type="button"
              class="dropdown-item"
              @click="duplicateWorkspace(workspaceDropdownId)"
            >
              <i class="icon-copy-paste"></i>
              <span>Duplicate</span>
            </button>
            <button
              type="button"
              class="dropdown-item"
              @click="exportWorkspace(workspaceDropdownId)"
            >
              <i class="icon-download"></i>
              <span>Download</span>
            </button>
            <div class="dropdown-divider"></div>
            <button
              type="button"
              class="dropdown-item"
              @click="removeWorkspace(workspaceDropdownId)"
            >
              <i class="icon-cross"></i>
              <span>Remove workspace</span>
            </button>
          </dropdown>
          <button
            type="button"
            class="btn -text -large  -cases ml8"
            @click="$refs.createWorkspaceDropdown.toggle($event.currentTarget)"
          >
            <i class="icon-plus mr4"></i>
            <span>New</span>
          </button>

          <dropdown ref="createWorkspaceDropdown">
            <button
              type="button"
              class="dropdown-item"
              @click="uploadWorkspace"
            >
              <i class="icon-upload"></i>
              <span>Upload template file</span>
            </button>
            <button
              type="button"
              class="dropdown-item"
              @click="createBlankWorkspace"
            >
              <i class="icon-plus"></i>
              <span>Create blank template</span>
            </button>
          </dropdown>
        </div>
        <table v-if="workspaces.length" class="table mt8">
          <thead>
            <tr>
              <th>Name</th>
              <th class="text-nowrap">Updated at</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="workspace of workspaces"
              :key="workspace.id"
              class="option -action"
              @click="openWorkspace(workspace.id)"
            >
              <td
                class="table-input table-ellipsis text-nowrap"
                :class="[workspace.id === currentWorkspace.id && 'text-bold']"
                v-text="workspace.name"
                :title="
                  `${workspace.name}, created ${ago(workspace.createdAt)} ago`
                "
                v-tippy="{ boundary: 'window', placement: 'left' }"
              ></td>
              <td class="table-input table-min">
                {{ ago(workspace.updatedAt) }} ago
              </td>
              <td class="table-action -hover">
                <button
                  class="btn -text -small"
                  @click.stop="toggleWorkspaceDropdown($event, workspace.id)"
                >
                  <i class="icon-more"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        class="section__title"
        @click="$store.commit('settings/TOGGLE_SETTINGS_PANEL', 'workspaces')"
      >
        Workspaces
        <small>templates</small>
        <i class="icon-up-thin"></i>
      </div>
    </section>

    <section class="section">
      <div v-if="settings.indexOf('list') > -1" class="settings-trades">
        <div class="form-group column mb8">
          <label class="checkbox-control -aggr -auto flex-grow-1">
            <input
              type="checkbox"
              class="form-control"
              :checked="true"
              @click.prevent="$store.commit('settings/TOGGLE_AGGREGATION')"
            />
            <div :on="aggregationLength + 'ms'" off="No aggregation"></div>
            <span v-if="aggregationLength"
              >{{ aggregationLength }}ms aggregation</span
            >
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
            <input
              type="checkbox"
              class="form-control"
              :checked="calculateSlippage"
              @change="$store.commit('settings/TOGGLE_SLIPPAGE')"
            />
            <div></div>
            <span v-if="calculateSlippage === 'price'">
              Calculate slippage in price change (<i class="icon-dollar"></i>)
            </span>
            <span v-if="calculateSlippage === 'bps'">
              Calculate slippage in bps <i class="icon-bps"></i>
            </span>
            <span v-if="!calculateSlippage">Do not show slippage</span>
          </label>
        </div>

        <div class="form-group">
          <label
            class="checkbox-control checkbox-control-input -auto"
            v-tippy="{ placement: 'left' }"
            title="Size display preference"
          >
            <input
              type="checkbox"
              class="form-control"
              :checked="preferQuoteCurrencySize"
              @change="
                $store.commit(
                  'settings/SET_QUOTE_AS_PREFERED_CURRENCY',
                  $event.target.checked
                )
              "
            />
            <span>Size in</span>
            <div on="quote currency" off="base currency"></div>
            <span
              >(<i
                :class="preferQuoteCurrencySize ? 'icon-quote' : 'icon-base'"
              ></i
              >)</span
            >
          </label>
        </div>
      </div>
      <div
        class="section__title"
        @click="$store.commit('settings/TOGGLE_SETTINGS_PANEL', 'list')"
      >
        Trades
        <small>aggregation, slippage, currency</small>
        <i class="icon-up-thin"></i>
      </div>
    </section>

    <section class="section">
      <audio-settings v-if="settings.indexOf('audio') > -1"></audio-settings>
      <div
        class="section__title"
        @click="$store.commit('settings/TOGGLE_SETTINGS_PANEL', 'audio')"
      >
        Audio
        <small>main volume</small>
        <i class="icon-up-thin"></i>
      </div>
    </section>

    <section class="section">
      <div v-if="settings.indexOf('colors') > -1" class="settings-chart">
        <div class="form-group column mb8">
          <color-picker-control
            :value="backgroundColor"
            label="Background color"
            @input="
              $store.dispatch('settings/setColor', {
                type: 'BACKGROUND',
                value: $event
              })
            "
          ></color-picker-control>
          <label class="-fill -center ml8">Background color</label>
        </div>
        <div class="form-group column mb8">
          <color-picker-control
            :value="textColor"
            label="App text color"
            @input="
              $store.dispatch('settings/setColor', {
                type: 'TEXT',
                value: $event
              })
            "
          ></color-picker-control>
          <label for="" class="-fill -center ml8"
            >Text color
            <a
              ><i
                class="icon-cross text-small"
                v-if="textColor"
                @click="
                  $store.dispatch('settings/setColor', {
                    type: 'TEXT',
                    value: null
                  })
                "
              ></i></a
          ></label>
        </div>
        <div class="form-group column mb8">
          <color-picker-control
            :value="buyColor"
            label="Buy color"
            @close="regenerateSwatch"
            @input="
              $store.dispatch('settings/setColor', {
                type: 'BUY',
                value: $event
              })
            "
          ></color-picker-control>
          <label class="-fill -center ml8">Buy color</label>
        </div>
        <div class="form-group column mb8">
          <color-picker-control
            :value="sellColor"
            label="Sell color"
            @close="regenerateSwatch"
            @input="
              $store.dispatch('settings/setColor', {
                type: 'SELL',
                value: $event
              })
            "
          ></color-picker-control>
          <label class="-fill -center ml8">Sell color</label>
        </div>
      </div>
      <div
        class="section__title"
        @click="$store.commit('settings/TOGGLE_SETTINGS_PANEL', 'colors')"
      >
        Colors
        <small>background, buy/sell color</small>
        <i class="icon-up-thin"></i>
      </div>
    </section>

    <section class="section">
      <div class="form-group" v-if="settings.indexOf('exchanges') > -1">
        <div class="settings-exchanges">
          <Exchange
            v-for="exchangeId of exchanges"
            :key="exchangeId"
            :id="exchangeId"
          />
        </div>
      </div>
      <div
        class="section__title"
        @click="$store.commit('settings/TOGGLE_SETTINGS_PANEL', 'exchanges')"
      >
        Exchanges
        <small>enable/disable exchange globally</small>
        <i class="icon-up-thin"></i>
      </div>
    </section>

    <section class="section">
      <other-settings v-if="settings.indexOf('other') > -1"></other-settings>
      <div
        class="section__title"
        @click="$store.commit('settings/TOGGLE_SETTINGS_PANEL', 'other')"
      >
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
          <a
            class="btn -text"
            href="https://github.com/Tucsky/aggr"
            target="_blank"
            >github</a
          >
          <i class="pipe -center">|</i>
          <span>
            <dono-dropdown class="-top -text-left" />
          </span>
          <i class="pipe -center">|</i>
          <span>
            <button
              type="button"
              class="btn -text -arrow"
              @click="$refs.databaseDropdown.toggle($event.currentTarget)"
            >
              Reset
            </button>
            <dropdown ref="databaseDropdown">
              <button type="button" class="dropdown-item" @click="reset">
                <i class="icon-warning"></i>
                <span>Reset to default</span>
              </button>
              <button
                type="button"
                class="dropdown-item"
                @click="exportDatabase"
              >
                <i class="icon-upload"></i>
                <span>Export database</span>
              </button>
            </dropdown>
          </span>
        </div>
      </div>
    </footer>
  </Dialog>
</template>

<script>
import { ago, browseFile } from '../../utils/helpers'

import Dialog from '@/components/framework/Dialog.vue'
import Exchange from './Exchange.vue'
import DonoDropdown from './DonoDropdown.vue'
import dialogService from '../../services/dialogService'
import AudioSettings from './AudioSettings.vue'
import OtherSettings from './OtherSettings.vue'
import ColorPickerControl from '../framework/picker/ColorPickerControl.vue'

import importService from '@/services/importService'
import workspacesService from '@/services/workspacesService'
import aggregatorService from '@/services/aggregatorService'
import { APPLICATION_START_TIME } from '@/utils/constants'

import DialogMixin from '@/mixins/dialogMixin'

export default {
  mixins: [DialogMixin],
  components: {
    Dialog,
    Exchange,
    AudioSettings,
    OtherSettings,
    DonoDropdown,
    ColorPickerControl
  },
  data() {
    return {
      currentWorkspace: null,
      workspaces: [],
      hits: null,
      workspaceDropdownId: null,
      workspaceDropdownTrigger: null
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

    backgroundColor() {
      return this.$store.state.settings.backgroundColor
    },

    textColor() {
      return this.$store.state.settings.textColor
    },

    buyColor() {
      return this.$store.state.settings.buyColor
    },

    sellColor() {
      return this.$store.state.settings.sellColor
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
      const workspaces = await workspacesService.getWorkspaces()
      this.workspaces = workspaces
      const workspace = workspacesService.workspace

      this.currentWorkspace = {
        name: workspace.name,
        id: workspace.id,
        updatedAt: ago(workspace.updatedAt),
        createdAt: ago(workspace.createdAt),
        states: null
      }
    },

    openWorkspace(id, newWindow = false) {
      const url = window.location.href.replace(this.currentWorkspace.id, id)

      if (newWindow) {
        window.open(url)
      } else {
        window.location.href = url
      }
    },

    async removeWorkspace(id = this.workspaceDropdownId) {
      const workspace = await workspacesService.getWorkspace(id)

      const isCurrent =
        this.currentWorkspace && this.currentWorkspace.id === workspace.id

      if (isCurrent) {
        await this.close()
      }

      if (
        !(await dialogService.confirm(
          `Delete ${isCurrent ? 'current workspace' : 'workspace'} ${
            workspace.name
          } ?`
        ))
      ) {
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

    async exportWorkspace(id = this.workspaceDropdownId) {
      workspacesService.downloadWorkspace(id)
    },

    async duplicateWorkspace(id = this.workspaceDropdownId) {
      workspacesService.duplicateWorkspace(id)
    },

    async createBlankWorkspace() {
      const randomName = await fetch(
        'https://random-word-api.herokuapp.com/word?number=2'
      )
        .then(response => response.json())
        .then(words =>
          words.map(word => word[0].toUpperCase() + word.slice(1)).join('')
        )

      const name = await dialogService.prompt({
        label: 'Name',
        input: randomName,
        action: 'Name the template',
        placeholder: 'Name (or leave empty)',
        submitLabel: 'Create'
      })

      if (typeof name !== 'string') {
        return
      }

      await this.close()
      const workspace = await workspacesService.createWorkspace(name)

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

    async renameWorkspace(id = this.workspaceDropdownId) {
      const workspace = await workspacesService.getWorkspace(id)

      const name = await dialogService.prompt({
        action: 'Rename',
        input: workspace.name
      })

      if (name) {
        await workspacesService.renameWorkspace(workspace, name)

        await this.getWorkspaces()
      }
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
                content
                  .map(
                    ([thing, count]) =>
                      count + ' ' + thing + (count > 1 ? 's' : '')
                  )
                  .join('\n\t - ') +
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
    },

    toggleWorkspaceDropdown(event, workspaceId) {
      if (this.workspaceDropdownTrigger) {
        this.workspaceDropdownTrigger = null
      } else {
        this.workspaceDropdownTrigger = event.currentTarget
        this.workspaceDropdownId = workspaceId
      }
    },

    async regenerateSwatch(colorDidChanged) {
      if (!colorDidChanged) {
        return
      }

      if (await dialogService.confirm(`Generate thresholds colors ?`)) {
        const buyColor = this.$store.state.settings.buyColor
        const sellColor = this.$store.state.settings.sellColor

        for (const paneId in this.$store.state.panes.panes) {
          if (/^trades/.test(this.$store.state.panes.panes[paneId].type)) {
            this.$store.dispatch(`${paneId}/generateSwatch`, {
              buyColor,
              sellColor,
              baseVariance: 0.25
            })

            this.$store.state[paneId].thresholds = JSON.parse(
              JSON.stringify(this.$store.state[paneId].thresholds)
            )
          }
        }

        this.$store.commit(
          `settings/SET_BACKGROUND_COLOR`,
          this.$store.state.settings.backgroundColor
        )
      }
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
