export const PALETTE = [
  '#F44336',
  '#FF9800',
  '#ffeb3b',
  '#4caf50',
  '#009688',
  '#00bcd4',
  '#2196F3',
  '#673ab7',
  '#9c27b0',
  '#e91e63',
  '#FFCDD2',
  '#FFE0B2',
  '#FFF9C4',
  '#C8E6C9',
  '#B2DFDB',
  '#B2EBF2',
  '#BBDEFB',
  '#D1C4E9',
  '#E1BEE7',
  '#F8BBD0',
  '#ef9a9a',
  '#FFCC80',
  '#FFF59D',
  '#A5D6A7',
  '#80cbc4',
  '#80DEEA',
  '#90CAF9',
  '#B39DDB',
  '#CE93D8',
  '#f48fb1',
  '#E57373',
  '#ffb74d',
  '#FFF176',
  '#81c784',
  '#4db6ac',
  '#4dd0e1',
  '#64B5F6',
  '#9575cd',
  '#ba68c8',
  '#f06292',
  '#EF5350',
  '#FFA726',
  '#ffee58',
  '#66BB6A',
  '#26a69a',
  '#26c6da',
  '#42A5F5',
  '#7e57c2',
  '#ab47bc',
  '#ec407a',
  '#D32F2F',
  '#F57C00',
  '#fbc02d',
  '#388e3c',
  '#00796b',
  '#0097A7',
  '#1976D2',
  '#512da8',
  '#7b1fa2',
  '#C2185B',
  '#B71C1C',
  '#e65100',
  '#F57F17',
  '#1B5E20',
  '#004D40',
  '#006064',
  '#0d47a1',
  '#311B92',
  '#4A148C',
  '#880e4f'
]

export function getColor(except = []) {
  let color

  while (!color || except.indexOf(color) !== -1) {
    color = PALETTE[Math.floor(Math.random() * PALETTE.length)]
  }

  return color
}

export function getColorByWeight(a, b, weight) {
  if (weight > 1) {
    return b
  }

  const p = weight
  const w = p * 2 - 1
  const w1 = (w / 1 + 1) / 2
  const w2 = 1 - w1
  const rgb = [Math.round(b[0] * w1 + a[0] * w2), Math.round(b[1] * w1 + a[1] * w2), Math.round(b[2] * w1 + a[2] * w2)]
  return rgb
}

export function getAlphaByWeight(a, b, weight) {
  const p = weight
  const w = p * 2 - 1
  const w1 = (w / 1 + 1) / 2
  const w2 = 1 - w1
  return b * w1 + a * w2
}

export function rgbaToRgb(color, backgroundColor) {
  const alpha = 1 - color[3]

  color[0] = Math.round((color[3] * (color[0] / 255) + alpha * (backgroundColor[0] / 255)) * 255)
  color[1] = Math.round((color[3] * (color[1] / 255) + alpha * (backgroundColor[1] / 255)) * 255)
  color[2] = Math.round((color[3] * (color[2] / 255) + alpha * (backgroundColor[2] / 255)) * 255)
  color.splice(3, 1)

  return color
}

export function rgbToHex(rgb) {
  return '#' + ((1 << 24) + (rgb[0] << 16) + (rgb[1] << 8) + rgb[2]).toString(16).slice(1)
}

export function hexToRgb(hex) {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i
  hex = hex.replace(shorthandRegex, function(m, r, g, b) {
    return r + r + g + g + b + b
  })

  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : null
}

export function getColorLuminance(color, backgroundColor?: number[]) {
  if (typeof color[3] !== 'undefined' && backgroundColor) {
    color = rgbaToRgb(color, backgroundColor)
  }

  const luminance = Math.sqrt(color[0] * color[0] * 0.241 + color[1] * color[1] * 0.691 + color[2] * color[2] * 0.068)

  return luminance
}

const colorsByName = {}

export function getColorByName(name) {
  if (colorsByName[name]) {
    return colorsByName[name].slice()
  }

  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 1
  const ctx = canvas.getContext('2d')

  ctx.clearRect(0, 0, 1, 1)
  ctx.fillStyle = '#000'
  ctx.fillStyle = name
  ctx.fillRect(0, 0, 1, 1)

  const color = ctx.getImageData(0, 0, 1, 1).data

  colorsByName[name] = [color[0], color[1], color[2], color[3] / 255]

  return colorsByName[name]
}

export function splitRgba(string, backgroundColor?: number[]) {
  if (string[0] === '#') {
    return hexToRgb(string)
  } else if (!/^rgb/.test(string) && /^[a-z]+$/i.test(string)) {
    return getColorByName(string)
  }

  let match
  let color
  try {
    match = string.match(/rgba?\((\d+)[\s,]*(\d+)[\s,]*(\d+)(?:[\s,]*([\d.]+))?\)/)

    if (!match) {
      throw new Error()
    }

    color = [+match[1], +match[2], +match[3]]
  } catch (error) {
    console.error(error)

    color = [0, 0, 0]
  }

  if (match && typeof match[4] !== 'undefined') {
    color.push(+match[4])

    if (backgroundColor) {
      color = rgbaToRgb(color, backgroundColor)
    }
  }

  return color
}

export function joinRgba(color) {
  const [a, b, c, d] = color

  return 'rgb' + (d ? 'a(' : '(') + a + ',' + b + ',' + c + (d ? ',' + d + ')' : ')')
}

export function getAppBackgroundColor() {
  const color = getComputedStyle(document.getElementById('app')).backgroundColor

  let output: number[]

  if (color.indexOf('#') !== -1) {
    output = hexToRgb(color)
  } else {
    output = splitRgba(color)
  }

  return output
}

export function getLogShade(color: [number, number, number], percent: number) {
  percent = Math.max(-1, Math.min(1, percent))
  const P = percent < 0
  const t = P ? 0 : percent * 255 ** 2
  const p = P ? 1 + percent : 1 - percent

  return (
    'rgb(' +
    Math.round((p * color[0] ** 2 + t) ** 0.5) +
    ',' +
    Math.round((p * color[1] ** 2 + t) ** 0.5) +
    ',' +
    Math.round((p * color[2] ** 2 + t) ** 0.5) +
    ')'
  )
}

export function rgbToHsl([r, g, b]) {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b)
  let h: number
  let s: number
  const l = (max + min) / 2

  if (max == min) {
    h = s = 0 // achromatic
  } else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h /= 6
  }

  return [h, s, l]
}

function hslToRgb([h, s, l]) {
  let r: number
  let g: number
  let b: number

  if (s == 0) {
    r = g = b = l // achromatic
  } else {
    // eslint-disable-next-line no-inner-declarations
    function hue2rgb(p, q, t) {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }

  return [r * 255, g * 255, b * 255]
}

export function increaseBrightness(color, percent) {
  const HSL = rgbToHsl(color)
  const [r, g, b] = hslToRgb([HSL[0], HSL[1], HSL[2] + HSL[2] * (percent / 100)]) // prettier-ignore
  return [r, g, b]
}
