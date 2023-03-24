<template>
  <div
    class="indicator-option form-group"
    :class="['-' + type, inline && 'indicator-option--inline']"
  >
    <label>
      {{ label }}
    </label>

    <dropdown-button
      v-if="name === 'lineType'"
      v-model="value"
      :options="{ 0: 'Simple', 1: 'with steps' }"
      class="-outline form-control -arrow"
      placeholder="lineType"
      @input="setValue($event)"
    ></dropdown-button>
    <dropdown-button
      v-else-if="/linestyle$/i.test(name)"
      v-model="value"
      :options="{
        0: 'Solid',
        1: 'Dotted',
        2: 'Dashed',
        3: 'LargeDashed',
        4: 'SparseDotted'
      }"
      class="-outline form-control -arrow"
      placeholder="lineStyle"
      @input="setValue($event)"
    ></dropdown-button>
    <color-picker-control
      v-else-if="type === 'color'"
      :label="label"
      model="rgb"
      allow-null
      :value="value"
      @input="setValue($event)"
      @close="reloadIndicator"
    ></color-picker-control>
    <editable
      v-else-if="type === 'string' || type === 'number'"
      class="form-control"
      :value="value"
      @input="setValue($event)"
    ></editable>
    <label v-else-if="type === 'boolean'" class="checkbox-control">
      <input
        type="checkbox"
        class="form-control"
        :checked="value"
        @change="setValue($event.target.checked)"
      />
      <span>{{ label }}</span>
      <div></div>
    </label>
  </div>
</template>
<script lang="ts">
import { Component, Vue, Watch } from 'vue-property-decorator'
import {
  getDefaultIndicatorOptionValue,
  getIndicatorOptionType
} from './options'

import DropdownButton from '@/components/framework/DropdownButton.vue'
import ColorPickerControl from '../framework/picker/ColorPickerControl.vue'

@Component({
  name: 'IndicatorOption',
  components: {
    DropdownButton,
    ColorPickerControl
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
    inline: {
      type: Boolean,
      default: false
    },
    ensure: {
      type: Boolean,
      default: false
    }
  }
})
export default class extends Vue {
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

  get label() {
    return this.name
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
    this.type = getIndicatorOptionType(
      this.name,
      this.plotTypes,
      null,
      this.currentIndicatorValue
    )

    if (this.ensure && typeof this.currentIndicatorValue === 'undefined') {
      this.setValue(this.value)
    }
  }

  getValue() {
    let preferedValue

    if (typeof this.currentIndicatorValue !== 'undefined') {
      preferedValue = this.currentIndicatorValue
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
    this.type = getIndicatorOptionType(
      this.name,
      this.plotTypes,
      true,
      this.currentIndicatorValue
    )
  }

  reloadIndicator() {
    this.$store.commit(this.paneId + '/SET_INDICATOR_SCRIPT', {
      id: this.indicatorId,
      value: this.$store.state[this.paneId].indicators[this.indicatorId].script
    })
  }
}
</script>
<style lang="scss">
.indicator-option {
  &--inline > label {
    margin: 0 0.5rem 0 0;
  }

  > label {
    display: block;
  }

  &.-boolean,
  &.-color {
    display: flex;
    align-items: center;

    > label:first-child {
      flex-grow: 1;
      margin: 0;
    }
  }

  &.-color > label {
    flex-grow: 1;
    color: var(--theme-color-base);
    margin-right: 0.25rem;
  }

  &.-boolean {
    > label:first-child {
      display: none;
    }

    .checkbox-control {
      flex-grow: 1;

      > span {
        flex-grow: 1;
        word-break: break-word;
      }
    }
  }

  + .indicator-option {
    margin-top: 1rem;
  }

  .form-control {
    width: 100%;
    max-width: 200px;
  }

  .dropdown {
    width: 100%;
  }
}
</style>
