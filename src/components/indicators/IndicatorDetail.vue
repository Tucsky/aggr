<template>
  <transition name="indicator-detail" @after-leave="$emit('close')">
    <div v-if="opened" class="indicator-detail" @click="onBackdropClick">
      <div class="indicator-detail__wrapper hide-scrollbar">
        <IndicatorPreview
          class="indicator-detail__preview"
          :id="indicator.id"
          :preview="indicator.preview"
          :path="indicator.imagePath"
          :is-installed="isInstalled"
          @close="close"
        ></IndicatorPreview>
        <div class="indicator-detail__content">
          <div class="indicator-detail__head">
            <div class="indicator-detail__name">
              <div @dblclick="editName">
                {{ indicator.displayName || indicator.name }}
              </div>

              <Btn
                v-if="isInstalled"
                class="-text -small indicator-detail__toggle"
                @click="toggleMenuDropdown"
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
            <div class="indicator-detail__inner">
              <p
                class="indicator-detail__description"
                v-html="description"
                @dblclick="editDescription"
              />

              <div class="indicator-detail__options">
                <template v-for="(value, key) in options">
                  <div
                    v-if="
                      value && key !== 'priceScaleId' && key !== 'scaleMargins'
                    "
                    v-tippy
                    :title="key"
                    :key="`${key}`"
                    class="badge -outline indicator-detail__option"
                  >
                    {{ value.toString().replace(' ', '') }}
                  </div>
                </template>
              </div>
            </div>
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
        <div
          class="indicator-detail__footer"
          :style="{ backgroundColor: footerColor }"
        >
          <div v-if="!isInstalled" class="btn-group d-flex">
            <Btn
              @click="installIndicator()"
              :loading="isInstalling"
              :disabled="isInstalling || isFetchingVersions"
              >Install</Btn
            >
            <Btn
              @click="toggleVersionsDropdown"
              :loading="isFetchingVersions"
              :disabled="isInstalling || isFetchingVersions"
              :class="[!isFetchingVersions && '-arrow']"
            />
          </div>
          <Btn v-else @click="addToChart">
            <i class="icon-plus mr4"></i> Add {{ added ? 'again' : '' }}
          </Btn>
        </div>

        <dropdown v-model="menuDropdownTrigger">
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

        <dropdown v-model="versionsDropdownTrigger">
          <template v-if="!versions.length && fetchedVersions">
            <div class="px8 text-danger">No history available</div>
          </template>
          <template v-else>
            <btn
              v-for="item in versions"
              :key="item.sha"
              class="dropdown-item -cases"
              :loading="isPublishing"
              @click="installIndicator(item.sha)"
            >
              {{ item.date }}
            </btn>
          </template>
        </dropdown>
      </div>
    </div>
  </transition>
</template>

<script lang="ts">
import Btn from '@/components/framework/Btn.vue'
import importService from '@/services/importService'
import { ago, sleep } from '@/utils/helpers'
import dialogService from '@/services/dialogService'
import workspacesService from '@/services/workspacesService'
import EditResourceDialog from '@/components/library/EditResourceDialog.vue'
import { openPublishDialog, fetchIndicator } from '@/components/library/helpers'
import { computeThemeColorAlpha } from '@/utils/colors'
import IndicatorPreview from './IndicatorPreview.vue'
import { marked } from 'marked'

export default {
  props: {
    indicator: {
      type: Object,
      required: true
    },
    paneId: {
      type: String,
      default: null
    }
  },
  components: {
    Btn,
    IndicatorPreview
  },
  data() {
    return {
      opened: false,
      isInstalling: false,
      isPublishing: false,
      isFetchingVersions: false,
      menuDropdownTrigger: null,
      versionsDropdownTrigger: null,
      imageObjectUrl: null,
      fetchedVersions: null,
      dateIndex: 0,
      communityTabEnabled: !!import.meta.env.VITE_APP_LIB_URL,
      footerColor: computeThemeColorAlpha('background-150', 0.5)
    }
  },
  computed: {
    isInstalled() {
      return !!this.indicator.script
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
    },
    added() {
      if (!this.paneId || !this.$store.state[this.paneId].indicators) {
        return false
      }

      return !!Object.values(this.$store.state[this.paneId].indicators).find(
        indicator => indicator.libraryId === this.indicator.id
      )
    },
    options() {
      if (!this.indicator.options) {
        return {}
      }

      return Object.keys(this.indicator.options).reduce((acc, key) => {
        const value = this.indicator.options[key]
        if (!value || typeof value === 'object') {
          return acc
        }

        acc[key] = value
        return acc
      }, {})
    },
    versions() {
      return this.indicator.versions || this.fetchedVersions || []
    },
    description() {
      if (!this.indicator.description) {
        if (this.installed) {
          return 'Add description'
        }

        return ''
      }

      console.log('do marked')
      return marked(this.indicator.description)
    }
  },
  watch: {
    indicator: {
      immediate: true,
      handler() {
        if (this.isInstalling) {
          this.addToChart()
        }
      }
    }
  },
  mounted() {
    this.opened = true
  },
  methods: {
    close() {
      this.opened = false
    },
    toggleMenuDropdown(event) {
      if (event && !this.menuDropdownTrigger) {
        this.menuDropdownTrigger = event.currentTarget
      } else {
        this.menuDropdownTrigger = null
      }
    },
    async toggleVersionsDropdown(event) {
      if (event && !this.versionsDropdownTrigger) {
        if (!this.indicator.versions && !this.fetchedVersions) {
          await this.fetchIndicatorVersions()
        }
        this.versionsDropdownTrigger = event.target
      } else {
        this.versionsDropdownTrigger = null
      }
    },
    onBackdropClick(event) {
      if (event.target === event.currentTarget) {
        this.close()
      }
    },
    async fetchIndicatorVersions() {
      if (this.indicator.versions) {
        return
      }

      this.isFetchingVersions = true

      await sleep(1000)

      try {
        this.fetchedVersions = await (
          await fetch(
            `${import.meta.env.VITE_APP_LIB_URL}versions/${
              this.indicator.jsonPath
            }`
          )
        ).json()
      } catch {
        this.fetchedVersions = []
      } finally {
        this.isFetchingVersions = false
      }
    },
    async installIndicator(sha) {
      if (this.isInstalled) {
        return
      }

      this.isInstalling = true

      try {
        const indicator = await fetchIndicator(
          this.indicator.jsonPath,
          this.indicator.imagePath,
          sha
        )

        await importService.importIndicator(indicator, false, true)
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

      const description = await dialogService.prompt(
        {
          label: 'Description',
          action: 'Edit',
          placeholder: this.indicator.description,
          input: this.indicator.description,
          markdown: true
        },
        'edit-description'
      )

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
    border-radius: 0.75rem 0.75rem 0 0;
    max-height: 420px;
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
    position: sticky;
    bottom: 0;
    backdrop-filter: blur(0.5rem);
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

  &__inner {
    flex-grow: 1;
  }

  &__description {
    margin: 0;
  }

  &__options {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  &__option {
    padding-block: 0.25rem;
    letter-spacing: 1px;
    font-size: 10px;
    font-family: $font-monospace;
  }

  &__detail {
    display: flex;
    gap: 1rem;
  }
}
</style>
