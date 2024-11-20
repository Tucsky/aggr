<template>
  <div
    class="indicator-dialog-divider"
    :class="[
      !navigation.columnWidth && 'indicator-dialog-divider--collapsed-column'
    ]"
  >
    <div
      class="indicator-dialog-divider__resizer"
      @mousedown="handleColumnResize"
      @touchstart="handleColumnResize"
    />
    <button
      class="btn indicator-dialog-divider__collapser -text"
      @click="toggleCollapseColumn"
    >
      <i class="icon-up-thin" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { getEventCords } from '@/utils/helpers'
import { useIndicatorNavigation } from './useIndicatorNavigation'

const emit = defineEmits(['resize'])

const { navigation } = useIndicatorNavigation()

const toggleCollapseColumn = () => {
  navigation.columnWidth = navigation.columnWidth > 50 ? 0 : 240
  emit('resize')
}

const handleColumnResize = (startEvent: MouseEvent | TouchEvent) => {
  navigation.resizing = true
  let refX = getEventCords(startEvent).x

  const moveHandler = (moveEvent: MouseEvent | TouchEvent) => {
    const endX = getEventCords(moveEvent).x
    navigation.columnWidth += refX - endX
    refX = endX
  }

  const endHandler = (endEvent: MouseEvent | TouchEvent) => {
    const isMouseEvent = endEvent instanceof MouseEvent
    document.removeEventListener(
      isMouseEvent ? 'mousemove' : 'touchmove',
      moveHandler
    )
    document.removeEventListener(
      isMouseEvent ? 'mouseup' : 'touchend',
      endHandler
    )

    if (navigation.columnWidth < 50) {
      navigation.columnWidth = 0
    }
    emit('resize')
    navigation.resizing = false
  }

  const isMouseEvent = startEvent instanceof MouseEvent
  document.addEventListener(
    isMouseEvent ? 'mousemove' : 'touchmove',
    moveHandler
  )
  document.addEventListener(isMouseEvent ? 'mouseup' : 'touchend', endHandler)
}
</script>

<style lang="scss" scoped>
.indicator-dialog-divider {
  position: relative;

  &__resizer {
    position: relative;
    z-index: 2;
    overflow: visible;
    height: 100%;
    width: 1px;
    background-color: var(--theme-background-150);

    .indicator-dialog-divider--collapsed-column & {
      width: 0px;
    }

    &:before {
      content: '';
      position: absolute;
      top: 0;
      bottom: 0;
      cursor: ew-resize;
      left: -0.25rem;
      right: -0.25rem;
    }
  }

  &__collapser {
    border: 1px solid var(--theme-background-300);
    border-radius: 0.25rem;
    padding: 0.25rem 0.125rem;
    position: absolute;
    z-index: 10;
    right: -0.5rem;
    top: 0.75rem;
    font-size: 0.75rem;
    transition: right 0.2s cubic-bezier(0, 1.4, 1, 1);
    z-index: 20;
    display: none;
    height: 2rem;

    &.btn {
      background-color: var(--theme-background-150);
    }

    .dialog--small & {
      display: none;
    }

    @media screen and (min-width: 768px) {
      display: inline-flex;
    }

    i {
      transform: rotateZ(90deg);
      transition: transform 0.2s cubic-bezier(0, 1.4, 1, 1);
      display: block;

      .indicator-dialog-divider--collapsed-column & {
        transform: rotateZ(-90deg);
      }
    }

    .indicator-dialog-divider--collapsed-column & {
      right: -4px;
    }
  }
}
</style>
