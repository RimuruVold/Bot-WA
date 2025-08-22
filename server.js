const express = require("express");
const { makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys");
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

async function startSock() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info");

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false // kita tidak pakai QR
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection } = update;
    if (connection === "open") {
      connected = true;
      io.emit("connected");
      console.log("✅ Bot connected to WhatsApp");

      // ambil grup
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

startSock();

// API untuk generate pairing code dengan nomor HP
app.post("/pair", async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: "Phone number required" });

    const code = await sock.requestPairingCode(phone);
    console.log("Pairing code:", code);
    res.json({ code });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get pairing code" });
  }
});

// API untuk kirim pesan
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

// socket.io
io.on("connection", (socket) => {
  console.log("Client connected");
  if (connected) {
    socket.emit("connected");
    socket.emit("groups", groupsCache);
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));