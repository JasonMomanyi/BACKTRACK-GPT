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
      const text = msg.message.conversation;
      const from = msg.key.remoteJid;

      if (text && from) {
        // Generate a response using ChatGPT
        const response = await openai.createChatCompletion({
          model: 'gpt-4',
          messages: [{ role: 'user', content: text }],
        });

        const reply = response.data.choices[0].message.content;

        await sock.sendMessage(from, { text: reply });
      }
    }
  });
};

startSock();
