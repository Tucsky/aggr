<template>
  <dropdown
    :selected="sortType"
    :options="['none', 'price', 'volume', 'delta', 'change']"
    :selection-class="selectionClass"
    return-value
    @output="selectSortType($event)"
  ></dropdown>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'

@Component({
  name: 'PricesSortDropdown',
  props: {
    paneId: {
      type: String,
      required: true
    },
    selectionClass: {
      type: String,
      default: '-text -arrow'
    }
  }
})
export default class extends Vue {
  paneId: string

  get sortType() {
    return this.$store.state[this.paneId].sortType
  }

  get sortOrder() {
    return this.$store.state[this.paneId].sortOrder
  }

  selectSortType(option) {
    if (option === this.sortType) {
      this.$store.commit(this.paneId + '/TOGGLE_SORT_ASC')
    }

    this.$store.commit(this.paneId + '/SET_SORT_TYPE', option)
  }
}
</script>
