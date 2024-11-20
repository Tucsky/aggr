<template>
  <transition name="indicator-detail" @after-leave="emit('close')">
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
              <span @click="dateIndex = (dateIndex + 1) % dates.length">
                {{ dates[dateIndex].label }} {{ dates[dateIndex].value }}
              </span>
            </small>
          </div>
          <div class="indicator-detail__detail">
            <div
              class="indicator-detail__description marked"
              v-html="description"
              @dblclick="editDescription"
            />
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
<script setup lang="ts">
import { ref, computed, onMounted, watch, getCurrentInstance } from 'vue'
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
import { ChartPaneState } from '@/store/panesSettings/chart'

// Props
const props = defineProps({
  indicator: {
    type: Object,
    required: true
  },
  paneId: {
    type: String,
    default: null
  }
})

// Emits
const emit = defineEmits(['add', 'reload', 'close'])

// Reactive data properties
const opened = ref(false)
const isInstalling = ref(false)
const isPublishing = ref(false)
const isFetchingVersions = ref(false)
const menuDropdownTrigger = ref(null)
const versionsDropdownTrigger = ref(null)
const fetchedVersions = ref(null)
const dateIndex = ref(0)
const communityTabEnabled = !!import.meta.env.VITE_APP_LIB_URL
const footerColor = computeThemeColorAlpha('background-150', 0.5)

// Computed properties
const isInstalled = computed(() => !!props.indicator.script)
const dates = computed(() => {
  const arr = []
  if (props.indicator.updatedAt) {
    arr.push({
      label: 'Updated',
      value: `${ago(props.indicator.updatedAt)} ago`
    })
  }
  if (props.indicator.createdAt) {
    arr.push({
      label: 'Created',
      value: `${ago(props.indicator.createdAt)} ago`
    })
  }
  return arr
})
const prId = computed(() =>
  props.indicator.pr ? props.indicator.pr.split('/').pop() : null
)
const authorUrl = computed(
  () =>
    `${import.meta.env.VITE_APP_LIB_REPO_URL}/tree/main/indicators/${props.indicator.author}`
)
const added = computed(() => {
  const store = getCurrentInstance()?.proxy.$store
  if (
    !props.paneId ||
    !(store.state[props.paneId] as ChartPaneState).indicators
  )
    return false
  return !!Object.values(
    (store.state[props.paneId] as ChartPaneState).indicators
  ).find(indicator => indicator.libraryId === props.indicator.id)
})
const versions = computed(
  () => props.indicator.versions || fetchedVersions.value || []
)
const description = computed(() => {
  if (!props.indicator.description)
    return isInstalled.value ? 'Add description' : ''
  return marked(props.indicator.description)
})

// Watchers
watch(
  () => props.indicator,
  async () => {
    if (isInstalling.value) {
      await addToChart()
    }
  },
  { immediate: true }
)

// Lifecycle hook
onMounted(() => {
  opened.value = true
})

// Methods
const close = () => {
  opened.value = false
}

const toggleMenuDropdown = event => {
  menuDropdownTrigger.value =
    event && !menuDropdownTrigger.value ? event.currentTarget : null
}

const toggleVersionsDropdown = async event => {
  if (event && !versionsDropdownTrigger.value) {
    if (!props.indicator.versions && !fetchedVersions.value) {
      await fetchIndicatorVersions()
    }
    versionsDropdownTrigger.value = event.target
  } else {
    versionsDropdownTrigger.value = null
  }
}

const onBackdropClick = event => {
  if (event.target === event.currentTarget) close()
}

const fetchIndicatorVersions = async () => {
  if (props.indicator.versions) return

  isFetchingVersions.value = true
  await sleep(1000)

  try {
    const response = await fetch(
      `${import.meta.env.VITE_APP_LIB_URL}versions/${props.indicator.jsonPath}`
    )
    fetchedVersions.value = await response.json()
  } catch {
    fetchedVersions.value = []
  } finally {
    isFetchingVersions.value = false
  }
}

const installIndicator = async (sha?: string) => {
  if (isInstalled.value) return

  isInstalling.value = true
  try {
    const indicator = await fetchIndicator(
      props.indicator.jsonPath,
      props.indicator.imagePath,
      sha
    )
    await importService.importIndicator(indicator, { addToChart: true })
  } catch (error) {
    console.error(error)
    const store = getCurrentInstance()?.proxy.$store
    store.dispatch('app/showNotice', {
      type: 'error',
      title: 'Failed to fetch indicator'
    })
  } finally {
    isInstalling.value = false
  }
}

const addToChart = () => {
  emit('add', props.indicator)
}

const editName = async () => {
  if (!isInstalled.value) return

  const name = await dialogService.prompt({
    label: 'Name',
    action: 'Rename',
    placeholder: props.indicator.name
  })

  if (name && name !== props.indicator.name) {
    await workspacesService.saveIndicator(
      {
        ...props.indicator,
        name,
        displayName: name
      },
      true
    )
    emit('reload')
  }
}

const editDescription = async () => {
  if (!isInstalled.value) return

  const description = await dialogService.prompt(
    {
      label: 'Description',
      action: 'Edit',
      placeholder: props.indicator.description,
      input: props.indicator.description,
      markdown: true
    },
    'edit-description'
  )

  if (description && description !== props.indicator.description) {
    await workspacesService.saveIndicator(
      {
        ...props.indicator,
        description
      },
      true
    )
    emit('reload')
  }
}

const publish = async () => {
  if (!isInstalled.value) return

  try {
    const url = await openPublishDialog(props.indicator)

    if (url) {
      await workspacesService.saveIndicator(
        {
          ...props.indicator,
          pr: url
        },
        true
      )
      emit('reload')
    }
  } catch (error) {
    console.error(error)
    const store = getCurrentInstance()?.proxy.$store
    store.dispatch('app/showNotice', {
      type: 'error',
      title: 'Failed to publish indicator'
    })
  }
}

const edit = async () => {
  const indicator = await dialogService.openAsPromise(EditResourceDialog, {
    item: props.indicator,
    ids: await workspacesService.getIndicatorsIds()
  })

  if (indicator) {
    if (indicator.id !== props.indicator.id) {
      await workspacesService.deleteIndicator(props.indicator.id)
    }
    await workspacesService.saveIndicator(indicator, true)
    emit('reload', indicator.id)
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

  &__description {
    margin: 0;
    flex-grow: 1;
  }

  &__detail {
    display: flex;
    gap: 1rem;
  }
}
</style>
