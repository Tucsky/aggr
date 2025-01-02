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
        v-for="emoji in emojis"
        :key="emoji"
        v-html="emoji"
        class="emoji-picker__emoji"
      ></li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

// Define the emojisRanges constant
const emojisRanges: [number, number][] = [
  [128513, 128591],
  [128640, 128704],
  [127757, 127999],
  [128000, 128359]
]

// Reactive state for the current index
const index = ref(0)

// Computed property to determine if the previous button should be enabled
const canPrev = computed(() => index.value > 0)

// Computed property to determine if the next button should be enabled
const canNext = computed(() => index.value < emojisRanges.length - 1)

// Computed property to generate the list of emojis based on the current range
const emojis = computed(() => {
  const [start, end] = emojisRanges[index.value]
  const list: string[] = []

  for (let i = start; i < end; i++) {
    list.push(`&#${i};`)
  }

  return list
})

// Define the emit function for the 'emoji' event
const emit = defineEmits<{
  (event: 'emoji', emoji: string): void
}>()

// Method to handle click events on the emoji list
const onClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (target.tagName === 'LI') {
    // Decode the HTML entity to get the actual emoji character
    const parser = new DOMParser()
    const doc = parser.parseFromString(target.innerHTML, 'text/html')
    const emojiText = doc.body.textContent || ''
    emit('emoji', emojiText)
  }
}

// Method to navigate to the previous emoji range
const prev = () => {
  if (index.value > 0) {
    index.value--
  }
}

// Method to navigate to the next emoji range
const next = () => {
  if (index.value < emojisRanges.length - 1) {
    index.value++
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
