<template>
  <Dialog
    @clickOutside="close"
    class="indicator-dialog -auto -sticky-footer -mobile-fs"
    :mask="false"
  >
    <template v-slot:header>
      <div>
        <div class="title">
          <div @dblclick="renameIndicator">{{ name }}</div>
        </div>
        <div
          v-if="description"
          class="subtitle pl0"
          v-text="description"
          @dblclick="editDescription"
        ></div>
        <code
          v-else
          class="subtitle -filled"
          @click="copyIndicatorId"
          v-text="indicatorId"
          @dblclick="editDescription"
        ></code>
      </div>

      <a
        href="https://github.com/Tucsky/aggr/wiki/introduction-to-scripting"
        target="_blank"
        title="Scripting documentation"
        v-tippy
        class="btn -text -white mlauto -center -no-grab"
        ><i class="icon-info"></i><span class="ml8">Wiki</span></a
      >

      <button
        v-if="unsavedChanges"
        title="Rollback changes"
        v-tippy
        class="btn ml8 -text -no-grab"
        @click="undoIndicator"
      >
        <i class="icon-trash"></i><span class="ml8">Discard</span>
      </button>

      <button
        title="Save changes"
        v-tippy
        class="btn ml8 -no-grab"
        :class="[!unsavedChanges && '-text', unsavedChanges && '-green']"
        @click="saveIndicator"
      >
        <i class="icon-save"></i><span class="ml8">Save</span>
      </button>
    </template>
    <p v-if="error" class="form-feedback ml16">
      <i class="icon-warning mr4"></i> {{ error }}
    </p>
    <div class="d-flex indicator-dialog__wrapper" ref="containerElement">
      <tabs class="indicator-tabs" v-model="tab" ref="tabsComponent">
        <tab
          name="Script"
          class="d-flex p-relative editor"
          :style="{ fontSize: fontSize + 'em' }"
        >
          <prism-editor
            class="editor__prism hide-scrollbar"
            :value="code"
            :highlight="highlighter"
            ref="editor"
            @blur="updateScript($event.target.value)"
          ></prism-editor>
          <code-minimap ref="editorMinimap" class="editor__minimap" />
          <div class="editor__zoom">
            <div class="btn -text -small" @click="scaleEditor(1.1)">
              <i class="icon-plus"></i>
            </div>
            <div class="btn -text -small" @click="scaleEditor(0.9)">
              <i class="icon-minus"></i>
            </div>
          </div>
          <i
            class="icon-up-thin editor__resize"
            @mousedown="handleResize"
            @touchstart="handleResize"
          ></i>
        </tab>
        <tab
          name="Options"
          class="indicator-options indicator-options--tab hide-scrollbar"
        >
          <section class="section" v-if="scriptOptionsKeys.length">
            <div
              v-if="sections.indexOf('scriptOptions') > -1"
              class="section__content"
            >
              <indicator-option
                v-for="key in scriptOptionsKeys"
                :key="key"
                :name="key"
                :pane-id="paneId"
                :indicator-id="indicatorId"
                :plot-types="plotTypes"
                class="indicator-options__option"
              />
            </div>
            <div
              class="section__title"
              @click="toggleSection('scriptOptions', $event)"
            >
              Script options <i class="icon-up-thin"></i>
            </div>
          </section>
          <section class="section" v-if="colorOptionsKeys.length">
            <div
              v-if="sections.indexOf('colors') > -1"
              class="section__content"
            >
              <indicator-option
                v-for="key in colorOptionsKeys"
                :key="key"
                :name="key"
                :pane-id="paneId"
                :indicator-id="indicatorId"
                :plot-types="plotTypes"
                class="indicator-options__option"
              />
            </div>
            <div
              class="section__title"
              @click="toggleSection('colors', $event)"
            >
              Colors <i class="icon-up-thin"></i>
            </div>
          </section>
          <section class="section">
            <div
              v-if="sections.indexOf('defaultOptions') > -1"
              class="section__content"
            >
              <indicator-option
                v-for="key in defaultOptionsKeys"
                :key="key"
                :name="key"
                :pane-id="paneId"
                :indicator-id="indicatorId"
                :plot-types="plotTypes"
                class="indicator-options__option"
              />
            </div>
            <div
              class="section__title"
              @click="toggleSection('defaultOptions', $event)"
            >
              Other options <i class="icon-up-thin"></i>
            </div>
          </section>
        </tab>
      </tabs>
      <hr class="-vertical" />
      <div class="indicator-options">
        <section class="indicator-options__search section">
          <div>
            <div class="input-group">
              <input
                type="text"
                class="form-control"
                placeholder="search..."
                v-model="optionsQuery"
              />
              <button
                type="button"
                class="btn -text -small"
                @click="optionsQuery = ''"
              >
                <i class="icon-cross"></i>
              </button>
            </div>
            <indicator-option
              v-for="key in queryOptionsKeys"
              :key="key"
              :name="key"
              :pane-id="paneId"
              :indicator-id="indicatorId"
              :plot-types="plotTypes"
            />
          </div>
        </section>
        <div
          v-if="!optionsQuery.length"
          class="indicator-options__options-scroller hide-scrollbar"
        >
          <section v-if="colorOptionsKeys.length" class="section">
            <div
              v-if="sections.indexOf('colors') > -1"
              class="section__content"
            >
              <indicator-option
                v-for="key in colorOptionsKeys"
                :key="key"
                :name="key"
                :pane-id="paneId"
                :indicator-id="indicatorId"
                :plot-types="plotTypes"
              />
            </div>
            <div
              class="section__title"
              @click="toggleSection('colors', $event)"
            >
              Colors <i class="icon-up-thin"></i>
            </div>
          </section>

          <section class="section" v-if="scriptOptionsKeys.length">
            <div
              v-if="sections.indexOf('scriptOptions') > -1"
              class="section__content"
            >
              <indicator-option
                v-for="key in scriptOptionsKeys"
                :key="key"
                :name="key"
                :pane-id="paneId"
                :indicator-id="indicatorId"
                :plot-types="plotTypes"
              />
            </div>
            <div
              class="section__title"
              @click="toggleSection('scriptOptions', $event)"
            >
              Script <i class="icon-up-thin"></i>
            </div>
          </section>

          <section class="section">
            <div
              v-if="sections.indexOf('defaultOptions') > -1"
              class="section__content"
            >
              <indicator-option
                v-for="key in defaultOptionsKeys"
                :key="key"
                :name="key"
                :pane-id="paneId"
                :indicator-id="indicatorId"
                :plot-types="plotTypes"
              />
            </div>
            <div
              class="section__title"
              @click="toggleSection('defaultOptions', $event)"
            >
              Other <i class="icon-up-thin"></i>
            </div>
          </section>

          <section class="section">
            <div
              v-if="sections.indexOf('position') > -1"
              class="section__content"
            >
              <div class="form-group">
                <label
                  >Scale with
                  <i class="icon-info" v-tippy :title="helps.priceScaleId"></i
                ></label>
                <dropdown-button
                  v-model="indicator.options.priceScaleId"
                  :options="availableScales"
                  placeholder="Default scale"
                  class="-outline form-control -arrow w-100"
                  @input="setPriceScale($event)"
                ></dropdown-button>
              </div>
            </div>
            <div
              class="section__title"
              @click="toggleSection('position', $event)"
            >
              Position in chart <i class="icon-up-thin"></i>
            </div>
          </section>
          <section class="section">
            <div
              v-if="sections.indexOf('format') > -1"
              class="section__content"
            >
              <div class="d-flex mb4">
                <small class="mrauto">Format</small>
                <small>Precision</small>
              </div>
              <div class="d-flex">
                <dropdown-button
                  :value="priceFormat"
                  :options="['price', 'volume']"
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
            </div>

            <div
              class="section__title"
              @click="toggleSection('format', $event)"
            >
              Price format <i class="icon-up-thin"></i>
            </div>
          </section>
        </div>
      </div>
    </div>

    <footer>
      <presets
        :type="'indicator:' + indicatorId"
        class="mr8 -left"
        :adapter="getIndicatorPreset"
        @apply="applyIndicatorPreset($event)"
        label="Presets"
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
          </label>
        </div>
        <button type="button" class="dropdown-item" @click="resizeIndicator">
          <i class="icon-resize-height"></i> Resize
        </button>
        <button type="button" class="dropdown-item" @click="downloadIndicator">
          <i class="icon-download"></i> Download
        </button>
        <button type="button" class="dropdown-item" @click="duplicateIndicator">
          <i class="icon-copy-paste"></i> Duplicate
        </button>
        <div class="dropdown-divider"></div>
        <button type="button" class="dropdown-item" @click="removeIndicator">
          <i class="icon-cross"></i> Unload
        </button>
      </dropdown>
    </footer>
  </Dialog>
