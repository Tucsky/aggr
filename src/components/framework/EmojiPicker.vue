<template>
  <div class="emoji-picker">
    <div class="emoji-picker__controls">
      <button
        type="button"
        class="btn -text -small"
        @click="prev"
        :disabled="!canPrev"
      >
        <i class="icon-up" />
      </button>
      <button
        type="button"
        class="btn -text -small"
        @click="next"
        :disabled="!canNext"
      >
        <i class="icon-down" />
      </button>
    </div>
    <ul class="emoji-picker__list hide-scrollbar" @click="onClick">
      <li
        v-for="emoji of emojis"
        :key="emoji"
        v-html="emoji"
        class="emoji-picker__emoji"
      ></li>
    </ul>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
const emojisRanges = [
  [128513, 128591],
  [128640, 128704],
  [127757, 127999],
  [128000, 128359]
]

@Component({
  name: 'EmojiPicker'
})
export default class EmojiPicker extends Vue {
  index = 0

  get canPrev() {
    return this.index > 0
  }

  get canNext() {
    return this.index < emojisRanges.length - 1
  }

  get emojis() {
    const list = []

    for (
      let i = emojisRanges[this.index][0];
      i < emojisRanges[this.index][1];
      i++
    ) {
      list.push(`&#${i};`)
    }

    return list
  }

  onClick(event) {
    if (event.target.tagName === 'LI') {
      this.$emit('emoji', event.target.innerText)
    }
  }

  prev() {
    if (this.index === 0) {
      return
    }

    this.index--
  }

  next() {
    if (this.index === emojisRanges.length - 1) {
      return
    }

    this.index++
  }
}
</script>

<style lang="scss" scoped>
.emoji-picker {
  display: flex;
  flex-direction: column;
  min-height: 1px;
  position: relative;

  &__controls {
    display: flex;
    gap: 0.25rem;
    margin-bottom: 0.25rem;
    justify-content: space-between;
    position: absolute;
    left: 0;
    right: 0;
    margin-top: 1rem;
    align-items: center;
    top: 0;
    bottom: 0;
    pointer-events: none;

    .btn {
      pointer-events: all;
      position: relative;
      z-index: 1;

      &:hover {
        transform: scale(1.5);
      }

      &[disabled] {
        opacity: 0;
        transform: 1;
      }
    }

    i {
      display: inline-block;
      transform: rotateZ(-90deg);
    }
  }

  &__list {
    display: flex;
    flex-wrap: wrap;
    list-style: none;
    margin: 0 1rem;
    padding: 1rem 0;
    overflow: auto;
    position: relative;
    justify-content: center;
  }

  &__emoji {
    display: flex;
    align-items: center;
    justify-items: center;
    cursor: pointer;
    transition: transform 0.2s $ease-elastic;
    padding: 0.25rem;
    width: 2rem;
    font-size: 1.5rem;

    &:hover {
      transform: scale(1.1);
    }

    &:active {
      transform: scale(0.9);
    }
  }
}
</style>
