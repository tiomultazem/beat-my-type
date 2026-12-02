/**
 * BEAT-MY-TYPE FRONTEND ENGINE
 * Standard Typing Engine with Anti-Cheat, Ghost Racer, and GAS Web App Sync
 */

const DEFAULT_API_URL = 'https://script.google.com/macros/s/AKfycby0vtuSERXWlNXMnxIPspHM1K7tCxXmKkbPnmXxqJnvMokLxB9uMDPMLSdqobG1cpKt/exec';

const state = {
  apiUrl: DEFAULT_API_URL,
  mode: new URLSearchParams(window.location.search).get('mode') === 'admin' ? 'admin' : 'challenger',
  adminName: 'Admin',
  candidateId: '',
  candidateName: '',
  targetText: '',
  adminWpm: 0,
  adminAccuracy: 0,
  adminGhost: [],
  charIndex: 0,
  keystrokes: [], // [{t: deltaMs, k: key, err: boolean}]
  startTime: null,
  timerInterval: null,
  ghostInterval: null,
  isFinished: false,
  totalErrors: 0
};

// DOM Elements
const modeBadge = document.getElementById('modeBadge');
const identityCard = document.getElementById('identityCard');
const historyCard = document.getElementById('historyCard');
const welcomeText = document.getElementById('welcomeText');
const sessionInfo = document.getElementById('sessionInfo');
const quotaRemaining = document.getElementById('quotaRemaining');
const historyList = document.getElementById('historyList');
const launchArenaBtn = document.getElementById('launchArenaBtn');
const logoutBtn = document.getElementById('logoutBtn');
const adminNameLogin = document.getElementById('adminNameLogin');
const adminWpmLogin = document.getElementById('adminWpmLogin');
const adminAccLogin = document.getElementById('adminAccLogin');
const adminNameDashboard = document.getElementById('adminNameDashboard');
const adminWpmDashboard = document.getElementById('adminWpmDashboard');
const adminAccDashboard = document.getElementById('adminAccDashboard');
const adminPanel = document.getElementById('adminPanel');
const arenaCard = document.getElementById('arenaCard');
const candidateIdInput = document.getElementById('candidateId');
const candidateNameInput = document.getElementById('candidateName');
const startTestBtn = document.getElementById('startTestBtn');
const candidateError = document.getElementById('candidateError');
const adminNameInput = document.getElementById('adminNameInput');
const customTargetText = document.getElementById('customTargetText');
const setAdminBenchmarkBtn = document.getElementById('setAdminBenchmarkBtn');
const textDisplay = document.getElementById('textDisplay');
const hiddenInput = document.getElementById('hiddenInput');
const adminProgress = document.getElementById('adminProgress');
const userProgress = document.getElementById('userProgress');
const adminNameDisplay = document.getElementById('adminNameDisplay');
const adminWpmDisplay = document.getElementById('adminWpmDisplay');
const liveWpm = document.getElementById('liveWpm');
const liveAcc = document.getElementById('liveAcc');
const liveTime = document.getElementById('liveTime');
const resultModal = document.getElementById('resultModal');
const resultBanner = document.getElementById('resultBanner');
const resUserWpm = document.getElementById('resUserWpm');
const resAdminWpm = document.getElementById('resAdminWpm');
const resAccuracy = document.getElementById('resAccuracy');
const resDuration = document.getElementById('resDuration');
const resAttempts = document.getElementById('resAttempts');
const closeModalBtn = document.getElementById('closeModalBtn');
const updateToast = document.getElementById('updateToast');
const reloadAppBtn = document.getElementById('reloadAppBtn');

// Version Polling for Auto-Update
let currentVersion = '1.0.1';
initUpdateChecker();

function initUpdateChecker() {
  reloadAppBtn.addEventListener('click', () => {
    window.location.reload(true);
  });

  setInterval(async () => {
    if (state.isFinished || state.startTime) return;
    try {
      const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (data.version && data.version !== currentVersion) {
        updateToast.classList.remove('hidden');
      }
    } catch (e) {
      // ignore network errors
    }
  }, 45000);
}

// Fetch Benchmark Target globally
fetchTargetBenchmark();

// Init Session Cache
checkSavedSession();

