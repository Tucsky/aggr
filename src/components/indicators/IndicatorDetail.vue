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
          <div class="indicator-detail__head">
            <div class="indicator-detail__name">
              <div @dblclick="editName">
                {{ indicator.displayName || indicator.name }}
              </div>

              <Btn
                v-if="isInstalled"
                class="-text -small indicator-detail__toggle"
                @click="toggleDropdown"
              >
                <i class="icon-more"></i>
              </Btn>
            </div>
            <small class="indicator-detail__subtitle">
              <span v-if="indicator.author">
                by
                <a :href="authorUrl" target="_blank">{{ indicator.author }}</a>
              </span>
              <span
                :title="dates[dateIndex].title"
                v-tippy="{ placement: 'top', distance: 24 }"
                @click="dateIndex = (dateIndex + 1) % dates.length"
              >
                {{ dates[dateIndex].value }}
              </span>
            </small>
          </div>
          <div class="indicator-detail__detail">
            <p
              class="indicator-detail__description"
              @dblclick="editDescription"
            >
              {{ indicator.description || 'Add description' }}
            </p>
            <ul class="indicator-detail__metadatas">
              <li
                v-if="indicator.pr"
                title="Publish request"
                v-tippy="{ placement: 'right', distance: 24 }"
              >
                <span>Publish</span>
                <a
                  target="_blank"
                  :href="indicator.pr"
                  class="indicator-detail__metadatas-value"
                >
                  #{{ prId }}
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div class="indicator-detail__footer">
          <Btn
            v-if="!isInstalled"
            @click="installIndicator"
            :loading="isInstalling"
            >Install</Btn
          >
          <Btn v-else @click="addToChart">
            <i class="icon-plus mr4"></i> Add
          </Btn>
        </div>

        <dropdown v-model="dropdownTrigger">
          <btn
            v-if="communityTabEnabled"
            class="dropdown-item -cases"
            :loading="isPublishing"
            @click="publish"
          >
            <i class="icon-external-link-square-alt"></i>
            <span>Publish</span>
          </btn>
          <Btn class="dropdown-item -cases" @click="edit">
            <i class="icon-edit"></i>
            <span>Edit</span>
          </Btn>
        </dropdown>
      </div>
    </div>
  </transition>
</template>

<script>
import Btn from '@/components/framework/Btn.vue'
import importService from '@/services/importService'
import { ago } from '@/utils/helpers'
import dialogService from '@/services/dialogService'
import workspacesService from '@/services/workspacesService'
import EditResourceDialog from '@/components/library/EditResourceDialog.vue'
import { openPublishDialog } from '@/components/library/helpers'

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
      isInstalling: false,
      isPublishing: false,
      dropdownTrigger: null,
      imageObjectUrl: null,
      dateIndex: 0,
      communityTabEnabled: !!import.meta.env.VITE_APP_LIB_URL
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
    },
    createdAt() {
      if (this.indicator.createdAt) {
        return `${ago(this.indicator.createdAt)} ago`
      }

      return null
    },
    updatedAt() {
      if (this.indicator.updatedAt) {
        return `${ago(this.indicator.updatedAt)} ago`
      }

      return null
    },
    dates() {
      const arr = []

      if (this.indicator.updatedAt) {
        arr.push({
          title: 'Updated at',
          label: 'Updated',
          value: `${ago(this.indicator.updatedAt)} ago`
        })
      }

      if (this.indicator.createdAt) {
        arr.push({
          title: 'Created at',
          label: 'Created',
          value: `${ago(this.indicator.createdAt)} ago`
        })
      }

      return arr
    },
    prId() {
      if (this.indicator.pr) {
        return this.indicator.pr.split('/').pop()
      }

      return null
    },
    authorUrl() {
      return `${import.meta.env.VITE_APP_LIB_REPO_URL}/tree/main/indicators/${
        this.indicator.author
      }`
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
    toggleDropdown(event) {
      if (event && !this.dropdownTrigger) {
        this.dropdownTrigger = event.currentTarget
      } else {
        this.dropdownTrigger = null
      }
    },
    onBackdropClick(event) {
      if (event.target === event.currentTarget) {
        this.close()
      }
    },
    loadPreview() {
      this.clearPreview()

      const preview = this.indicator.preview

      if (
        this.isInstalled &&
        (preview instanceof Blob || preview instanceof File)
      ) {
        this.imageObjectUrl = URL.createObjectURL(preview)
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
        this.isInstalling = false
      }
    },
    addToChart() {
      this.$emit('add', this.indicator)
    },
    async editName() {
      if (!this.isInstalled) {
        return
      }

      const name = await dialogService.prompt({
        label: 'Name',
        action: 'Rename',
        placeholder: this.indicator.name
      })

      if (name && name !== this.indicator.name) {
        await workspacesService.saveIndicator(
          {
            ...this.indicator,
            name,
            displayName: name
          },
          true
        )

        this.$emit('reload')
      }
    },
    async editDescription() {
      if (!this.isInstalled) {
        return
      }

      const description = await dialogService.prompt({
        label: 'Description',
        action: 'Edit',
        placeholder: this.indicator.description,
        input: this.indicator.description,
        tag: 'textarea'
      })

      if (description && description !== this.indicator.description) {
        await workspacesService.saveIndicator(
          {
            ...this.indicator,
            description
          },
          true
        )

        this.$emit('reload')
      }
    },
    async publish() {
      if (!this.isInstalled) {
        return
      }

      try {
        const url = await openPublishDialog(this.indicator)

        if (url) {
          await workspacesService.saveIndicator(
            {
              ...this.indicator,
              pr: url
            },
            true
          )
          this.$emit('reload')
        }
      } catch (error) {
        console.error(error)
        this.$store.dispatch('app/showNotice', {
          type: 'error',
          title: 'Failed to publish indicator'
        })
      }
    },
    async edit() {
      const indicator = await dialogService.openAsPromise(EditResourceDialog, {
        item: this.indicator,
        ids: await workspacesService.getIndicatorsIds()
      })

      if (indicator) {
        if (indicator.id !== this.indicator.id) {
          await workspacesService.deleteIndicator(this.indicator.id)
        }

        await workspacesService.saveIndicator(indicator, true)
        this.$emit('reload', indicator.id)
      }
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
    display: flex;
    justify-content: space-between;
    gap: 1rem;
  }

  &__subtitle {
    display: flex;
    gap: 0.25rem;

    > span:not(:last-child):after {
      content: ',';
    }
  }

  &__toggle {
    margin: -0.25rem -0.25rem 0 0;
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
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  &__metadatas {
    $metadatas: &;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    text-align: right;
    flex-shrink: 0;
    gap: 1rem;
    margin: 0.25rem 0 0;
    font-size: 0.75rem;
    padding: 0;
    color: var(--theme-buy-base);

    li {
      display: flex;
      align-items: flex-end;
      flex-direction: column;

      #{$metadatas}-value {
        font-size: 1rem;
        color: var(--theme-buy-200);
      }

      a {
        text-decoration: underline;
      }
    }
  }

  &__footer {
    padding: 1rem;
    text-align: right;
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
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

  &__description {
    margin: 0;
    flex-grow: 1;
    white-space: pre-line;
  }

  &__detail {
    display: flex;
    gap: 1rem;
  }
}
</style>
