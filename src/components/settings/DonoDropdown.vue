<template>
  <dropdown-button
    :options="donationMenu"
    :placeholder="label"
    class="-text -arrow"
    @input="onSelect"
  >
    <template v-slot:option="{ value }">
      <i :class="value.icon" class="-fill"></i>

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
export default class DonoDropdown extends Vue {
  donationMenu = [
    {
      label: 'with Bitcoin',
      icon: 'icon-bitcoin',
      click: () => window.open('bitcoin:3PK1bBK8sG3zAjPBPD7g3PL14Ndux3zWEz')
    },
    {
      label: 'Ethereum',
      icon: 'icon-eth',
      click: () =>
        window.open('erc20:0x83bBC120a998cF7dFcBa1518CDDCb68Aa0D0c158')
    },
    {
      label: 'with other coin',
      icon: 'icon-COINBASE',
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
