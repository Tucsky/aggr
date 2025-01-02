<template>
  <dropdown-button
    :options="donationMenu"
    :placeholder="label"
    class="-text -arrow"
    @input="onSelect"
  >
    <template v-slot:option="{ value }">
      <i :class="value.icon" style="width: 16px; text-align: center"></i>

      <span>{{ value.label }}</span>
    </template>
  </dropdown-button>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import DropdownButton from '@/components/framework/DropdownButton.vue'
import { copyTextToClipboard } from '@/utils/helpers'

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
      click: () => this.copyAddress('bc1q3f5ndx2zww3pw5c5vctw7t4wfgv05fdsc2graj', 'Bitcoin')
    },
    {
      label: 'Ethereum',
      icon: 'icon-eth',
      click: () =>
        this.copyAddress('0x83bBC120a998cF7dFcBa1518CDDCb68Aa0D0c158', 'Ethereum')
    },
    {
      label: 'Solana',
      icon: 'icon-sol',
      click: () =>
        this.copyAddress('FKMNaBJqdpNA1d33hiUEjHaovQ5AiBGACqRuKuxA9q3D', 'Solana')
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

  async copyAddress(text, name) {
    await copyTextToClipboard(text)

    this.$store.dispatch('app/showNotice', {
      id: 'copy-address',
      type: 'info',
      title: `${name} address added to clipboard`
    })
  }
}
</script>
