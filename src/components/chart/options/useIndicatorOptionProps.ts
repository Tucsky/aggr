export const useIndicatorOptionProps = {
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
  modelValue: {
    default: null
  },
  definition: {
    type: Object,
    default: () => ({})
  }
}
