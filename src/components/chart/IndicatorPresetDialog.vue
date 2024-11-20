<template>
  <transition name="dialog" :duration="300" @after-leave="close">
    <Dialog
      v-if="opened"
      @close="hide"
      class="indicator-preset-dialog"
      size="medium"
    >
      <template v-slot:header>
        <div class="dialog__title">Configure preset</div>
      </template>
      <form ref="form" @submit.prevent="submit">
        <p class="mt0 mb0">Choose what to include</p>
        <div class="d-flex">
          <div>
            <div class="form-group mb8">
              <label class="checkbox-control mt16">
                <input
                  type="checkbox"
                  class="form-control"
                  v-model="form.colors"
                  @input="onToggle(true, $event)"
                />
                <div></div>
                <span>Colors</span>
                <i
                  class="icon-info pl4"
                  v-tippy="{ placement: 'top', distance: 16 }"
                  title="Toggle all color options"
                />
              </label>
            </div>
            <div class="form-group mb8">
              <label class="checkbox-control">
                <input
                  type="checkbox"
                  class="form-control"
                  v-model="form.values"
                  @input="onToggle(false, $event)"
                />
                <div></div>
                <span>Options</span>
                <i
                  class="icon-info pl4"
                  v-tippy="{ placement: 'top', distance: 16 }"
                  title="Toggle all other options"
                />
              </label>
            </div>
            <div class="form-group mb8">
              <label class="checkbox-control">
                <input
                  type="checkbox"
                  class="form-control"
                  v-model="form.script"
                />
                <div></div>
                <span>Script</span>
                <i
                  class="icon-info pl4"
                  v-tippy="{ placement: 'top', distance: 16 }"
                  title="Include script in preset"
                />
              </label>
            </div>
          </div>
        </div>

        <div class="indicator-preset-dialog__grid mt8">
          <button
            type="button"
            class="btn indicator-preset-dialog__item -small"
            :class="[selection[key] ? '-green' : '-text']"
            @click="toggleOption(key)"
            v-for="(key, index) in keys"
            :key="index"
          >
            {{ key }}
          </button>
          <button
            type="button"
            class="btn indicator-preset-dialog__item -small"
            :class="[form.script ? '-green' : '-text']"
            @click="form.script = !form.script"
          >
            Script
          </button>
        </div>
      </form>

      <template v-slot:footer>
        <button class="btn -text mr8" @click="hide(false)">Cancel</button>
        <button type="button" @click="submit" class="btn -green -pill">
          <span
            v-if="count > 0"
            class="badge -red ml8"
            v-text="count"
            v-tippy
            :title="submitLabel"
          ></span>
          <span><i class="icon-save mr8"></i> Save</span>
        </button>
      </template>
    </Dialog>
  </transition>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useDialog } from '@/composables/useDialog'
import Dialog from '@/components/framework/Dialog.vue'
import { getIndicatorOptionType } from './options'

const props = defineProps({
  plotTypes: {
    type: Array as () => string[],
    required: true
  },
  keys: {
    type: Array as () => string[],
    required: true
  },
  originalKeys: {
    type: Array as () => string[] | null,
    default: null
  }
})

// Initialize dialog logic
const { opened, close, hide } = useDialog()
defineExpose({ close })

const selection = ref(
  props.keys.reduce((acc: Record<string, boolean>, key: string) => {
    acc[key] =
      props.originalKeys && props.originalKeys.includes(key) ? true : false
    return acc
  }, {})
)

const form = ref({
  colors: false,
  values: true,
  script: false
})

const count = computed(() => {
  return Object.values(selection.value).reduce(
    (acc, value) => {
      if (value) {
        acc++
      }
      return acc
    },
    form.value.script ? 1 : 0
  )
})

const submitLabel = computed(() => {
  if (!count.value) {
    return 'No selection'
  }

  const scriptCount = form.value.script ? 1 : 0
  const optionsCount = count.value - scriptCount
  const included = []

  if (optionsCount) {
    included.push(`${optionsCount} option${optionsCount > 1 ? 's' : ''}`)
  }
  if (scriptCount) {
    included.push('the code')
  }
  return included.join(' + ')
})

onMounted(() => {
  if (!props.originalKeys) {
    form.value.colors = true
    toggleType(true, true)
  }
})

const submit = () => {
  hide({
    selection: selection.value,
    script: form.value.script
  })
}

const onToggle = (color: boolean, event: Event) => {
  toggleType(color, (event.target as HTMLInputElement).checked)
}

const toggleType = (color: boolean, value: boolean) => {
  for (const key of props.keys) {
    const type = getIndicatorOptionType(key, props.plotTypes)

    if ((color && type !== 'color') || (!color && type === 'color')) {
      continue
    }

    selection.value[key] = value
  }
}

const toggleOption = (key: string) => {
  selection.value[key] = !selection.value[key]
}
</script>

<style lang="scss" scoped>
.indicator-preset-dialog {
  &__grid {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  &__item {
    text-transform: none;
  }
}
</style>
