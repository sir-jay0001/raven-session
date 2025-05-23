const PastebinAPI = require('pastebin-js');
const pastebin = new PastebinAPI('EMWTMkQAVfJa9kM-MRUrxd5Oku1U7pgL');
const { makeid } = require('./id');
const express = require('express');
const fs = require('fs');
const pino = require('pino');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
} = require("@whiskeysockets/baileys");

const router = express.Router();

// Helper function to remove files
function removeFile(filePath) {
    if (!fs.existsSync(filePath)) return false;
    fs.rmSync(filePath, { recursive: true, force: true });
}

// Route handler
router.get('/', async (req, res) => {
    const id = makeid();
    let num = req.query.number;

    async function RAVEN() {
        const { state, saveCreds } = await useMultiFileAuthState('./temp/' + id);
        try {
      const client = makeWASocket({
        printQRInTerminal: false,
        logger: pino({
          level: 'silent',
        }),
        browser: ['Ubuntu', 'Chrome', '20.0.04'],
        auth: state,
      })

            if (!client.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, '');
                const code = await client.requestPairingCode(num);

                 if (!res.headersSent) {
                    await res.send({ code });
                }
            }

            client.ev.on('creds.update', saveCreds);
            client.ev.on('connection.update', async (s) => {
                const { connection, lastDisconnect } = s;
                if (connection === 'open') {
                await client.sendMessage(client.user.id, { text: `Generating your session, Wait a moment. . .` });
                    await delay(50000);
                    
                    const data = fs.readFileSync(__dirname + `/temp/${id}/creds.json`);
                    await delay(8000);
                    const b64data = Buffer.from(data).toString('base64');
                    const session = await client.sendMessage(client.user.id, { text: '' + b64data });

                    // Send message after session
                    await client.sendMessage(client.user.id, {text: "```Raven has been linked to your WhatsApp account! Do not share this session_id with anyone.\n\nCopy and paste it on the SESSION string during deploy as it will be used for authentication.\n\nIncase you are facing Any issue reach me via here👇\n\nhttps://wa.me/message/YNDA2RFTE35LB1\n\nAnd don't forget to sleep😴, for even the rentless must recharge⚡.\n\nGoodluck 🎉. ```" }, { quoted: session });
                    
                    await delay(100);
                    await client.ws.close();
                    removeFile('./temp/' + id);
                } else if (connection === 'close' && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode !== 401) {
                    await delay(10000);
                    RAVEN();
                }
            });
        } catch (err) {
            console.log('service restarted', err);
            removeFile('./temp/' + id);
            if (!res.headersSent) {
                await res.send({ code: 'Service Currently Unavailable' });
            }
        }
    }

    await RAVEN();
});

module.exports = router;
