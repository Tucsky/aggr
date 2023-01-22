export type VisibleColorFormat = 'hex' | 'hsl' | 'hwb' | 'rgb'

export type ColorFormat = 'hex' | 'hsl' | 'hsv' | 'hwb' | 'rgb'

export type ColorHsl = {
  h: number
  s: number
  l: number
  a: number
}

export type ColorHsv = {
  h: number
  s: number
  v: number
  a: number
}

export type ColorHwb = {
  h: number
  w: number
  b: number
  a: number
}

export type ColorRgb = {
  r: number
  g: number
  b: number
  a: number
}

export type AlphaChannelProp = 'show' | 'hide'

/**
 * Rounds a given number to a certain level of precision after the decimal point.
 *
 * The default decimal precision is 2 (e.g. the value `10.333` would result in `'10.33'`).
 *
 * @param {number} value
 * @param {number} [decimalPrecision]
 * @returns {string}
 */
export function round(value, decimalPrecision = 2) {
  return value.toFixed(decimalPrecision).replace(/0+$/, '').replace(/\.$/, '')
}

/**
 * Converts a HEX color string to an RGB color object.
 *
 * Supports HEX color strings with length 3, 4, 6, and 8.
 *
 * @param {string} hex
 * @returns {ColorRgb}
 */
