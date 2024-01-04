<template>
  <transition name="indicator-detail" @after-leave="$emit('close')">
    <div v-if="opened" class="indicator-detail" @click="onBackdropClick">
      <div class="indicator-detail__wrapper hide-scrollbar">
        <div class="indicator-detail__preview">
          <Btn class="indicator-detail__close -text" @click="close">
            <i class="icon-cross"></i>
          </Btn>
          <code class="indicator-detail__id -filled ml8">
            <small>#{{ indicator.id }}</small>
          </code>
          <img v-if="image" :src="image" />
        </div>
        <div class="indicator-detail__content">
          <div class="d-flex">
            <div class="indicator-detail__name">{{ indicator.name }}</div>
          </div>
          <p>{{ indicator.description }}</p>
        </div>
        <div class="indicator-detail__footer">
          <Btn
            v-if="!isInstalled"
            @click="installIndicator"
            :loading="isLoading"
            >Install</Btn
          >
          <Btn v-else @click="addToChart">Add to chart</Btn>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
import Btn from '@/components/framework/Btn.vue'
import importService from '@/services/importService'
export default {
  props: {
    indicator: {
      type: Object,
      required: true
    }
  },
  components: {
    Btn
  },
  data() {
    return {
      opened: false,
      isLoading: false
    }
  },
  computed: {
    isInstalled() {
      return !!this.indicator.script
    },
    image() {
      if (this.imageObjectUrl) {
        return this.imageObjectUrl
      }

      if (this.indicator.imagePath) {
        return `${import.meta.env.VITE_APP_LIB_URL}${this.indicator.imagePath}`
      }

      return null
    }
  },
  watch: {
    indicator: {
      immediate: true,
      handler() {
        this.loadPreview()
      }
    }
  },
  mounted() {
    this.opened = true
  },
  beforeDestroy() {
    if (this.imageObjectUrl) {
      URL.revokeObjectURL(this.imageObjectUrl)
      this.imageObjectUrl = null
    }
  },
  methods: {
    close() {
      this.opened = false
    },
    onBackdropClick(event) {
      if (event.target === event.currentTarget) {
        this.close()
      }
    },
    loadPreview() {
      this.clearPreview()

      if (this.isInstalled && this.indicator.preview) {
        this.imageObjectUrl = URL.createObjectURL(this.indicator.preview)
      }
    },
    clearPreview() {
      if (this.imageObjectUrl) {
        URL.revokeObjectURL(this.imageObjectUrl)
        this.imageObjectUrl = null
      }
    },
    async installIndicator() {
      if (this.isInstalled) {
        return
      }

      try {
        const indicator = await (
          await fetch(
            `${import.meta.env.VITE_APP_LIB_URL}${this.indicator.jsonPath}`
          )
        ).json()

        if (!indicator.data) {
          throw new Error('invalid payload')
        }

        if (this.image) {
          indicator.data.preview = await (await fetch(this.image)).blob()
        }

        importService.importIndicator(indicator)
      } catch (error) {
        console.error(error)
        this.$store.dispatch('app/showNotice', {
          type: 'error',
          title: 'Failed to fetch indicator'
        })
      } finally {
        this.isLoading = false
      }
    },
    addToChart() {
      this.$emit('add', this.indicator)
    }
  }
}
</script>
<style lang="scss" scoped>
.indicator-detail {
  $self: &;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 27;

  &__preview {
    height: 100px;
    width: 100%;
    position: relative;
    overflow: hidden;
    border-radius: 0.75rem 0.75rem 0 0;
    background-color: var(--theme-background-o75);

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 0.75rem 0.75rem 0 0;
    }
  }

  &__id {
    position: absolute;
    bottom: 0.5rem;
    left: 0.5rem;
  }

  &__close {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
  }

  &__name {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--theme-color-base);
  }

  &__wrapper {
    background-color: var(--theme-background-150);
    box-shadow: rgba(0, 0, 0, 0.2) 0px 18px 50px -10px;
    max-height: 80%;
    border-radius: 0.75rem;
    overflow-y: auto;
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
  }

  &__content {
    padding: 1rem;
  }

  &__footer {
    padding: 1rem;
    text-align: right;
  }

  &-enter-active {
    transition: opacity 0.2s ease-out;

    #{$self}__wrapper {
      transition: transform 0.3s $ease-out-expo;
    }
  }

  &-leave-active {
    transition: opacity 0.2s $ease-out-expo;
    pointer-events: all;

    #{$self}__wrapper {
      transition: transform 0.2s $ease-out-expo;
    }
  }

  &-enter,
  &-leave-to {
    opacity: 0;

    #{$self}__wrapper {
      transform: translateY(100%);
    }
  }
}
</style>
