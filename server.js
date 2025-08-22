const path = require('path'); const http = require('http'); const express = require('express'); const QRCode = require('qrcode'); const {
    Server
} = require('socket.io'); const axios = require('axios'); const {
    Client,
    LocalAuth
} = require('whatsapp-web.js');

const app = express(); const server = http.createServer(app); const io = new Server(server, {
    cors: {
        origin: '*'
    }
}

);

app.use(express.json()); app.use(express.static(path.join(__dirname, 'public')));

// ===== WhatsApp Client (whatsapp-web.js) ===== let client = null; let isReady = false; let groupsCache = []; let sendInterval = null; let currentTargets = []; let currentTemplate = ''; let currentFirebaseURL = '';

async function buildMessageFromFirebase(url) {
    if (!url) return null;
    try {
        const final = url.endsWith('.json') ? url: (url.endsWith('/') ? url + '.json': url + '/.json');
        const {
            data
        } = await axios.get(final, {
                timeout: 10000
            }

        ); let items = ''; if (Array.isArray(data)) {
            items = data.map((v, i) => $ {
                i + 1
            }

                . $ {
                    v
                }

            ).join('\n');
        } else if (data && typeof data === 'object') {
            const keys = Object.keys(data);
            items = keys.map((k, i) => $ {
                i + 1
            }

                . $ {
                    data[k]
                }

            ).join('\n');
        } else {
            items = String(data ?? '').trim();
        }

        const template = WTS\n$ {
            items
        }

        \n\nMINAT? PM/TAG DI GRUP\nNEGO DI PM!!\nDIRECT/MM FEE LU; return template;
    }

    catch (e) {
        console.warn('[Firebase] fetch failed:', e?.message || e);
        return null;
    }
}

async function listGroups() {
    try {
        const chats = await client.getChats();
        const groups = chats.filter(c => c.isGroup).map(g => ({
            id: g.id._serialized, name: g.name
        }

        )); groups.sort((a, b) => (a.name || '').localeCompare(b.name || '')); groupsCache = groups; return groups;
    }

    catch (e) {
        console.warn('listGroups error:', e?.message || e);
        return [];
    }
}

function stopAutoSend() {
    if (sendInterval) {
        clearInterval(sendInterval);
        sendInterval = null;
    }
}

async function startAutoSend( {
    template, groupIds, intervalSeconds, firebaseURL
}

) {
    stopAutoSend();
    currentTemplate = template || '';
    currentTargets = Array.isArray(groupIds) ? groupIds: [];
    currentFirebaseURL = firebaseURL || '';
    const secs = Math.max(30, Number(intervalSeconds) || 300);

    sendInterval = setInterval(async () => {
        try {
            let msg = await buildMessageFromFirebase(currentFirebaseURL);
            if (!msg) msg = currentTemplate || 'Halo dari bot.';
            for (const gid of currentTargets) {
                await client.sendMessage(gid, msg);
                console.log('[sent]', gid);
            }

            io.emit('tick', {
                at: Date.now(), sentTo: currentTargets
            }

            );
        }

        catch (e) {
            console.error('send loop error:', e?.message || e);
        }
    },
        secs * 1000);

    return secs;
}

async function bootClient() {
    isReady = false;
    client = new Client({
        authStrategy: new LocalAuth({
            dataPath: path.join(__dirname, 'session')
        }

        ),
        puppeteer: {
            headless: true,
            args: ['--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-zygote',
                '--no-first-run'] // Jika Replit punya Chromium sistem, bisa set executablePath: // executablePath: process.env.CHROME_PATH || undefined
        }
    }

    );

    client.on('qr',
        async (qr) => {
            try {
                const dataUrl = await QRCode.toDataURL(qr);
                io.emit('qr', {
                    dataUrl
                }

                ); console.log('[qr] emitted to UI');
            }

            catch (e) {
                io.emit('qr', {
                    error: 'QR generation failed'
                }

                );
            }
        }

    );

    client.on('ready',
        async () => {
            isReady = true;
            console.log('✅ WhatsApp client ready');
            io.emit('status', {
                status: 'ready'
            }

            ); await listGroups(); io.emit('groups', groupsCache);
        }

    );

    client.on('authenticated',
        () => {
            console.log('🔐 Authenticated');
            io.emit('status', {
                status: 'authenticated'
            }

            );
        }

    );

    client.on('auth_failure',
        (m) => {
            console.warn('⚠️ auth_failure:', m);
            io.emit('status', {
                status: 'auth_failure', reason: m
            }

            );
        }

    );

    client.on('disconnected',
        async (reason) => {
            console.warn('❌ Disconnected:', reason);
            io.emit('status', {
                status: 'disconnected', reason
            }

            ); stopAutoSend(); setTimeout(() => {
                    bootClient().catch(console.error);
                }, 3000);
        }

    );

    await client.initialize();
}

// ===== API ===== app.get('/api/groups', async (req, res) => {
try {
    if (!isReady) return res.json({
        ok: false, error: 'not_ready'
    }

    ); const groups = await listGroups(); res.json( {
            ok: true, groups
        }

    );
}

catch (e) {
    res.status(500).json({
        ok: false, error: String(e)
    }

    );
}
}

);

app.post('/api/start', async (req, res) => {
try {
if (!isReady) return res.status(400).json({
ok: false, error: 'not_ready'
}

); const {
template,
groupIds,
intervalSeconds,
firebaseURL
} = req.body || {}; if (!Array.isArray(groupIds) || !groupIds.length) return res.status(400).json( {
ok: false, error: 'no_targets'
}

); const secs = await startAutoSend( {
template, groupIds, intervalSeconds, firebaseURL
}

); res.json( {
ok: true, runningEverySeconds: secs, targets: groupIds
}

);
}

catch (e) {
res.status(500).json({
ok: false, error: String(e)
}

);
}
}

);

app.post('/api/stop', async (req, res) => {
stopAutoSend();
res.json({
ok: true, stopped: true
}

);
}

);

io.on('connection', (socket) => {
socket.emit('status', {
status: isReady ? 'ready': 'waiting_qr'
}

); if (groupsCache.length) socket.emit('groups', groupsCache);
}

);

const PORT = process.env.PORT || 3000; server.listen(PORT, async () => {
console.log('HTTP on :' + PORT);
await bootClient();
}

);