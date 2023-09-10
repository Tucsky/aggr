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
        @change="$store.dispatch(paneId + '/setUrl', $event.target.value)"
      />
      <p class="text-muted mt4" v-if="originalUrl">
        Currently set to
        <a :href="originalUrl" v-text="originalUrlTrimmed" target="_blank"></a>
      </p>
    </div>
    <div class="form-group mb16">
      <label
        >Automatic reload
        <i
          class="icon-info"
          v-tippy
          title="Automaticaly reload the website after some time"
        ></i
      ></label>
      <dropdown-button
        :value="reloadTimer"
        :options="{
          0: 'Never',
          '10s': 'every 10 seconds',
          '1m': 'every minute',
          '15m': 'every 15 minutes',
          '30m': 'every 30 minutes',
          '1h': 'every hour',
          '2h': 'every 2 hours',
          '4h': 'every 4 hours'
        }"
        placeholder="Never"
        class="-outline form-control -arrow"
        @input="$store.commit(paneId + '/SET_RELOAD_TIMER', $event)"
      ></dropdown-button>
    </div>
    <div class="form-group mb8">
      <label class="checkbox-control">
        <input
          type="checkbox"
          class="form-control"
          :checked="interactive"
          @change="$store.commit(paneId + '/TOGGLE_INTERACTIVE')"
        />
        <div></div>
        <span
          >Interactive
          <i
            class="icon-info"
            v-tippy="{ theme: 'left' }"
            title="Allow interaction (click, scroll etc)<br>Keep it OFF to move the pane around with ease."
          ></i
        ></span>
      </label>
    </div>
    <div class="form-group">
      <label class="checkbox-control">
        <input
          type="checkbox"
          class="form-control"
          :checked="invert"
          @change="$store.commit(paneId + '/TOGGLE_INVERT')"
        />
        <div></div>
        <span
          >Invert
          <i
            class="icon-info"
            v-tippy="{ theme: 'left' }"
            title="Invert site colors"
          ></i
        ></span>
      </label>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import Slider from '../framework/picker/Slider.vue'
import DropdownButton from '@/components/framework/DropdownButton.vue'

@Component({
  components: { Slider, DropdownButton },
  name: 'WebsiteSettings',
  props: {
    paneId: {
      type: String,
      required: true
    }
  }
})
export default class WebsiteSettings extends Vue {
  paneId: string
  originalUrl: string

  $refs!: {
    input: HTMLInputElement
  }

  get originalUrlTrimmed() {
    const url = this.originalUrl.replace(/https?:\/\/(www\.)?/, '')

    if (url.length <= 16) {
      return url
    } else {
      return url.slice(0, 8) + '[...]' + url.substr(-8)
    }
  }

  get url() {
    return this.$store.state[this.paneId].url
  }

  get interactive() {
    return this.$store.state[this.paneId].interactive
  }

  get invert() {
    return this.$store.state[this.paneId].invert
  }

  get reloadTimer() {
    return this.$store.state[this.paneId].reloadTimer
  }

  created() {
    this.originalUrl = this.$store.state[this.paneId].url
  }

  async mounted() {
    if (!this.originalUrl) {
      await this.$nextTick()
      this.$refs.input.focus()
    }
  }
}
</script>
