import express from "express";
import bodyParser from "body-parser";
import { sendMessageToGroup } from "./index.js";

const app = express();
const PORT = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("views"));

app.post("/send", async (req, res) => {
    const { group, message } = req.body;
    const success = await sendMessageToGroup(group, message);

    if (success) {
        res.send(`<h3>✅ Pesan terkirim ke grup ${group}</h3><a href="/">Kembali</a>`);
    } else {
        res.send(`<h3>❌ Gagal mengirim ke grup ${group}</h3><a href="/">Coba Lagi</a>`);
    }
});

app.listen(PORT, () => {
    console.log(`🌐 Web Panel jalan di http://localhost:${PORT}`);
});