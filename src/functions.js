const createError = require('http-errors')
const axios = require('axios')

// ---
const glossaryBaseUrl = 'https://webservice.kiko.bot/glossary'
const glossaryApikey = '827345287346528746' // api key for test purposes

/**
 * sends output messages to kiko bot
 *
 * @param {*} messages
 * @param {*} options
 */
async function sendOutputMessages (options) {
  const { messages, endpointBaseUrl, conversationId } = options
  console.log('sendOutputMessages - messages:', messages)
  const response = await axios.post(
    endpointBaseUrl + '/api/v1/conversation/send',
    {
      conversationId: conversationId,
      messages: messages
    }
  ).catch((error) => { throw createError(500, 'Error on send messages. Error message: ' + error.message) })
  if (!response) { throw createError(500, 'Error on send messages. Empty result.') }
}

/**
 * fetches the glossary links from the glossary-db for the words
 * 
 * @param {*} options 
 * @returns 
 */
async function getlinks(options) {
  const { glossaryProfileName, words } = options
  const response = await axios({ 
    url: glossaryBaseUrl + '/v1/get-links?apikey=' + glossaryApikey, 
    method: 'POST', 
    data: { 
      words: words, 
      glossaryProfileName: glossaryProfileName  
    }
  }).catch((error) => { throw createError(500, error.message) })
  console.log('getlinks - response.data:', response.data)
  // expected structure (example): { links: [ {word: 'example word', url: 'example url to a html page with the description of the word' } ] }
 
  return response.data.links
}

// ---
const eocEvent = {
  type: 'event',
  name: 'endOfConversation'
}

/**
 * adds links to the output and sends it to the webchat
 * 
 * @param {*} options 
 */
 async function sendOutputWithLinkedGlossaryWords (options) {
  const { messages, conversationId, endpointBaseUrl, glossaryProfileName } = options

  // go through the message list
  const outputMessages = []
  for (const msg of messages) {
    // if we have a text message - check and get the glossary url for every word.
    // replace these words and produce a html message
    let outputMessage
    console.log('sendOutputWithLinkedGlossaryWords - msg:', msg)
    if (
      msg.type === 'message' &&
      msg.data &&
      msg.data.type === 'text/plain'
    ) {
      // msg.data.content
      const R =  /(\w|\s)*\w(?=")|\w+/g
      const words = msg.data.content.match(R)
      const uniqueWords = words.filter((v, i, a) => a.indexOf(v) === i)
      
      const glossaryLinks = await getlinks({
        words: uniqueWords, 
        glossaryProfileName: glossaryProfileName
      })
      
      let htmlContent = '<p>' + msg.data.content + '</p>'
      console.log('sendOutputWithLinkedGlossaryWords - htmlContent:', htmlContent)
      for (const glossaryLink of glossaryLinks) {
        const link = '<a href="' + glossaryLink.url + '" target="_self" >' + glossaryLink.word + '</a>'
        console.log('sendOutputWithLinkedGlossaryWords - glossaryLink.word:', glossaryLink.word)
        console.log('sendOutputWithLinkedGlossaryWords - link:', link)

        // htmlContent = htmlContent.replaceAll( glossaryLink.word, link)
        // For older nodejs versions like 14
        htmlContent = htmlContent.replace(new RegExp(glossaryLink.word, 'g'), link)
        
        console.log('sendOutputWithLinkedGlossaryWords - htmlContent:', htmlContent)
      }
      outputMessage = {
        type: 'message',
        data: {
          type: 'text/html',
          content: htmlContent
        }
      }      
    } else {
      outputMessage = msg
    }
    outputMessages.push(outputMessage)
  }
  outputMessages.push(eocEvent)
  await sendOutputMessages({ messages: outputMessages, endpointBaseUrl, conversationId })
}

/**
 * Kiko subbot action router for import actions
 *
 * @param {*} req
 * @param {*} res
 */
async function postWebhookMessageSent (req, res) {
  const { conversationId, messages } = req.body
  const referer = req.get('referer') || req.query.referer
  if (!referer) throw createError(400, 'Missing referer.')
  const endpointBaseUrl = referer.replace(/\/\//g, 'https://')
  // ---
  const metadata = messages[0].metaData
  console.log('postWebhookMessageSent - messages[0].metaData:', metadata)
  if (metadata) {
    if (!metadata.intent) { throw createError(500, 'Missing metadata intent.')}    
    await sendOutputWithLinkedGlossaryWords({ 
      messages: metadata.intent.output, 
      conversationId: conversationId, 
      endpointBaseUrl: endpointBaseUrl,
      glossaryProfileName: metadata.glossaryProfileName
    }).catch((err) => { throw createError(500, 'sendOutputWithLinkedGlossaryWords: ' + err) })
  } else {
    console.log('Warning - No metadata - send eoc. - messages:', messages)
    await sendOutputMessages({ 
      messages:[eocEvent], 
      conversationId: conversationId, 
      endpointBaseUrl: endpointBaseUrl 
    }).catch((err) => { throw createError(500, 'sendOutputMessages: ' + err) })
  }
  // ---
  res.status(200).json({ success: true })
}

module.exports = {
  postWebhookMessageSent
}
