<template>
  <div>
    <div class="form-group mb16">
      <label>
        Url
        <i
          class="icon-info mr8"
          v-tippy
          title="Some url might not work because of the cross domain policy in place for that website"
        ></i>
      </label>
      <input
        ref="input"
        type="text"
        class="form-control w-100"
        placeholder="ex: https://cryptopanic.com/widgets/news/?bg_color=FFFFFF&amp;font_family=sans&amp;header_bg_color=30343B&amp;header_text_color=FFFFFF&amp;link_color=0091C2&amp;news_feed=trending&amp;text_color=333333&amp;title=Latest%20News"
        :value="url"
        @input="updateUrl"
      />
      <p class="text-muted mt4" v-if="originalUrl">
        Currently set to
        <a :href="originalUrl" v-text="originalUrlTrimmed" target="_blank"></a>
      </p>
    </div>
    <div class="form-group mb16">
      <label>
        Automatic reload
        <i
          class="icon-info"
          v-tippy
          title="Automaticaly reload the website after some time"
        ></i>
      </label>
      <dropdown-button
        :value="reloadTimer"
        :options="reloadOptions"
        placeholder="Never"
        class="-outline form-control -arrow"
        @input="setReloadTimer"
      ></dropdown-button>
    </div>
    <div class="form-group mb8">
      <label class="checkbox-control">
        <input
          type="checkbox"
          class="form-control"
          :checked="interactive"
          @change="toggleInteractive"
        />
        <div></div>
        <span>
          Interactive
          <i
            class="icon-info"
            v-tippy="{ theme: 'left' }"
            title="Allow interaction (click, scroll etc)<br>Keep it OFF to move the pane around with ease."
          ></i>
        </span>
      </label>
    </div>
    <div class="form-group">
      <label class="checkbox-control">
        <input
          type="checkbox"
          class="form-control"
          :checked="invert"
          @change="toggleInvert"
        />
        <div></div>
        <span>
          Invert
          <i
            class="icon-info"
            v-tippy="{ theme: 'left' }"
            title="Invert site colors"
          ></i>
        </span>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import store from '@/store'
import DropdownButton from '@/components/framework/DropdownButton.vue'

// Define props with types
const props = defineProps<{
  paneId: string
}>()

// Define refs for template refs
const input = ref<HTMLInputElement | null>(null)

// Define a constant for originalUrl
const originalUrl = store.state[props.paneId].url

// Computed property to get url from the store
const url = computed(() => store.state[props.paneId].url)

// Computed properties for interactive and invert
const interactive = computed(() => store.state[props.paneId].interactive)
const invert = computed(() => store.state[props.paneId].invert)

// Computed property for reloadTimer
const reloadTimer = computed(() => store.state[props.paneId].reloadTimer)

// Define reload options
const reloadOptions: Record<string, string> = {
  '0': 'Never',
  '10s': 'every 10 seconds',
  '1m': 'every minute',
  '15m': 'every 15 minutes',
  '30m': 'every 30 minutes',
  '1h': 'every hour',
  '2h': 'every 2 hours',
  '4h': 'every 4 hours'
}

// Computed property to trim the original URL
const originalUrlTrimmed = computed(() => {
  if (!originalUrl) return ''
  const urlTrimmed = originalUrl.replace(/https?:\/\/(www\.)?/, '')

  if (urlTrimmed.length <= 16) {
    return urlTrimmed
  } else {
    return `${urlTrimmed.slice(0, 8)}[...]${urlTrimmed.slice(-8)}`
  }
})

// Methods to commit mutations to the store
const updateUrl = (event: InputEvent) => {
  const target = event.currentTarget as HTMLInputElement
  store.commit(`${props.paneId}/setUrl`, target.value)
}

const setReloadTimer = (newTimer: string) => {
  store.commit(`${props.paneId}/SET_RELOAD_TIMER`, newTimer)
}

const toggleInteractive = () => {
  store.commit(`${props.paneId}/TOGGLE_INTERACTIVE`)
}

const toggleInvert = () => {
  store.commit(`${props.paneId}/TOGGLE_INVERT`)
}

// Lifecycle hook to focus input if originalUrl is not set
onMounted(() => {
  if (!originalUrl) {
    input.value?.focus()
  }
})
</script>
