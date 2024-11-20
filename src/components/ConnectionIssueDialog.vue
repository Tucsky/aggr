<template>
  <transition name="dialog" :duration="500" @after-leave="close">
    <Dialog
      v-if="opened"
      class="connection-issue-dialog"
      :resizable="false"
      @close="hide"
    >
      <template v-slot:header>
        <div>
          <div class="dialog__title">
            <i class="icon-warning -lower"></i>
            Connection issue
          </div>
        </div>

        <div class="column -center"></div>
      </template>
      <form @submit.prevent="submit">
        <TransitionHeight
          stepper
          class="connection-issue-dialog__stepper"
          :name="`slide-fade-${isBack ? 'left' : 'right'}`"
          :duration="500"
        >
          <div
            v-if="stepIndex === 0"
            class="connection-issue-dialog__step"
            key="step-0"
          >
            <p class="form-feedback mt0 mb0">
              Can't connect to {{ restrictedUrl
              }}<i
                class="icon-info -lower ml4"
                :title="`Exchange API refused to connect<br>or blocked connection.`"
                v-tippy="{ boundary: 'window', distance: 24 }"
              ></i>
            </p>
          </div>
          <div
            v-if="stepIndex === 1"
            class="connection-issue-dialog__step"
            key="step-1"
          >
            <p class="-inline mb0 mt0">
              The exchange API is unreachable due to
              <u
                title="Beginning in late November 2022, Binance began declining API requests originating from US IP addresses."
                v-tippy
              >
                geo restriction
              </u>
              or something else.
            </p>
            <ol class="mb0">
              <li v-if="currentWsProxyUrl">
                <p>
                  The current proxy URL might not be working<br />
                  Last used : <code>{{ currentWsProxyUrl }}</code>
                </p>
                <button
                  type="button"
                  class="btn -red mrauto -cases"
                  @click="deleteWsProxyUrl"
                  :disable="selectedAction"
                >
                  <i class="icon-eraser mr8"></i> Clear proxy URL
                </button>
              </li>
              <li>
                <p>
                  Disable all {{ exchangeId }}'s pairs so you won't see the
                  issue anymore
                </p>

                <button
                  type="button"
                  class="btn -red -cases"
                  @click="disableExchange"
                  :disable="selectedAction"
                >
                  <i class="icon-cross mr8"></i> Disable&nbsp;
                  <span>{{ exchangeId }}</span>
                  <i class="ml4" :class="'icon-' + exchangeId"></i>
                </button>
              </li>

              <li>
                <p>Use a VPN</p>

                <button
                  type="button"
                  class="btn -green -cases"
                  @click="refreshExchange"
                  :disable="selectedAction"
                  title="Retry connection with exchange"
                  v-tippy
                >
                  <i class="icon-refresh mr8"></i> I enabled my VPN
                </button>
              </li>
            </ol>
          </div>
          <div
            v-else-if="stepIndex === 2"
            class="connection-issue-dialog__step"
            key="step-3"
          >
            <p class="mx0 text-center text-muted">Connecting to</p>
            <p class="mt0 text-center">
              <code>{{ testUrl }}</code>
            </p>
            <loader ref="loader" />
            <p class="mb0 text-center text-muted">Please wait</p>
          </div>
        </TransitionHeight>
      </form>
      <template v-slot:footer>
        <template v-if="stepIndex">
          <button
            v-if="stepIndex"
            :disabled="isTesting"
            type="button"
            class="btn -text -large mrauto"
            @click="prev"
          >
            Back
          </button>
        </template>
        <template v-else>
          <button type="button" class="btn -text mrauto" @click="dismiss">
            Dismiss
          </button>
          <button type="button" class="btn -text ml8 -large" @click="next">
            Troubleshoot
          </button>
        </template>
      </template>
    </Dialog>
  </transition>
</template>

<script lang="ts" setup>
import { ref, computed, watch, onBeforeUnmount, onBeforeMount } from 'vue'
import store from '@/store'

// Initialize dialog logic
const { opened, close, hide } = useDialog()
defineExpose({ close })

// Import components
import TransitionHeight from '@/components/framework/TransitionHeight.vue'
import Loader from '@/components/framework/Loader.vue'
import Dialog from './framework/Dialog.vue'

