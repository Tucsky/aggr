import Vue from 'vue'
import Component from 'vue-class-component'

@Component({
  props: {
    paneId: {
      type: String,
      required: true
    },
    indicatorId: {
      type: String,
      required: true
    },
    label: {
      type: String,
      required: true
    },
    value: {
      default: null
    },
    definition: {
      type: Object,
      default: () => ({})
    }
  }
})
export default class IndicatorOptionMixin extends Vue {}