export function convertHexToRgb(hex) {
  const hexWithoutHash = hex.replace(/^#/, '')

  const channels = []

  // Slice hex color string into two characters each.
  // For longhand hex color strings, two characters can be consumed at a time.
  const step = hexWithoutHash.length > 4 ? 2 : 1
  for (let i = 0; i < hexWithoutHash.length; i += step) {
    const channel = hexWithoutHash.slice(i, i + step)
    // Repeat the character once for shorthand hex color strings.
    channels.push(channel.repeat((step % 2) + 1))
  }

  if (channels.length === 3) {
    channels.push('ff')
  }

  // Okay, TypeScript, let’s agree that we got four elements in that array, alright?
  const rgbChannels =
    /** @type {[number, number, number, number]} */ channels.map(
      channel => parseInt(channel, 16) / 255
    )

  return {
    r: rgbChannels[0],
    g: rgbChannels[1],
    b: rgbChannels[2],
    a: rgbChannels[3]
  }
}

/**
 * Converts an HSL color object to an HSV color object.
 *
 * Source: https://en.m.wikipedia.org/wiki/HSL_and_HSV#HSL_to_HSV
 *
 * @param {ColorHsl} hsl
 * @returns {ColorHsv}
 */
export function convertHslToHsv(hsl) {
  const v = hsl.l + hsl.s * Math.min(hsl.l, 1 - hsl.l)
  const s = v === 0 ? 0 : 2 - (2 * hsl.l) / v

  return {
    h: hsl.h,
    s,
    v,
    a: hsl.a
  }
}

/**
 * @param {number} p
 * @param {number} q
 * @param {number} t
 * @returns {number}
 */
function hue2rgb(p, q, t) {
  if (t < 0) {
    t += 1
  } else if (t > 1) {
    t -= 1
  }

  if (t < 1 / 6) {
    return p + (q - p) * 6 * t
  } else if (t < 1 / 2) {
    return q
  } else if (t < 2 / 3) {
    return p + (q - p) * (2 / 3 - t) * 6
  } else {
    return p
  }
}

/**
 * Converts an HSL color object to an RGB color object.
 *
 * Source: https://en.m.wikipedia.org/wiki/HSL_and_HSV#HSL_to_RGB
 *
 * @param {ColorHsl} hsl
 * @returns {ColorRgb}
 */
export function convertHslToRgb(hsl) {
  const q = hsl.l < 0.5 ? hsl.l * (1 + hsl.s) : hsl.l + hsl.s - hsl.l * hsl.s
  const p = 2 * hsl.l - q

  return {
    r: hue2rgb(p, q, hsl.h + 1 / 3),
    g: hue2rgb(p, q, hsl.h),
    b: hue2rgb(p, q, hsl.h - 1 / 3),
    a: hsl.a
  }
}

/**
 * Converts an HSV color object to an HSL color object.
 *
 * Source: https://en.m.wikipedia.org/wiki/HSL_and_HSV#HSV_to_HSL
 *
 * @param {ColorHsv} hsv
 * @returns {ColorHsl}
 */
export function convertHsvToHsl(hsv) {
  const l = hsv.v - (hsv.v * hsv.s) / 2
  const lMin = Math.min(l, 1 - l)
  const s = lMin === 0 ? 0 : (hsv.v - l) / lMin

  return {
    h: hsv.h,
    s,
    l,
    a: hsv.a
  }
}

/**
 * Converts an HSV color object to an HWB color object.
 *
 * @param {ColorHsv} hsv
 * @returns {ColorHwb}
 */
export function convertHsvToHwb(hsv) {
  return {
    h: hsv.h,
    w: (1 - hsv.s) * hsv.v,
    b: 1 - hsv.v,
    a: hsv.a
  }
}

/**
 * @param {number} n
 * @param {ColorHsv} hsv
 * @returns {number}
 */
function fn(n, hsv) {
  const k = (n + hsv.h * 6) % 6
  return hsv.v - hsv.v * hsv.s * Math.max(0, Math.min(k, 4 - k, 1))
}

/**
 * Converts an HSV color object to an RGB color object.
 *
 * Source: https://en.m.wikipedia.org/wiki/HSL_and_HSV#HSL_to_RGB
 *
 * @param {ColorHsv} hsv
 * @returns {ColorRgb}
 */
export function convertHsvToRgb(hsv) {
  return {
    r: fn(5, hsv),
    g: fn(3, hsv),
    b: fn(1, hsv),
    a: hsv.a
  }
}

/**
 * Converts an HWB color object to an HSV color object.
 *
 * @param {ColorHwb} hwb
 * @returns {ColorHsv}
 */
export function convertHwbToHsv(hwb) {
  return {
    h: hwb.h,
    s: hwb.b === 1 ? 0 : 1 - hwb.w / (1 - hwb.b),
    v: 1 - hwb.b,
    a: hwb.a
  }
}

/**
 * Converts an RGB color object to an HEX color string.
 *
 * @param {ColorRgb} rgb
 * @returns {string}
 */
export function convertRgbToHex(rgb: ColorRgb) {
  const hexChannels = Object.values(rgb).map(channel => {
    const int = channel * 255
    const hex = Math.round(int).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  })

  return '#' + hexChannels.join('')
}

/**
 * Converts an RGB color object to an HWB color object.
 *
 * @param {ColorRgb} rgb
 * @returns {ColorHwb}
 */
export function convertRgbToHwb(rgb) {
  const min = Math.min(rgb.r, rgb.g, rgb.b)
  const max = Math.max(rgb.r, rgb.g, rgb.b)

  let h
  if (max === min) {
    h = 0
  } else if (max === rgb.r) {
    h = (0 + (rgb.g - rgb.b) / (max - min)) / 6
  } else if (max === rgb.g) {
    h = (2 + (rgb.b - rgb.r) / (max - min)) / 6
  } else {
    h = (4 + (rgb.r - rgb.g) / (max - min)) / 6
  }

  if (h < 0) {
    h += 1
  }

  return {
    h,
    w: min,
    b: 1 - max,
    a: rgb.a
  }
}

/**
 * Converts an RGB color object to an HSL color object.
 *
 * Source: https://en.m.wikipedia.org/wiki/HSL_and_HSV#RGB_to_HSL_and_HSV
 *
 * @param {ColorRgb} rgb
 * @returns {ColorHsl}
 */
export function convertRgbToHsl(rgb: ColorRgb): ColorHsl {
  const hwb = convertRgbToHwb(rgb)
  const min = hwb.w
  const max = 1 - hwb.b

  const l = (max + min) / 2

  let s
  if (max === 0 || min === 1) {
    s = 0
  } else {
    s = (max - l) / Math.min(l, 1 - l)
  }

  return {
    h: hwb.h,
    s,
    l,
    a: rgb.a
  }
}

/**
 * Clamps the given value between the min and max boundaries.
 *
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number} - `value` if `min <= value <= max`
 *                   - `min` if `value < min`
 *                   - `max` if `value > max`
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max))
}

/**
 * @param {number} value in the range [0, 1]
 * @returns {string} in the range [0, 360]
 */
export function toHueAngle(value) {
  return round(value * 360)
}

/**
 * Checks whether two objects are value equal.
 *
 * @param {string | { [key: string]: number }} colorA
 * @param {string | { [key: string]: number }} colorB
 * @returns {boolean}
 */
export function colorsAreValueEqual(colorA, colorB) {
  if (typeof colorA === 'string' || typeof colorB === 'string') {
    return colorA === colorB
  }

  for (const channelA in colorA) {
    if (colorA[channelA] !== colorB[channelA]) {
      return false
    }
  }

  return true
}

/**
 * Takes a `color` and passes it through a list of conversion functions.
 *
 * This process is necessary when a direct conversion algorithm isn’t known/available for the conversion between two color formats. Then, several conversion functions are chained to get to the result in an indirect manner (e.g. to convert from RGB to HSV, we first convert from RGB to HWB and then from HWB to HSV).
 *
 * @param {any} sourceColor
 * @param {Function[]} convertFunctions
 * @returns {any}
 */
function chainConvert(sourceColor, convertFunctions) {
  return convertFunctions.reduce(
    (color, convert) => convert(color),
    sourceColor
  )
}

export function copyColorObject(color): any {
  const newColor = {}

  for (const prop in color) {
    newColor[prop] = color[prop]
  }

  return newColor
}

/**
 * @param {string} value a string representing an arbitrary number
 * @returns {number} in the range [0, 1]
 */
export function fromHueAngle(value) {
  if (value.endsWith('.')) {
    return NaN
  }

  // Maps the angle to the range [0, 360] (e.g. -30 becomes 330, 385 becomes 15, etc).
  const boundAngle = ((parseFloat(value) % 360) + 360) % 360

  return boundAngle / 360
}

/**
 * @param {string} value a string representing an arbitrary percentage value
 * @returns {number} in the range [0, 1]
 */
export function fromPercentage(value) {
  if (!value.endsWith('%')) {
    return NaN
  }

  const numberString = value.substring(0, value.length - 1)

  if (numberString.endsWith('.')) {
    return NaN
  }

  const numberValue = parseFloat(numberString)

  if (Number.isNaN(numberValue)) {
    return NaN
  }

  return clamp(numberValue, 0, 100) / 100
}

/**
 * @param {number} value in the range [0, 1]
 * @returns {string} in the range [0%, 100%]
 */
export function toPercentage(value) {
  return round(value * 100) + '%'
}

/**
 * @param {string} value a string representing an arbitrary number value
 * @returns {number} in the range [0, 1]
 */
export function from8BitDecimal(value) {
  if (value.endsWith('%')) {
    return fromPercentage(value)
  }

  if (value.endsWith('.')) {
    return NaN
  }

  const numberValue = parseFloat(value)

  if (Number.isNaN(numberValue)) {
    return NaN
  }

  return clamp(numberValue, 0, 255) / 255
}

/**
 * @param {number} value in the range [0, 1]
 * @returns {string} in the range [0, 255]
 */
export function to8BitDecimal(value) {
  return round(value * 255)
}

/**
 * @param {string} value in the range [0, 1] or [0%, 100%]
 * @returns {number} in the range [0, 1]
 */
export function fromAlpha(value) {
  if (value.endsWith('%')) {
    return fromPercentage(value)
  } else {
    return clamp(parseFloat(value), 0, 1)
  }
}

/**
 * @param {number} value in the range [0, 1]
 * @returns {string} in the range [0, 1]
 */
export function toAlpha(value) {
  return String(value)
}

/**
 * Lazy function that returns the format of a given color object.
 *
 * Doesn’t handle invalid formats.
 *
 * @param {ColorHsl | ColorHsv | ColorHwb | ColorRgb} color
 * @returns {ColorFormat}
 */
export function detectFormat(color) {
  if (Object.prototype.hasOwnProperty.call(color, 'r')) {
    return 'rgb'
  } else if (Object.prototype.hasOwnProperty.call(color, 'w')) {
    return 'hwb'
  } else if (Object.prototype.hasOwnProperty.call(color, 'v')) {
    return 'hsv'
  } else {
    return 'hsl'
  }
}

/**
 * @typedef {Object} Formatters
 * @property {(color: string, excludeAlphaChannel: boolean) => string} hex
 * @property {(color: ColorHsl, excludeAlphaChannel: boolean) => string} hsl
 * @property {(color: ColorHwb, excludeAlphaChannel: boolean) => string} hwb
 * @property {(color: ColorRgb, excludeAlphaChannel: boolean) => string} rgb
 */

/** @type {Formatters} */
const formatters = {
  /**
   * @param {string} hex
   * @param {boolean} excludeAlphaChannel
   * @returns {string}
   */
  hex(hex, excludeAlphaChannel) {
    return excludeAlphaChannel && [5, 9].includes(hex.length)
      ? hex.substring(0, hex.length - (hex.length - 1) / 4)
      : hex
  },

  /**
   * @param {ColorHsl} hsl
   * @param {boolean} excludeAlphaChannel
   * @returns {string}
   */
  hsl(hsl, excludeAlphaChannel) {
    const h = Math.round(hsl.h * 360)
    const s = Math.round(hsl.s * 100)
    const l = Math.round(hsl.l * 100)
    return (
      `hsl${!excludeAlphaChannel && hsl.a !== 1 ? 'a' : ''}(${h},${s}%,${l}%` +
      (!excludeAlphaChannel && hsl.a !== 1 ? `,${round(hsl.a)})` : ')')
    )
  },

  /**
   * @param {ColorHwb} hwb
   * @param {boolean} excludeAlphaChannel
   * @returns {string}
   */
  hwb(hwb, excludeAlphaChannel) {
    const h = round(hwb.h * 360)
    const w = round(hwb.w * 100)
    const b = round(hwb.b * 100)

    return (
      `hwb(${h} ${w}% ${b}%` +
      (excludeAlphaChannel ? ')' : ` / ${round(hwb.a)})`)
    )
  },

  /**
   * @param {ColorRgb} rgb
   * @param {boolean} excludeAlphaChannel
   * @returns {string}
   */
  rgb(rgb, excludeAlphaChannel) {
    const r = Math.round(rgb.r * 255)
    const g = Math.round(rgb.g * 255)
    const b = Math.round(rgb.b * 255)

    return `rgb${
      rgb.a !== 1 && !excludeAlphaChannel ? 'a' : ''
    }(${r},${g},${b}${
      rgb.a !== 1 && !excludeAlphaChannel ? `,${round(rgb.a)}` : ''
    })`
  }
}

/**
 * Formats a given color object as a CSS color string.
 *
 * @param {string | ColorHsl | ColorHwb | ColorRgb} color
 * @param {VisibleColorFormat} format
 * @param {boolean} excludeAlphaChannel
 * @returns {string}
 */
export function formatAsCssColor(color, format, excludeAlphaChannel = false) {
  return formatters[format](color, excludeAlphaChannel)
}

/**
 * Returns whether a given HEX color string is a valid CSS color.
 *
 * @param {string} hexColor
 * @returns {boolean}
 */
export function isValidHexColor(hexColor) {
  if (!hexColor.startsWith('#')) {
    return false
  }

  if (![3, 4, 6, 8].includes(hexColor.length - 1)) {
    return false
  }

  return /^#[0-9A-Fa-f]+$/.test(hexColor)
}

/**
 * @type {{ [key in ColorFormat]: Array<[ColorFormat, (color: any) => any]> }}
 */
export const conversions = {
  hex: [
    ['hsl', hex => chainConvert(hex, [convertHexToRgb, convertRgbToHsl])],
    [
      'hsv',
      hex =>
        chainConvert(hex, [convertHexToRgb, convertRgbToHwb, convertHwbToHsv])
    ],
    ['hwb', hex => chainConvert(hex, [convertHexToRgb, convertRgbToHwb])],
    ['rgb', convertHexToRgb]
  ],
  hsl: [
    ['hex', hsl => chainConvert(hsl, [convertHslToRgb, convertRgbToHex])],
    ['hsv', convertHslToHsv],
    ['hwb', hsl => chainConvert(hsl, [convertHslToRgb, convertRgbToHwb])],
    ['rgb', convertHslToRgb]
  ],
  hsv: [
    ['hex', hsv => chainConvert(hsv, [convertHsvToRgb, convertRgbToHex])],
    ['hsl', convertHsvToHsl],
    ['hwb', convertHsvToHwb],
    ['rgb', convertHsvToRgb]
  ],
  hwb: [
    [
      'hex',
      hwb =>
        chainConvert(hwb, [convertHwbToHsv, convertHsvToRgb, convertRgbToHex])
    ],
    [
      'hsl',
      hwb =>
        chainConvert(hwb, [convertHwbToHsv, convertHsvToRgb, convertRgbToHsl])
    ],
    ['hsv', convertHwbToHsv],
    ['rgb', hwb => chainConvert(hwb, [convertHwbToHsv, convertHsvToRgb])]
  ],
  rgb: [
    ['hex', convertRgbToHex],
    ['hsl', convertRgbToHsl],
    ['hsv', rgb => chainConvert(rgb, [convertRgbToHwb, convertHwbToHsv])],
    ['hwb', convertRgbToHwb]
  ]
}

/** @type {any} */
export const colorChannels = {
  hsl: {
    h: {
      to: toHueAngle,
      from: fromHueAngle
    },

    s: {
      to: toPercentage,
      from: fromPercentage
    },

    l: {
      to: toPercentage,
      from: fromPercentage
    },

    a: {
      to: toAlpha,
      from: fromAlpha
    }
  },

  hwb: {
    h: {
      to: toHueAngle,
      from: fromHueAngle
    },

    w: {
      to: toPercentage,
      from: fromPercentage
    },

    b: {
      to: toPercentage,
      from: fromPercentage
    },

    a: {
      to: toAlpha,
      from: fromAlpha
    }
  },

  rgb: {
    r: {
      to: to8BitDecimal,
      from: from8BitDecimal
    },

    g: {
      to: to8BitDecimal,
      from: from8BitDecimal
    },

    b: {
      to: to8BitDecimal,
      from: from8BitDecimal
    },

    a: {
      to: toAlpha,
      from: fromAlpha
    }
  }
}

/**
 * Parses a color as it can be provided to the color picker’s `color` prop.
 *
 * Supports all valid CSS colors in string form (e.g. tomato, #f80c, hsl(266.66 50% 100% / 0.8), hwb(0.9 0.9 0.9 / 1), etc.) as well as the color formats used for internal storage by the color picker.
 *
 * @param {string | ColorHsl | ColorHsv | ColorHwb | ColorRgb} propsColor
 * @returns {{ format: ColorFormat, color: string | ColorHsl | ColorHsv | ColorHwb | ColorRgb } | null}
 */
export function parsePropsColor(propsColor) {
  if (typeof propsColor !== 'string') {
    const format = detectFormat(propsColor)
    return { format, color: propsColor }
  }

  if (isValidHexColor(propsColor)) {
    return { format: 'hex', color: propsColor }
  }

  if (!propsColor.includes('(')) {
    const context = /** @type {CanvasRenderingContext2D} */ document
      .createElement('canvas')
      .getContext('2d')
    context.fillStyle = propsColor
    const color = context.fillStyle

    // Invalid color names yield `'#000000'` which we only know to have come from an invalid color name if it was *not* `'black'`
    if (color === '#000000' && propsColor !== 'black') {
      return null
    }

    return { format: 'hex', color }
  }

  // Split a color string like `rgba(255 255 128 / .5)` into `rgba` and `255 255 128 / .5)`.
  const [cssFormat, rest] =
    /** @type {[string, string]} */ propsColor.split('(')
  const format = /** @type {ColorFormat} */ cssFormat.substring(0, 3)
  const parameters = rest
    // Replace all characters that aren’t needed any more, leaving a string like `255 255 128 .5`.
    .replace(/[,/)]/g, ' ')
    // Replace consecutive spaces with one space.
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')

  // Normalize color to always have an alpha channel in its internal representation.
  if (parameters.length === 3) {
    parameters.push('1')
  }

  const channels = format.split('').concat('a')
  const color =
    /** @type {ColorHsl | ColorHsv | ColorHwb | ColorRgb} */ Object.fromEntries(
      channels.map((channel, index) => [
        channel,
        colorChannels[format][channel].from(parameters[index])
      ])
    )

  return { format, color }
}
