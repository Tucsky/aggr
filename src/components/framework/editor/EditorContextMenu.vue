<template>
  <dropdown v-model="dropdownTrigger">
    <button @click.stop="$emit('cmd', ['zoom', 1])" class="dropdown-item">
      <i class="icon-plus"></i>
      <span>Zoom in</span>
    </button>
    <button @click.stop="$emit('cmd', ['zoom', -1])" class="dropdown-item">
      <i class="icon-minus"></i>
      <span>Zoom out</span>
    </button>
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
