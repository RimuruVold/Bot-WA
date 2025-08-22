const socket = io();

const qrSection = document.getElementById("qr-section");
const qrCodeImg = document.getElementById("qr-code");
const connectedSection = document.getElementById("connected-section");
const groupSelect = document.getElementById("group");
const sendForm = document.getElementById("send-form");
const messageInput = document.getElementById("message");

socket.on("qr", (qrUrl) => {
  qrCodeImg.src = qrUrl;
  qrSection.style.display = "block";
  connectedSection.style.display = "none";
});

socket.on("connected", () => {
  qrSection.style.display = "none";
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