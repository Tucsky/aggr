<template>
  <div
    v-if="isBooted"
    id="app"
    :data-prefered-sizing-currency="preferedSizingCurrency"
    :class="{
      '-no-animations': disableAnimations,
      '-auto-hide-headers': autoHideHeaders,
      '-auto-hide-names': autoHideNames,
      '-light': theme === 'light'
    }"
  >
    <Loader v-if="isLoading" />
    <DialogContainer />
    <Notices />
    <div class="app__wrapper">
      <Menu />

      <div class="app__layout">
        <Panes />
      </div>
    </div>
  </div>
  <div id="app" v-else>
    <div class="app__loader d-flex -column">
      <div v-if="showStuck" class="px8 py8">
        💡 Stuck here ?
        <button class="btn -text" @click="resetAndReload">
          reset everything
        </button>
      </div>
      <Loader />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'

// Import components
import Loader from '@/components/framework/Loader.vue'
import Notices from '@/components/framework/Notices.vue'
import DialogContainer from '@/components/framework/DialogContainer.vue'
import Menu from '@/components/Menu.vue'
import Panes from '@/components/panes/Panes.vue'

// Import services
import aggregatorService from './services/aggregatorService'
import workspacesService from '@/services/workspacesService'
import { formatMarketPrice } from '@/services/productsService'
import dialogService from '@/services/oldDialogService'
import importService from '@/services/importService'
import { pathToBase64 } from './utils/helpers'

// Import assets
import upFavicon from '@/assets/up.png'
import downFavicon from '@/assets/down.png'
import store from '@/store'
import { Notice } from './store/app'

// State variables
const price = ref<string | null>(null)
const showStuck = ref(false)
const mainPrices = ref<{ [marketKey: string]: number }>({})
const mainMarkets = ref<string[]>([])
const mainPair = ref<string | null>(null)
const faviconElement = ref<HTMLLinkElement | null>(null)
const favicons = ref<{ up?: string; down?: string }>({})
let stuckTimeout: number

// Computed properties
const isBooted = computed(() => {
  const isBooted = store.state.app && store.state.app.isBooted

  return isBooted
})

const isLoading = computed(() => store.state.app.isLoading)
const theme = computed(() => store.state.settings.theme)
const autoHideHeaders = computed(() => store.state.settings.autoHideHeaders)
const autoHideNames = computed(() => store.state.settings.autoHideNames)
const preferedSizingCurrency = computed(() =>
  store.state.settings.preferQuoteCurrencySize ? 'quote' : 'base'
)
const disableAnimations = computed(() => store.state.settings.disableAnimations)

// Methods
const resetAndReload = async () => {
  const response = await dialogService.confirm({
    title: 'Reset app',
    message: 'Are you sure ?',
    ok: 'Reset settings',
    cancel: workspacesService.workspace
      ? 'Download workspace ' + workspacesService.workspace.id
      : 'Cancel'
  })

  if (response === true) {
    await workspacesService.reset()
    window.location.reload()
  } else if (response === false && workspacesService.workspace) {
    workspacesService.downloadWorkspace()
  }
}

const updatePrice = (tickers: any) => {
  let totalPrice = 0
  let count = 0

  for (const marketKey of mainMarkets.value) {
    if (tickers[marketKey]) {
      mainPrices.value[marketKey] = tickers[marketKey].price
    }

    if (!mainPrices.value[marketKey]) {
      continue
    }

    totalPrice += mainPrices.value[marketKey]
    count++
  }

  if (count) {
    const avgPrice = totalPrice / count

    if (price.value !== null) {
      if (avgPrice > +price.value) {
        updateFavicon('up')
      } else if (avgPrice < +price.value) {
        updateFavicon('down')
      }
    }

    price.value = formatMarketPrice(avgPrice, mainPair.value)

    window.document.title = `${mainPair.value} ${price.value}`
  } else {
    price.value = null
    updateFavicon('neutral')

    window.document.title = mainPair.value ? mainPair.value : 'AGGR'
  }
}

