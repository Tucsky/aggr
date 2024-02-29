<template>
  <div class="search-bar form-control">
    <input
      type="text"
      class="search-bar__input form-control w-100"
      placeholder="Search"
      :value="value"
      @input="$emit('input', $event.currentTarget.value)"
      v-autofocus
    />
    <slot />
  </div>
</template>

<script>
export default {
  props: {
    value: {
      type: String,
      default: ''
    }
  }
}
</script>
<style lang="scss" scoped>
.search-bar {
  position: relative;
  display: flex;
  gap: 0.5rem;

  &__input {
    border: 0;
    padding: 0;
    flex-grow: 1;
    min-height: 0;
  }

  > .btn {
    margin: -0.25rem;
  }
}
</style>
