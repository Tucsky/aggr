<template>
  <Dialog @clickOutside="close" class="serie-dialog -auto" :mask="!resizing">
    <template v-slot:header>
      <div>
        <div class="title">
          <div @dblclick="renameIndicator">{{ name }}</div>
        </div>
        <div v-if="description" class="subtitle pl0" v-text="description" @dblclick="editDescription"></div>
        <code v-else class="subtitle -filled" v-text="indicatorId" @dblclick="editDescription"></code>
      </div>

      <div class="column -center"></div>
    </template>
    <div class="d-flex mb16">
      <template v-if="unsavedChanges">
        <button
          v-if="unsavedChanges"
          class="btn -green"
          href="javascript:void(0)"
          @click="$store.dispatch(paneId + '/saveIndicator', indicatorId)"
          v-tippy
          title="Save it to use / sync with other panes"
        >
          <i class="icon-info mr4"></i> Save {{ indicatorId }}
        </button>
        <button class="btn -text" @click="rollbackIndicator"><i class="icon-eraser"></i></button
      ></template>
      <button class="btn -text -white mlauto" @click="showHelp">doc <i class="icon-external-link-square-alt ml4"></i></button>
    </div>
    <div class="d-flex mobile-dir-col-desktop-dir-row">
      <div>
        <div class="form-group mb16">
          <div class="d-flex mb8">
            <label for class="mrauto -center">
              Input
            </label>
          </div>
          <textarea
            ref="behaveInput"
            class="form-control"
            rows="10"
            cols="50"
            :value="script"
            @blur="updateScript($event.target.value)"
            spellcheck="false"
          ></textarea>
          <p v-if="error" class="form-feedback"><i class="icon-warning mr4"></i> {{ error }}</p>
        </div>
        <div v-if="otherOptions.length" class="d-flex -fill" style="max-width: 400px;flex-wrap:wrap;">
          <div v-for="option in otherOptions" :key="option.key" class="form-group mb16 mr16">
            <label v-if="option.label !== false">
              {{ option.label }}
              <i v-if="helps[option.key]" class="icon-info" v-tippy :title="helps[option.key]"></i>
            </label>

            <dropdown
              v-if="option.key === 'lineType'"
              class="-left -center"
              :selected="currentValues[option.key]"
              :options="{ 0: 'Simple', 1: 'with steps' }"
              selectionClass="-outline form-control -arrow"
              placeholder="lineType"
              @output="validate(option, $event)"
            ></dropdown>
            <dropdown
              v-else-if="/linestyle$/i.test(option.key)"
              class="-left -center"
              :selected="currentValues[option.key]"
              :options="{ 0: 'Solid', 1: 'Dotted', 2: 'Dashed', 3: 'LargeDashed', 4: 'SparseDotted' }"
              selectionClass="-outline form-control -arrow"
              placeholder="lineStyle"
              @output="validate(option, $event)"
            ></dropdown>
            <template v-else-if="option.type === 'string' || option.type === 'number'">
              <editable class="form-control" :content="currentValues[option.key]" @output="validate(option, $event)"></editable>
            </template>
            <template v-else-if="option.type === 'boolean'">
              <label class="checkbox-control">
                <input type="checkbox" class="form-control" :checked="currentValues[option.key]" @change="validate(option, $event.target.checked)" />
                <div></div>
              </label>
            </template>
          </div>
        </div>
      </div>
      <hr class="-horizontal" />
      <hr class="-vertical mb8" />
      <div>
        <div class="column">
          <div v-if="colorOptions.length">
            <div v-for="(option, index) in colorOptions" :key="index" class="column form-group -fill mr8 mb8">
              <label v-if="option.label !== false" class="-center  -nowrap mr16">{{ option.label }}</label>
              <verte
                picker="square"
                menuPosition="left"
                :label="option.label"
                model="rgb"
                :value="currentValues[option.key]"
                @input="currentValues[option.key] !== $event && validate(option, $event)"
              ></verte>
            </div>
          </div>
        </div>

        <section class="section">
          <div v-if="sections.indexOf('position') > -1">
            <div class="form-group mb16">
              <label>Scale with <i class="icon-info" v-tippy :title="helps.priceScaleId"></i></label>
              <dropdown
                class="-left -center"
                :selected="currentValues.priceScaleId"
                :options="availableScales"
                placeholder="Default scale"
                selectionClass="-outline form-control -arrow"
                @output="validate('priceScaleId', $event)"
              ></dropdown>
            </div>
          </div>
          <div class="section__title" @click="toggleSection('position')">Position in chart <i class="icon-up"></i></div>
        </section>
        <section v-if="formatOption" class="section">
          <div v-if="sections.indexOf('format') > -1">
            <div class="form-group mb16">
              <label>price format</label>
              <dropdown
                class="-left -center"
                :selected="formatOption.value.type"
                :options="{ price: 'Price', volume: 'Volume', percent: 'Percent' }"
                placeholder="lineType"
                selectionClass="-outline form-control -arrow"
                @output="validate(formatOption, { ...formatOption.value, type: $event })"
              ></dropdown>
            </div>
            <div>
              <div class="form-group mb16">
                <label>precision</label>
                <editable
                  class="form-control"
                  :content="formatOption.value.precision"
                  @output="validate(formatOption, { ...formatOption.value, precision: +$event || 1 })"
                ></editable>
              </div>
              <div class="form-group">
                <label>minMove</label>
                <editable
                  class="form-control"
                  :content="formatOption.value.minMove"
                  step="0.01"
                  @output="validate(formatOption, { ...formatOption.value, minMove: ($event || 0.1).toString() })"
                ></editable>
              </div>
            </div>
          </div>

          <div class="section__title" @click="toggleSection('format')">Price format <i class="icon-up"></i></div>
        </section>
      </div>
    </div>

    <hr />
    <div class="form-group column">
      <presets type="indicator" class="mr8 -left" :adapter="getIndicatorPreset" @apply="applyIndicatorPreset($event)" label="Presets" />
      <button class="btn -red" v-tippy title="Unload indicator" @click="removeIndicator"><i class="icon-cross mr4"></i> Unload</button>
      <button class="btn -text ml8" v-tippy title="Unload indicator" @click="resizeIndicator"><i class="icon-resize-height mr4"></i> Resize</button>
      <button class="btn -text ml8 mrauto" v-tippy title="Duplicate" @click="duplicateIndicator">
        <i class="icon-copy-paste mr4"></i> Make a copy
      </button>
    </div>
  </Dialog>
