<template>
  <Dialog @clickOutside="close" class="serie-dialog -medium" :mask="!resizing">
    <template v-slot:header>
      <div class="title">
        <div @dblclick="renameIndicator">{{ name }}</div>
        <div v-if="description" class="subtitle pl0" v-text="description" @dblclick="editDescription"></div>
        <code v-else class="subtitle -filled" v-text="indicatorId" @dblclick="editDescription"></code>
      </div>

      <div class="column -center"></div>
    </template>
    <div class="d-flex mb16">
      <button v-if="unsavedChanges" class="btn -text" href="javascript:void(0)" @click="$store.dispatch(paneId + '/saveIndicator', indicatorId)">
        <i class="icon-info mr4"></i> unsaved changes
      </button>
      <button class="btn -text -white mlauto" @click="showHelp">doc <i class="icon-external-link-square-alt ml4"></i></button>
    </div>
    <div class="form-group mb16 mt16">
      <div class="d-flex mb4">
        <label for class="mrauto -center">
          Input
        </label>
      </div>
      <textarea
        ref="behaveInput"
        class="form-control"
        rows="10"
        :value="script"
        @blur="updateScript($event.target.value)"
        spellcheck="false"
      ></textarea>
      <p v-if="error" class="form-feedback"><i class="icon-warning mr4"></i> {{ error }}</p>
    </div>
    <hr />
    <div class="column w-100">
      <div v-if="colorOptions.length">
        <div v-for="(option, index) in colorOptions" :key="index" class="column form-group -fill mr16 mb8">
          <label v-if="option.label !== false" class="-center -fill -nowrap mr16">{{ option.label }}</label>
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
      <div v-if="otherOptions.length" class=" -fill">
        <div v-for="option in otherOptions" :key="option.key" class="form-group mb16">
          <label v-if="option.label !== false">
            {{ option.label }}
            <i v-if="helps[option.key]" class="icon-info" v-tippy :title="helps[option.key]"></i>
          </label>

          <dropdown
            v-if="option.key === 'lineType'"
            class="form-control -left -center"
            :selected="currentValues[option.key]"
            :options="{ 0: 'Simple', 1: 'with steps' }"
            placeholder="lineType"
            @output="validate(option, $event)"
          ></dropdown>
          <dropdown
            v-else-if="/linestyle$/i.test(option.key)"
            class="form-control -left -center"
            :selected="currentValues[option.key]"
            :options="{ 0: 'Solid', 1: 'Dotted', 2: 'Dashed', 3: 'LargeDashed', 4: 'SparseDotted' }"
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

    <section v-if="positionOption" class="section">
      <div v-if="sections.indexOf('position') > -1">
        <div class="column">
          <div class="form-group mb16">
            <label>top <i class="icon-info" v-tippy :title="helps['scaleMargins.top']"></i></label>
            <editable class="form-control" :content="positionOption.value.top" :step="0.01" @output="updateScale('top', $event)"></editable>
          </div>
          <div class="form-group">
            <label>bottom <i class="icon-info" v-tippy :title="helps['scaleMargins.bottom']"></i></label>
            <editable class="form-control" :content="positionOption.value.bottom" :step="0.01" @output="updateScale('bottom', $event)"></editable>
          </div>
        </div>
        <button class="btn -green" @click="$store.dispatch(paneId + '/resizeIndicator', indicatorId)">
          <i class="icon-resize-height mr4"></i> Resize on chart
        </button>
      </div>
      <div class="section__title" @click="toggleSection('position')">Position in chart <i class="icon-up"></i></div>
    </section>
    <section v-if="formatOption" class="section">
      <div v-if="sections.indexOf('format') > -1">
        <div class="form-group mb16">
          <label>price format</label>
          <dropdown
            class="form-control -left -center"
            :selected="formatOption.value.type"
            :options="{ price: 'Price', volume: 'Volume', percent: 'Percent' }"
            placeholder="lineType"
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
    <hr />
    <div class="form-group column">
      <button class="btn -blue mr16 mlauto" v-tippy title="Duplicate" @click="duplicateIndicator">
        <i class="icon-copy-paste"></i>
      </button>
      <button class="btn -red" v-tippy title="Unload indicator" @click="removeIndicator">
        <i class="icon-cross"></i>
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
import workspacesService from '../../services/workspacesService'
import merge from 'lodash.merge'

