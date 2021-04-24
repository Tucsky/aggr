import store from '../store'
import { splitRgba, getColorLuminance, getLogShade } from '../utils/colors'

const applyBackgroundColor = (el, rgb, modifier: number | boolean = false) => {
  if (rgb) {
    let color = splitRgba(rgb)
    let luminance = getColorLuminance(color)
    if (typeof modifier === 'number' && modifier) {
      if (store.state.settings.theme === 'dark') {
        const ajusted = modifier / Math.log(255 - luminance) / 4
        modifier = ajusted
      } else {
        modifier *= 1 / 255
      }
      rgb = getLogShade(color, modifier)
    } else {
      color = splitRgba(rgb)
    }
    el.style.backgroundColor = rgb

    luminance = getColorLuminance(color)

    el.style.color = luminance < 175 ? '#f6f6f6' : '#111'
  }
}

export default {
  bind(el, binding) {
    const unwatchBackground = store.watch(
      state => state.settings.backgroundColor,
      rgb => {
        applyBackgroundColor(el, rgb, +binding.value)
      }
    )
    const unwatchColor = store.watch(
      state => state.settings.textColor,
      rgb => {
        el.style.color = rgb ? rgb : ''
      }
    )

    el.__background_unwatch_background_color__ = unwatchBackground
    el.__background_unwatch_color__ = unwatchColor

    applyBackgroundColor(el, store.state.settings.backgroundColor, +binding.value)
  },
  unbind(el) {
    el.__background_unwatch_color__ && el.__background_unwatch_color__()
    el.__background_unwatch_background_color__ && el.__background_unwatch_background_color__()
  }
}
