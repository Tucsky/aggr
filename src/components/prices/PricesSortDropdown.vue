<template>
  <dropdown-button
    v-model="sortType"
    :options="['none', 'price', 'volume', 'delta', 'change']"
    @input="selectSortType($event)"
  ></dropdown-button>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import DropdownButton from '@/components/framework/DropdownButton.vue'

@Component({
  name: 'PricesSortDropdown',
  components: {
    DropdownButton
  },
  props: {
    paneId: {
      type: String,
      required: true
    },
    buttonClass: {
      type: String,
      default: '-text -arrow'
    }
  }
})
export default class PricesSortDropdown extends Vue {
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
