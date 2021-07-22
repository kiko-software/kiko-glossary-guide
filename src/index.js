const express = require('express')
const cors = require('cors')
const compress = require('compression')
const bodyParser = require('body-parser')

const Functions = require('./functions')

// ============================
// console.log('============ index.js - START')
const app = express()
app.use(cors())
app.use(compress())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

app.get('/v1/ping', (req, res) => { res.status(200).send('pong.') })
app.post('/v1/webhook-message-sent', Functions.postWebhookMessageSent)

// error handling
app.use((error, req, res, next) => {
  console.error('ERROR:', error.status, error.message)
  console.debug('STACK:', error.stack)
  res.status(error.status || 500)
  res.json({
    status: error.status,
    message: error.message
  })
})
// ---

const port = process.env.PORT || 8082
app.listen(port, () => {
  console.log(`Server is up and running on port number ${port}`)
})