// Import services
import aggregatorService from '@/services/aggregatorService'
import notificationService from '@/services/notificationService'
import { useDialog } from '@/composables/useDialog'

// Props
const props = defineProps({
  exchangeId: {
    type: String,
    required: true
  },
  restrictedUrl: {
    type: String,
    required: true
  }
})

// Refs (data properties)
const proxyUrl = ref('')
const isTesting = ref(false)
const selectedAction = ref<string | null>(null)
const isBack = ref(false)
const stepIndex = ref(0)

// Computed properties
const currentWsProxyUrl = computed(() => store.state.settings.wsProxyUrl)
const valid = computed(() => /wss?:\/\/.{3,}/.test(proxyUrl.value))
const computedUrl = computed(() => {
  const [base, params] = proxyUrl.value.split('?')
  const url = base.replace(/([^/])$/, '$1/')
  return params?.length ? `${url}?${params}&url=` : `${url}?url=`
})
const testUrl = computed(() => computedUrl.value + props.restrictedUrl)
const contextId = computed(() => props.exchangeId + props.restrictedUrl)

const onSubscribed = (event: { url: string }) => {
  if (event.url === props.restrictedUrl || event.url === testUrl.value) {
    hide()
  }
}

const submit = () => {
  if (!valid.value) return
  hide()
}

const dismiss = () => {
  hide()
  notificationService.dismiss(contextId.value, 86400000)
}

const next = () => {
  if (stepIndex.value === 1 && !valid.value) {
    return
  }
  stepIndex.value = Math.min(2, stepIndex.value + 1)
}

const prev = () => {
  stepIndex.value = Math.max(0, stepIndex.value - 1)
}

const disableExchange = async () => {
  selectedAction.value = 'disable'
  try {
    await store.dispatch('exchanges/toggleExchange', props.exchangeId)
    hide()
  } catch (error: any) {
    store.dispatch('app/showNotice', {
      title: error.message
    })
  } finally {
    selectedAction.value = null
  }
}

const refreshExchange = async () => {
  selectedAction.value = 'disable'
  try {
    await store.dispatch('exchanges/disconnect', props.exchangeId)
    await store.dispatch('exchanges/connect', props.exchangeId)
    hide()
  } catch (error: any) {
    store.dispatch('app/showNotice', {
      title: error.message
    })
  } finally {
    selectedAction.value = null
  }
}

const test = async () => {
  if (!proxyUrl.value) return false

  isTesting.value = true
  const url = testUrl.value

  const result = await new Promise(resolve => {
    const ws = new WebSocket(url)
    let openTimeout: ReturnType<typeof setTimeout> | null = null

    const postHandler = () => {
      ws.close()
    }

    ws.addEventListener('open', () => {
      openTimeout = setTimeout(() => {
        resolve(true)
        postHandler()
      }, 3000)
    })

    ws.addEventListener('error', () => {
      if (openTimeout) clearTimeout(openTimeout)
      resolve(false)
      postHandler()
    })
  })

  isTesting.value = false

  if (result) {
    hide(computedUrl.value)
  } else {
    store.dispatch('app/showNotice', {
      title: `Failed to open ws connection with ${url}`,
      type: 'error'
    })
    prev()
  }

  return result
}

const deleteWsProxyUrl = () => hide('')

// Watchers
watch(
  () => stepIndex.value,
  (currentStep, previousStep) => {
    isBack.value = currentStep < previousStep
    if (currentStep === 2) test()
  }
)

// Lifecycle Hooks
onBeforeMount(() => {
  if (currentWsProxyUrl.value) {
    proxyUrl.value = currentWsProxyUrl.value.replace(/(&|\?)url=/g, '')
  }
  aggregatorService.on('connection', onSubscribed)
})

onBeforeUnmount(() => {
  aggregatorService.off('connection', onSubscribed)
})
</script>

<style lang="scss">
.connection-issue-dialog {
  .dialog__content {
    width: 320px;
  }

  code {
    word-break: break-all;
  }

  .form-control {
    width: 100%;
  }

  &__stepper {
    margin: 0 -1rem;
    position: relative;

    &.transition-height--active {
      overflow: hidden;
    }
  }

  &__step {
    padding: 0 1rem;
  }

  &__action {
    text-transform: none !important;
  }
}
</style>
