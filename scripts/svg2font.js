import svgtofont from 'svgtofont'
import fs from 'fs'
import path from 'path'

const __filename = new URL(import.meta.url).pathname
const __dirname = path.dirname(__filename)

const HEADER = `/* AUTO VAR INJECTION HEADER !! DO NOT MOVE !! */`
const FOOTER = `/* AUTO VAR INJECTION FOOTER !! DO NOT MOVE !! */`

svgtofont({
  src: __dirname + '/../src/assets/svg',
  dist: __dirname + '/../src/assets/fonts',
  fontName: 'icon',
  css: {
    include: /\.scss$/
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

  const variablesScss = fs.readFileSync(
    __dirname + '/../src/assets/sass/variables.scss',
    'utf-8'
  )

  const headerIndex = variablesScss.indexOf(HEADER) + HEADER.length
  const footerIndex = variablesScss.indexOf(FOOTER)
  const fullVariablesScss =
    variablesScss.slice(0, headerIndex) +
    '\n\n' +
    iconVariablesScss +
    variablesScss.slice(footerIndex, variablesScss.length)

  fs.writeFileSync(
    __dirname + '/../src/assets/sass/variables.scss',
    fullVariablesScss
  )
})
