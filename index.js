const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const { Configuration, OpenAIApi } = require('openai');
const P = require('pino');
const fs = require('fs');
require('dotenv').config();

// Initialize OpenAI API
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const startSock = async () => {
  // Initialize WhatsApp socket with multi-file auth state
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

  const sock = makeWASocket({
    logger: P({ level: 'silent' }),
    printQRInTerminal: true,
    auth: state,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type === 'notify') {
      const msg = messages[0];
      if (!msg.message) return;

      const text = msg.message.conversation;
      const from = msg.key.remoteJid;

      if (text && from) {
        try {
          // Generate a response using ChatGPT
          const response = await openai.createChatCompletion({
            model: 'gpt-4',
            messages: [{ role: 'user', content: text }],
          });

          const reply = response.data.choices[0].message.content;

          await sock.sendMessage(from, { text: reply });
        } catch (error) {
          console.error('Error generating response:', error);
          await sock.sendMessage(from, { text: 'An error occurred while processing your message.' });
        }
      }
    }
  });
};

startSock().catch(console.error);
