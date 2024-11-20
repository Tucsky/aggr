<template>
  <transition name="dialog" :duration="300" @after-leave="close">
    <Dialog
      ref="dialogRef"
      v-if="opened"
      @close="hide"
      size="small"
      :resizable="false"
    >
      <template v-slot:header>
        <div class="dialog__title">{{ title }}</div>
      </template>
      <p class="mx0 -nl text-color-50" v-if="!html" v-text="message"></p>
      <p class="mx0 text-color-50" v-else v-html="message"></p>
      <template v-if="showFooter" v-slot:footer>
        <button
          v-for="action in actions"
          :key="action.label"
          type="button"
          class="btn -text mr8"
          @click="onClickAction($event, action)"
          @mousedown.prevent
        >
          {{ action.label }}
        </button>
        <Btn
          v-if="cancel"
          type="button"
          class="mr8"
          :class="cancelClass"
          @click="hide(false)"
          @mousedown.prevent
        >
          <i v-if="cancelIcon" class="mr4" :class="cancelIcon"></i> {{ cancel }}
        </Btn>

        <Btn
          v-if="ok"
          type="button"
          :disabled="!isSubmitEnabled"
          class="-large"
          :class="okClass"
          v-autofocus
          @click="hide(true)"
          @mousedown.prevent
        >
          <i v-if="okIcon" class="mr4" :class="okIcon"></i> {{ ok }}
        </Btn>
      </template>
    </Dialog>
  </transition>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import Btn from '@/components/framework/Btn.vue'
import Dialog from '@/components/framework/Dialog.vue'
import { useDialog } from '@/composables/useDialog'

const props = defineProps({
  title: {
    type: String,
    default: 'Confirmation'
  },
  message: {
    type: String,
    required: true
  },
  ok: {
    type: String,
    default: 'OK'
  },
  okIcon: {
    type: String,
    default: 'icon-check'
  },
  okClass: {
    type: String,
    default: '-green'
  },
  cancel: {
    type: String,
    default: 'Cancel'
  },
  cancelIcon: {
    type: String,
    default: null
  },
  cancelClass: {
    type: String,
    default: '-text'
  },
  html: {
    type: Boolean,
    default: false
  },
  actions: {
    type: Array as () => { label: string; callback: (e: Event) => any }[],
    default: () => []
  },
  requireScroll: {
    type: Boolean,
    default: false
  }
})

const dialogRef = ref<InstanceType<typeof Dialog> | null>(null)
const isSubmitEnabled = ref(!props.requireScroll)
const { opened, close, hide } = useDialog()
defineExpose({ close })

const showFooter = computed(
  () => props.ok || props.cancel || props.actions.length
)

let scrollHandler: (() => void) | null = null

const bindScroll = async () => {
  await nextTick()
  const bodyElement = dialogRef.value?.body

  if (bodyElement?.clientHeight === bodyElement?.scrollHeight) {
    isSubmitEnabled.value = true
    return
  }

  if (bodyElement) {
    scrollHandler = handleScroll
    bodyElement.addEventListener('scroll', handleScroll)
  }
}

const handleScroll = () => {
  const bodyElement = dialogRef.value?.body
  isSubmitEnabled.value =
    bodyElement.scrollTop + bodyElement.clientHeight >=
    bodyElement.scrollHeight - 1

  if (isSubmitEnabled.value) {
    unbindScroll()
  }
}

const unbindScroll = () => {
  if (!scrollHandler) return
  const bodyElement = dialogRef.value?.body
  bodyElement?.removeEventListener('scroll', handleScroll)
  scrollHandler = null
}

const onClickAction = (
  event: Event,
  action: { label: string; callback: (e: Event) => any }
) => {
  if (action.callback) {
    const output = action.callback(event)
    if (typeof output !== 'undefined') {
      hide(output)
    }
  }
}

onMounted(() => {
  document.querySelector('.app__wrapper')?.classList.add('-blur')
  if (props.requireScroll) bindScroll()
})

onBeforeUnmount(() => {
  document.querySelector('.app__wrapper')?.classList.remove('-blur')
  unbindScroll()
})
</script>
<style lang="scss">
.app__wrapper.-blur {
  filter: blur(0.25rem);
}
</style>
