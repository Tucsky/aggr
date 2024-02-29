<template>
  <Dialog @clickOutside="close" class="indicator-preset-dialog" size="medium">
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
                @input="toggleType(true, $event.target.checked)"
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
                @input="toggleType(false, $event.target.checked)"
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
      <a href="javascript:void(0);" class="btn -text mr8" @click="close(false)">
        Cancel
      </a>

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
</template>

<script>
import DialogMixin from '@/mixins/dialogMixin'
import { getIndicatorOptionType } from './options'

export default {
  mixins: [DialogMixin],
  props: {
    plotTypes: {
      type: Array,
      required: true
    },
    keys: {
      type: Array,
      required: true
    },
    originalKeys: {
      type: Array,
      default: null
    }
  },
  data() {
    return {
      selection: this.keys.reduce((acc, key) => {
        acc[key] =
          this.originalKeys && this.originalKeys.indexOf(key) !== -1
            ? true
            : false
        return acc
      }, {}),
      form: {
        colors: false,
        values: true,
        script: false
      }
    }
  },
  computed: {
    count() {
      return Object.values(this.selection).reduce(
        (acc, value) => {
          if (value) {
            acc++
          }

          return acc
        },
        this.form.script ? 1 : 0
      )
    },
    submitLabel() {
      if (!this.count) {
        return 'No selection'
      }

      const scriptCount = this.form.script ? 1 : 0
      const optionsCount = this.count - scriptCount

      const included = []

      if (optionsCount) {
        included.push(`${optionsCount} option${optionsCount > 1 ? 's' : ''}`)
      }

      if (scriptCount) {
        included.push(`the code`)
      }
      return included.join(' + ')
    }
  },
  mounted() {
    if (!this.originalKeys) {
      this.form.colors = true
      this.toggleType(true, true)
    }
  },
  methods: {
    submit() {
      this.close({
        selection: this.selection,
        script: this.form.script
      })
    },
    toggleType(color, value) {
      for (const key of this.keys) {
        const type = getIndicatorOptionType(key, this.plotTypes)

        if ((color && type !== 'color') || (!color && type === 'color')) {
          continue
        }

        this.selection[key] = value
      }
    },
    toggleOption(key) {
      this.selection[key] = !this.selection[key]
    }
  }
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
