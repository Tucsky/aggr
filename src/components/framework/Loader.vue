<template>
  <div
    class="loader"
    :class="[small && 'loader--small']"
    aria-label="Loading"
    role="status"
  />
</template>

<script>
export default {
  name: 'Loader',
  props: {
    small: {
      type: Boolean,
      default: false
    }
  }
}
</script>

<style lang="scss" scoped>
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

.loader {
  margin-inline: auto;
  border-radius: 50%;
  width: 1.5rem;
  height: 1.5rem;
  border: 0.25rem solid var(--theme-color-o20);
  border-top-color: currentColor;
  animation: spin 1s infinite linear;
  cursor: progress;
  flex-shrink: 0;

  &-wrapper {
    position: fixed;
    margin: auto;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
    z-index: +1000;
  }

  &--small {
    width: 0.75rem;
    height: 0.75rem;
  }
}
</style>
