const { default: makeWASocket, useSingleFileAuthState } = require('@whiskeysockets/baileys');
const { Configuration, OpenAIApi } = require('openai');
const P = require('pino');
require('dotenv').config();

// Initialize OpenAI API
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Initialize WhatsApp socket with creds.json
const { state, saveState } = useSingleFileAuthState('./creds.json');

const startSock = async () => {
  const sock = makeWASocket({
    logger: P({ level: 'silent' }),
    printQRInTerminal: true,
    auth: state,
  });

  sock.ev.on('creds.update', saveState);

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type === 'notify') {
      const msg = messages[0];
      if (!msg.message) return;

      const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
      const from = msg.key.remoteJid;

      if (text && from) {
        const response = await getChatGptResponse(text);
        await sock.sendMessage(from, { text: response });
      }
    }
  });
};

const getChatGptResponse = async (message) => {
  try {
    const completion = await openai.createCompletion({
      model: 'text-davinci-003',
      prompt: message,
      max_tokens: 150,
    });
    return completion.data.choices[0].text.trim();
  } catch (error) {
    console.error('Error with OpenAI API request:', error);
    return 'Sorry, I encountered an error while processing your request.';
  }
};

startSock();
