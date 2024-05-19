const { default: makeWASocket, useSingleFileAuthState } = require('@whiskeysockets/baileys');
const { writeFileSync } = require('fs');
const { Configuration, OpenAIApi } = require('openai');
const P = require('pino');
require('dotenv').config();

// Initialize OpenAI API
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Initialize WhatsApp socket
const { state, saveState } = useSingleFileAuthState('./auth_info.json');

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
        try {
          const response = await openai.createCompletion({
            model: 'text-davinci-003',
            prompt: text,
            max_tokens: 150,
          });

          await sock.sendMessage(from, {
            text: response.data.choices[0].text.trim(),
          });
        } catch (err) {
          console.error('Error: ', err);
        }
      }
    }
  });
};

startSock();
