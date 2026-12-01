/**
 * BEAT-MY-TYPE FRONTEND ENGINE
 * Standard Typing Engine with Anti-Cheat, Ghost Racer, and GAS Web App Sync
 */

const DEFAULT_API_URL = 'https://script.google.com/macros/s/AKfycby0vtuSERXWlNXMnxIPspHM1K7tCxXmKkbPnmXxqJnvMokLxB9uMDPMLSdqobG1cpKt/exec';

const state = {
  apiUrl: localStorage.getItem('BMT_API_URL') || DEFAULT_API_URL,
  mode: new URLSearchParams(window.location.search).get('mode') === 'admin' ? 'admin' : 'challenger',
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
const apiUrlInput = document.getElementById('apiUrlInput');
const saveApiBtn = document.getElementById('saveApiBtn');
const modeBadge = document.getElementById('modeBadge');
const identityCard = document.getElementById('identityCard');
const adminPanel = document.getElementById('adminPanel');
const arenaCard = document.getElementById('arenaCard');
const candidateIdInput = document.getElementById('candidateId');
const candidateNameInput = document.getElementById('candidateName');
const startTestBtn = document.getElementById('startTestBtn');
const candidateError = document.getElementById('candidateError');
const customTargetText = document.getElementById('customTargetText');
const setAdminBenchmarkBtn = document.getElementById('setAdminBenchmarkBtn');
const textDisplay = document.getElementById('textDisplay');
const hiddenInput = document.getElementById('hiddenInput');
const adminProgress = document.getElementById('adminProgress');
const userProgress = document.getElementById('userProgress');
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

// Init
apiUrlInput.value = state.apiUrl;
if (state.mode === 'admin') {
  modeBadge.textContent = 'Mode: Admin (Perekam Benchmark)';
  modeBadge.style.color = '#f59e0b';
  adminPanel.classList.remove('hidden');
}

saveApiBtn.addEventListener('click', () => {
  state.apiUrl = apiUrlInput.value.trim();
  localStorage.setItem('BMT_API_URL', state.apiUrl);
  alert('API URL berhasil disimpan.');
});

// Start Candidate Test
startTestBtn.addEventListener('click', async () => {
  const cid = candidateIdInput.value.trim();
  const cname = candidateNameInput.value.trim();
  if (!cid || !cname) {
    candidateError.textContent = 'Harap isi ID dan Nama kandidat!';
    return;
  }
  if (!state.apiUrl) {
    candidateError.textContent = 'Harap isi URL Google Apps Script Web App terlebih dahulu!';
    return;
  }
  candidateError.textContent = '';
  state.candidateId = cid;
  state.candidateName = cname;

  startTestBtn.disabled = true;
  startTestBtn.textContent = 'Memuat target...';

  try {
    const res = await fetch(`${state.apiUrl}?service=beat_my_type&action=get_target`);
    const json = await res.json();
    if (json.status !== 'success' || !json.targetText) {
      throw new Error(json.message || 'Target benchmark admin belum ditetapkan di server.');
    }
    state.targetText = json.targetText;
    state.adminWpm = json.adminWpm || 0;
    state.adminAccuracy = json.adminAccuracy || 0;
    state.adminGhost = json.adminGhost || [];

    adminWpmDisplay.textContent = state.adminWpm;
    identityCard.classList.add('hidden');
    arenaCard.classList.remove('hidden');
    setupArena();
  } catch (err) {
    candidateError.textContent = 'Gagal memuat target: ' + err.message;
    startTestBtn.disabled = false;
    startTestBtn.textContent = 'Mulai Tes';
  }
});

// Admin Benchmark Trigger
setAdminBenchmarkBtn.addEventListener('click', () => {
  const text = customTargetText.value.trim();
  if (!text) {
    alert('Harap ketik atau tempel teks benchmark target terlebih dahulu.');
    return;
  }
  state.targetText = text;
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

  // Render chars
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

  // Ignore navigation & modifier keys alone
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

  // Standard Formula: (Chars / 5) / (Seconds / 60)
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

  // Ghost Racer Simulation
  if (state.mode === 'challenger' && state.adminWpm > 0) {
    const totalChars = state.targetText.length;
    // adminWpm chars per second = (adminWpm * 5) / 60
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
  resultBanner.textContent = `Target Admin ${wpm} WPM berhasil ditetapkan!`;
  resAdminWpm.textContent = wpm;
  resAttempts.textContent = 'Unlimited (Admin)';
  resultModal.classList.remove('hidden');

  try {
    await fetch(state.apiUrl, {
      method: 'POST',
      body: JSON.stringify({
        isAdminBenchmark: true,
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
      resultBanner.textContent = 'SELAMAT! ANDA MENGALAHKAN ADMIN!';
    } else {
      resultBanner.className = 'result-banner banner-lost';
      resultBanner.textContent = 'ANDA MASIH KALAH DIBANDINGKAN ADMIN.';
    }

    resAttempts.textContent = json.attemptsRemaining !== undefined ? json.attemptsRemaining : '-';
  } catch (err) {
    resultBanner.className = 'result-banner banner-lost';
    resultBanner.textContent = 'Gagal sinkronisasi server: ' + err.message;
  }
}

closeModalBtn.addEventListener('click', () => {
  resultModal.classList.add('hidden');
  location.reload();
});
