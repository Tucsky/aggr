<template>
  <Dialog
    class="indicator-dialog"
    :class="[
      !navigation.columnWidth && 'indicator-dialog--collapsed-column',
      resizingColumn && 'indicator-dialog--resizing-column'
    ]"
    size="wide"
    :mask="false"
    :close-on-escape="false"
    :cover="savedPreview"
    @clickOutside="close"
    @resize="onResize"
    contrasted
  >
    <template #cover>
      <BlobImage :value="savedPreview" class="indicator-dialog__preview" />
    </template>

    <template #header>
      <div class="dialog__title indicator-dialog__title -center mrauto">
        <div @dblclick="renameIndicator">{{ name }}</div>
        <code
          class="indicator-dialog__id -filled"
          @click="copyIndicatorId"
          :title="libraryId"
          v-tippy
        >
          <small>{{ displayId }}</small>
        </code>
      </div>

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
      <tabs :value="navigation.tab" @input="setTab">
        <tab name="script">Script</tab>
        <tab name="options">Options</tab>
      </tabs>

      <IndicatorDropdown
        v-model="dropdownIndicatorTrigger"
        :indicator-id="indicatorId"
        :pane-id="paneId"
      >
        <DropdownButton
          @click.native.stop
          button-class="dropdown-item"
          :options="{
            revert: 'Revert changes',
            reset: 'Reset to default'
          }"
          class="-cases"
          @input="revertChanges"
        >
          <template #selection>
            <i class="icon-eraser"></i> <span>Reset</span>
          </template>
        </DropdownButton>
      </IndicatorDropdown>

      <button
        class="btn -text -arrow indicator-dialog__settings"
        @click="toggleIndicatorDropdown"
      >
        Settings
      </button>
    </template>
    <div
      v-if="loadedEditor"
      v-show="navigation.tab === 'script'"
      class="indicator-editor"
    >
      <p v-if="error" class="form-feedback ml16">
        <i class="icon-warning mr4"></i> {{ error }}
      </p>
      <editor
        ref="editor"
        :value="code"
        :editor-options="navigation.editorOptions"
        @blur="updateScript"
        @options="updateIndicatorOptions"
      />
    </div>
    <div
      v-show="navigation.tab === 'options'"
      class="indicator-options indicator-options--tab hide-scrollbar"
    >
      <ToggableSection
        v-if="scriptOptionsKeys.length"
        :badge="scriptOptionsKeys.length"
        title="Script options"
        id="indicator-left-script"
      >
        <div class="indicator-options__grid">
          <indicator-option
            v-for="key in scriptOptionsKeys"
            :key="key"
            class="indicator-options__option"
            :name="key"
            :pane-id="paneId"
            :indicator-id="indicatorId"
            :plot-types="plotTypes"
            :ensure="ensureOptionValue"
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
        <div class="indicator-options__grid">
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
        <div class="indicator-options__grid">
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
    <div class="indicator-delimiter">
      <div
        class="indicator-delimiter__resizer"
        @mousedown="handleColumnResize"
        @touchstart="handleColumnResize"
      />
      <button
        class="btn indicator-delimiter__collapser -text"
        @click="toggleCollapseColum"
      >
        <i class="icon-up-thin" />
      </button>
    </div>
    <div
      class="indicator-options indicator-options--column hide-scrollbar"
      :style="{ width: navigation.columnWidth + 'px' }"
    >
      <div
        class="indicator-search input-group"
        :class="[navigation.optionsQuery && 'indicator-search--active']"
      >
        <input
          type="text"
          class="form-control"
          placeholder="search option..."
          v-model="navigation.optionsQuery"
        />
        <button
          v-if="navigation.optionsQuery"
          type="button"
          class="btn -text -small"
          @click="navigation.optionsQuery = ''"
        >
          <i class="icon-cross"></i>
        </button>
      </div>
      <div
        v-if="navigation.optionsQuery.length"
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
              :ensure="ensureOptionValue"
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
        :type="'indicator:' + libraryId"
        class="mr8 -left"
        :adapter="getIndicatorPreset"
        :placeholder="presetPlaceholder"
        :label="lastPreset"
        :show-reset="false"
        @apply="applyIndicatorPreset($event)"
      />
    </template>
  </Dialog>
</template>

<script lang="ts">
/* eslint-disable vue/no-unused-components */

import DialogMixin from '../../mixins/dialogMixin'
import Tabs from '@/components/framework/Tabs.vue'
import Tab from '@/components/framework/Tab.vue'
import IndicatorDropdown from '@/components/indicators/IndicatorDropdown.vue'

