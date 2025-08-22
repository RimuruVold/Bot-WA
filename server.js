const express = require("express");
const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys");
const qrcode = require("qrcode");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

let sock;
let connected = false;
let groupsCache = [];

// Start WA connection
async function startSock() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info");
  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, qr } = update;
    if (qr) {
      const qrCodeUrl = await qrcode.toDataURL(qr);
      io.emit("qr", qrCodeUrl);
    }
    if (connection === "open") {
      connected = true;
      io.emit("connected");
      console.log("✅ Bot connected to WhatsApp");
      // get groups
      const groups = await sock.groupFetchAllParticipating();
      groupsCache = Object.values(groups).map(g => ({
        id: g.id,
        name: g.subject
      }));
      io.emit("groups", groupsCache);
    } else if (connection === "close") {
      connected = false;
      io.emit("disconnected");
    }
  });

  sock.ev.on("creds.update", saveCreds);
}

// API to send message
app.post("/send", async (req, res) => {
  try {
    if (!connected) return res.status(400).json({ error: "Not connected" });
    const { groupId, message } = req.body;
    if (!groupId || !message) return res.status(400).json({ error: "Missing params" });
    await sock.sendMessage(groupId, { text: message });
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// Socket.IO connection
io.on("connection", (socket) => {
  console.log("Client connected");
  if (connected) {
    socket.emit("connected");
    socket.emit("groups", groupsCache);
  }
});

startSock();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));