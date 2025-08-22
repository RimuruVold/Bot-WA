const socket = io();

const elQR = document.getElementById('qr'); const elStatus = document.getElementById('status'); const elGroups = document.getElementById('groups'); const elSearch = document.getElementById('search'); const elRefresh = document.getElementById('refresh'); const elTemplate = document.getElementById('template'); const elFirebaseURL = document.getElementById('firebaseURL'); const elInterval = document.getElementById('interval'); const elStart = document.getElementById('start'); const elStop = document.getElementById('stop'); const elLog = document.getElementById('log');

let allGroups = [];

function log(msg) {
const t = new Date().toLocaleTimeString();
elLog.textContent = [$ {
t
}] $ {
msg
}

\n + elLog.textContent;
}

socket.on('qr', ( {
dataUrl, error
}

) => {
if (error) {
elQR.textContent = error;
return;
}

const img = new Image(); img.src = dataUrl; img.alt = 'QR'; img.style.maxWidth = '100%'; elQR.innerHTML = ''; elQR.appendChild(img);
}

);

socket.on('status', ( {
status, reason
}

) => {
elStatus.textContent = Status: $ {
status
}

$ {
reason ? ' ('+reason+')': ''
}; if (status === 'ready') log('Terhubung ke WhatsApp'); if (status === 'auth_failure') log('Auth failure: ' + (reason || ''));
}

);

socket.on('groups', (groups) => {
allGroups = groups || [];
renderGroups();
}

);

socket.on('tick', ( {
at, sentTo
}

) => {
log(Auto-send jalan, terkirim ke $ {
sentTo.length
}

grup);
}

);

function renderGroups() {
const q = (elSearch.value || '').toLowerCase();
elGroups.innerHTML = '';
const list = allGroups.filter(g => (g.name || '').toLowerCase().includes(q));
if (!list.length) {
elGroups.textContent = 'Tidak ada grup cocok.';
return;
}

list.forEach(g => {
const wrap = document.createElement('label');
wrap.className = 'group';
const cb = document.createElement('input');
cb.type = 'checkbox';
cb.value = g.id;
const meta = document.createElement('div');
const nm = document.createElement('div');
nm.className = 'name';
nm.textContent = g.name;
const id = document.createElement('div');
id.className = 'id';
id.textContent = g.id;
meta.appendChild(nm);
meta.appendChild(id);
wrap.appendChild(cb);
wrap.appendChild(meta);
elGroups.appendChild(wrap);
}

);
}

elSearch.addEventListener('input', renderGroups);

elRefresh.addEventListener('click', async () => {
const r = await fetch('/api/groups');
const j = await r.json();
if (j.ok) {
allGroups = j.groups;
renderGroups();
}
}

);

async function post(path, body) {
const r = await fetch(path, {
method: 'POST', headers: {
'Content-Type': 'application/json'
}, body: JSON.stringify(body || {})
}

); return r.json();
}

elStart.addEventListener('click', async () => {
const checked = Array.from(elGroups.querySelectorAll('input[type="checkbox"]:checked')).map(x => x.value);
const template = elTemplate.value;
const firebaseURL = elFirebaseURL.value;
const intervalSeconds = Number(elInterval.value || 300);
const res = await post('/api/start', {
template, groupIds: checked, intervalSeconds, firebaseURL
}

); if (res.ok) {
log(Auto-send aktif setiap $ {
res.runningEverySeconds
}

s untuk $ {
res.targets.length
}

grup); elStart.disabled = true; elStop.disabled = false;
} else {
log('Gagal start: ' + (res.error || ''));
}
}

);

elStop.addEventListener('click', async () => {
const res = await post('/api/stop');
if (res.ok) {
log('Auto-send dihentikan');
elStart.disabled = false;
elStop.disabled = true;
}
}

);