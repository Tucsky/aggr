const fs = require('fs')
const svg2ttf = require('svg2ttf')

const ttf = svg2ttf(
  fs.readFileSync(__dirname + '/../src/assets/fonts/icon.svg', 'utf8'),
  {}
)
fs.writeFileSync(
  __dirname + '/../src/assets/fonts/icon-test.ttf',
  Buffer.from(ttf.buffer)
)
