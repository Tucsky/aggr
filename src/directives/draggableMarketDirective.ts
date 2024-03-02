import iframeService from '@/services/iframeService'
import store from '@/store'
import { ListenedProduct } from '@/store/app'
import { INFRAME } from '@/utils/constants'
import { mountComponent, createComponent, getEventCords } from '@/utils/helpers'
import { isTouchSupported } from '@/utils/touchevent'

let marketContext: { el: HTMLElement; market: ListenedProduct; paneId: string }
let draggableMarketComponent: any
let isLoading = false

async function createDraggableMarketComponent(target) {
  isLoading = true
  const module = await import(`@/components/DraggableMarket.vue`)
  isLoading = false

  if (!marketContext) {
    return
  }

  draggableMarketComponent = createComponent(module.default, {
    market: marketContext.market,
    target
  })

  mountComponent(draggableMarketComponent)

  document.body.classList.add('-dragging-market')
}

function destroyDraggableMarketComponent() {
  if (draggableMarketComponent) {
    draggableMarketComponent.$destroy()
    draggableMarketComponent.$el.parentNode.removeChild(
      draggableMarketComponent.$el
    )
    draggableMarketComponent = null

    document.body.classList.remove('-dragging-market')
  }
}

async function handleDragMove(event: MouseEvent | TouchEvent) {
  if (isLoading) {
    return
  }

  const target = getEventCords(event)

  if (!draggableMarketComponent) {
    await createDraggableMarketComponent(target)
  } else {
    draggableMarketComponent.target = target
  }
}

function handleDragEnd(event: MouseEvent | TouchEvent) {
  const el = event.target as HTMLElement

  if (el.classList.contains('pane') && el.id !== marketContext.paneId) {
    store.dispatch('panes/setMarketsForPane', {
      id: el.id,
      markets: [marketContext.market.id]
    })
  }

  document.body.removeEventListener(
    /touch/.test(event.type) ? 'touchmove' : 'mousemove',
    handleDragMove
  )

  document.body.removeEventListener(
    /touch/.test(event.type) ? 'touchend' : 'mouseup',
    handleDragEnd
  )

  marketContext = null
  destroyDraggableMarketComponent()
}

function getMarketContext(el) {
  // get relatve paneId
  let parentElement = el
  let depth = 0
  let paneId
  while (depth++ < 10 && (parentElement = parentElement.parentElement)) {
    if (parentElement.classList.contains('pane')) {
      paneId = parentElement.id
    }
  }
  if (!paneId) {
    return null
  }

  // get market
  const textContent = el.getAttribute('data-market')
  const markets = store.state.panes.marketsListeners

  let marketData
  if (/:/.test(textContent)) {
    marketData = markets[textContent]
  } else {
    marketData =
      markets[
        Object.keys(markets).find(key => markets[key].local === textContent)
      ]
  }

  if (!marketData) {
    return null
  }

  marketContext = {
    el,
    paneId,
    market: marketData
  }

  return marketContext
}

function handleDragStart(event: MouseEvent | TouchEvent) {
  if (event instanceof MouseEvent && event.button !== 0) {
    return
  }

  getMarketContext(event.currentTarget)

  if (!marketContext) {
    return
  }

  document.body.addEventListener(
    /touch/.test(event.type) ? 'touchmove' : 'mousemove',
    handleDragMove
  )
  document.body.addEventListener(
    /touch/.test(event.type) ? 'touchend' : 'mouseup',
    handleDragEnd
  )
}

function emitContext(event: MouseEvent | TouchEvent) {
  const context = getMarketContext(event.currentTarget)

  if (context) {
    iframeService.send('market', context.market)
  }
}

const draggableHandlers = {
  bind(el) {
    const touchEvents = isTouchSupported()

    if (touchEvents && window.innerWidth < 768) {
      return
    }

    el.addEventListener(
      touchEvents ? 'touchstart' : 'mousedown',
      handleDragStart
    )
  },

  unbind(el) {
    const touchEvents = isTouchSupported()

    if (touchEvents && window.innerWidth < 768) {
      return
    }

    el.removeEventListener(
      touchEvents ? 'touchstart' : 'mousedown',
      handleDragStart
    )

    if (marketContext && marketContext.el === el) {
      handleDragEnd({ type: touchEvents ? 'touchmove' : 'mousemove' } as any)
    }
  }
}

const iframeHandlers = {
  bind(el) {
    el.addEventListener('click', emitContext)
  },

  unbind(el) {
    el.removeEventListener('click', emitContext)
  }
}

export default INFRAME ? iframeHandlers : draggableHandlers
