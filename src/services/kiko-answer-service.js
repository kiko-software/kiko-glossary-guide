const debug = require('debug')('glossary-guide:debug')
const createError = require('http-errors')
const axios = require('axios')

class KikoAnswerService {
  /**
   * Creates an instance of KikoAnswerService.
   * @param {*} options
   * @memberof KikoAnswerService
   */
  constructor (options) {
    const { endpointBaseUrl, conversationId } = options
    this.endpointBaseUrl = endpointBaseUrl
    this.conversationId = conversationId
    return this
  }

  /**
   *
   *
   * @param {*} content
   * @param {*} endOfConversation
   * @memberof KikoAnswerService
   */
  async sendMessage (content, endOfConversation) {
    debug('sendMessage () ----- content:', content)
    let tgdMessages
    if (typeof content === 'string') {
      tgdMessages = [{
        type: 'message',
        data: {
          type: 'text/plain',
          content: content
        }
      }]
    } else {
      tgdMessages = content
    }

    // ends the actual looping kiko channel request and ends the actual DF "Default Fallback Intent" wich has a DF "end-of-conversation" property
    if (endOfConversation === true) {
      tgdMessages.push({
        type: 'event',
        name: 'endOfConversation'
      })
    }
    const url = this.endpointBaseUrl + '/api/v1/conversation/send'
    const data = {
      conversationId: this.conversationId,
      messages: tgdMessages
    }
    debug('sendMessage () - url:', url)
    debug('sendMessage () - data:', JSON.stringify(data, null, 2))
    const response = await axios.post(
      url,
      data
    ).catch((error) => { throw createError(500, 'Error on send messages. Error message: ' + error.message) })
    if (!response) { throw createError(500, 'Error on send messages. Empty result.') }
    // debug('sendMessage () - post response.data: ', response.data)
  }
}

module.exports = KikoAnswerService
