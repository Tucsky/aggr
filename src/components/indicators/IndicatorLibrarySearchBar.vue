<template>
  <input
    type="text"
    class="form-control w-100 -fill indicator-library-search-bar"
    placeholder="Search"
    :value="value"
    @input="$emit('input', $event.currentTarget.value)"
    v-autofocus
  />
</template>

<script>
export default {
  props: {
    value: {
      type: String,
      default: ''
    },
    count: {
      type: Number,
      default: null
    },
    label: {
      type: String,
      default: null
    }
  },
  computed: {
    placeholder() {
      if (!this.label) {
        return 'Search'
      }

      return `Search ${this.label.toLowerCase()}`
    }
  }
}
</script>