</template>

<script>
import store from '../../store'
import DialogMixin from '../../mixins/dialogMixin'
import { defaultPlotsOptions, defaultSerieOptions, plotTypesMap } from './chartOptions'
import Behave from 'behave-js'
import IndicatorDialog from './IndicatorDialog.vue'
import SerieHelpDialog from './IndicatorHelpDialog.vue'
import dialogService from '../../services/dialogService'
import merge from 'lodash.merge'
import IndicatorPresetDialog from './IndicatorPresetDialog.vue'

const ignoredOptionsKeys = ['crosshairMarkerVisible', 'minLength', 'visible', 'priceScaleId']

export default {
  props: ['paneId', 'indicatorId'],
  mixins: [DialogMixin],
  data: () => ({
    types: [],
    sections: [],
    editor: null,
    currentValues: {},
    otherOptionsKeys: [],
    colorOptionsKeys: [],
    colorOptions: [],
    otherOptions: [],
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
    displayName: function() {
      return store.state[this.paneId].indicators[this.indicatorId].displayName
    },
    description: function() {
      return store.state[this.paneId].indicators[this.indicatorId].description
    },
    unsavedChanges() {
      return store.state[this.paneId].indicators[this.indicatorId].unsavedChanges
    },
    error: function() {
      return store.state[this.paneId].indicatorsErrors[this.indicatorId]
    },
    name() {
      return store.state[this.paneId].indicators[this.indicatorId].displayName || store.state[this.paneId].indicators[this.indicatorId].name
    },
    script: function() {
      return store.state[this.paneId].indicators[this.indicatorId].script
    },
    formatOption() {
      return {
        key: 'priceFormat',
        label: 'priceFormat',
        value: this.getValue('priceFormat'),
        type: 'position'
      }
    },
    resizing() {
      return store.state[this.paneId].resizingIndicator === this.indicatorId
    },
    availableScales() {
      return Object.values(this.$store.state[this.paneId].indicators).reduce(
        (scales, indicator) => {
          if (indicator.id !== this.indicatorId && indicator.options && indicator.options.priceScaleId && !scales[indicator.options.priceScaleId]) {
            scales[indicator.options.priceScaleId] = indicator.name || indicator.id
          }

          return scales
        },
        {
          [this.indicatorId]: 'Own scale',
          right: 'Right scale (main)'
        }
      )
    }
  },
  created() {
    this.$nextTick(() => {
      this.refreshPlotTypes()
      this.refreshOptions()
    })

    this.getValue('priceScaleId')
  },
  mounted() {
    this.$nextTick(function() {
      this.createScriptEditor()
    })
  },
  beforeDestroy() {
    this.cleanOptions()

    if (this.editor) {
      this.editor.destroy()
    }
  },
  methods: {
    getOptionType(value, key) {
      let type = 'string'

      try {
        value = JSON.parse(value)
      } catch (error) {
        // empty
      }

      if (typeof value === 'boolean' || /^show[A-Z]/.test(key)) {
        type = 'boolean'
      } else if (/^rgba?/.test(value) || /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value)) {
        type = 'color'
      } else if (typeof value === 'number') {
        type = 'number'
      }

      return type
    },
    validate(option, value) {
      const key = typeof option === 'string' ? option : option.key

      store.dispatch(this.paneId + '/setIndicatorOption', {
        id: this.indicatorId,
        key,
        value
      })

      this.currentValues = { ...this.currentValues, [key]: value }
    },
    getDefaultValue(key) {
      let value

      for (const type of this.types) {
        if (typeof defaultPlotsOptions[type][key] !== 'undefined') {
          return defaultPlotsOptions[type][key]
        }
      }

      if (typeof value === 'undefined' && typeof defaultSerieOptions[key] !== 'undefined') {
        return defaultSerieOptions[key]
      }

      if (typeof value === 'undefined' && /length$/i.test(key)) {
        return 14
      }

      if (typeof value === 'undefined' && /color$/i.test(key)) {
        return '#c3a87a'
      }

      if (typeof value === 'undefined' && /width$/i.test(key)) {
        return 1
      }

      return value
    },
    getValue(key) {
      /*if (!store.state[this.paneId].indicators[this.indicatorId]) {
        return null
      }*/

      let preferedValue

      if (typeof store.state[this.paneId].indicators[this.indicatorId].options[key] !== 'undefined') {
        preferedValue = store.state[this.paneId].indicators[this.indicatorId].options[key]
      }

      const defaultValue = this.getDefaultValue(key)
      let finalValue = ''

      if (typeof preferedValue !== 'undefined') {
        if (preferedValue && typeof preferedValue === 'object' && defaultValue && typeof defaultValue === 'object') {
          finalValue = Object.assign({}, defaultValue, preferedValue)
        } else {
          finalValue = preferedValue
        }
      } else if (typeof defaultValue !== 'undefined') {
        finalValue = defaultValue
      }

      this.currentValues[key] = finalValue

      return this.currentValues[key]
    },
    updateScript(newInput) {
      this.refreshPlotTypes()
      this.refreshOptions(newInput)

      this.$store.commit(this.paneId + '/SET_INDICATOR_SCRIPT', { id: this.indicatorId, value: newInput })
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
    removeOption(key) {
      this.$store.commit(this.paneId + '/REMOVE_INDICATOR_OPTION', { id: this.indicatorId, key })

      for (const options of [this.colorOptions, this.otherOptions]) {
        const option = options.find(o => o.key === key)

        if (option) {
          options.splice(options.indexOf(option), 1)
          break
        }
      }
    },
    refreshPlotTypes() {
      this.types = (this.script.match(/plot(\w+)/g) || [])
        .map(t => t.replace(/^plot/, ''))
        .map(t => plotTypesMap[t] || t)
        .filter((t, index, self) => self.indexOf(t) === index && defaultPlotsOptions[t])
    },
    cleanOptions() {
      const defaultSeriesOptionsKeys = Object.keys(defaultSerieOptions)

      for (let i = this.types.length - 1; i >= 0; i--) {
        for (const prop in defaultPlotsOptions[this.types[i]]) {
          defaultSeriesOptionsKeys.push(prop)
        }
      }

      const scriptOptionsKeys = this.getScriptOptions(this.script)

      const mergedOptionsKeys = [...scriptOptionsKeys, ...defaultSeriesOptionsKeys].filter((x, i, a) => {
        return ignoredOptionsKeys.indexOf(x) === -1 && a.indexOf(x) == i
      })

      for (const key of this.otherOptionsKeys) {
        if (mergedOptionsKeys.indexOf(key) === -1) {
          console.warn('[indicator/' + this.indicatorId + '] remove unused option ' + key)
          this.$store.commit(this.paneId + '/REMOVE_INDICATOR_OPTION', { id: this.indicatorId, key })
        }
      }
    },
    refreshOptions(script) {
      const defaultIndicatorOptionsKeys = Object.keys(store.state[this.paneId].indicators[this.indicatorId].options)

      const scriptOptionsKeys = this.getScriptOptions(script || this.script)

      const defaultSeriesOptionsKeys = Object.keys(defaultSerieOptions)

      for (let i = this.types.length - 1; i >= 0; i--) {
        for (const prop in defaultPlotsOptions[this.types[i]]) {
          defaultSeriesOptionsKeys.push(prop)
        }
      }

      const mergedOptionsKeys = [...defaultIndicatorOptionsKeys, ...scriptOptionsKeys, ...defaultSeriesOptionsKeys].filter((x, i, a) => {
        return ignoredOptionsKeys.indexOf(x) === -1 && a.indexOf(x) == i
      })

      const colorOptionsKeys = mergedOptionsKeys.filter(k => /color/i.test(k))
      const otherOptionsKeys = mergedOptionsKeys.filter(k => !/color/i.test(k))

      for (const key of colorOptionsKeys) {
        if (this.colorOptionsKeys.indexOf(key) === -1) {
          const value = this.getValue(key)

          if (value && typeof value === 'object') {
            continue
          }

          this.colorOptions.push({
            key,
            label: key,
            type: this.getOptionType(value, key)
          })

          if (scriptOptionsKeys.indexOf(key) !== -1 && defaultIndicatorOptionsKeys.indexOf(key) === -1) {
            this.validate(this.colorOptions[this.colorOptions.length - 1], value)
          }
        }
      }

      for (const key of otherOptionsKeys) {
        if (this.otherOptionsKeys.indexOf(key) === -1) {
          const value = this.getValue(key)

          if (value && typeof value === 'object') {
            continue
          }

          this.otherOptions.push({
            key,
            label: key,
            type: this.getOptionType(value, key)
          })

          if (scriptOptionsKeys.indexOf(key) !== -1 && defaultIndicatorOptionsKeys.indexOf(key) === -1) {
            this.validate(this.otherOptions[this.otherOptions.length - 1], value)
          }
        }
      }

      this.colorOptionsKeys = colorOptionsKeys
      this.otherOptionsKeys = otherOptionsKeys

      for (let i = 0; i < this.otherOptions.length; i++) {
        if (this.otherOptionsKeys.indexOf(this.otherOptions[i].key) === -1) {
          this.otherOptions.splice(this.otherOptions.indexOf(this.otherOptions[i]), 1)
          i--
        }
      }

      for (let i = 0; i < this.colorOptions.length; i++) {
        if (this.colorOptionsKeys.indexOf(this.colorOptions[i].key) === -1) {
          this.colorOptions.splice(this.colorOptions.indexOf(this.colorOptions[i]), 1)
          i--
        }
      }

      this.otherOptions = this.otherOptions.sort((a, b) => {
        let order = 0

        if (a.key > b.key) {
          order++
        } else if (a.key < b.key) {
          order--
        }

        if (a.type === 'boolean' && a.type !== 'boolean') {
          order += 10
        }

        return order
      })
    },
    async removeIndicator() {
      await this.close()

      store.dispatch(this.paneId + '/removeIndicator', { id: this.indicatorId })
    },
    async resizeIndicator() {
      await this.close()

      store.commit(this.paneId + '/TOGGLE_LAYOUTING', this.indicatorId)
    },
    async renameIndicator() {
      const name = await dialogService.prompt({
        action: 'Rename',
        input: store.state[this.paneId].indicators[this.indicatorId].name
      })

      if (name && name !== this.name) {
        await this.close()
        await store.dispatch(this.paneId + '/renameIndicator', { id: this.indicatorId, name })
      }
    },
    async editDescription() {
      const description = await dialogService.prompt({
        action: 'Description',
        input: this.description
      })

      if (description !== null && description !== this.description) {
        await store.commit(this.paneId + '/UPDATE_DESCRIPTION', { id: this.indicatorId, description })
      }
    },
    async duplicateIndicator() {
      const indicator = merge({}, store.state[this.paneId].indicators[this.indicatorId])

      indicator.id += '-copy'
      indicator.name += ' copy'
      delete indicator.updatedAt
      delete indicator.createdAt
      delete indicator.enabled

      this.$store.dispatch(this.paneId + '/addIndicator', indicator)

      await this.close()

      dialogService.open(
        IndicatorDialog,
        {
          paneId: this.paneId,
          indicatorId: indicator.id
        },
        'serie'
      )
    },
    rollbackIndicator() {
      this.$store.dispatch(this.paneId + '/rollbackIndicator', this.indicatorId)
    },
    toggleSection(id) {
      const index = this.sections.indexOf(id)

      if (index === -1) {
        this.sections.push(id)
      } else {
        this.sections.splice(index, 1)
      }
    },
    showHelp() {
      dialogService.open(SerieHelpDialog)
    },
    createScriptEditor() {
      setTimeout(() => {
        this.editor = new Behave({
          textarea: this.$refs.behaveInput,
          replaceTab: true,
          softTabs: true,
          tabSize: 2,
          autoOpen: true,
          overwrite: true,
          autoStrip: true,
          autoIndent: true,
          fence: false
        })
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

        const indicatorPreset = {
          options: {}
        }

        const ignoreKeys = ['scaleMargins', 'priceFormat', 'visible']

        if (payload.values) {
          for (const key of this.otherOptionsKeys) {
            if (ignoreKeys.indexOf(key) !== -1) {
              continue
            }
            indicatorPreset.options[key] = this.getValue(key)
          }
        }

        if (payload.colors) {
          for (const key of this.colorOptionsKeys) {
            if (ignoreKeys.indexOf(key) !== -1) {
              continue
            }
            indicatorPreset.options[key] = this.getValue(key)
          }
        }

        if (payload.script) {
          indicatorPreset.script = this.script
        }

        return indicatorPreset
      }
    },
    applyIndicatorPreset(presetData) {
      const indicator = this.$store.state[this.paneId].indicators[this.indicatorId]

      if (presetData) {
        merge(indicator, presetData)
      } else {
        const keys = this.otherOptionsKeys.concat(this.colorOptionsKeys)

        for (const key of keys) {
          const defaultValue = this.getDefaultValue(key)

          if (typeof defaultValue !== 'undefined') {
            indicator.options[key] = defaultValue
          }
        }
      }

      this.$store.commit(this.paneId + '/SET_INDICATOR_SCRIPT', { id: this.indicatorId })
    }
  }
}
</script>
