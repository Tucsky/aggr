const svgtofont = require('svgtofont')
const fs = require('fs')

const HEADER = `/**\n* EXCHANGES HEADER\n* DO NOT CHANGE OR REMOVE\n**/\n`

const FOOTER = `/**\n* EXCHANGES FOOTER\n* DO NOT CHANGE OR REMOVE\n**/\n`

svgtofont({
  src: __dirname + '/../src/assets/exchanges/flat',
  dist: __dirname + '/../src/assets/exchanges/fonts',
  fontName: 'exchanges',
  css: true,
  startUnicode: 0xe960
}).then(() => {
  let scss = fs.readFileSync(
    __dirname + '/../src/assets/exchanges/fonts/exchanges.scss',
    'utf-8'
  )
  let exchangeList = '$exchange-list: (\n\t'
  const index = scss.indexOf('$exchanges-')
  scss = scss.slice(index).split('\n')
  scss = scss.slice(0, scss.length - 2)
  scss.forEach((entry, index) => {
    const val = entry.split(':')[0]
    exchangeList +=
      "'" +
      val.split('-')[1] +
      "': " +
      val +
      (index < scss.length - 1 ? ',\n\t' : '\n);')
  })

  const exchangeScss =
    "$iconpath: '../fonts/';\n" +
    fs
      .readFileSync(
        __dirname + '/../src/assets/exchanges/fonts/exchanges.scss',
        'utf-8'
      )
      .slice(0, index)
      .replaceAll('url("exchanges', 'url("#{$iconpath}exchanges')
      .replaceAll("url('exchanges", "url('#{$iconpath}exchanges")
  fs.writeFileSync(
    __dirname + '/../src/assets/sass/exchanges.scss',
    exchangeScss
  )

  fs.copyFileSync(
    __dirname + '/../src/assets/exchanges/fonts/exchanges.svg',
    __dirname + '/../src/assets/fonts/exchanges.svg'
  )
  fs.copyFileSync(
    __dirname + '/../src/assets/exchanges/fonts/exchanges.woff',
    __dirname + '/../src/assets/fonts/exchanges.woff'
  )
  fs.copyFileSync(
    __dirname + '/../src/assets/exchanges/fonts/exchanges.woff2',
    __dirname + '/../src/assets/fonts/exchanges.woff2'
  )
  fs.copyFileSync(
    __dirname + '/../src/assets/exchanges/fonts/exchanges.eot',
    __dirname + '/../src/assets/fonts/exchanges.eot'
  )

  const variableData =
    fs
      .readFileSync(
        __dirname + '/../src/assets/exchanges/fonts/exchanges.scss',
        'utf-8'
      )
      .slice(index) + exchangeList
  let variables = fs.readFileSync(
    __dirname + '/../src/assets/sass/variables.scss',
    'utf-8'
  )
  const variablesIndex = variables.indexOf(HEADER)
  if (variablesIndex !== -1) {
    const variablesFooterIndex = variables.indexOf(FOOTER) + FOOTER.length
    variables =
      variables.slice(0, variablesIndex) + variables.slice(variablesFooterIndex)
  }
  fs.writeFileSync(
    __dirname + '/../src/assets/sass/variables.scss',
    variables + '\n' + HEADER + variableData + '\n' + FOOTER
  )

  console.log('wrote scss variable')

  fs.rmSync(__dirname + '/../src/assets/exchanges/fonts/', {
    recursive: true,
    force: true
  })

  fs.mkdirSync(__dirname + '/../src/assets/exchanges/fonts/')
})
