<template>
  <Dialog
    class="indicator-dialog"
    size="large"
    :mask="false"
    :close-on-escape="false"
    @clickOutside="close"
    @resize="resizeEditor"
  >
    <template #header>
      <div class="d-flex">
        <div class="dialog__title indicator-dialog__title -center">
          <div @dblclick="renameIndicator">{{ name }}</div>
          <code
            class="dialog__subtitle indicator-dialog__id -filled"
            @click="copyIndicatorId"
            @dblclick="editDescription"
            :title="indicatorId"
            v-tippy
            >{{ displayId }}</code
          >
        </div>
      </div>

      <a
        href="https://github.com/Tucsky/aggr/wiki/introduction-to-scripting"
        target="_blank"
        title="Scripting documentation"
        v-tippy
        class="btn -text -white mlauto -center -no-grab indicator-dialog__action"
        ><i class="icon-info"></i><span class="ml8">Wiki</span></a
      >

      <button
        v-if="unsavedChanges"
        title="Rollback changes"
        v-tippy
        class="btn ml8 -text -no-grab indicator-dialog__action"
        @click="undoIndicator"
      >
        <i class="icon-eraser"></i><span class="ml8">Discard</span>
      </button>

      <button
        title="Save changes"
        v-tippy
        class="btn ml8 -no-grab indicator-dialog__action"
        :class="[!unsavedChanges && '-text', unsavedChanges && '-green']"
        @click="saveIndicator"
      >
        <i class="icon-save"></i><span class="ml8">Save</span>
      </button>
    </template>
    <template #subheader>
      <tabs v-model="tab">
        <tab name="script">Script</tab>
        <tab name="options">Options</tab>
      </tabs>
    </template>
    <div v-show="tab === 'script'" class="indicator-editor">
      <p v-if="error" class="form-feedback ml16">
        <i class="icon-warning mr4"></i> {{ error }}
      </p>
      <editor
        ref="editor"
        :value="code"
        :font-size="editorFontSize"
        @blur="updateScript"
      />
      <div class="indicator-editor__zoom">
        <div class="btn -text -small" @click="updateEditorFontSize(1)">
          <i class="icon-plus"></i>
        </div>
        <div class="btn -text -small" @click="updateEditorFontSize(-1)">
          <i class="icon-minus"></i>
        </div>
      </div>
    </div>
    <div
      v-show="tab === 'options'"
      class="indicator-options indicator-options--tab hide-scrollbar"
    >
      <ToggableSection
        v-if="scriptOptionsKeys.length"
        :badge="scriptOptionsKeys.length"
        title="Script options"
        id="indicator-left-script"
      >
        <div class="indicator-options__grid mt16">
          <indicator-option
            v-for="key in scriptOptionsKeys"
            :key="key"
            class="indicator-options__option"
            :name="key"
            :pane-id="paneId"
            :indicator-id="indicatorId"
            :plot-types="plotTypes"
            ensure
            @change="setIndicatorOption"
          />
        </div>
      </ToggableSection>
      <ToggableSection
        v-if="colorOptionsKeys.length"
        :badge="colorOptionsKeys.length"
        title="Colors"
        id="indicator-left-colors"
      >
        <div class="indicator-options__grid mt16">
          <indicator-option
            v-for="key in colorOptionsKeys"
            :key="key"
            class="indicator-options__option"
            :name="key"
            :pane-id="paneId"
            :indicator-id="indicatorId"
            :plot-types="plotTypes"
            @change="setIndicatorOption"
          />
        </div>
      </ToggableSection>
      <ToggableSection
        v-if="defaultOptionsKeys.length"
        :badge="defaultOptionsKeys.length"
        title="Other options"
        id="indicator-left-other"
      >
        <div class="indicator-options__grid mt16">
          <indicator-option
            v-for="key in defaultOptionsKeys"
            :key="key"
            class="indicator-options__option"
            :name="key"
            :pane-id="paneId"
            :indicator-id="indicatorId"
            :plot-types="plotTypes"
            @change="setIndicatorOption"
          />
        </div>
      </ToggableSection>
    </div>
    <hr class="-vertical" />
    <div class="indicator-options indicator-options--column hide-scrollbar">
      <div
        class="indicator-search input-group"
        :class="[optionsQuery && 'indicator-search--active']"
      >
        <input
          type="text"
          class="form-control"
          placeholder="search option..."
          v-model="optionsQuery"
        />
        <button
          v-if="optionsQuery"
          type="button"
          class="btn -text -small"
          @click="optionsQuery = ''"
        >
          <i class="icon-cross"></i>
        </button>
      </div>
      <div
        v-if="optionsQuery.length"
        class="indicator-options__list indicator-search__results"
      >
        <indicator-option
          v-for="key in queryOptionsKeys"
          :key="key"
          :name="key"
          :pane-id="paneId"
          :indicator-id="indicatorId"
          :plot-types="plotTypes"
          @change="setIndicatorOption"
        />
        <p v-if="!queryOptionsKeys.length">No results</p>
      </div>
      <template v-else>
        <ToggableSection
          v-if="colorOptionsKeys.length"
          :badge="colorOptionsKeys.length"
          title="Colors"
          id="indicator-right-colors"
        >
          <div class="indicator-options__list">
            <indicator-option
              v-for="key in colorOptionsKeys"
              :key="key"
              :name="key"
              :pane-id="paneId"
              :indicator-id="indicatorId"
              :plot-types="plotTypes"
              inline
              @change="setIndicatorOption"
            />
          </div>
        </ToggableSection>

        <ToggableSection
          v-if="scriptOptionsKeys.length"
          :badge="scriptOptionsKeys.length"
          title="Script"
          id="indicator-right-script"
        >
          <div class="indicator-options__list">
            <indicator-option
              v-for="key in scriptOptionsKeys"
              :key="key"
              :name="key"
              :pane-id="paneId"
              :indicator-id="indicatorId"
              :plot-types="plotTypes"
              ensure
              @change="setIndicatorOption"
            />
          </div>
        </ToggableSection>

        <ToggableSection
          v-if="defaultOptionsKeys.length"
          :badge="defaultOptionsKeys.length"
          title="Other"
          id="indicator-right-default"
        >
          <div class="indicator-options__list">
            <indicator-option
              v-for="key in defaultOptionsKeys"
              :key="key"
              :name="key"
              :pane-id="paneId"
              :indicator-id="indicatorId"
              :plot-types="plotTypes"
              @change="setIndicatorOption"
            />
          </div>
        </ToggableSection>

        <ToggableSection title="Scale" id="indicator-right-scale">
          <div class="form-group">
            <label
              >Scale with
              <i class="icon-info" v-tippy :title="helps.priceScaleId"></i
            ></label>
            <dropdown-button
              :value="indicator.options.priceScaleId"
              :options="availableScales"
              placeholder="Default scale"
              class="-outline form-control -arrow w-100"
              @input="setPriceScale($event)"
            ></dropdown-button>
          </div>
        </ToggableSection>

        <ToggableSection title="Format" id="indicator-right-format">
          <div class="d-flex mb4">
            <div class="mrauto">Format</div>
            <div>Precision</div>
          </div>
          <div class="d-flex">
            <dropdown-button
              :value="priceFormat"
              :options="['price', 'volume', 'percent']"
              class="mr8 -outline form-control -arrow"
              @input="setPriceFormat($event, precision)"
              v-tippy
              title="Volume uses abbreviation for Million and Thousand"
            ></dropdown-button>
            <editable
              class="form-control mlauto"
              :value="precision"
              @input="setPriceFormat(priceFormat, $event)"
            ></editable>
          </div>
        </ToggableSection>
      </template>
    </div>

    <template v-slot:footer>
      <presets
        :type="'indicator:' + indicatorId"
        class="mr8 -left"
        :adapter="getIndicatorPreset"
        :placeholder="presetPlaceholder"
        :label="lastPreset"
        :show-reset="false"
        @apply="applyIndicatorPreset($event)"
      />
      <button class="btn -text -arrow" @click="toggleIndicatorDropdown">
        Options
      </button>
      <dropdown v-model="dropdownIndicatorTrigger">
        <div class="dropdown-item">
          <label class="checkbox-control -small" @mousedown.prevent>
            <input
              type="checkbox"
              class="form-control"
              :checked="indicator.enabled"
              @change="toggleIndicatorAsDefault"
            />
            <div></div>
            <span>Use as default</span>
            <i
              class="icon-info text-muted ml8"
              title="New charts to use this indicator"
              v-tippy
            />
          </label>
        </div>
        <button type="button" class="dropdown-item" @click="copyIndicatorId">
          <i class="icon-copy-paste"></i> <span>Copy ID</span>
          <i
            class="icon-info text-muted ml8"
            title="ID can be used to reference in other indicator using $ sign followed by the id ($price)"
            v-tippy
          />
        </button>
        <button type="button" class="dropdown-item" @click="resizeIndicator">
          <i class="icon-resize-height"></i> <span>Resize</span>
        </button>
        <button type="button" class="dropdown-item" @click="downloadIndicator">
          <i class="icon-download"></i> <span>Download</span>
        </button>
        <button type="button" class="dropdown-item" @click="duplicateIndicator">
          <i class="icon-copy-paste"></i> <span>Duplicate</span>
        </button>
        <div class="dropdown-divider"></div>
        <button type="button" class="dropdown-item" @click="revertChanges">
          <i class="icon-refresh"></i> <span>Revert changes</span>
        </button>
        <button type="button" class="dropdown-item" @click="removeIndicator">
          <i class="icon-cross"></i> <span>Unload</span>
        </button>
      </dropdown>
    </template>
  </Dialog>
