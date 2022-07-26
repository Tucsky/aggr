<template>
  <dropdown-button
    :options="donationMenu"
    :placeholder="label"
    class="-text -arrow"
    @input="onSelect"
  >
    <template v-slot:option="{ value }">
      <i :class="'icon-' + value.icon" class="-fill"></i>

      <span class="ml4">{{ value.label }}</span>
    </template>
  </dropdown-button>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import DropdownButton from '@/components/framework/DropdownButton.vue'

@Component({
  components: {
    DropdownButton
  },
  props: {
    label: {
      default: 'donate'
    }
  }
})
export default class extends Vue {
  donationMenu = [
    {
      label: 'with Bitcoin',
      icon: 'bitcoin',
      click: () => window.open('bitcoin:3PK1bBK8sG3zAjPBPD7g3PL14Ndux3zWEz')
    },
    {
      label: 'with Monero',
      icon: 'xmr',
      click: () =>
        window.open(
          'monero:48NJj3RJDo33zMLaudQDdM8G6MfPrQbpeZU2YnRN2Ep6hbKyYRrS2ZSdiAKpkUXBcjD2pKiPqXtQmSZjZM7fC6YT6CMmoX6'
        )
    },
    {
      label: 'with other coin',
      icon: 'COINBASE',
      click: () =>
        window.open(
          'https://commerce.coinbase.com/checkout/c58bd003-5e47-4cfb-ae25-5292f0a0e1e8'
        )
    }
  ]

  onSelect(option) {
    if (typeof option.click === 'function') {
      option.click()
    }
  }
}
</script>
