import { Pane } from '@/store/panes'
import Vue from 'vue'
import Component from 'vue-class-component'
import { Watch } from 'vue-property-decorator'
import aggregatorService from '../services/aggregatorService'

@Component({
  props: {
    paneId: {
      required: true,
      type: String
    }
  }
})
export default class PaneMixin extends Vue {
  paneId: string
  protected _onStoreMutation: () => void
  protected aggregatorSubscriptions: {
    [subscriptionName: string]: { eventName: string; handlerName: string }
  } = {}

  get pane(): Pane {
    return this.$store.state.panes.panes[this.paneId]
  }

  get subscriptions(): string[] {
    return this.pane.subscriptions
  }

  @Watch('subscriptions', {
    immediate: true
  })
  onSubscriptionsChange(newSubscriptions, oldSubscriptions = []) {
    const allSubscriptions = newSubscriptions
      .concat(oldSubscriptions)
      .filter((eventName, index, arr) => arr.indexOf(eventName) === index)

    const toUnsubscribe = []
    const toSubscribe = []

    for (const eventName of allSubscriptions) {
      const shouldSubscribe = newSubscriptions.indexOf(eventName) !== -1
      const wasSubscribed = oldSubscriptions.indexOf(eventName) !== -1

      if (shouldSubscribe && !wasSubscribed) {
        toSubscribe.push(eventName)
      }
      if (!shouldSubscribe && wasSubscribed) {
        toUnsubscribe.push(eventName)
      }
    }

    console.log(
      `[${
        this.paneId
      }] onSubscriptionsChange\n\t-toUnsubscribe:${toUnsubscribe.join(
        ','
      )}\n\t-toSubscribe:${toSubscribe.join(',')}`
    )

    this.unsubscribeFromAggregator(toUnsubscribe)
    this.subscribeToAggregator(toSubscribe)
  }

  mounted() {
    this.$el.id = this.paneId

    this.refreshZoom()

    this.$nextTick(() => {
      const width = this.$el.clientWidth

      if (typeof this.onResize === 'function') {
        this.onResize(width, this.$el.clientHeight, true)
      }
    })

    this.$el.addEventListener('mousedown', this.focusPane)
  }

  beforeDestroy() {
    this.$el.removeEventListener('mousedown', this.focusPane)

    if (this._onStoreMutation) {
      this._onStoreMutation()
    }
  }

  refreshZoom() {
    this.$store.dispatch('panes/refreshZoom', this.paneId)
  }

  focusPane() {
    this.$store.commit('app/SET_FOCUSED_PANE', this.paneId)
  }

  onResize?(newWidth: number, newHeight: number, isMounting?: boolean)

  getAggregatorEvent(subscription) {
    const [market] = subscription.split('.')

    return {
      eventName: `${market}.trades`,
      handlerName: 'onTrades'
    }
  }

  unsubscribeFromAggregator(subscriptions: string[]) {
    for (const subscription of subscriptions) {
      if (!this.aggregatorSubscriptions[subscription]) {
        continue
      }

      const { eventName, handlerName } =
        this.aggregatorSubscriptions[subscription]

      console.log(`[${this.paneId}] agg.OFF ${eventName} ${handlerName}`)

      aggregatorService.off(eventName, this[handlerName])

      delete this.aggregatorSubscriptions[subscription]
    }
  }

  subscribeToAggregator(subscriptions: string[]) {
    for (const subscription of subscriptions) {
      if (this.aggregatorSubscriptions[subscription]) {
        continue
      }

      this.aggregatorSubscriptions[subscription] =
        this.getAggregatorEvent(subscription)

      console.log(
        `[${this.paneId}] agg.ON ${this.aggregatorSubscriptions[subscription].eventName} ${this.aggregatorSubscriptions[subscription].handlerName}`
      )

      aggregatorService.on(
        this.aggregatorSubscriptions[subscription].eventName,
        this[this.aggregatorSubscriptions[subscription].handlerName]
      )
    }
  }
}
