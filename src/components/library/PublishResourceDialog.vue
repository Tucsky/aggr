<template>
  <form @submit.prevent="submit">
    <transition name="dialog" :duration="300" @after-leave="close">
      <Dialog v-if="opened" class="publish-resource" borderless @close="hide">
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
              <i class="icon-github mr8"></i>
              <a :href="output" target="_blank">
                Github&nbsp;pull&nbsp;request
              </a>
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
              title="Automatic contribution"
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

<script setup lang="ts">
import { ref } from 'vue'
import Dialog from '@/components/framework/Dialog.vue'
import TransitionHeight from '@/components/framework/TransitionHeight.vue'
import Btn from '@/components/framework/Btn.vue'
import Loader from '@/components/framework/Loader.vue'
import { useDialog } from '@/composables/useDialog'
import { uploadResource } from './helpers'

const props = defineProps({
  item: {
    type: Object,
    required: true
  }
})

const { opened, close, hide } = useDialog()
defineExpose({ close })

const isLoading = ref(false)
const errorMessage = ref<string | null>(null)
const output = ref<string | null>(null)
const repoUrl = import.meta.env.VITE_APP_LIB_REPO_URL

const submit = async () => {
  if (isLoading.value) return

  errorMessage.value = null
  isLoading.value = true

  try {
    const url = await uploadResource(props.item)
    output.value = url
  } catch (error: any) {
    errorMessage.value = error.message
  } finally {
    isLoading.value = false
  }
}
</script>

<style lang="scss" scoped>
.publish-resource {
  $self: &;

  :deep() {
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