const startUpdatingPrice = async () => {
  const up = await pathToBase64(upFavicon)
  const down = await pathToBase64(downFavicon)
  favicons.value = { up, down }

  aggregatorService.on('tickers', updatePrice)
}

const stopUpdatingPrice = () => {
  aggregatorService.off('tickers', updatePrice)
  price.value = null
}

const updateFavicon = (direction: 'up' | 'down' | 'neutral') => {
  if (!faviconElement.value) {
    faviconElement.value = document.createElement('link')
    faviconElement.value.id = 'favicon'
    faviconElement.value.rel = 'shortcut icon'
    document.head.appendChild(faviconElement.value)
  }

  if (direction === 'up') {
    faviconElement.value.href = favicons.value.up || ''
  } else if (direction === 'down') {
    faviconElement.value.href = favicons.value.down || ''
  }
}

const onDocumentKeyPress = (event: KeyboardEvent) => {
  if (!isBooted.value) {
    return
  }

  const activeElement = document.activeElement as HTMLElement

  if (
    store.state.app.showSearch ||
    event.metaKey ||
    event.ctrlKey ||
    event.altKey ||
    activeElement.tagName === 'INPUT' ||
    activeElement.tagName === 'TEXTAREA' ||
    activeElement.tagName === 'SELECT' ||
    activeElement.isContentEditable
  ) {
    return
  }

  if (/^[a-z]$/i.test(event.key)) {
    store.dispatch('app/showSearch', {
      pristine: true,
      input: event.key
    })
  } else if (/^[0-9]$/i.test(event.key)) {
    store.dispatch('app/showTimeframe')
  }
}

const bindDropFile = () => {
  document.body.addEventListener('drop', handleDrop)
  document.body.addEventListener('dragover', handleDrop)
}

const unbindDropFile = () => {
  document.body.removeEventListener('drop', handleDrop)
  document.body.removeEventListener('dragover', handleDrop)
}

const handleDrop = async (event: DragEvent) => {
  event.preventDefault()

  if (event.type !== 'drop') {
    return false
  }

  if (!event.dataTransfer?.files || !event.dataTransfer.files.length) {
    return
  }

  for (const file of event.dataTransfer.files as unknown as Iterable<File>) {
    try {
      await importService.importAnything(file)
    } catch (error: any) {
      store.dispatch('app/showNotice', {
        title: error.message,
        type: 'error',
        timeout: 60000
      })
    }
  }
}

const refreshMainMarkets = (markets: any) => {
  const marketsByNormalizedPair: Record<string, number> = {}
  for (const id in markets) {
    const pair = markets[id].local
    if (!marketsByNormalizedPair[pair]) {
      marketsByNormalizedPair[pair] = 0
    }

    marketsByNormalizedPair[pair] += markets[id].listeners
  }

  mainPair.value = Object.keys(marketsByNormalizedPair).sort(
    (a, b) => marketsByNormalizedPair[b] - marketsByNormalizedPair[a]
  )[0]

  mainMarkets.value = Object.keys(markets)
    .filter(id => markets[id].local === mainPair.value)
    .map(id => markets[id].exchange + ':' + markets[id].pair)

  mainPrices.value = {}
}

// Lifecycle hooks
onMounted(() => {
  aggregatorService.on('notice', (notice: Notice) => {
    store.dispatch('app/showNotice', notice)
  })
  document.addEventListener('keydown', onDocumentKeyPress)

  bindDropFile()
  startUpdatingPrice()
})

onBeforeUnmount(() => {
  unbindDropFile()
  stopUpdatingPrice()
})

const bootWatch = watch(
  isBooted,
  value => {
    clearTimeout(stuckTimeout)

    if (!value) {
      showStuck.value = false
      console.log('start boot watch')
      stuckTimeout = setTimeout(() => {
        showStuck.value = true
      }, 15000)
    } else {
      console.log('stop boot watch')
      bootWatch()

      // Watchers
      watch(
        () => store.state.panes.marketsListeners,
        (newMarkets, previousMarkets) => {
          if (newMarkets !== previousMarkets) {
            refreshMainMarkets(newMarkets)
          }
        }
      )
    }
  },
  { immediate: true }
)
</script>