import {
  defaultPlotsOptions,
  defaultSerieOptions,
  getChartScales,
  getIndicatorOptionType,
  getIndicatorOptionValue,
  plotTypesMap
} from '../chart/options'
import dialogService from '../../services/dialogService'
import merge from 'lodash.merge'
import IndicatorPresetDialog from '../chart/IndicatorPresetDialog.vue'
import { copyTextToClipboard, getEventCords } from '@/utils/helpers'

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
import { Preset } from '@/types/types'
import workspacesService from '@/services/workspacesService'
import BlobImage from '../framework/BlobImage.vue'

export default {
  components: {
    Tabs,
    Tab,
    IndicatorOption,
    DropdownButton,
    ToggableSection,
    BlobImage,
    IndicatorDropdown,
    Editor: () => import('@/components/framework/editor/Editor.vue')
  },
  props: ['paneId', 'indicatorId'],
  mixins: [DialogMixin],
  data() {
    return {
      code: '',
      navigation: {
        optionsQuery: '',
        editorOptions: {},
        columnWidth: 240,
        tab: 'options'
      },
      resizingColumn: false,
      loadedEditor: false,
      savedPreview: null,
      plotTypes: [],
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
      },
      ensureOptionValue: true
    }
  },
  computed: {
    indicator() {
      return this.$store.state[this.paneId].indicators[this.indicatorId]
    },
    libraryId() {
      return this.indicator.libraryId || this.indicatorId
    },
    displayName() {
      return this.indicator.displayName
    },
    displayId() {
      const id = this.libraryId

      if (!id) {
        return 'n/a'
      }

      if (id.length <= 16) {
        return id
      } else {
        return id.slice(0, 6) + '..' + id.substr(-6)
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
      if (!this.navigation.optionsQuery.length) {
        return []
      }

      const query = new RegExp(this.navigation.optionsQuery, 'i')

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
    }
  },
  created() {
    this.restoreNavigation()
    this.getSavedPreview()

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
    async getSavedPreview() {
      const indicator = await workspacesService.getIndicator(this.libraryId)
      this.savedPreview = indicator?.preview
    },
    toggleCollapseColum() {
      if (this.navigation.columnWidth > 50) {
        this.navigation.columnWidth = 0
      } else {
        this.navigation.columnWidth = 240
      }

      this.resizeEditor()
    },
    handleColumnResize(startEvent: MouseEvent | TouchEvent) {
      this.resizingColumn = true

      let refX = getEventCords(startEvent).x

      const moveHandler = moveEvent => {
        const endX = getEventCords(moveEvent).x

        this.navigation.columnWidth += refX - endX
        refX = endX
      }

      const endHandler = endEvent => {
        if (endEvent instanceof MouseEvent) {
          document.removeEventListener('mousemove', moveHandler)
          document.removeEventListener('mouseup', endHandler)
        } else {
          document.removeEventListener('touchmove', moveHandler)
          document.removeEventListener('touchend', endHandler)
        }

        if (this.navigation.columnWidth < 50) {
          this.navigation.columnWidth = 0
        }

        this.resizeEditor()
        this.resizingColumn = false
      }

      if (startEvent instanceof MouseEvent) {
        document.addEventListener('mousemove', moveHandler)
        document.addEventListener('mouseup', endHandler)
      } else {
        document.addEventListener('touchmove', moveHandler)
        document.addEventListener('touchend', endHandler)
      }
    },
    restoreNavigation() {
      const navigationState =
        this.$store.state.settings.indicatorDialogNavigation

      if (navigationState) {
        try {
          const json = JSON.parse(navigationState)
          for (const key in json) {
            this.navigation[key] = json[key]
          }
        } catch (error) {
          console.error('Failed to parse navigation state', error)
        }
      }
    },
    saveNavigation() {
      this.$store.commit(
        'settings/SET_INDICATOR_DIALOG_NAVIGATION',
        this.navigation
      )
    },
    setPriceScale(id) {
      this.$store.dispatch(this.paneId + '/setIndicatorOption', {
        id: this.indicatorId,
        key: 'priceScaleId',
        value: id
      })
    },
    updateScript(script) {
      this.$store.commit(this.paneId + '/SET_INDICATOR_SCRIPT', {
        id: this.indicatorId,
        value: script ? script.trim() : undefined
      })

      this.getPlotTypes()
      this.getOptionsKeys()
    },
    updateIndicatorOptions(options) {
      this.$set(this.navigation, 'editorOptions', options)
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
    async renameIndicator() {
      const name = await dialogService.prompt({
        action: 'Rename',
        input: this.$store.state[this.paneId].indicators[this.indicatorId].name
      })

      if (typeof name === 'string' && name !== this.name) {
        this.$store.dispatch(this.paneId + '/renameIndicator', {
          id: this.indicatorId,
          name
        })
      }
    },
    async saveIndicator() {
      await this.$store.dispatch(
        this.paneId + '/saveIndicator',
        this.indicatorId
      )
      setTimeout(() => {
        this.getSavedPreview()
      }, 500)
    },
    async undoIndicator() {
      if (!(await dialogService.confirm('Undo changes ?'))) {
        return
      }

      this.$store.dispatch(this.paneId + '/undoIndicator', {
        libraryId: this.libraryId,
        indicatorId: this.indicatorId
      })
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
        originalKeys: originalPreset
          ? Object.keys(originalPreset.data.options)
          : this.scriptOptionsKeys
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
      ].filter((x, i, a) => {
        if (ignoredOptionsKeys.indexOf(x) === -1 && a.indexOf(x) == i) {
          return true
        }
        return false
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
    setPriceFormat(type, precisionInput) {
      let auto = false

      let precision = Math.round(precisionInput)

      if (precisionInput === '' || isNaN(precision)) {
        auto = true
        precision = 2
      }

      const priceFormat = {
        type,
        precision: precision,
        minMove: 1 / Math.pow(10, precision),
        auto
      }

      // updates the indicator now
      this.$store.dispatch(this.paneId + '/setIndicatorOption', {
        id: this.indicatorId,
        key: 'priceFormat',
        value: priceFormat
      })

      // persist preference at the priceScale level
      this.$store.commit(this.paneId + '/SET_PRICE_SCALE', {
        id: this.indicator.options.priceScaleId,
        priceScale: {
          ...this.$store.state[this.paneId].priceScales[
            this.indicator.options.priceScaleId
          ],
          priceFormat: {
            type,
            precision: precision,
            minMove: 1 / Math.pow(10, precision),
            auto
          }
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
    onResize() {
      this.resizeEditor()
    },
    async revertChanges(op: 'reset' | 'revert') {
      if (op === 'reset') {
        this.ensureOptionValue = false
        this.indicator.options = {
          priceScaleId: this.indicator.options.priceScaleId
        }
        this.$store.commit(this.paneId + '/SET_INDICATOR_SCRIPT', {
          id: this.indicatorId
        })
      } else if (op === 'revert') {
        this.applyIndicatorPreset({
          data: this.originalIndicator
        })
      }

      this.scriptOptionsKeys =
        this.defaultOptionsKeys =
        this.colorOptionsKeys =
          []
      await this.$nextTick()
      this.getOptionsKeys()
    },
    async setTab(value) {
      this.navigation.tab = value

      if (this.navigation.tab === 'script') {
        this.loadedEditor = true
      }

      await this.$nextTick()

      this.resizeEditor()
      this.saveNavigation()
    }
  }
}
</script>
<style lang="scss" scoped>
.indicator-dialog {
  &--resizing-column {
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;

    .indicator-editor {
      overflow: hidden;
    }
  }

  &__settings {
    position: absolute;
    right: 0.25rem;
    top: 0.25rem;
    bottom: 0.5rem;
    padding: 0.5rem;
  }

  &__preview {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    overflow: hidden;
    border-radius: 1rem 1rem 0 0;
    filter: blur(0.25rem);
    object-fit: cover;
  }

  ::v-deep .dialog__content {
    width: 755px;
    overflow: visible;

    .dialog__body {
      padding: 0;
      flex-direction: row;
      align-items: stretch;
      overflow: visible;
    }
  }

  &__title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    text-overflow: ellipsis;
    overflow: hidden;
  }

  &__action {
    .dialog--small & span,
    .dialog--medium & span {
      display: none;
    }
  }

  &__id {
    display: none;
    max-width: 5rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin: 0;

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

.indicator-delimiter {
  position: relative;

  &__resizer {
    position: relative;
    z-index: 2;
    overflow: visible;
    height: 100%;
    width: 1px;
    background-color: var(--theme-background-150);

    .indicator-dialog--collapsed-column & {
      width: 0px;
    }

    &:before {
      content: '';
      position: absolute;
      top: 0;
      bottom: 0;
      cursor: ew-resize;
      left: -0.25rem;
      right: -0.25rem;
    }
  }

  &__collapser {
    border: 1px solid var(--theme-background-300);
    border-radius: 0.25rem;
    padding: 0.25rem 0.125rem;
    position: absolute;
    z-index: 10;
    right: -0.5rem;
    top: 0.75rem;
    font-size: 0.75rem;
    transition: right 0.2s cubic-bezier(0, 1.4, 1, 1);
    z-index: 20;
    display: none;
    height: 2rem;

    &.btn {
      background-color: var(--theme-background-150);
    }

    .dialog--small & {
      display: none;
    }

    @media screen and (min-width: 768px) {
      display: inline-flex;
    }

    i {
      transform: rotateZ(90deg);
      transition: transform 0.2s cubic-bezier(0, 1.4, 1, 1);
      display: block;

      .indicator-dialog--collapsed-column & {
        transform: rotateZ(-90deg);
      }
    }

    .indicator-dialog--collapsed-column & {
      right: -4px;
    }
  }
}

.indicator-editor {
  display: flex;
  flex-direction: column;
  position: relative;
  flex-grow: 1;
  min-height: 50px;
}
</style>
