<template>
  <div class="indicator-option">
    <component
      v-if="type"
      :is="componentName"
      :pane-id="paneId"
      :indicator-id="indicatorId"
      :label="label"
      :value="value"
      :definition="definition"
      @input="setValue($event)"
    >
      <template v-if="definition.description" #description>
        <i
          class="icon-info pl4"
          v-tippy="{ followCursor: true, distance: 24 }"
          :title="definition.description"
        ></i>
      </template>
    </component>
  </div>
</template>
<script lang="ts">
import { Component, Vue, Watch } from 'vue-property-decorator'
import {
  getIndicatorOptionType,
  getDefaultIndicatorOptionValue
} from './options'
import { ALLOWED_OPTION_TYPES } from './buildUtils'

@Component({
  name: 'IndicatorOptions',
  components: {
    IndicatorOptionNumber: () =>
      import('@/components/chart/options/IndicatorOptionNumber.vue'),
    IndicatorOptionText: () =>
      import('@/components/chart/options/IndicatorOptionText.vue'),
    IndicatorOptionList: () =>
      import('@/components/chart/options/IndicatorOptionList.vue'),
    IndicatorOptionLineStyle: () =>
      import('@/components/chart/options/IndicatorOptionLineStyle.vue'),
    IndicatorOptionLineType: () =>
      import('@/components/chart/options/IndicatorOptionLineType.vue'),
    IndicatorOptionExchange: () =>
      import('@/components/chart/options/IndicatorOptionExchange.vue'),
    IndicatorOptionRange: () =>
      import('@/components/chart/options/IndicatorOptionRange.vue'),
    IndicatorOptionCheckbox: () =>
      import('@/components/chart/options/IndicatorOptionCheckbox.vue'),
    IndicatorOptionColor: () =>
      import('@/components/chart/options/IndicatorOptionColor.vue')
  },
  props: {
    indicatorId: {
      type: String,
      required: true
    },
    paneId: {
      type: String,
      required: true
    },
    plotTypes: {
      required: true
    },
    name: {
      type: String,
      required: true
    },
    ensure: {
      type: Boolean,
      default: false
    }
  }
})
export default class IndicatorOption extends Vue {
  private indicatorId: string
  private paneId: string
  private plotTypes: string[]
  private name: string
  private ensure: boolean

  type: string = null
  value = null

  get currentIndicatorValue() {
    return this.$store.state[this.paneId].indicators[this.indicatorId].options[
      this.name
    ]
  }

  get definition() {
    return (
      this.$store.state[this.paneId].indicators[this.indicatorId]
        .optionsDefinitions[this.name] || {}
    )
  }

  get label() {
    return this.definition.label || this.name
  }

  get componentName() {
    if (!this.type) {
      return 'IndicatorOptionText'
    }

    if (this.name === 'lineType') {
      return 'IndicatorOptionLineType'
    }

    if (this.name === 'lineStyle') {
      return 'IndicatorOptionLineStyle'
    }

    return `IndicatorOption${this.type[0].toUpperCase()}${this.type
      .toLowerCase()
      .slice(1)}`
  }

  @Watch('definition')
  onDefinitionChange() {
    this.type = this.getType()
  }

  @Watch('currentIndicatorValue')
  onIndicatorValueChange() {
    const value = this.getValue()

    if (
      +this.value !== +value ||
      (isNaN(+this.value) && value !== this.value)
    ) {
      this.value = value
    }
  }

  created() {
    this.value = this.getValue()
    this.type = this.getType()

    if (
      this.ensure &&
      typeof this.currentIndicatorValue === 'undefined' &&
      this.value !== 'null'
    ) {
      this.setValue(this.value)
    }
  }

  getType() {
    const type =
      this.definition.type ||
      getIndicatorOptionType(
        this.name,
        this.plotTypes,
        true,
        this.currentIndicatorValue
      )

    if (!Object.values(ALLOWED_OPTION_TYPES).includes(type)) {
      return 'number'
    }

    return type
  }

  getValue() {
    let preferedValue

    if (typeof this.currentIndicatorValue !== 'undefined') {
      preferedValue = this.currentIndicatorValue
    }

    if (
      typeof preferedValue === 'undefined' &&
      typeof this.definition.default !== 'undefined'
    ) {
      return this.definition.default
    }

    const defaultValue = getDefaultIndicatorOptionValue(
      this.name,
      this.plotTypes
    )

    if (typeof preferedValue !== 'undefined') {
      if (
        preferedValue &&
        typeof preferedValue === 'object' &&
        defaultValue &&
        typeof defaultValue === 'object'
      ) {
        return Object.assign({}, defaultValue, preferedValue)
      } else {
        return preferedValue
      }
    } else if (typeof defaultValue !== 'undefined') {
      return defaultValue
    }

    return null
  }

  setValue(value) {
    this.$emit('change', {
      key: this.name,
      value
    })

    this.value = value
    this.type = this.getType()
  }
}
</script>
<style lang="scss">
.indicator-option {
  width: 100%;
  max-width: 200px;

  .form-control {
    min-width: 100px;
    max-width: 100%;
  }
}
</style>