async function fetchTargetBenchmark() {
  try {
    const res = await fetch(`${state.apiUrl}?service=beat_my_type&action=get_target`);
    const json = await res.json();
    if (json.status === 'success') {
      state.targetText = json.targetText || '';
      state.adminName = json.adminName || 'Admin';
      state.adminWpm = json.adminWpm || 0;
      state.adminAccuracy = json.adminAccuracy || 0;
      state.adminGhost = json.adminGhost || [];

      // Update Login Banner
      if (adminNameLogin) adminNameLogin.textContent = state.adminName;
      if (adminWpmLogin) adminWpmLogin.textContent = state.adminWpm;
      if (adminAccLogin) adminAccLogin.textContent = state.adminAccuracy;

      // Update Dashboard & Race Display
      if (adminNameDashboard) adminNameDashboard.textContent = state.adminName;
      if (adminWpmDashboard) adminWpmDashboard.textContent = state.adminWpm;
      if (adminAccDashboard) adminAccDashboard.textContent = state.adminAccuracy;
      if (adminNameDisplay) adminNameDisplay.textContent = state.adminName;
      if (adminWpmDisplay) adminWpmDisplay.textContent = state.adminWpm;
    }
  } catch (err) {
    console.error('Gagal mengambil target admin:', err);
  }
}

if (state.mode === 'admin') {
  modeBadge.textContent = 'Mode: Admin (Perekam Benchmark)';
  modeBadge.style.color = '#f59e0b';
  adminPanel.classList.remove('hidden');
  identityCard.classList.add('hidden');
  historyCard.classList.add('hidden');
}

function checkSavedSession() {
  if (state.mode === 'admin') return;
  const saved = localStorage.getItem('BMT_USER_SESSION');
  if (saved) {
    try {
      const user = JSON.parse(saved);
      if (user.candidateId && user.candidateName) {
        state.candidateId = user.candidateId;
        state.candidateName = user.candidateName;
        showHistoryDashboard();
      }
    } catch (e) {
      localStorage.removeItem('BMT_USER_SESSION');
    }
  }
}

// Login
startTestBtn.addEventListener('click', () => {
  const cid = candidateIdInput.value.trim().toLowerCase();
  const cname = candidateNameInput.value.trim();
  if (!cid || !cname) {
    candidateError.textContent = 'Harap isi ID dan Nama Anda!';
    return;
  }
  candidateError.textContent = '';
  state.candidateId = cid;
  state.candidateName = cname;

  localStorage.setItem('BMT_USER_SESSION', JSON.stringify({ candidateId: cid, candidateName: cname }));
  showHistoryDashboard();
});

// Logout / Ganti Peserta
logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('BMT_USER_SESSION');
  state.candidateId = '';
  state.candidateName = '';
  historyCard.classList.add('hidden');
  arenaCard.classList.add('hidden');
  identityCard.classList.remove('hidden');
  candidateIdInput.value = '';
  candidateNameInput.value = '';
});

// Dashboard Riwayat & Fetch Target (Stale-While-Revalidate: Tampil Instan)
async function showHistoryDashboard() {
  identityCard.classList.add('hidden');
  historyCard.classList.remove('hidden');
  welcomeText.textContent = `Halo, ${state.candidateName}`;
  sessionInfo.textContent = `ID: ${state.candidateId}`;

  // 1. Tampilkan dari Cache Lokal Seketika (0 ms)
  const cachedHistory = localStorage.getItem(`BMT_HIST_${state.candidateId}`);
  if (cachedHistory) {
    try {
      const parsed = JSON.parse(cachedHistory);
      quotaRemaining.textContent = parsed.attemptsRemaining !== undefined ? parsed.attemptsRemaining : '3';
      renderHistory(parsed.history || []);
    } catch (e) {}
  } else {
    historyList.innerHTML = '<p class="text-muted">Menyinkronkan riwayat...</p>';
  }

  // 2. Sinkronkan dengan Server di Latar Belakang (Single Round-Trip)
  try {
    const res = await fetch(`${state.apiUrl}?service=beat_my_type&action=get_history&candidateId=${encodeURIComponent(state.candidateId)}`);
    const json = await res.json();

    if (json.status === 'success') {
      // Perbarui Data Admin jika disertakan
      if (json.admin) {
        state.targetText = json.admin.targetText || state.targetText;
        state.adminName = json.admin.adminName || 'Admin';
        state.adminWpm = json.admin.adminWpm || 0;
        state.adminAccuracy = json.admin.adminAccuracy || 0;
        state.adminGhost = json.admin.adminGhost || [];

        if (adminNameDashboard) adminNameDashboard.textContent = state.adminName;
        if (adminWpmDashboard) adminWpmDashboard.textContent = state.adminWpm;
        if (adminAccDashboard) adminAccDashboard.textContent = state.adminAccuracy;
        if (adminNameDisplay) adminNameDisplay.textContent = state.adminName;
        if (adminWpmDisplay) adminWpmDisplay.textContent = state.adminWpm;
      }

      // Perbarui Kuota dan Riwayat
      quotaRemaining.textContent = json.attemptsRemaining;
      if (json.attemptsRemaining <= 0) {
        launchArenaBtn.disabled = true;
        launchArenaBtn.textContent = 'Batas Kesempatan Hari Ini Habis';
      } else {
        launchArenaBtn.disabled = false;
        launchArenaBtn.textContent = 'Mulai Tes Sekarang';
      }

      renderHistory(json.history);

      // Simpan riwayat terbaru ke Cache Lokal
      localStorage.setItem(`BMT_HIST_${state.candidateId}`, JSON.stringify({
        attemptsRemaining: json.attemptsRemaining,
        history: json.history
      }));
    }
  } catch (err) {
    if (!cachedHistory) {
      historyList.innerHTML = `<p class="error-text">Gagal sinkron server: ${err.message}</p>`;
    }
  }
}

