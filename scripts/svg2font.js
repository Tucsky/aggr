import fs from 'fs'
import path from 'path'
import svgtofont from 'svgtofont'

const __filename = new URL(import.meta.url).pathname
const __dirname = path.dirname(__filename)

const HEADER = `/* AUTO VAR INJECTION HEADER !! DO NOT MOVE !! */`
const FOOTER = `/* AUTO VAR INJECTION FOOTER !! DO NOT MOVE !! */`

// Load existing icon mappings to preserve unicode codepoints
const variablesPath = __dirname + '/../src/assets/sass/variables.scss'
const variablesContent = fs.readFileSync(variablesPath, 'utf-8')
const existingIcons = {}
const headerIdx = variablesContent.indexOf(HEADER)
const footerIdx = variablesContent.indexOf(FOOTER)

if (headerIdx !== -1 && footerIdx !== -1) {
  const section = variablesContent.slice(headerIdx, footerIdx)
  section.split('\n').forEach(line => {
    const match = line.match(/\$icon-([^:]+):\s*"\\([^"]+)"/)
    if (match) {
      existingIcons[match[1]] = parseInt(match[2], 16)
    }
  })
}

let nextUnicode = Math.max(...Object.values(existingIcons), 0xea00) + 1

svgtofont({
  src: __dirname + '/../src/assets/svg',
  dist: __dirname + '/../src/assets/fonts',
  fontName: 'icon',
  css: {
    include: /\.scss$/
  },
  getIconUnicode: name => {
    // Return existing unicode if icon exists, otherwise assign next available
    if (existingIcons[name]) {
      return [String.fromCharCode(existingIcons[name]), existingIcons[name]]
    }
    const unicode = nextUnicode++
    return [String.fromCharCode(unicode), unicode]
  }
}).then(() => {
  const baseIconScss = fs.readFileSync(
    __dirname + '/../src/assets/fonts/icon.scss',
    'utf-8'
  )

  const iconVariablesScss = baseIconScss.slice(
    baseIconScss.indexOf('$'),
    baseIconScss.length
  )

  const iconScss =
    "$iconpath: '../fonts/';\n" +
    baseIconScss
      .replaceAll('url("icon', 'url("#{$iconpath}icon')
      .replaceAll("url('icon", "url('#{$iconpath}icon")
      .replace(
        'font-size: 16px;\n',
        `
  &.-lower {
    position: relative;
    top: 1px;
  }

  &.-higher {
    position: relative;
    top: -1px;
  }

  &.-large {
    font-size: 1.5rem;
  }

  &.-small {
    font-size: 0.75em;
  }

  &.-inline {
    line-height: 1.4;
  }\n`
      )
  fs.writeFileSync(
    __dirname + '/../src/assets/sass/icons.scss',
    iconScss.replace(iconVariablesScss, '')
  )

  const variablesScss = fs.readFileSync(variablesPath, 'utf-8')
  const headerIndex = variablesScss.indexOf(HEADER) + HEADER.length
  const footerIndex = variablesScss.indexOf(FOOTER)
  const fullVariablesScss =
    variablesScss.slice(0, headerIndex) +
    '\n\n' +
    iconVariablesScss +
    variablesScss.slice(footerIndex, variablesScss.length)

  fs.writeFileSync(variablesPath, fullVariablesScss)
})
