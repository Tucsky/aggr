export const PALETTE = [
  'rgb(255,255,255)',
  'rgb(209,212,220)',
  'rgb(178,181,190)',
  'rgb(149,152,161)',
  'rgb(120,123,134)',
  'rgb(93,96,107)',
  'rgb(67,70,81)',
  'rgb(42,46,57)',
  'rgb(19,23,34)',
  'rgb(0,0,0)',
  'rgb(242,54,69)',
  'rgb(255,152,0)',
  'rgb(255,235,59)',
  'rgb(76,175,80)',
  'rgb(8,153,129)',
  'rgb(0,188,212)',
  'rgb(41,98,255)',
  'rgb(103,58,183)',
  'rgb(156,39,176)',
  'rgb(233,30,99)',
  'rgb(252,203,205)',
  'rgb(255,224,178)',
  'rgb(255,249,196)',
  'rgb(200,230,201)',
  'rgb(172,229,220)',
  'rgb(178,235,242)',
  'rgb(187,217,251)',
  'rgb(209,196,233)',
  'rgb(225,190,231)',
  'rgb(248,187,208)',
  'rgb(250,161,164)',
  'rgb(255,204,128)',
  'rgb(255,245,157)',
  'rgb(165,214,167)',
  'rgb(112,204,189)',
  'rgb(128,222,234)',
  'rgb(144,191,249)',
  'rgb(179,157,219)',
  'rgb(206,147,216)',
  'rgb(244,143,177)',
  'rgb(247,124,128)',
  'rgb(255,183,77)',
  'rgb(255,241,118)',
  'rgb(129,199,132)',
  'rgb(66,189,168)',
  'rgb(77,208,225)',
  'rgb(91,156,246)',
  'rgb(149,117,205)',
  'rgb(186,104,200)',
  'rgb(240,98,146)',
  'rgb(247,82,95)',
  'rgb(255,167,38)',
  'rgb(255,238,88)',
  'rgb(102,187,106)',
  'rgb(34,171,148)',
  'rgb(38,198,218)',
  'rgb(49,121,245)',
  'rgb(126,87,194)',
  'rgb(171,71,188)',
  'rgb(236,64,122)',
  'rgb(178,40,51)',
  'rgb(245,124,0)',
  'rgb(251,192,45)',
  'rgb(56,142,60)',
  'rgb(5,102,86)',
  'rgb(0,151,167)',
  'rgb(24,72,204)',
  'rgb(81,45,168)',
  'rgb(123,31,162)',
  'rgb(194,24,91)',
  'rgb(128,25,34)',
  'rgb(230,81,0)',
  'rgb(245,127,23)',
  'rgb(27,94,32)',
  'rgb(0,51,42)',
  'rgb(0,96,100)',
  'rgb(12,50,153)',
  'rgb(49,27,146)',
  'rgb(74,20,140)',
  'rgb(136,14,79)'
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
  const rgb = [
    Math.round(b[0] * w1 + a[0] * w2),
    Math.round(b[1] * w1 + a[1] * w2),
    Math.round(b[2] * w1 + a[2] * w2)
  ]
  return rgb
}

export function mix(ratio, ...colors) {
  if (colors.length === 1 || ratio <= 0) return colors[0]
  if (ratio >= 1) return colors[colors.length - 1]

  const segmentLength = 1 / (colors.length - 1)
  const segmentIndex = Math.min(
    Math.floor(ratio / segmentLength),
    colors.length - 2
  )

  const a = colors[segmentIndex]
  const b = colors[segmentIndex + 1]

  const adjustedRatio = (ratio - segmentLength * segmentIndex) / segmentLength

  return interpolate(a, b, adjustedRatio)
}

function interpolate(a, b, weight) {
  const p = weight
  const w = p * 2 - 1
  const w1 = (w / 1 + 1) / 2
  const w2 = 1 - w1
  return [
    Math.round(a[0] * w2 + b[0] * w1),
    Math.round(a[1] * w2 + b[1] * w1),
    Math.round(a[2] * w2 + b[2] * w1),
    a[3] * w2 + b[3] * w1 // interpolate the alpha values
  ]
}

export function rgbaToRgb(color, backgroundColor) {
  const alpha = typeof color[3] === 'number' ? color[3] : 1
  const inverse = 1 - alpha

  return [
    Math.round(
      (alpha * (color[0] / 255) + inverse * (backgroundColor[0] / 255)) * 255
    ),
    Math.round(
      (alpha * (color[1] / 255) + inverse * (backgroundColor[1] / 255)) * 255
    ),
    Math.round(
      (alpha * (color[2] / 255) + inverse * (backgroundColor[2] / 255)) * 255
    )
  ]
}

