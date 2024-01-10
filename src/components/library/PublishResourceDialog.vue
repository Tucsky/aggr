<template>
  <form @submit.prevent="submit">
    <transition name="dialog" :duration="500" @after-leave="onHide">
      <Dialog
        v-if="dialogOpened"
        class="publish-resource"
        borderless
        @clickOutside="hide"
      >
        <template v-slot:header>
          <div class="dialog__title">
            Publish: <code>{{ item.name }}</code>
          </div>
        </template>

        <transition-height single name="transition-height-scale">
          <div v-if="errorMessage">
            <div class="publish-resource__error">
              <p class="mx0">
                <i class="icon-warning mr8"></i> {{ errorMessage }}
              </p>
            </div>
          </div>
        </transition-height>

        <transition-height
          class="publish-resource__wrapper"
          stepper
          name="slide-fade-right"
          :duration="500"
          fill-height
        >
          <div v-if="isLoading" key="loading" class="publish-resource__loading">
            <loader class="mx0 -center" />
            <p class="mb0 mt0 ml16 text-color-50 -center">
              Please wait a moment...
            </p>
          </div>
          <div
            v-else-if="output"
            key="completed"
            class="publish-resource__confirm"
          >
            <h3 class="mx0">Thank you {{ item.author }} !</h3>
            <p class="mb0">
              You can follow the review process on the
              <i class="icon-github mr8"></i
              ><a :href="output" target="_blank"
                >Github&nbsp;pull&nbsp;request</a
              >
            </p>
            <Btn
              :href="output"
              target="_blank"
              class="mt16 -theme -large mlauto mtauto"
            >
              Open <i class="icon-external-link-square-alt ml8"></i>
            </Btn>
          </div>
          <div
            v-else
            key="onboarding"
            class="publish-resource__actions divider-container"
          >
            <Btn
              type="submit"
              class="-large -green -cases"
              title="Automatic contribuation"
              v-tippy
            >
              <i class="icon-upload mr8"></i> Upload now
            </Btn>
            <div class="divider divider--vertical">Or</div>
            <Btn
              :href="repoUrl"
              target="_blank"
              class="-text -cases"
              title="Manual contribution"
              v-tippy="{ placement: 'bottom' }"
            >
              <i class="icon-github mr8"></i> Contribute on Github
            </Btn>
          </div>
        </transition-height>
      </Dialog>
    </transition>
  </form>
</template>

<script>
import TransitionHeight from '@/components/framework/TransitionHeight.vue'
import Btn from '@/components/framework/Btn.vue'
import Loader from '@/components/framework/Loader.vue'
import DialogMixin from '@/mixins/dialogMixin'
import { uploadResource } from './helpers'

export default {
  name: 'PublishResourceDialog',
  components: {
    TransitionHeight,
    Loader,
    Btn
  },
  props: {
    item: {
      type: Object,
      required: true
    }
  },
  mixins: [DialogMixin],
  data() {
    return {
      dialogOpened: false,
      isLoading: false,
      errorMessage: null,
      output: null,
      repoUrl: import.meta.env.VITE_APP_LIB_REPO_URL
    }
  },
  computed: {
    prId() {
      if (!this.output) {
        return ''
      }

      return this.output.split('/').pop()
    }
  },
  mounted() {
    this.show()
  },
  methods: {
    show() {
      this.dialogOpened = true
    },
    hide() {
      if (this.isLoading) {
        return
      }

      this.dialogOpened = false
    },
    onHide() {
      this.close()
    },
    async submit() {
      if (this.isLoading) {
        return
      }
      this.errorMessage = null
      this.isLoading = true
      try {
        const url = await uploadResource(this.item)

        this.output = url
      } catch (error) {
        this.errorMessage = error.message
      } finally {
        this.isLoading = false
      }
    }
  }
}
</script>
<style lang="scss" scoped>
.publish-resource {
  $self: &;

  ::v-deep {
    .dialog__content {
      width: 380px;
    }

    .dialog__body {
      height: 210px;
    }
  }

  &__actions {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    gap: 1rem;
    flex-grow: 1;
  }

  &__loading {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-grow: 1;
  }

  &__confirm {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
  }

  &__wrapper {
    container-type: inline-size;
    display: flex;
    flex-direction: column;
    justify-content: stretch;
    flex-grow: 1;

    @container (min-width: 380px) {
      #{$self}__actions {
        flex-direction: row;
      }
    }
  }

  &__error {
    padding: 0.75rem;
    border-radius: 0.375rem;
    border: 1px solid var(--theme-sell-100);
    color: var(--theme-sell-100);
    background-color: var(--theme-background-75);
    position: relative;
    margin-bottom: 1.5rem;

    &:before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: var(--theme-sell-base);
      opacity: 0.25;
    }
  }

  .btn {
    white-space: nowrap;
  }

  .divider {
    margin: 0;
  }
}
</style>
