require('dotenv').config();
const { default: makeWASocket, useSingleFileAuthState } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const axios = require('axios');
const { state, saveState } = useSingleFileAuthState('./auth_info.json');
const qrcode = require('qrcode-terminal');

async function startWhatsAppBot() {
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: undefined,
        browser: ['Baileys', 'Chrome', '1.0.0']
    });

    sock.ev.on('creds.update', saveState);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error = Boom) ? Boom(lastDisconnect.error).output.statusCode !== DisconnectReason.loggedOut : true;
            console.log('connection closed due to ', lastDisconnect.error, ', reconnecting ', shouldReconnect);
            // reconnect if not logged out
            if (shouldReconnect) {
                startWhatsAppBot();
            }
        } else if (connection === 'open') {
            console.log('opened connection');
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const messageType = Object.keys(msg.message)[0];
        let messageText = '';

        if (messageType === 'conversation') {
            messageText = msg.message.conversation;
        } else if (messageType === 'extendedTextMessage') {
            messageText = msg.message.extendedTextMessage.text;
        }

        if (messageText) {
            try {
                const gptResponse = await axios.post(
                    'https://api.openai.com/v1/engines/davinci-codex/completions',
                    {
                        prompt: messageText,
                        max_tokens: 150,
                        n: 1,
                        stop: null,
                        temperature: 0.9
                    },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
                        }
                    }
                );

                const gptReply = gptResponse.data.choices[0].text.trim();

                await sock.sendMessage(from, { text: gptReply });
            } catch (error) {
                console.error('Error:', error);
                await sock.sendMessage(from, { text: 'Sorry, there was an error processing your request.' });
            }
        }
    });
}

startWhatsAppBot();
