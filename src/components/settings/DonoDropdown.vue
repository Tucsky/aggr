<template>
  <DropdownButton
    v-model="selectedOption"
    :options="donationMenu"
    :placeholder="label"
    class="-text -arrow"
    @input="onSelect"
  >
    <template #option="{ value }">
      <i :class="value.icon" class="-fill"></i>
      <span class="ml4">{{ value.label }}</span>
    </template>
  </DropdownButton>
</template>

<script setup lang="ts">
import { ref, defineProps } from 'vue'
import DropdownButton from '@/components/framework/DropdownButton.vue'

// Define props with types and default values
withDefaults(
  defineProps<{
    label?: string
  }>(),
  {
    label: 'donate'
  }
)

// Define a ref for the selected option (for v-model)
const selectedOption = ref<any>(null)

// Define the donation menu options
const donationMenu = [
  {
    label: 'with Bitcoin',
    icon: 'icon-bitcoin',
    click: () => window.open('bitcoin:3PK1bBK8sG3zAjPBPD7g3PL14Ndux3zWEz')
  },
  {
    label: 'Ethereum',
    icon: 'icon-eth',
    click: () => window.open('erc20:0x83bBC120a998cF7dFcBa1518CDDCb68Aa0D0c158')
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

// Handle the selection of an option
const onSelect = (option: any) => {
  if (typeof option.click === 'function') {
    option.click()
  }
}
</script>
