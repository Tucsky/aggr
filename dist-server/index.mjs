import express from 'express'
import path from 'node:path'
import { config } from 'dotenv'

config()

const __filename = new URL(import.meta.url).pathname
let __dirname = path.dirname(__filename)

if(process.platform === "win32"){
	__dirname = __dirname.substring(1)
}

const app = express()
const PORT = process.env.DIST_SERVER_PORT || 8060
app.use(express.static(path.join(__dirname, '..', 'dist')))
app.get('/*', (req, res) => {
  console.log(__filename, __dirname)
  res.sendFile('index.html', {
    root: __dirname + '/../dist'
  })
})
app.listen(PORT, () => {
  console.log(`aggr dist server started on ${PORT}`)
})