export function rgbToHex(rgb) {
  return (
    '#' +
    ((1 << 24) + (rgb[0] << 16) + (rgb[1] << 8) + rgb[2]).toString(16).slice(1)
  )
}

export function hexToRgb(hex) {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i
  hex = hex.replace(shorthandRegex, function (m, r, g, b) {
    return r + r + g + g + b + b
  })

  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?$/i.exec(
    hex
  )
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
        parseInt(result[4], 16) || 1
      ]
    : null
}

export function getColorLuminance(color, backgroundColor?: number[]) {
  if (typeof color[3] !== 'undefined' && backgroundColor) {
    color = rgbaToRgb(color, backgroundColor)
  }

  return (
    (0.2126 * color[0] + 0.7152 * color[1] + 0.0722 * color[2] - 127.5) / 127.5
  )
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

export function splitColorCode(
  string,
  backgroundColor?: number[],
  includeAlpha = false
) {
  if (string[0] === '#') {
    return hexToRgb(string)
  } else if (!/^rgb/.test(string) && /^[a-z]+$/i.test(string)) {
    return getColorByName(string)
  }

  let match
  let color
  try {
    match = string.match(
      /rgba?\((\d+)[\s,]*(\d+)[\s,]*(\d+)(?:[\s,]*([\d.]+))?\)/
    )

    if (!match) {
      throw new Error()
    }

    color = [+match[1], +match[2], +match[3]]
  } catch (error) {
    console.error(error)

    return [0, 0, 0]
  }

  if (typeof match[4] !== 'undefined' || includeAlpha) {
    color.push(typeof match[4] !== 'undefined' ? +match[4] : 1)

    if (backgroundColor) {
      color = rgbaToRgb(color, backgroundColor)
    }
  }

  return color
}

export function joinRgba(color) {
  const [a, b, c, d] = color

  return (
    'rgb' + (d ? 'a(' : '(') + a + ',' + b + ',' + c + (d ? ',' + d + ')' : ')')
  )
}

export function computeThemeColorAlpha(name, alpha = 0.5) {
  const rgba = splitColorCode(
    getComputedStyle(document.documentElement).getPropertyValue(
      `--theme-${name}`
    )
  )

  rgba[3] = (typeof rgba[3] === 'number' ? rgba[3] : 1) * alpha

  return joinRgba(rgba)
}

export function getAppBackgroundColor() {
  const style = getComputedStyle(document.getElementById('app'))
  const color = style.backgroundColor
  return splitColorCode(
    color,
    splitColorCode(style.getPropertyValue('--theme-base'))
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

export function hslToRgb([h, s, l]: number[]) {
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

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)]
}

export function getLinearShade(color, strength: number, saturation?) {
  strength = Math.max(-1, Math.min(1, strength))
  const [a, b, c, d] = color
  const P = strength < 0
  const t = P ? 0 : 255 * strength
  const f = P ? 1 + strength : 1 - strength

  color = [
    Math.round(a * f + t),
    Math.round(b * f + t),
    Math.round(c * f + t),
    typeof d === 'undefined' ? 1 : d
  ]

  if (saturation) {
    const HSL = rgbToHsl(color)

    HSL[1] += saturation

    return hslToRgb(HSL)
  }

  return color
}

export function getLogShade(color, percent, saturation?) {
  percent = Math.max(-1, Math.min(1, percent))
  const [a, b, c, d] = color
  const P = percent < 0
  const t = P ? 0 : percent * 255 ** 2
  const F = P ? 1 + percent : 1 - percent
  color = [
    Math.round((F * a ** 2 + t) ** 0.5),
    Math.round((F * b ** 2 + t) ** 0.5),
    Math.round((F * c ** 2 + t) ** 0.5),
    typeof d === 'undefined' ? 1 : d
  ]

  if (saturation) {
    const HSL = rgbToHsl(color)

    HSL[1] += saturation

    return hslToRgb(HSL)
  }

  return color
}

export function getLinearShadeText(
  color,
  strength,
  saturation?: number,
  threshold = 0.125
) {
  return getLinearShade(
    color,
    strength * (getColorLuminance(color) > threshold ? -1 : 1),
    saturation
  )
}

export function getLogShadeText(
  color,
  strength,
  saturation?: number,
  threshold = 0
) {
  return getLogShade(
    color,
    strength * (getColorLuminance(color) > threshold ? -1 : 1),
    saturation
  )
}
