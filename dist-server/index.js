const express = require('express')
const path = require('node:path')
const { config } = require('dotenv')
config()
const app = express()
const PORT = process.env.DIST_SERVER_PORT || 8060
app.use(express.static(path.join(__dirname, '..', 'dist')))
app.get("*", (req, res) => {
    res.sendFile(path.join(__diname, '..', 'dist', 'index.html'))
})
app.listen(PORT, () => { console.log(`aggr dist server started on ${PORT}`) })