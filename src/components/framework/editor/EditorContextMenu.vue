<template>
  <dropdown v-model="dropdownTrigger">
    <div class="d-flex btn-group" style="width: 135px">
      <button
        type="button"
        class="btn -green"
        @click.stop="$emit('cmd', ['zoom', -1])"
      >
        <i class="icon-minus"></i>
      </button>
      <button
        type="button"
        class="btn -green text-monospace flex-grow-1 text-center -cases"
        @click.stop="$emit('cmd', ['zoom', 14, true])"
      >
        <div class="text-center w-100">
          {{ currentEditorOptions.fontSize.toFixed(0) }}px
        </div>
      </button>
      <button
        type="button"
        class="btn -green"
        @click.stop="$emit('cmd', ['zoom', 1])"
      >
        <i class="icon-plus"></i>
      </button>
    </div>
    <div class="dropdown-item" @click.stop>
      <label class="checkbox-control -small" @mousedown.prevent>
        <input
          type="checkbox"
          class="form-control"
          :checked="currentEditorOptions.wordWrap === 'on'"
          @change="$emit('cmd', ['toggleWordWrap', !$event.target.checked])"
        />
        <div></div>
        <span>Word Wrap</span>
      </label>
    </div>
    <a
      class="dropdown-item mb8"
      href="https://github.com/Tucsky/aggr/wiki/introduction-to-scripting"
      target="_blank"
      title="Scripting documentation"
      v-tippy
      @click.stop
    >
      <label class="checkbox-control -small" @mousedown.prevent>
        <i class="dropdown-item__icon icon-external-link-square-alt mr8"></i>
        <span>Wiki</span>
      </label>
    </a>
  </dropdown>
</template>

<script lang="ts">
export default {
  name: 'EditorContextMenu',
  props: {
    value: {
      type: Object,
      default: null
    },
    editorOptions: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      dropdownTrigger: null,
      currentEditorOptions: this.editorOptions
    }
  },
  watch: {
    value(value) {
      this.dropdownTrigger = value
    },
    editorOptions(value) {
      this.currentEditorOptions = value
    }
  },
  mounted() {
    this.dropdownTrigger = this.value
  }
}
</script>
