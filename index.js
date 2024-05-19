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

const password = process.env.API_PASSWORD;

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
        if (text.startsWith('!auth ')) {
          const providedPassword = text.split(' ')[1];
          if (providedPassword === password) {
            await sock.sendMessage(from, { text: 'Authentication successful! You can now use the bot.' });
          } else {
            await sock.sendMessage(from, { text: 'Authentication failed. Incorrect password.' });
          }
        } else {
          await sock.sendMessage(from, { text: 'Please authenticate first by sending !auth <password>.' });
        }
      }
    }
  });
};

startSock();
