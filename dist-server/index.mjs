import express from 'express'
import path from 'node:path'
import { config } from 'dotenv'

config()

const __filename = new URL(import.meta.url).pathname
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.DIST_SERVER_PORT || 8060
app.use(express.static(path.join(__dirname, '..', 'dist')))
app.get("/*", (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'))
})
app.listen(PORT, () => { console.log(`aggr dist server started on ${PORT}`) })