<template>
  <div
    class="pane-header hide-scrollbar d-flex"
    :class="[split && 'pane-header--split']"
    @dblclick="maximizePane"
  >
    <div
      v-if="showName && name"
      class="btn -cases pane-header__highlight"
      @dblclick="maximizePane"
    >
      <slot name="title">
        {{ name }}
        <btn
          type="button"
          @click="renamePane"
          class="pane-header__edit btn -text -small"
        >
          <i class="icon-edit"></i>
        </btn>
      </slot>
    </div>
    <slot>
      <hr />
    </slot>
    <button
      v-if="showSearch"
      type="button"
      @click="openSearch"
      class="btn -text"
    >
      <i class="icon-search"></i>
    </button>
    <btn
      v-if="settings"
      type="button"
      @click="openSettings"
      class="pane-overlay -text"
      :loading="isLoading"
    >
      <i class="icon-cog"></i>
    </btn>
    <button
      type="button"
      @click="toggleDropdown"
      class="pane-overlay btn -text"
    >
      <i class="icon-more"></i>
    </button>

    <dropdown v-model="paneDropdownTrigger">
      <div class="d-flex btn-group">
        <button
          type="button"
          class="btn -green"
          @click.stop="changeZoom($event, -1)"
        >
          <i class="icon-minus"></i>
        </button>
        <button
          type="button"
          class="btn -green text-monospace flex-grow-1 text-center"
          @click.stop="resetZoom"
        >
          × {{ zoom.toFixed(2) }}
        </button>
        <button
          type="button"
          class="btn -green"
          @click.stop="changeZoom($event, 1)"
        >
          <i class="icon-plus"></i>
        </button>
      </div>
      <button
        v-if="settings !== null"
        type="button"
        class="dropdown-item"
        @click="openSettings"
      >
        <i class="icon-cog"></i>
        <span>Settings</span>
      </button>
      <button
        v-if="showSearch"
        type="button"
        class="dropdown-item"
        @click="openSearch"
      >
        <i class="icon-search"></i>
        <span>Sources</span>
      </button>
      <div v-if="isInFrame" class="dropdown-item" @click.stop>
        <label class="checkbox-control -small">
          <input
            type="checkbox"
            class="form-control"
            :checked="syncedWithParent"
            @change="
              $store.commit('panes/TOGGLE_SYNC_WITH_PARENT_FRAME', paneId)
            "
          />
          <div></div>
          <span>Sync</span>
        </label>
      </div>
      <div
        v-if="$slots.menu"
        class="dropdown-divider"
        :data-label="`${paneId} options`"
      ></div>
      <slot name="menu"></slot>
      <div class="dropdown-divider" data-label="utilities"></div>
      <button type="button" class="dropdown-item" @click="maximizePane">
        <i class="icon-enlarge"></i>
        <span>Maximize</span>
      </button>
      <button type="button" class="dropdown-item" @click="duplicatePane">
        <i class="icon-copy-paste"></i>
        <span>Duplicate</span>
      </button>
      <button type="button" class="dropdown-item" @click="downloadPane">
        <i class="icon-download"></i>
        <span>Download</span>
      </button>
      <button type="button" class="dropdown-item" @click="renamePane">
        <i class="icon-edit"></i>
        <span>Rename</span>
      </button>
      <button type="button" class="dropdown-item" @click="removePane">
        <i class="icon-trash"></i>
        <span>Remove</span>
      </button>
    </dropdown>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import Component from 'vue-class-component'

import Btn from '@/components/framework/Btn.vue'
import { downloadAnything, getSiblings, slugify } from '@/utils/helpers'
import dialogService from '@/services/dialogService'
import { INFRAME } from '@/utils/constants'
import { Prop } from 'vue-property-decorator'

@Component({
  name: 'PaneHeader',
  components: {
    Btn
  }
})
export default class PaneHeader extends Vue {
  paneDropdownTrigger = null
  isLoading = false
  isInFrame = INFRAME

  @Prop(String) readonly paneId: string
  @Prop({ default: null }) readonly settings?: () => Promise<any>
  @Prop({ default: true }) readonly showSearch: boolean
  @Prop({ default: true }) readonly showName: boolean
  @Prop({ default: true }) readonly split: boolean

  get zoom() {
    return this.$store.state.panes.panes[this.paneId].zoom || 1
  }

  get type() {
    return this.$store.state.panes.panes[this.paneId].type
  }

  get syncedWithParent() {
    return (
      this.$store.state.panes.syncedWithParentFrame.indexOf(this.paneId) !== -1
    )
  }

  get name() {
    const name = this.$store.state.panes.panes[this.paneId].name
    const market =
      this.$store.state.panes.marketsListeners[
        this.$store.state.panes.panes[this.paneId].markets[0]
      ]

    if (name) {
      return name.trim()
    } else if (market) {
      return market.local
    } else {
      return this.type
    }
  }

  openSearch() {
    this.$store.dispatch('app/showSearch', { paneId: this.paneId })
  }

  changeZoom(event, direction) {
    const zoom = this.zoom + (event.shiftKey ? 0.0625 : 0.125) * direction
    this.$store.dispatch('panes/setZoom', { id: this.paneId, zoom: zoom })

    this.$emit('zoom', zoom)
  }

  resetZoom() {
    this.$store.dispatch('panes/setZoom', { id: this.paneId, zoom: 1 })

    this.$emit('zoom', 1)
  }

  async removePane() {
    if (
      await dialogService.confirm(`Delete pane ${this.type} "${this.name}" ?`)
    ) {
      this.$store.dispatch('panes/removePane', this.paneId)
    }
  }

  duplicatePane() {
    this.$store.dispatch('panes/duplicatePane', this.paneId)
  }

  maximizePane(event) {
    if (event.type === 'dblclick' && event.currentTarget !== event.target) {
      return
    }

    const el = this.$el.parentElement.parentElement
    const isMaximized = el.classList.toggle('-maximized')

    const siblings = getSiblings(el)

    for (const sibling of siblings) {
      if (!sibling.getAttribute('type')) {
        continue
      }
      sibling.classList.remove('-maximized')
      sibling.style.display = isMaximized ? 'none' : 'block'
    }

    const cls = Event as any

    window.dispatchEvent(new cls('resize'))

    this.$store.dispatch('panes/setZoom', {
      id: this.paneId,
      zoom: isMaximized ? this.zoom * 1.5 : this.zoom * (2 / 3)
    })
  }

  async renamePane(event) {
    if (event) {
      event.stopPropagation()
    }

    const name = await dialogService.prompt({
      placeholder: `Main pane's market`,
      action: 'Rename',
      input: this.name
    })

    if (typeof name === 'string' && name !== this.name) {
      this.$store.commit('panes/SET_PANE_NAME', { id: this.paneId, name: name })
    }
  }

  async downloadPane() {
    const id = `${this.type}:${this.paneId}`

    downloadAnything(
      {
        name: id,
        type: this.type,
        data: this.$store.state[this.paneId],
        markets: this.$store.state.panes.panes[this.paneId].markets,
        createdAt: Date.now(),
        updatedAt: null
      },
      slugify(`${this.type} ${this.name}`)
    )
  }

  toggleDropdown(event) {
    if (this.paneDropdownTrigger) {
      this.paneDropdownTrigger = null
    } else {
      this.paneDropdownTrigger = event.currentTarget
    }
  }

  async openSettings() {
    if (!this.settings) {
      return
    }

    this.isLoading = true
    dialogService.open((await this.settings()).default, {
      paneId: this.paneId
    })
    this.isLoading = false
  }
}
</script>
