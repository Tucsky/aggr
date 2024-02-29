<template>
  <transition
    name="dialog"
    :duration="500"
    @after-leave="onHide"
    @after-enter="onShow"
  >
    <Dialog
      v-if="dialogOpened"
      class="connection-issue-dialog"
      :resizable="false"
      @clickOutside="hide"
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
        <transition-height
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
        </transition-height>
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

<script>
import DialogMixin from '@/mixins/dialogMixin'
import TransitionHeight from '@/components/framework/TransitionHeight.vue'
import Loader from '@/components/framework/Loader.vue'
import aggregatorService from '@/services/aggregatorService'
import notificationService from '@/services/notificationService'

export default {
  name: 'ConnectionIssueDialog',
  components: {
    TransitionHeight,
    Loader
  },
  props: {
    exchangeId: {
      type: String
    },
    restrictedUrl: {
      type: String
    }
  },
  mixins: [DialogMixin],
  data() {
    return {
      data: null,
      proxyUrl: '',
      isTesting: false,
      selectedAction: null,
      isBack: false,
      stepIndex: 0,
      dialogOpened: false,
      sections: []
    }
  },
  computed: {
    currentWsProxyUrl() {
      return this.$store.state.settings.wsProxyUrl
    },
    valid() {
      return /wss?:\/\/.{3,}/.test(this.proxyUrl)
    },
    computedUrl() {
      const [base, params] = this.proxyUrl.split('?')

      const url = base.replace(/([^/])$/, '$1/')
      if (params && params.length) {
        return url + '?' + params + '&url='
      }

      return url + '?url='
    },
    testUrl() {
      return this.computedUrl + this.restrictedUrl
    },
    contextId() {
      return this.exchangeId + this.restrictedUrl
    }
  },
  watch: {
    stepIndex(currentStep, previousStep) {
      this.isBack = currentStep < previousStep
      if (currentStep === 2) {
        this.test()
      }
    }
  },
  created() {
    if (this.currentWsProxyUrl) {
      this.proxyUrl = this.currentWsProxyUrl.replace(/(&|\?)url=/g, '')
    }
    aggregatorService.on('connection', this.onSubscribed)
  },
  beforeDestroy() {
    aggregatorService.off('connection', this.onSubscribed)
  },
  mounted() {
    if (!this.data) {
      this.show()
    }
  },
  methods: {
    onSubscribed(event) {
      if (event.url === this.restrictedUrl || event.url === this.testUrl) {
        this.hide()
      }
    },
    show() {
      this.dialogOpened = true
    },
    hide(data = null) {
      if (this.isTesting) {
        return
      }

      this.data = data
      this.dialogOpened = false
    },
    onShow() {
      //
    },
    onHide() {
      this.close(this.data)
    },
    submit() {
      if (!this.valid) {
        return
      }

      this.hide()
    },
    dismiss() {
      this.hide()
      notificationService.dismiss(this.contextId, 86400000)
    },
    next() {
      if (this.stepIndex === 1 && !this.valid) {
        this.$refs.input.focus()
        return
      }

      this.stepIndex = Math.min(2, this.stepIndex + 1)
    },
    prev() {
      this.stepIndex = Math.max(0, this.stepIndex - 1)
    },
    async disableExchange() {
      this.selectedAction = 'disable'
      try {
        await this.$store.dispatch('exchanges/toggleExchange', this.exchangeId)
        this.hide()
      } catch (error) {
        this.$store.dispatch('app/showNotice', {
          title: error.message
        })
      } finally {
        this.selectedAction = null
      }
    },
    async refreshExchange() {
      this.selectedAction = 'disable'
      try {
        await this.$store.dispatch('exchanges/disconnect', this.exchangeId)
        await this.$store.dispatch('exchanges/connect', this.exchangeId)
        this.hide()
      } catch (error) {
        this.$store.dispatch('app/showNotice', {
          title: error.message
        })
      } finally {
        this.selectedAction = null
      }
    },
    validate() {
      if (!this.valid) {
        return false
      }

      return true
    },
    test() {
      if (!this.proxyUrl) {
        return false
      }

      this.isTesting = true

      const url = this.testUrl

      return new Promise(resolve => {
        const ws = new WebSocket(url)
        let openTimeout
        // eslint-disable-next-line prefer-const
        let openHandler
        // eslint-disable-next-line prefer-const
        let errorHandler

        const postHandler = () => {
          ws.removeEventListener('open', openHandler)
          ws.removeEventListener('error', errorHandler)
          ws.removeEventListener('close', errorHandler)

          if (ws.readyState < 2) {
            ws.close()
          }
        }

        openHandler = () => {
          openTimeout = setTimeout(() => {
            openTimeout = null
            resolve(true)
            postHandler()
          }, 3000)
        }

        errorHandler = () => {
          if (openTimeout) {
            clearTimeout(openTimeout)
          }

          setTimeout(() => {
            resolve(false)
            postHandler()
          }, 1000)
        }

        ws.addEventListener('open', openHandler)
        ws.addEventListener('error', errorHandler)
        ws.addEventListener('close', errorHandler)
      }).then(value => {
        this.isTesting = false

        if (value) {
          this.hide(this.computedUrl)
        } else {
          this.$store.dispatch('app/showNotice', {
            title: `Failed to open ws connection with ${url}`,
            type: 'error'
          })
          this.prev()
        }

        return value
      })
    },
    deleteWsProxyUrl() {
      this.hide('')
    }
  }
}
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
