<template>
  <Dialog
    @clickOutside="close"
    class="settings-dialog"
    contentClass="settings"
    size="medium"
  >
    <template #header>
      <div class="dialog__title">Settings</div>
    </template>
    <ToggableSection
      v-if="currentWorkspace"
      id="settings-workspaces"
      title="Workspaces"
      description="templates"
      :badge="workspaces.length"
      inset
    >
      <div class="column mt16">
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
            <span>Open in a tab</span>
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
            <span>Remove</span>
          </button>
        </dropdown>
        <button
          type="button"
          class="btn -text -large -cases ml8"
          @click="$refs.createWorkspaceDropdown.toggle($event.currentTarget)"
        >
          <i class="icon-plus mr4"></i>
          <span>New</span>
        </button>

        <dropdown ref="createWorkspaceDropdown">
          <button type="button" class="dropdown-item" @click="uploadWorkspace">
            <i class="icon-upload"></i>
            <span>Upload template file</span>
          </button>
          <Btn
            type="button"
            class="dropdown-item -cases"
            :loading="fetchingWords"
            @click.stop="createBlankWorkspace"
            @mousedown.prevent
          >
            <i class="icon-plus"></i>
            <span>Create blank template</span>
          </Btn>
        </dropdown>
      </div>
      <table v-if="workspaces.length" class="table mt8 table--inset">
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
              class="table-input table-ellipsis text-nowrap text-color-base"
              :class="[workspace.id === currentWorkspace.id && 'text-bold']"
              v-text="workspace.name"
              :title="`${workspace.name}<br>created ${ago(
                workspace.createdAt
              )} ago`"
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
    </ToggableSection>

    <ToggableSection
      v-if="currentWorkspace"
      id="settings-trades"
      title="Data"
      description="aggregation, slippage, currency"
      inset
    >
      <div class="form-group column">
        <label
          class="checkbox-control -aggr -auto flex-grow-1"
          title="Granularity preference"
          v-tippy="{ placement: 'left', boundary: 'window' }"
        >
          <input
            type="checkbox"
            class="form-control"
            :checked="true"
            @click.prevent="$store.commit('settings/TOGGLE_AGGREGATION')"
          />
          <div :on="aggregationLengthLabel" off="No aggregation"></div>
          <span v-if="aggregationLength < 0">
            <strong>RAW</strong> trades
            <i
              class="icon-info"
              v-tippy="{ followCursor: true, distance: 32 }"
              title="Will pull Binance tick data"
            ></i>
          </span>
          <span v-else-if="aggregationLength">
            {{ aggregationLengthLabel }} aggregation
            <i
              class="icon-info"
              v-tippy="{ followCursor: true, distance: 32 }"
              :title="`Will pull aggregated data <br>so that 1 tick = ${aggregationLength}ms`"
            ></i>
          </span>
          <span v-else>
            No aggregation
            <i
              class="icon-info"
              v-tippy="{ followCursor: true, distance: 32 }"
              title="Will pull aggregated Binance data but won't aggregate on top of it"
            ></i>
          </span>
        </label>
      </div>
      <p v-if="aggregationLength < 0" class="form-feedback mt4">
        <i class="icon-warning"></i> Processing raw data eats up CPU power
      </p>

      <div class="form-group mt8 mb8">
        <label
          class="checkbox-control -auto"
          :title="
            calculateSlippage === 'price'
              ? 'Show slippage in $'
              : calculateSlippage === 'bps'
                ? 'Show slippage in basis point (bps)'
                : 'Slippage disabled'
          "
          v-tippy="{ placement: 'left', boundary: 'window' }"
        >
          <input
            type="checkbox"
            class="form-control"
            :checked="calculateSlippage"
            @change="$store.commit('settings/TOGGLE_SLIPPAGE')"
          />
          <div>
            <span v-if="calculateSlippage === 'price'">
              change <i class="icon-dollar"></i>
            </span>
            <span v-if="calculateSlippage === 'bps'">
              bps <i class="icon-bps"></i>
            </span>
          </div>
          <span>Show Slippage</span>
        </label>
      </div>

      <div class="form-group">
        <label
          class="checkbox-control checkbox-control-input -auto"
          v-tippy="{ placement: 'left', boundary: 'window' }"
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
          <span>
            <span class="text-success"> (<i class="icon-currency"></i>) </span>
          </span>
        </label>
      </div>
    </ToggableSection>

    <ToggableSection
      id="settings-audio"
      title="Audio"
      description="main volume"
      inset
    >
      <audio-settings />
    </ToggableSection>

    <ToggableSection
      id="settings-colors"
      title="Colors"
      description="background, buy/sell color"
      inset
    >
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
    </ToggableSection>

    <ToggableSection
      id="settings-exchanges"
      title="Exchanges"
      description="enable/disable exchange globally"
      inset
    >
      <div class="settings-exchanges">
        <Exchange
          v-for="exchangeId of exchanges"
          :key="exchangeId"
          :id="exchangeId"
        />
      </div>
    </ToggableSection>

    <ToggableSection id="settings-other" title="Other" inset>
      <other-settings />
    </ToggableSection>

    <template v-slot:footer>
      <a
        class="btn -text mrauto"
        href="https://github.com/Tucsky/aggr"
        target="_blank"
        v-tippy
        title="Github"
      >
        v{{ version }}&nbsp;<sup class="settings-footer__version">{{
          buildDate
        }}</sup>
      </a>
      <span>
        <dono-dropdown class="-top -text-left" />
      </span>
      <i class="settings-footer__divider -center mr4">|</i>
      <span>
        <button
          type="button"
          class="btn -text -arrow settings-footer__button"
          @click="$refs.databaseDropdown.toggle($event.currentTarget)"
        >
          Reset
        </button>
        <dropdown ref="databaseDropdown">
          <button type="button" class="dropdown-item" @click="reset">
            <i class="icon-warning"></i>
            <span>Reset to default</span>
          </button>
          <button type="button" class="dropdown-item" @click="exportDatabase">
            <i class="icon-upload"></i>
            <span>Export database</span>
          </button>
        </dropdown>
      </span>
    </template>
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
import ToggableSection from '@/components/framework/ToggableSection.vue'
import Btn from '@/components/framework/Btn.vue'
import importService from '@/services/importService'
import workspacesService from '@/services/workspacesService'

import DialogMixin from '@/mixins/dialogMixin'

export default {
  mixins: [DialogMixin],
  components: {
    Btn,
    // eslint-disable-next-line vue/no-reserved-component-names
    Dialog,
    Exchange,
    AudioSettings,
    OtherSettings,
    DonoDropdown,
    ColorPickerControl,
    ToggableSection
  },
  data() {
    return {
      currentWorkspace: null,
      workspaces: [],
      workspaceDropdownId: null,
      workspaceDropdownTrigger: null,
      fetchingWords: false
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

    aggregationLengthLabel() {
      if (this.aggregationLength < 0) {
        return 'RAW'
      }

      return this.aggregationLength + 'ms'
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
  },

  methods: {
    async getWorkspaces() {
      const workspaces = (await workspacesService.getWorkspaces()).sort(
        (a, b) => b.updatedAt - a.updatedAt
      )
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

        if (workspacesService.urlStrategy === 'hash') {
          window.location.reload()
        }
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
        let nextWorkspace = this.workspaces
          .sort((a, b) => b.updatedAt - a.updatedAt)
          .find(w => w.id !== workspace.id)

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
      const fetchWithTimeout = async (url, options, timeout = 5000) => {
        return Promise.race([
          fetch(url, options),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timed out')), timeout)
          )
        ])
      }

      let randomName = 'Untitled'
      try {
        this.fetchingWords = true
        const response = await fetchWithTimeout(
          'https://random-word-api.herokuapp.com/word?number=2',
          undefined,
          3000 // Set timeout to 3 seconds
        )
        const words = await response.json()
        randomName = words
          .map(word => word[0].toUpperCase() + word.slice(1))
          .join('')
      } catch (error) {
        console.error('Failed to fetch random name:', error)
      } finally {
        this.fetchingWords = false
      }

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

        history.replaceState(
          {},
          '',
          window.location.href.replace(this.currentWorkspace.id, workspace.id)
        )

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

      if (
        await dialogService.confirm({
          message: `Generate thresholds colors ? 
          <i
            class="icon-info -lower ml4" 
            title="Will override every thresholds color with global buy / sell colors" 
          />`,
          html: true,
          ok: 'Yes please',
          cancel: 'No thanks'
        })
      ) {
        const buyColor = this.$store.state.settings.buyColor
        const sellColor = this.$store.state.settings.sellColor

        for (const paneId in this.$store.state.panes.panes) {
          if (/^trades/.test(this.$store.state.panes.panes[paneId].type)) {
            this.$store.dispatch(`${paneId}/generateSwatch`, {
              color: buyColor,
              side: 'buy',
              baseVariance: 0.25
            })

            this.$store.dispatch(`${paneId}/generateSwatch`, {
              color: sellColor,
              side: 'sell',
              baseVariance: 0.25
            })

            // force refresh
            this.$store.state[paneId].thresholds = JSON.parse(
              JSON.stringify(this.$store.state[paneId].thresholds)
            )
            this.$store.commit(paneId + '/SET_THRESHOLD_COLOR', {})
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
.settings-footer__version {
  opacity: 0.75;
  line-height: 1;
  position: relative;
  top: -0.5rem;
  left: 0.25rem;
  align-self: center;
}

.settings-footer__divider {
  opacity: 0.5;
  line-height: 1;
  align-self: center;
}

.settings-exchanges {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: flex-start;
}
</style>
