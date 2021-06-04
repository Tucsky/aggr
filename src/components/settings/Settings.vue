<template>
  <div id="settings" class="settings__container stack__container" @mousedown="$event.target === $el && close()">
    <div class="stack__scroller" v-background="0.01">
      <div class="stack__wrapper">
        <a href="#" class="stack__toggler icon-cross -text" @click="close"></a>
        <section class="section" v-if="workspace">
          <div class="form-group">
            <div class="column">
              <i class="icon-dashboard -center mr16"></i>

              <div class="-fill">
                <div class="column">
                  <div class="-center">{{ workspace.name }}</div>
                  <code class="-center">{{ workspace.id }}</code>
                  <div class="-fill"></div>
                </div>
                <small class="text-muted">created {{ workspace.createdAt }} ago</small>
              </div>

              <dropdown class="ml8" :options="workspaceMenu" placeholder="Workspaces" title="Workspace tools" v-tippy>
                <template v-slot:selection>
                  <button class="btn -blue"><i class="icon-menu"></i></button>
                </template>
                <template v-slot:option="{ value }">
                  <div>
                    <span>{{ value.label }}</span>
                    <i :class="'icon-' + value.icon"></i>
                  </div>
                </template>
              </dropdown>
            </div>

            <small class="help-text ">
              <dropdown
                class="-left mt16"
                v-if="workspaces.length > 1"
                :options="workspaces"
                placeholder="Workspaces"
                @output="loadWorkspace"
                title="Load another workspace"
                v-tippy
              >
                <template v-slot:selection>
                  <button type="button" class="btn -blue -small" href="javascript:void(0);">
                    <i class="icon-search"></i>
                    <span class="ml4">Load workspaces ({{ workspaces.length }}) </span>
                  </button>
                </template>
                <template v-slot:option="{ value }">
                  <div>
                    <i class="icon-trash -action mr16" @click.stop="removeWorkspace(value.id)"></i>
                    <div class="flex-grow-1">
                      <div class="dropdown-option__title">
                        {{ value.name }} <code>{{ value.id }}</code>
                      </div>
                      <div
                        v-if="value.updatedAt"
                        class="dropdown-option__description text-muted"
                        v-text="'last used ' + ago(value.updatedAt) + ' ago'"
                      ></div>
                    </div>
                    <i class="icon-external-link-square-alt ml4"></i>
                  </div>
                </template>
              </dropdown>
            </small>
          </div>

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
            <div class="form-group mb8">
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
                v{{ version }}
                <sup class="version-date">{{ buildDate }}</sup>
              </div>
              <a href="javascript:void(0);" @click="reset()">reset</a>
              <i class="pipe">|</i>
              <span>
                <dropdown :options="donationMenu" title="Support the project" class="-top -text-left" v-tippy>
                  <template v-slot:selection>
                    <a href="javascript:void(0);">
                      donate
                    </a>
                  </template>
                  <template v-slot:option="{ value }">
                    <div style="font-size:1rem;">
                      <i :class="'icon-' + value.icon" class="-fill"></i>

                      <span class="ml4">{{ value.label }}</span>
                    </div>
                  </template>
                </dropdown>
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'

import { ago } from '../../utils/helpers'

import Exchange from './Exchange.vue'
import SettingsImportConfirmation from './ImportConfirmation.vue'

import dialogService from '../../services/dialogService'
import AudioSettings from './AudioSettings.vue'
import OtherSettings from './OtherSettings.vue'
import workspacesService from '@/services/workspacesService'
import { Workspace } from '@/types/test'
import Dropdown from '../framework/Dropdown.vue'

@Component({
  name: 'Settings',
  components: {
    Exchange,
    AudioSettings,
    OtherSettings,
    Dropdown
  }
})
export default class extends Vue {
  workspace: Workspace = null
  workspaces: Workspace[] = []
  donationMenu = [
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

  workspaceMenu = [
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

  get exchanges() {
    return this.$store.getters['exchanges/getExchanges']
  }

  get version() {
    return this.$store.state.app.version
  }

  get buildDate() {
    return this.$store.state.app.buildDate
  }

  get settings() {
    return this.$store.state.settings.settings
  }

  get timezoneOffset() {
    return this.$store.state.settings.timezoneOffset
  }

  get backgroundColor() {
    return this.$store.state.settings.backgroundColor
  }

  get textColor() {
    return this.$store.state.settings.textColor
  }

  get aggregateTrades() {
    return this.$store.state.settings.aggregateTrades
  }

  get preferQuoteCurrencySize() {
    return this.$store.state.settings.preferQuoteCurrencySize
  }

  get calculateSlippage() {
    return this.$store.state.settings.calculateSlippage
  }

  async created() {
    await this.getWorkspaces()
  }

  mounted() {
    this.bindDrop()
  }

  beforeDestroy() {
    this.unbindDrop()
  }

  bindDrop() {
    document.body.addEventListener('drop', this.handleDrop)
    document.body.addEventListener('dragover', this.handleDrop)
  }

  unbindDrop() {
    document.body.removeEventListener('drop', this.handleDrop)
    document.body.removeEventListener('dragover', this.handleDrop)
  }

  handleDrop(e: DragEvent) {
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
  }

  async importWorkspace(workspace: Workspace) {
    await workspacesService.setCurrentWorkspace(await workspacesService.importWorkspace(workspace))

    this.getWorkspaces()
  }

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
  }

  close() {
    this.$store.commit('app/TOGGLE_SETTINGS')
  }

  validateWorkspaceImport(raw): Workspace {
    let workspace: Workspace = null

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
  }

  async loadWorkspace(index: number) {
    const id = this.workspaces[index].id

    const workspace = await workspacesService.getWorkspace(id)

    await workspacesService.setCurrentWorkspace(workspace)

    this.getWorkspaces()
  }

  async removeWorkspace(id: string) {
    let workspace: Workspace

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
  }

  async createWorkspace() {
    const workspace = await workspacesService.createWorkspace()
    await workspacesService.setCurrentWorkspace(workspace)
  }

  async exportWorkspace() {
    workspacesService.downloadWorkspace()
  }

  async duplicateWorkspace() {
    workspacesService.duplicateWorkspace()
  }

  async renameWorkspace() {
    const name = await dialogService.prompt({
      action: 'Rename',
      input: this.workspace.name
    })

    if (name) {
      await workspacesService.renameWorkspace(name)
    }

    this.getWorkspaces()
  }

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
  }

  ago(timestamp) {
    return ago(timestamp)
  }
}
</script>

<style lang="scss">
.settings__container {
  color: white;

  &.-stack__container {
    z-index: 10;
  }

  .stack__wrapper {
    padding: 0;
  }

  .stack__scroller {
    background-color: $dark;
  }

  @media screen and (min-width: 500px) {
    position: fixed;
    height: 100%;
    width: 100%;
    left: 0;

    .stack__scroller {
      width: 260px;
      height: 100%;
      position: absolute;
      left: 0;
    }

    .stack__wrapper {
      display: flex;
      flex-direction: column;
      min-height: 100%;

      > div:last-child {
        margin-top: auto;
        padding-top: 16px;
      }
    }
  }

  @media screen and (min-width: 840px) {
    .stack__scroller {
      width: 320px;
    }
  }

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
      line-height: 0;
    }

    .pipe {
      opacity: 0.5;
      margin: 0 0.25rem;
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

  &.open {
    background-color: #222;
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