const ignoredOptionsKeys = ['crosshairMarkerVisible', 'minLength', 'visible']

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
      lineType: `Only for line and area series`,
      'scaleMargins.top': `Top margin (0 = stick at top)`,
      'scaleMargins.bottom': `Bottom margin (0 = stick to bottom)`
    }
  }),
  computed: {
    indicatorSettings: function() {
      return store.state[this.paneId].indicators[this.indicatorId]
    },
    displayName: function() {
      return this.indicatorSettings.displayName
    },
    description: function() {
      return this.indicatorSettings.description
    },
    unsavedChanges() {
      return this.indicatorSettings.unsavedChanges
    },
    error: function() {
      return store.state[this.paneId].indicatorsErrors[this.indicatorId]
    },
    name() {
      return this.indicatorSettings.displayName || this.indicatorSettings.name
    },
    script: function() {
      return this.indicatorSettings.script
    },
    positionOption() {
      return {
        key: 'scaleMargins',
        label: 'scaleMargins',
        value: this.getValue('scaleMargins'),
        type: 'position'
      }
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
    }
  },
  created() {
    this.$nextTick(() => {
      this.refreshPlotTypes()
      this.refreshOptions()
    })
  },
  mounted() {
    this.$nextTick(function() {
      this.createScriptEditor()
    })
  },
  beforeDestroy() {
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

      if (key === 'type') {
        type = 'type'
      } else if (typeof value === 'number') {
        type = 'number'
      } else if (typeof value === 'boolean') {
        type = 'boolean'
      } else if (/^rgba?/.test(value) || /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value)) {
        type = 'color'
      } else if (key === 'scaleMargins') {
        type = 'position'
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

      if (typeof value === 'undefined' && key === 'scaleMargins') {
        return {
          top: 0.1,
          bottom: 0.2
        }
      }

      return value
    },
    getValue(key) {
      if (!this.indicatorSettings) {
        return null
      }

      let preferedValue

      if (typeof this.indicatorSettings.options[key] !== 'undefined') {
        preferedValue = this.indicatorSettings.options[key]
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
    updateScale(side, value) {
      const option = this.positionOption

      const scale = {
        top: option.value.top,
        bottom: option.value.bottom
      }

      scale[side] = +value || 0

      if (scale.top + scale.bottom > 1) {
        scale[side] = 1 - scale[side === 'top' ? 'bottom' : 'top']
      }

      this.validate(option, scale)
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
    refreshOptions(script) {
      const defaultIndicatorOptionsKeys = Object.keys(this.indicatorSettings.options)

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
    },
    async removeIndicator() {
      await this.close()

      store.dispatch(this.paneId + '/removeIndicator', { id: this.indicatorId })
    },
    async renameIndicator() {
      const name = await dialogService.prompt({
        action: 'Rename',
        input: this.indicatorSettings.name
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

      if (description !== this.description) {
        await store.commit(this.paneId + '/UPDATE_DESCRIPTION', { id: this.indicatorId, description })
      }
    },
    async duplicateIndicator() {
      const settings = merge({}, this.indicatorSettings)

      settings.id += '-copy'
      settings.name += ' copy'
      delete settings.updatedAt
      delete settings.createdAt

      const id = await workspacesService.saveIndicator(settings)
      const serie = await workspacesService.getIndicator(id)

      this.$store.dispatch(this.paneId + '/addIndicator', serie)

      await this.close()

      dialogService.open(
        IndicatorDialog,
        {
          paneId: this.paneId,
          indicatorId: id
        },
        'serie'
      )
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
    }
  }
}
</script>
