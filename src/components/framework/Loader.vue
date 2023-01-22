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
  margin: 0 auto;
  border-radius: 50%;
  width: 3em;
  height: 3em;
  border: 0.25rem solid var(--theme-color-o20);
  border-top-color: currentColor;
  animation: spin 1s infinite linear;

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
    width: 1em;
    height: 1em;
  }
}
</style>
