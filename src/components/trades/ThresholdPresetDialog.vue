<template>
  <transition name="dialog" :duration="300" @after-leave="close">
    <Dialog v-if="opened" @close="hide">
      <template v-slot:header>
        <div class="dialog__title">Configure preset</div>
      </template>
      <form @submit.prevent="submit">
        <div class="form-group mb8">
          <label>Choose what to include in preset</label>

          <label class="checkbox-control mt16">
            <input
              type="checkbox"
              class="form-control"
              v-model="includeAmounts"
            />
            <div></div>
            <span>Amounts</span>
          </label>
        </div>
        <div class="form-group mb8">
          <label class="checkbox-control">
            <input
              type="checkbox"
              class="form-control"
              v-model="includeColors"
            />
            <div></div>
            <span>Colors</span>
          </label>
        </div>
        <div class="form-group mb8">
          <label class="checkbox-control">
            <input
              type="checkbox"
              class="form-control"
              v-model="includeAudio"
            />
            <div></div>
            <span>Audio</span>
          </label>
        </div>
      </form>

      <template v-slot:footer>
        <button type="button" class="btn -text mr8" @click="hide(false)">
          Cancel
        </button>
        <button type="button" @click="submit" class="btn -large -green">
          <i class="icon-check mr4"></i> Submit
        </button>
      </template>
    </Dialog>
  </transition>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useDialog } from '@/composables/useDialog'
import Dialog from '@/components/framework/Dialog.vue'

defineEmits(['close'])
const { hide, close, opened } = useDialog()

const includeAmounts = ref(false)
const includeColors = ref(true)
const includeAudio = ref(true)

const submit = () => {
  hide({
    amounts: includeAmounts.value,
    colors: includeColors.value,
    audios: includeAudio.value
  })
}
</script>
