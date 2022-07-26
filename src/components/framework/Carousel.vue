<template>
  <div
    class="carousel"
    :class="[
      canRight && 'carousel--can-right',
      canLeft && 'carousel--can-left'
    ]"
  >
    <div class="carousel__wrapper" @scroll="onScroll" ref="scroller">
      <vnodes :vnodes="this.$slots.default" />
    </div>
  </div>
</template>

<script lang="ts">
export default {
  name: 'Carousel',
  components: {
    Vnodes: {
      functional: true,
      render: (h, ctx) => ctx.props.vnodes
    }
  },
  data: () => ({
    canRight: false,
    canLeft: false
  }),
  mounted() {
    this.$nextTick().then(() => this.onScroll())
  },
  methods: {
    onScroll() {
      const { scrollWidth, scrollLeft, clientWidth } = this.$refs.scroller

      this.canLeft = scrollLeft > 0

      this.canRight = scrollLeft < scrollWidth - clientWidth
    },
    goLeft() {
      const element = this.$refs.scroller as HTMLElement

      element.scroll({
        left: Math.max(0, element.scrollLeft - element.clientWidth),
        behavior: 'smooth'
      })
    },
    goRight() {
      const element = this.$refs.scroller as HTMLElement

      const { scrollWidth, scrollLeft, clientWidth } = element

      const nextScrollLeft = element.scrollLeft + element.clientWidth
      const maxScrollLeft = scrollWidth - clientWidth

      if (Math.ceil(scrollLeft) < maxScrollLeft) {
        element.scroll({
          left: Math.min(maxScrollLeft, nextScrollLeft),
          behavior: 'smooth'
        })
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.carousel {
  $self: &;
  display: block;
  position: relative;

  &:before {
    position: absolute;
    top: 0;
    bottom: 0;
  }

  &--can-left .carousel__wrapper {
    mask-image: linear-gradient(
      to right,
      rgba(0, 0, 0, 0) 0%,
      rgba(0, 0, 0, 1) 10%
    );
  }

  &--can-right .carousel__wrapper {
    mask-image: linear-gradient(to left, rgba(0, 0, 0, 0) 0%, rgb(0, 0, 0) 10%);
  }

  &.carousel--can-left.carousel--can-right .carousel__wrapper {
    mask-image: linear-gradient(
      to right,
      rgba(0, 0, 0, 0) 0%,
      rgb(0, 0, 0) 5%,
      rgb(0, 0, 0) 95%,
      rgb(0, 0, 0, 0) 100%
    );
  }

  &__wrapper {
    display: flex;
    overflow-x: auto;
    align-items: flex-end;
    gap: 0.25rem;
    padding: 0.25rem 0;

    > div:last-child {
      margin-right: 1rem;
    }

    &::-webkit-scrollbar {
      height: 0;
    }
  }

  &__control {
    $control: &;
    position: absolute;
    top: 50%;
    transform: translateY(-50%);

    &--left {
      left: 0.5rem;
    }

    &--right {
      right: 0.5rem;
    }
  }
}
</style>
