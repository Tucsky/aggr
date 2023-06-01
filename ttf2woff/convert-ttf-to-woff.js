const ttf2woff = require('ttf2woff/index')
const fs = require('fs')

const ttf = new Uint8Array(
  fs.readFileSync(__dirname + '/../src/assets/fonts/icon-test.ttf')
)
const woff = ttf2woff(ttf, {})
fs.writeFileSync(__dirname + '/../src/assets/fonts/icon-test.woff', woff)