function renderHistory(items) {
  if (!items || items.length === 0) {
    historyList.innerHTML = '<p class="text-muted">Belum ada riwayat percobaan.</p>';
    return;
  }
  historyList.innerHTML = items.map(it => `
    <div class="history-item">
      <div>
        <strong>${it.wpm} WPM</strong> | Akurasi: ${it.accuracy}% | Durasi: ${it.duration}s
        <div class="text-muted" style="font-size:0.75rem">${it.date} ${it.isToday ? '(Hari Ini)' : ''}</div>
      </div>
      <span class="${it.status === 'BEAT_ADMIN' ? 'status-win' : 'status-lost'}">
        ${it.status === 'BEAT_ADMIN' ? 'MENANG' : 'KALAH'}
      </span>
    </div>
  `).join('');
}

launchArenaBtn.addEventListener('click', () => {
  if (!state.targetText) {
    alert('Target admin belum ditetapkan di spreadsheet!');
    return;
  }
  historyCard.classList.add('hidden');
  arenaCard.classList.remove('hidden');
  setupArena();
});

// Admin Benchmark Trigger
setAdminBenchmarkBtn.addEventListener('click', () => {
  const text = customTargetText.value.trim();
  const name = adminNameInput.value.trim() || 'Admin';
  if (!text) {
    alert('Harap ketik atau tempel teks benchmark target terlebih dahulu.');
    return;
  }
  state.targetText = text;
  state.adminName = name;
  adminPanel.classList.add('hidden');
  arenaCard.classList.remove('hidden');
  setupArena();
});

function setupArena() {
  textDisplay.innerHTML = '';
  state.charIndex = 0;
  state.keystrokes = [];
  state.startTime = null;
  state.isFinished = false;
  state.totalErrors = 0;
  userProgress.style.width = '0%';
  adminProgress.style.width = '0%';
  liveWpm.textContent = '0';
  liveAcc.textContent = '100%';
  liveTime.textContent = '0s';

  for (let i = 0; i < state.targetText.length; i++) {
    const span = document.createElement('span');
    span.className = 'char' + (i === 0 ? ' cursor' : '');
    span.textContent = state.targetText[i];
    textDisplay.appendChild(span);
  }

  textDisplay.addEventListener('click', () => hiddenInput.focus());
  hiddenInput.value = '';
  hiddenInput.focus();
}

// Anti-cheat: Block paste, drop, contextmenu
['paste', 'drop', 'copy', 'cut', 'contextmenu'].forEach(evt => {
  hiddenInput.addEventListener(evt, e => e.preventDefault());
  textDisplay.addEventListener(evt, e => e.preventDefault());
});

// Keystroke Capture
hiddenInput.addEventListener('keydown', handleKeydown);

function handleKeydown(e) {
  if (state.isFinished) return;
  if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab'].includes(e.key)) return;

  const now = performance.now();
  if (!state.startTime) {
    state.startTime = now;
    startTimers();
  }

  const expectedChar = state.targetText[state.charIndex];
  const charSpans = textDisplay.children;

  if (e.key === 'Backspace') {
    if (state.charIndex > 0) {
      charSpans[state.charIndex].classList.remove('cursor');
      state.charIndex--;
      charSpans[state.charIndex].className = 'char cursor';
      state.keystrokes.push({ t: Math.round(now - state.startTime), k: 'Backspace', err: false });
      updateStats();
    }
    return;
  }

  if (e.key.length === 1) {
    const isCorrect = (e.key === expectedChar);
    if (!isCorrect) state.totalErrors++;

    charSpans[state.charIndex].className = 'char ' + (isCorrect ? 'correct' : 'wrong');
    state.keystrokes.push({
      t: Math.round(now - state.startTime),
      k: e.key,
      err: !isCorrect
    });

    state.charIndex++;
    if (state.charIndex < state.targetText.length) {
      charSpans[state.charIndex].classList.add('cursor');
    }

    updateStats();

    if (state.charIndex >= state.targetText.length) {
      finishTest();
    }
  }
}

