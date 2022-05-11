<template>
  <div>
    <div class="form-group mb8">
      <label>
        Url <span v-if="originalUrl">(<a :href="originalUrl" v-text="originalUrlTrimmed" target="_blank"></a>)</span>
      </label>
      <input
        ref="input"
        type="text"
        class="form-control w-100"
        placeholder="ex: https://cryptopanic.com/widgets/news/?bg_color=FFFFFF&amp;font_family=sans&amp;header_bg_color=30343B&amp;header_text_color=FFFFFF&amp;link_color=0091C2&amp;news_feed=trending&amp;text_color=333333&amp;title=Latest%20News"
        :value="url"
        v-tippy
        title="Original URL"
        @change="$store.dispatch(paneId + '/setUrl', $event.target.value)"
      />
    </div>
    <div class="form-group">
      <label class="checkbox-control">
        <input type="checkbox" class="form-control" :checked="interactive" @change="$store.commit(paneId + '/TOGGLE_INTERACTIVE')" />
        <div></div>
        <span>Interactive</span>
      </label>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import Slider from '../framework/picker/Slider.vue'
import Thresholds from '../settings/Thresholds.vue'
@Component({
  components: { Thresholds, Slider },
  name: 'WebsiteSettings',
  props: {
    paneId: {
      type: String,
      required: true
    }
  }
})
export default class extends Vue {
  paneId: string
  originalUrl: string

  created() {
    this.originalUrl = this.$store.state[this.paneId].url
  }

  get originalUrlTrimmed() {
    if (this.originalUrl.length <= 33) {
      return this.originalUrl
    } else {
      return this.originalUrl.slice(0, 15) + '[...]' + this.originalUrl.substr(-15)
    }
  }

  get url() {
    return this.$store.state[this.paneId].url
  }

  get interactive() {
    return this.$store.state[this.paneId].interactive
  }
}
</script>
