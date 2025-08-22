const { Client, LocalAuth } = require('whatsapp-web.js');
import qrcode from 'qrcode-terminal';
import fs from 'fs';

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './session' })
});

// Tampilkan QR code pertama kali
client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
    console.log("Scan QR di atas dengan WhatsApp");
});

client.on('ready', () => {
    console.log("✅ WhatsApp Bot sudah siap!");
});

// Event saat ada pesan (kalau mau auto-reply)
client.on('message', msg => {
    if (msg.body === "!ping") {
        msg.reply("pong 🏓");
    }
});

client.initialize();

// Fungsi kirim pesan ke grup
export async function sendMessageToGroup(groupName, message) {
    try {
        const chats = await client.getChats();
        const group = chats.find(chat => chat.isGroup && chat.name.toLowerCase() === groupName.toLowerCase());

        if (!group) {
            console.log("❌ Grup tidak ditemukan:", groupName);
            return false;
        }

        await client.sendMessage(group.id._serialized, message);
        console.log(`✅ Pesan terkirim ke grup: ${groupName}`);
        return true;
    } catch (err) {
        console.error("❌ Error kirim pesan:", err);
        return false;
    }
}