const createError = require('http-errors')
const axios = require('axios')

const glossaryBaseUrl = 'https://webservice.kiko.bot/glossary'
const glossaryApiKey = '827345287346528746'
const eocEvent = {
  type: 'event',
  name: 'endOfConversation'
}

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
 * 
 * @param {*} options 
 * @returns 
 */
async function getGlossaryDescriptionLinks(options) {
  const { glossaryProfileName, words } = options
  const response = await axios({ 
    url: glossaryBaseUrl + '/v1/get-description-links?api_key=' + glossaryApiKey, 
    method: 'POST', 
    data: { 
      words: words, 
      glossaryProfileName: glossaryProfileName  
    }
  }).catch((error) => { throw createError(500, error.message) })
  console.log('getGlossaryDescriptionLinks - response.data:', response.data)
  return response.data.glossaryDescriptionLinks
}

/**
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
      
      const glossaryDescriptionLinks = await getGlossaryDescriptionLinks({
        words: uniqueWords, 
        glossaryProfileName: glossaryProfileName
      })
      // { links: [ {word: 'example word', url: 'example url to a html page with the description of the word' } ] }
      
      let htmlContent = '<p>' + msg.data.content + '</p>'
      console.log('sendOutputWithLinkedGlossaryWords - htmlContent:', htmlContent)
      for (const glossaryDescriptionLink of glossaryDescriptionLinks) {
        const link = '<a href="' + glossaryDescriptionLink.url + '" target="_self" >' + glossaryDescriptionLink.word + '</a>'
        console.log('sendOutputWithLinkedGlossaryWords - glossaryDescriptionLink.word:', glossaryDescriptionLink.word)
        console.log('sendOutputWithLinkedGlossaryWords - link:', link)

        // htmlContent = htmlContent.replaceAll( glossaryDescriptionLink.word, link)
        // For older nodejs versions like 14
        htmlContent = htmlContent.replace(new RegExp(glossaryDescriptionLink.word, 'g'), link)
        
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