</template>

<script lang="ts">
/* eslint-disable vue/no-unused-components */

import DialogMixin from '../../mixins/dialogMixin'
import Tabs from '@/components/framework/Tabs.vue'
import Tab from '@/components/framework/Tab.vue'

import {
  defaultPlotsOptions,
  defaultSerieOptions,
  getChartScales,
  getIndicatorOptionType,
  getIndicatorOptionValue,
  plotTypesMap
} from './options'
import dialogService from '../../services/dialogService'
import merge from 'lodash.merge'
import IndicatorPresetDialog from './IndicatorPresetDialog.vue'
import { copyTextToClipboard } from '@/utils/helpers'

const ignoredOptionsKeys = [
  'crosshairMarkerVisible',
  'minLength',
  'visible',
  'priceScaleId',
  'priceFormat'
]

import ToggableSection from '@/components/framework/ToggableSection.vue'
import IndicatorOption from '@/components/chart/IndicatorOption.vue'
import DropdownButton from '@/components/framework/DropdownButton.vue'
import Editor from '@/components/framework/Editor.vue'
import { Preset } from '@/types/types'
export default {
  components: {
    IndicatorOption,
    Tabs,
    Tab,
    DropdownButton,
    ToggableSection,
    Editor
  },
  props: ['paneId', 'indicatorId'],
  mixins: [DialogMixin],
  data: () => ({
    code: '',
    editorFontSize: 14,
    plotTypes: [],
    optionsQuery: '',
    tab: 'options',
    defaultOptionsKeys: [],
    scriptOptionsKeys: [],
    colorOptionsKeys: [],
    dropdownIndicatorTrigger: null,
    helps: {
      priceScaleId: `Use <u>right</u> for binding indicator to main price scale. Otherwise use it as an id to align multiple indicator on same scale (as overlay)`,
      lastValueVisible: `Show last value on right axis`,
      priceLineVisible: `Show horizontal line at current value`,
      borderVisible: `Only for candlestick series, enable borders of candles`,
      lineWidth: `Only for line and area series`,
      lineStyle: `Only for line and area series`,
      lineType: `Only for line and area series`
    }
  }),
  computed: {
    indicator() {
      return this.$store.state[this.paneId].indicators[this.indicatorId]
    },
    displayName() {
      return this.indicator.displayName
    },
    displayId() {
      if (this.indicatorId.length <= 16) {
        return this.indicatorId
      } else {
        return this.indicatorId.slice(0, 6) + '..' + this.indicatorId.substr(-6)
      }
    },
    presetPlaceholder() {
      return `${this.indicator.name.replace(/\{.*\}/, '').trim()} preset`
    },
    description() {
      return this.indicator.description
    },
    unsavedChanges() {
      return this.indicator.unsavedChanges
    },
    error() {
      return this.$store.state[this.paneId].indicatorsErrors[this.indicatorId]
    },
    name() {
      return this.indicator.displayName || this.indicator.name
    },
    script() {
      return this.indicator.script
    },
    precision() {
      if (
        !this.indicator.options.priceFormat ||
        this.indicator.options.priceFormat.auto
      ) {
        return 'auto'
      }

      return typeof this.indicator.options.priceFormat.precision === 'number'
        ? this.indicator.options.priceFormat.precision
        : 2
    },
    priceFormat() {
      return (
        (this.indicator.options.priceFormat &&
          this.indicator.options.priceFormat.type) ||
        'price'
      )
    },
    availableScales() {
      return getChartScales(
        this.$store.state[this.paneId].indicators,
        this.indicatorId
      )
    },
    queryOptionsKeys() {
      if (!this.optionsQuery.length) {
        return []
      }

      const query = new RegExp(this.optionsQuery, 'i')

      // script + default + colors
      return [
        ...this.scriptOptionsKeys,
        ...this.defaultOptionsKeys,
        ...this.colorOptionsKeys
      ].filter(key => query.test(key))
    },
    lastPreset: {
      get() {
        if (this.indicator.lastPreset) {
          return this.indicator.lastPreset
        }

        return 'Presets'
      },
      set(preset: Preset) {
        this.indicator.lastPreset = (preset && preset.name) || null
      }
    }
  },
  watch: {
    script: {
      handler(value) {
        this.code = value
      },
      immediate: true
    },
    async tab() {
      await this.$nextTick()

      this.resizeEditor()
    }
  },
  created() {
    this.restoreNavigation()

    this.$nextTick(() => {
      this.getPlotTypes()
      this.getOptionsKeys()
    })

    this.originalIndicator = JSON.parse(JSON.stringify(this.indicator))
  },
  beforeDestroy() {
    this.saveNavigation()
  },
  methods: {
    restoreNavigation() {
      const navigationState = this.$store.state.app.indicatorDialogNavigation

      if (navigationState) {
        this.tab = navigationState.tab || 'options'
        this.optionsQuery = navigationState.optionsQuery
        this.editorFontSize =
          navigationState.fontSizePx || (window.devicePixelRatio > 1 ? 12 : 14)
      }
    },
    saveNavigation() {
      this.$store.commit('app/SET_INDICATOR_DIALOG_NAVIGATION', {
        tab: this.tab,
        optionsQuery: this.optionsQuery,
        fontSizePx: this.editorFontSize
      })
    },
    setPriceScale(id) {
      this.$store.dispatch(this.paneId + '/setIndicatorOption', {
        id: this.indicatorId,
        key: 'priceScaleId',
        value: id
      })
    },
    updateScript(script) {
      script = script.trim()
      this.$store.commit(this.paneId + '/SET_INDICATOR_SCRIPT', {
        id: this.indicatorId,
        value: script
      })

      this.getPlotTypes()
      this.getOptionsKeys()
    },
    getScriptOptions(script) {
      const keys = Object.keys(this.indicator.optionsDefinitions || {})
      const reg =
        /options\.([a-zA-Z0-9_]+)|[\s\n]*(\w[\d\w]+)[\s\n]*=[\s\n]*option\(/g

      let match

      do {
        if (
          (match = reg.exec(script)) &&
          match[1] &&
          keys.indexOf(match[1]) === -1
        ) {
          keys.push(match[1])
        }
      } while (match)

      return keys
    },
    getPlotTypes() {
      const availableTypes = Object.keys(defaultPlotsOptions).map(a =>
        a.replace(/[^\w]/g, '')
      )

      this.plotTypes = (
        this.script.match(
          new RegExp(
            `(?:\\n|\\s|^)(?:plot)?(${availableTypes.join('|')})\\(`,
            'g'
          )
        ) || []
      )
        .map(a => {
          const justType = a.replace(/[^\w]/g, '').replace(/^plot/, '')

          return plotTypesMap[justType] || justType
        })
        .filter(
          (t, index, self) =>
            self.indexOf(t) === index && defaultPlotsOptions[t]
        )
    },
    async removeIndicator() {
      await this.close()

      this.$store.dispatch(this.paneId + '/removeIndicator', {
        id: this.indicatorId
      })
    },
    async resizeIndicator() {
      await this.close()

      this.$store.commit(this.paneId + '/TOGGLE_LAYOUTING', this.indicatorId)
    },
    async renameIndicator() {
      const name = await dialogService.prompt({
        action: 'Rename',
        input: this.$store.state[this.paneId].indicators[this.indicatorId].name
      })

      if (typeof name === 'string' && name !== this.name) {
        await this.close()
        await this.$store.dispatch(this.paneId + '/renameIndicator', {
          id: this.indicatorId,
          name
        })
      }
    },
    async editDescription() {
      const description = await dialogService.prompt({
        action: 'Description',
        input: this.description
      })

      if (typeof description === 'string' && description !== this.description) {
        await this.$store.commit(this.paneId + '/UPDATE_DESCRIPTION', {
          id: this.indicatorId,
          description
        })
      }
    },
    async downloadIndicator() {
      this.$store.dispatch(this.paneId + '/downloadIndicator', this.indicatorId)
    },
    async duplicateIndicator() {
      this.$store.dispatch(
        this.paneId + '/duplicateIndicator',
        this.indicatorId
      )

      await this.close()

      dialogService.openIndicator(this.paneId, this.indicatorId)
    },
    async saveIndicator() {
      this.$store.dispatch(this.paneId + '/saveIndicator', this.indicatorId)
    },
    async undoIndicator() {
      if (!(await dialogService.confirm('Undo changes ?'))) {
        return
      }

      this.$store.dispatch(this.paneId + '/undoIndicator', this.indicatorId)
    },
    async getIndicatorPreset(originalPreset: Preset) {
      const optionsKeys = [
        ...this.colorOptionsKeys,
        ...this.scriptOptionsKeys,
        ...this.defaultOptionsKeys
      ]
      const payload = await dialogService.openAsPromise(IndicatorPresetDialog, {
        keys: optionsKeys,
        plotTypes: this.plotTypes,
        originalKeys: originalPreset && Object.keys(originalPreset.data.options)
      })

      if (payload) {
        if (
          typeof Object.values(payload.selection).find(a => !!a) ===
            'undefined' &&
          !payload.script
        ) {
          this.$store.dispatch('app/showNotice', {
            title: 'You did not select anything to save in the preset !',
            type: 'error'
          })
          return
        }

        const indicatorPreset: any = {
          options: {}
        }

        for (const key of optionsKeys) {
          if (!payload.selection[key]) {
            continue
          }
          indicatorPreset.options[key] = getIndicatorOptionValue(
            this.paneId,
            this.indicatorId,
            key,
            this.plotTypes
          )
        }

        if (payload.script) {
          indicatorPreset.script = this.script
        }

        return indicatorPreset
      }
    },
    getOptionsKeys() {
      // retrieve all options keys more or less linked to that indicator
      const scriptOptionsKeys = this.getScriptOptions(this.script)
      const defaultOptionsKeys = Object.keys(defaultSerieOptions)
      const defaultSeriesOptionsKeys = this.plotTypes.reduce(
        (typesKeys, key) => [
          ...typesKeys,
          ...Object.keys(defaultPlotsOptions[key] || {})
        ],
        []
      )

      // merge / clean duplicates
      const allKeys = [
        ...defaultOptionsKeys,
        ...defaultSeriesOptionsKeys,
        ...scriptOptionsKeys
      ]
        .filter((x, i, a) => {
          if (ignoredOptionsKeys.indexOf(x) === -1 && a.indexOf(x) == i) {
            return true
          }
          return false
        })
        .sort((a, b) => {
          if (a > b) {
            return 1
          } else if (a < b) {
            return -1
          }

          return 0
        })

      const colorKeys = []
      const nonColorScriptKeys = []
      const otherKeys = []

      // order by type / origin
      for (let i = 0; i < allKeys.length; i++) {
        const key = allKeys[i]
        if (
          getIndicatorOptionType(
            key,
            this.plotTypes,
            false,
            this.indicator.options[key]
          ) === 'color'
        ) {
          colorKeys.push(allKeys.shift())
        } else if (scriptOptionsKeys.indexOf(key) !== -1) {
          nonColorScriptKeys.push(allKeys.shift())
        } else {
          otherKeys.push(allKeys.shift())
        }
        i--
      }

      this.scriptOptionsKeys = nonColorScriptKeys
      this.defaultOptionsKeys = otherKeys
      this.colorOptionsKeys = colorKeys
    },
    applyIndicatorPreset(preset?: Preset & { name: string }) {
      const data = preset ? preset.data : null

      const indicator =
        this.$store.state[this.paneId].indicators[this.indicatorId]

      this.lastPreset = preset

      if (data) {
        merge(indicator, data)
      } else {
        // script + default + colors
        const keys = this.scriptOptionsKeys.concat(
          this.defaultOptionsKeys,
          this.colorOptionsKeys
        )

        for (const key of keys) {
          const defaultValue = this.getDefaultValue(key)

          if (typeof defaultValue !== 'undefined') {
            indicator.options[key] = defaultValue
          }
        }
      }

      this.otherOptionsKeys = this.colorOptionsKeys = []

      this.$nextTick(() => {
        this.$store.commit(this.paneId + '/SET_INDICATOR_SCRIPT', {
          id: this.indicatorId
        })

        this.getPlotTypes()
        this.getOptionsKeys()

        this.$store.commit(
          this.paneId + '/FLAG_INDICATOR_AS_UNSAVED',
          this.indicatorId
        )
      })
    },
    async toggleIndicatorAsDefault() {
      if (
        this.unsavedChanges &&
        !(await dialogService.confirm(
          'Indicator has unsaved changes, save it and turn ' +
            (this.indicator.enabled ? 'off' : 'on') +
            ' default ?'
        ))
      ) {
        return
      }

      this.indicator.enabled = !this.indicator.enabled

      return this.saveIndicator()
    },
    updateEditorFontSize(change) {
      this.editorFontSize += change
    },
    setPriceFormat(type, precisionInput) {
      let auto = false

      let precision = Math.round(precisionInput)

      if (precisionInput === '' || isNaN(precision)) {
        auto = true
        precision = 2
      }

      this.$store.dispatch(this.paneId + '/setIndicatorOption', {
        id: this.indicatorId,
        key: 'priceFormat',
        value: {
          type,
          precision: precision,
          minMove: 1 / Math.pow(10, precision),
          auto
        }
      })
    },
    copyIndicatorId() {
      copyTextToClipboard(this.indicatorId)

      this.$store.dispatch('app/showNotice', {
        title: `Copied indicator id to clipboard`
      })
    },
    toggleIndicatorDropdown(event) {
      if (this.dropdownIndicatorTrigger) {
        this.dropdownIndicatorTrigger = null
      } else {
        this.dropdownIndicatorTrigger = event.currentTarget
      }
    },
    setIndicatorOption({ key, value }) {
      this.$store.dispatch(this.paneId + '/setIndicatorOption', {
        id: this.indicatorId,
        key: key,
        value
      })
    },
    resizeEditor() {
      if (this.$refs.editor) {
        this.$refs.editor.resize()
      }
    },
    revertChanges() {
      this.applyIndicatorPreset({
        data: this.originalIndicator
      })
    }
  }
}
</script>
<style lang="scss" scoped>
hr.-vertical {
  margin: 0;
}

.indicator-dialog {
  ::v-deep .dialog__content {
    width: 755px;

    .dialog__body {
      padding: 0;
      flex-direction: row;
      align-items: stretch;
    }

    .dialog__header {
      border-bottom: 0 !important;
      padding-bottom: 0;
    }

    .dialog__header,
    .dialog__subheader {
      background-color: var(--theme-base-o25);
    }
  }

  &__title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  &__action {
    .dialog--small & span {
      display: none;
    }
  }

  &__id {
    display: none;
    max-width: 5rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    @media screen and (min-width: 768px) {
      display: block;
    }

    .dialog--small & {
      display: none;
    }
  }
}

.indicator-search {
  backdrop-filter: blur(0.25rem);
  background-color: var(--theme-background-o75);
  position: sticky;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1;

  input {
    border: 0;
    background: 0;
    color: inherit;
    padding: 1rem;
    border-radius: 0;
  }

  &__results {
    padding: 1rem;
  }
}

.indicator-options {
  position: relative;

  &--tab {
    display: block;
    overflow: auto;
    flex-grow: 1;
  }

  &--column {
    width: 15rem;
    flex-shrink: 0;
    flex-direction: column;
    display: none;
    overflow-y: auto;

    .dialog--small & {
      width: 100%;
      display: none;
    }

    @media screen and (min-width: 768px) {
      display: flex;
    }
  }

  &__grid {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: center;
    justify-content: stretch;
    container-type: inline-size;

    .indicator-options__option {
      margin: 0;
      flex-basis: 0;
      min-width: 150px;
      flex-shrink: 0;
      flex-grow: 1;

      @container (min-width: 0px) {
        max-width: none;
        min-width: 0;
        flex-grow: 0;
        flex-basis: 100%;
        width: 100%;
      }

      @container (min-width: 420px) {
        flex-basis: calc(50% - 0.5rem);
        width: calc(50% - 0.5rem);
      }

      @container (min-width: 580px) {
        flex-basis: calc(33% - 0.66rem);
        width: calc(33% - 0.66rem);
      }

      @container (min-width: 768px) {
        flex-basis: calc(25% - 0.75rem);
        width: calc(25% - 0.75rem);
      }
    }
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
}

.indicator-editor {
  display: flex;
  flex-direction: column;
  position: relative;
  flex-grow: 1;
  min-height: 50px;

  &__zoom {
    position: absolute;
    font-size: 1rem;
    z-index: 6;
    pointer-events: none;
    top: 1.5rem;
    right: 1.5rem;

    .btn {
      display: block;
      pointer-events: all;
    }
  }
}
</style>
