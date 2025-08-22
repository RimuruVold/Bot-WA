const socket = io();

const pairSection = document.getElementById("pair-section");
const pairCodeEl = document.getElementById("pair-code");
const connectedSection = document.getElementById("connected-section");
const groupSelect = document.getElementById("group");
const sendForm = document.getElementById("send-form");
const messageInput = document.getElementById("message");

async function getCode() {
  const phone = document.getElementById("phone").value.trim();
  if (!phone) return alert("Masukkan nomor telepon!");
  const res = await fetch("/pair", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone })
  });
  const data = await res.json();
  if (data.code) {
    pairCodeEl.textContent = "Kode Pairing: " + data.code;
  } else {
    pairCodeEl.textContent = "Gagal mendapatkan kode.";
  }
}

socket.on("connected", () => {
  pairSection.style.display = "none";
  connectedSection.style.display = "block";
});

socket.on("groups", (groups) => {
  groupSelect.innerHTML = "";
  groups.forEach(g => {
    const option = document.createElement("option");
    option.value = g.id;
    option.textContent = g.name;
    groupSelect.appendChild(option);
  });
});

sendForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const groupId = groupSelect.value;
  const message = messageInput.value;
  if (!groupId || !message) return alert("Isi semua field!");
  await fetch("/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ groupId, message })
  });
  alert("Pesan terkirim!");
});