</template>

<script lang="ts">
import { PrismEditor } from 'vue-prism-editor'
import DialogMixin from '../../mixins/dialogMixin'
import Tabs from '@/components/framework/Tabs.vue'
import Tab from '@/components/framework/Tab.vue'
import {
  defaultPlotsOptions,
  defaultSerieOptions,
  getIndicatorOptionValue,
  plotTypesMap
} from './options'
import dialogService from '../../services/dialogService'
import merge from 'lodash.merge'
import IndicatorPresetDialog from './IndicatorPresetDialog.vue'
import { copyTextToClipboard, getEventCords } from '@/utils/helpers'
import CodeMinimap from '../framework/CodeMinimap.vue'

const ignoredOptionsKeys = [
  'crosshairMarkerVisible',
  'minLength',
  'visible',
  'priceScaleId',
  'priceFormat'
]

import { highlight, languages } from 'prismjs/components/prism-core'
import 'prismjs/components/prism-clike'
import 'prismjs/components/prism-javascript'
import IndicatorOption from '@/components/chart/IndicatorOption.vue'
import { IndicatorSettings } from '@/store/panesSettings/chart'
import DropdownButton from '@/components/framework/DropdownButton.vue'

export default {
  components: {
    CodeMinimap,
    PrismEditor,
    IndicatorOption,
    Tabs,
    Tab,
    DropdownButton
  },
  props: ['paneId', 'indicatorId'],
  mixins: [DialogMixin],
  data: () => ({
    code: '',
    plotTypes: [],
    sections: ['position', 'colors'],
    optionsQuery: '',
    fontSize: 1,
    tab: 0,
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
      return this.indicator.options.priceFormat
        ? this.indicator.options.priceFormat.type
        : 'price'
    },
    availableScales() {
      return Object.values(
        this.$store.state[this.paneId].indicators as IndicatorSettings
      ).reduce(
        (scales, indicator) => {
          if (
            indicator.id !== this.indicatorId &&
            indicator.options &&
            indicator.options.priceScaleId &&
            !scales[indicator.options.priceScaleId]
          ) {
            scales[indicator.options.priceScaleId] =
              indicator.name || indicator.id
          }

          return scales
        },
        {
          [this.indicatorId]: 'Own scale',
          right: 'Right scale (main)'
        }
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
    this.restoreNavigationState()

    this.$nextTick(() => {
      this.getPlotTypes()
      this.getOptionsKeys()
    })
  },
  beforeDestroy() {
    this.saveNavigationState()
  },
  methods: {
    restoreNavigationState() {
      if (this.indicator.navigationState) {
        this.sections = this.indicator.navigationState.sections.slice()
        this.tab = this.indicator.navigationState.tab
        this.optionsQuery = this.indicator.navigationState.optionsQuery
        this.fontSize = this.indicator.navigationState.fontSize
      }
    },
    saveNavigationState() {
      this.$store.dispatch(this.paneId + '/setIndicatorNavigationState', {
        id: this.indicatorId,
        navigationState: {
          sections: this.sections,
          tab: this.tab,
          optionsQuery: this.optionsQuery,
          fontSize: this.fontSize
        }
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
      const keys = []
      const reg = /options\.([a-zA-Z0-9_]+)/g

      let match

      do {
        if ((match = reg.exec(script))) {
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

      if (name && name !== this.name) {
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

      if (description !== null && description !== this.description) {
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

      this.$refs.editorMinimap.updateSize()
    },
    toggleSection(id, event: Event) {
      const index = this.sections.indexOf(id)

      if (index === -1) {
        this.sections.push(id)
      } else {
        this.sections.splice(index, 1)
      }

      this.$nextTick(() => {
        const sectionEl = (event.target as HTMLElement).parentElement

        if (sectionEl && sectionEl.scrollIntoView) {
          sectionEl.scrollIntoView()
        }
      })
    },
    async getIndicatorPreset() {
      const payload = await dialogService.openAsPromise(IndicatorPresetDialog)

      if (payload) {
        if (!payload.colors && !payload.script && !payload.values) {
          this.$store.dispatch('app/showNotice', {
            title: 'You did not select anything to save in the preset !',
            type: 'error'
          })
          return
        }

        const indicatorPreset: any = {
          options: {}
        }

        if (payload.values) {
          // + script + default
          for (const key of this.scriptOptionsKeys) {
            indicatorPreset.options[key] = getIndicatorOptionValue(
              this.paneId,
              this.indicatorId,
              key,
              this.plotTypes
            )
          }
          for (const key of this.defaultOptionsKeys) {
            indicatorPreset.options[key] = getIndicatorOptionValue(
              this.paneId,
              this.indicatorId,
              key,
              this.plotTypes
            )
          }
        }

        if (payload.colors) {
          // + colors
          for (const key of this.colorOptionsKeys) {
            indicatorPreset.options[key] = getIndicatorOptionValue(
              this.paneId,
              this.indicatorId,
              key,
              this.plotTypes
            )
          }
        }

        if (payload.script) {
          indicatorPreset.script = this.script
        }

        return indicatorPreset
      }
    },
    getOptionsKeys() {
      const defaultOptionsKeys = Object.keys(defaultSerieOptions)
      const defaultSeriesOptionsKeys = this.plotTypes.reduce(
        (typesKeys, key) => [
          ...typesKeys,
          ...Object.keys(defaultPlotsOptions[key] || {})
        ],
        []
      )
      const scriptOptionsKeys = this.getScriptOptions(this.script)

      const customOptionsKeys = [
        ...defaultOptionsKeys,
        ...defaultSeriesOptionsKeys,
        ...scriptOptionsKeys
      ].filter((x, i, a) => {
        return ignoredOptionsKeys.indexOf(x) === -1 && a.indexOf(x) == i
      })

      this.scriptOptionsKeys = customOptionsKeys
        .filter(
          key => !/color/i.test(key) && scriptOptionsKeys.indexOf(key) !== -1
        )
        .sort((a, b) => {
          if (a > b) {
            return 1
          } else if (a < b) {
            return -1
          }

          return 0
        })

      this.defaultOptionsKeys = customOptionsKeys
        .filter(
          key => !/color/i.test(key) && scriptOptionsKeys.indexOf(key) === -1
        )
        .sort((a, b) => {
          if (a > b) {
            return 1
          } else if (a < b) {
            return -1
          }

          return 0
        })

      this.colorOptionsKeys = customOptionsKeys.filter(key =>
        /color/i.test(key)
      )
    },
    applyIndicatorPreset(presetData) {
      const indicator = this.$store.state[this.paneId].indicators[
        this.indicatorId
      ]

      if (presetData) {
        merge(indicator, presetData)
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
    highlighter(code) {
      return highlight(code, languages.js, 'js') // languages.<insert language> to return html with markup
    },
    handleResize(event) {
      this._resizeOrigin = getEventCords(event)

      this.$refs.tabsComponent.$el.style.width =
        this.$refs.tabsComponent.$el.clientWidth + 'px'
      this.$refs.containerElement.style.height =
        this.$refs.containerElement.clientHeight + 'px'

      document.addEventListener('mousemove', this.resize)
      document.addEventListener('mouseup', this.release)
      document.addEventListener('touchmove', this.resize)
      document.addEventListener('touchend', this.release)

      document.body.classList.add('-unselectable')
    },
    resize(event) {
      const coordinates = getEventCords(event)

      const editorWidth =
        parseInt(this.$refs.tabsComponent.$el.style.width) +
        (coordinates.x - this._resizeOrigin.x) * 2
      const editorHeight =
        parseInt(this.$refs.containerElement.style.height) +
        (coordinates.y - this._resizeOrigin.y) * 2
      this.$refs.tabsComponent.$el.style.width = editorWidth + 'px'
      this.$refs.containerElement.style.height = editorHeight + 'px'

      this._resizeOrigin = coordinates
    },
    release() {
      document.removeEventListener('mousemove', this.resize)
      document.removeEventListener('mouseup', this.release)
      document.removeEventListener('touchmove', this.resize)
      document.removeEventListener('touchend', this.release)

      document.body.classList.remove('-unselectable')

      this.$refs.editor.setLineNumbersHeight()

      setTimeout(() => {
        this.$refs.editorMinimap.updateSize()
      })
    },
    scaleEditor(change) {
      if (isNaN(this.fontSize)) {
        this.fontSize = 1
      }

      this.fontSize *= change

      setTimeout(() => {
        this.$refs.editorMinimap.updateSize()
      })
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
    }
  }
}
</script>
<style lang="scss" scoped>
.indicator-dialog {
  ::v-deep .dialog-content {
    header {
      border-bottom: 0 !important;
    }
    .dialog-body {
      max-height: 90vh;
    }
  }

  &__wrapper {
    height: 50vh;
    flex-grow: 1;
  }
  .indicator-tabs {
    display: flex;
    flex-direction: column;
    flex-grow: 1;

    @media screen and (min-width: 768px) {
      width: 50vw;
    }

    @media screen and (min-width: 1400px) {
      width: 25vw;
    }

    + hr.-vertical {
      margin: 2.5rem 0 0;
    }
  }

  .indicator-options {
    margin-top: 2.5rem;
    border-top: 1px solid var(--theme-background-200);
    flex-direction: column;
    display: none;

    @media screen and (min-width: 768px) {
      display: flex;
    }

    &__search {
      .input-group + .indicator-option {
        margin-top: 1rem;
      }
    }

    &__options-scroller {
      overflow-y: auto;
    }

    &--tab {
      margin: 0;
      border: 0;
      display: block;
      overflow: auto;

      .section {
        &__content {
          margin: -0.25rem;
        }
      }

      .indicator-options__option {
        width: calc(50% - 1rem);
        display: inline-block;
        margin: 0.5rem;

        @media screen and (min-width: 768px) {
          width: auto;
        }

        .form-control {
          max-width: 100%;
        }
      }
    }
  }
}

.editor {
  position: relative;
  flex-grow: 1;
  min-height: 0;

  &__prism {
    width: 100%;
    height: auto;
    padding: 1rem 2.5rem 1rem 1rem;
    font-size: 0.825em;
  }

  &__minimap {
    flex-basis: 60px;
    max-width: 60px;
    flex-shrink: 0;

    @media screen and (min-width: 1280px) {
      flex-basis: 80px;
      max-width: 80px;
    }

    @media screen and (min-width: 1440px) {
      flex-basis: 100px;
      max-width: 100px;
    }
  }

  &__zoom,
  &__resize {
    position: absolute;
    font-size: 1rem;
    padding: 0.5em;
    right: 0;
    top: 0;
  }

  &__zoom .btn {
    display: block;
  }

  &__resize {
    top: auto;
    bottom: 0;
    cursor: se-resize;

    &:before {
      display: inline-block;
      transform: rotateZ(-225deg) scale(1);
      transition: transform 0.2s;
    }

    &:hover:before {
      transform: translate(5%, 5%) rotateZ(-225deg) scale(1);
    }
  }
}
</style>