function updateStats() {
  if (!state.startTime) return;
  const elapsedSeconds = (performance.now() - state.startTime) / 1000;
  if (elapsedSeconds <= 0) return;

  const currentWpm = Math.round(((state.charIndex / 5) / (elapsedSeconds / 60)));
  const totalTyped = state.keystrokes.length;
  const accuracy = totalTyped === 0 ? 100 : Math.max(0, Math.round(((totalTyped - state.totalErrors) / totalTyped) * 100));

  liveWpm.textContent = currentWpm;
  liveAcc.textContent = `${accuracy}%`;
  liveTime.textContent = `${Math.floor(elapsedSeconds)}s`;

  const percent = Math.min(100, Math.round((state.charIndex / state.targetText.length) * 100));
  userProgress.style.width = `${percent}%`;
}

function startTimers() {
  state.timerInterval = setInterval(updateStats, 200);

  if (state.mode === 'challenger' && state.adminWpm > 0) {
    const totalChars = state.targetText.length;
    const charsPerSec = (state.adminWpm * 5) / 60;
    const ghostStartTime = performance.now();

    state.ghostInterval = setInterval(() => {
      const elapsed = (performance.now() - ghostStartTime) / 1000;
      const ghostChars = elapsed * charsPerSec;
      const ghostPercent = Math.min(100, (ghostChars / totalChars) * 100);
      adminProgress.style.width = `${ghostPercent}%`;
      if (ghostPercent >= 100) clearInterval(state.ghostInterval);
    }, 100);
  }
}

async function finishTest() {
  state.isFinished = true;
  clearInterval(state.timerInterval);
  clearInterval(state.ghostInterval);

  const duration = Math.max(1, Math.round((performance.now() - state.startTime) / 1000));
  const finalWpm = Math.round(((state.targetText.length / 5) / (duration / 60)));
  const totalKeys = state.keystrokes.length;
  const finalAccuracy = totalKeys === 0 ? 100 : Math.max(0, Math.round(((totalKeys - state.totalErrors) / totalKeys) * 100));

  resUserWpm.textContent = finalWpm;
  resAccuracy.textContent = `${finalAccuracy}%`;
  resDuration.textContent = `${duration}s`;

  if (state.mode === 'admin') {
    await submitAdminBenchmark(finalWpm, finalAccuracy, duration);
  } else {
    await submitCandidateResult(finalWpm, finalAccuracy, duration);
  }
}

async function submitAdminBenchmark(wpm, accuracy, duration) {
  resultTitle.textContent = 'Benchmark Admin Tersimpan';
  resultBanner.className = 'result-banner banner-win';
  resultBanner.textContent = `Target ${state.adminName} (${wpm} WPM) berhasil ditetapkan!`;
  resAdminWpm.textContent = wpm;
  resAttempts.textContent = 'Unlimited (Admin)';
  resultModal.classList.remove('hidden');

  try {
    await fetch(state.apiUrl, {
      method: 'POST',
      body: JSON.stringify({
        isAdminBenchmark: true,
        adminName: state.adminName,
        targetText: state.targetText,
        wpm: wpm,
        accuracy: accuracy,
        durationSeconds: duration,
        keystrokes: state.keystrokes
      })
    });
  } catch (err) {
    alert('Gagal mengirim benchmark ke Apps Script: ' + err.message);
  }
}

async function submitCandidateResult(wpm, accuracy, duration) {
  resAdminWpm.textContent = state.adminWpm;
  resultModal.classList.remove('hidden');
  resultBanner.className = 'result-banner';
  resultBanner.textContent = 'Memverifikasi hasil di server...';

  try {
    const res = await fetch(state.apiUrl, {
      method: 'POST',
      body: JSON.stringify({
        candidateId: state.candidateId,
        candidateName: state.candidateName,
        textTyped: state.targetText,
        wpm: wpm,
        accuracy: accuracy,
        durationSeconds: duration,
        keystrokes: state.keystrokes
      })
    });

    const json = await res.json();

    if (json.status === 'limit_exceeded') {
      resultBanner.className = 'result-banner banner-lost';
      resultBanner.textContent = json.message;
      resAttempts.textContent = '0';
      return;
    }

    if (json.result === 'BEAT_ADMIN') {
      resultBanner.className = 'result-banner banner-win';
      resultBanner.textContent = `SELAMAT! ANDA MENGALAHKAN ${state.adminName.toUpperCase()}!`;
    } else {
      resultBanner.className = 'result-banner banner-lost';
      resultBanner.textContent = `ANDA MASIH KALAH DIBANDINGKAN ${state.adminName.toUpperCase()}.`;
    }

    resAttempts.textContent = json.attemptsRemaining !== undefined ? json.attemptsRemaining : '-';

    // Invalidate / perbarui cache lokal agar reload berikutnya instan
    localStorage.removeItem(`BMT_HIST_${state.candidateId}`);
  } catch (err) {
    resultBanner.className = 'result-banner banner-lost';
    resultBanner.textContent = 'Gagal sinkronisasi server: ' + err.message;
  }
}

closeModalBtn.addEventListener('click', () => {
  resultModal.classList.add('hidden');
  location.reload();
});
