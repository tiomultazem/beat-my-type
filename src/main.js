/**
 * BEAT-MY-TYPE FRONTEND ENGINE
 * Standard Typing Engine with Anti-Cheat, Ghost Racer, and GAS Web App Sync
 */

const DEFAULT_API_URL = 'https://script.google.com/macros/s/AKfycby0vtuSERXWlNXMnxIPspHM1K7tCxXmKkbPnmXxqJnvMokLxB9uMDPMLSdqobG1cpKt/exec';

const state = {
  apiUrl: DEFAULT_API_URL,
  mode: new URLSearchParams(window.location.search).get('mode') === 'admin' ? 'admin' : 'challenger',
  activeUnit: localStorage.getItem('BMT_UNIT') || 'wpm',
  isOpen: localStorage.getItem('BMT_IS_OPEN') !== 'false',
  maxQuota: parseInt(localStorage.getItem('BMT_MAX_QUOTA'), 10) || 3,
  adminName: 'Admin',
  adminPin: sessionStorage.getItem('BMT_ADMIN_PIN') || '',
  candidateId: '',
  candidateName: '',
  targetText: '',
  adminWpm: parseInt(localStorage.getItem('BMT_ADMIN_WPM'), 10) || 0,
  adminCpm: parseInt(localStorage.getItem('BMT_ADMIN_CPM'), 10) || 0,
  adminAccuracy: parseInt(localStorage.getItem('BMT_ADMIN_ACC'), 10) || 0,
  adminGhost: [],
  charIndex: 0,
  keystrokes: [], // [{t: deltaMs, k: key, err: boolean}]
  startTime: null,
  sessionStartTime: null,
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
const adminPinGate = document.getElementById('adminPinGate');
const adminPanelContent = document.getElementById('adminPanelContent');
const gatePinInput = document.getElementById('gatePinInput');
const gatePinError = document.getElementById('gatePinError');
const arenaCard = document.getElementById('arenaCard');
const candidateIdInput = document.getElementById('candidateId');
const candidateNameInput = document.getElementById('candidateName');
const startTestBtn = document.getElementById('startTestBtn');
const candidateError = document.getElementById('candidateError');
const adminNameInput = document.getElementById('adminNameInput');
const toggleChallengeBtn = document.getElementById('toggleChallengeBtn');
const closedNoticeLogin = document.getElementById('closedNoticeLogin');
const closedNoticeDashboard = document.getElementById('closedNoticeDashboard');
const customTargetText = document.getElementById('customTargetText');
const setAdminBenchmarkBtn = document.getElementById('setAdminBenchmarkBtn');
const textDisplay = document.getElementById('textDisplay');
const hiddenInput = document.getElementById('hiddenInput');
const adminProgress = document.getElementById('adminProgress');
const userProgress = document.getElementById('userProgress');
const adminNameDisplay = document.getElementById('adminNameDisplay');
const adminWpmDisplay = document.getElementById('adminWpmDisplay');
const liveSpeed = document.getElementById('liveSpeed');
const speedUnitLbl = document.getElementById('speedUnitLbl');
const liveAcc = document.getElementById('liveAcc');
const liveTime = document.getElementById('liveTime');
const unitButtons = document.querySelectorAll('.unit-btn');
const resultModal = document.getElementById('resultModal');
const resultBanner = document.getElementById('resultBanner');
const resUserWpm = document.getElementById('resUserWpm');
const resAdminWpm = document.getElementById('resAdminWpm');
const resAccuracy = document.getElementById('resAccuracy');
const resDuration = document.getElementById('resDuration');
const resAttempts = document.getElementById('resAttempts');
const resMaxAttempts = document.getElementById('resMaxAttempts');
const quotaMax = document.getElementById('quotaMax');
const adminDailyQuotaInput = document.getElementById('adminDailyQuotaInput');
const saveDailyQuotaBtn = document.getElementById('saveDailyQuotaBtn');
const leaderboardTbody = document.getElementById('leaderboardTbody');
const refreshLeaderboardBtn = document.getElementById('refreshLeaderboardBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const updateToast = document.getElementById('updateToast');
const reloadAppBtn = document.getElementById('reloadAppBtn');

function updateQuotaDisplay(remaining, max) {
  if (max !== undefined && max !== null) {
    state.maxQuota = Number(max);
    localStorage.setItem('BMT_MAX_QUOTA', String(max));
  }
  if (quotaMax) quotaMax.textContent = state.maxQuota;
  if (resMaxAttempts) resMaxAttempts.textContent = state.maxQuota;
  if (adminDailyQuotaInput && document.activeElement !== adminDailyQuotaInput) {
    adminDailyQuotaInput.value = state.maxQuota;
  }
  if (remaining !== undefined && remaining !== null) {
    if (quotaRemaining) quotaRemaining.textContent = remaining;
    if (resAttempts) resAttempts.textContent = remaining;
  }
}

// Version Polling for Auto-Update (Dynamic Version Detection)
let currentVersion = null;
initUpdateChecker();

function initUpdateChecker() {
  reloadAppBtn.addEventListener('click', () => {
    window.location.reload(true);
  });

  // Ambil versi awal saat halaman pertama kali dibuka
  fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' })
    .then(res => res.json())
    .then(data => {
      if (data && data.version) currentVersion = data.version;
    })
    .catch(() => {});

  // Cek setiap 45 detik sekali
  setInterval(async () => {
    if (state.isFinished || state.startTime || !currentVersion) return;
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

// Pulihkan sesi penantang saat halaman dimuat ulang (Auto-Login)
checkSavedSession();

// Unit Toggle Handler
unitButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    unitButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.activeUnit = btn.dataset.unit;
    localStorage.setItem('BMT_UNIT', state.activeUnit);
    updateSpeedLabels();
    updateStats();
    if (currentLeaderboardData.length > 0) renderLeaderboardTable(currentLeaderboardData);
  });
});

// Set initial unit active state
unitButtons.forEach(btn => {
  if (btn.dataset.unit === state.activeUnit) btn.classList.add('active');
  else btn.classList.remove('active');
});
updateSpeedLabels();
updateChallengeStatusUI();

function updateChallengeStatusUI() {
  if (state.mode === 'admin' && toggleChallengeBtn) {
    if (state.isOpen) {
      toggleChallengeBtn.textContent = 'Buka (OPEN)';
      toggleChallengeBtn.className = 'btn-sm status-open';
    } else {
      toggleChallengeBtn.textContent = 'Tutup (CLOSED)';
      toggleChallengeBtn.className = 'btn-sm status-closed';
    }
  }

  // Pengaturan Tampilan untuk Penantang
  if (closedNoticeLogin) {
    if (state.isOpen) closedNoticeLogin.classList.add('hidden');
    else closedNoticeLogin.classList.remove('hidden');
  }

  if (closedNoticeDashboard) {
    if (state.isOpen) closedNoticeDashboard.classList.add('hidden');
    else closedNoticeDashboard.classList.remove('hidden');
  }

  if (state.mode !== 'admin') {
    if (!state.isOpen) {
      if (startTestBtn) {
        startTestBtn.disabled = true;
        startTestBtn.textContent = 'Challenge Ditutup';
      }
      if (launchArenaBtn) {
        launchArenaBtn.disabled = true;
        launchArenaBtn.textContent = 'Maaf, challenge sudah ditutup';
      }
    } else {
      if (startTestBtn) {
        startTestBtn.disabled = false;
        startTestBtn.textContent = 'Masuk';
      }
      const attemptsText = quotaRemaining ? quotaRemaining.textContent.trim() : '-';
      if (launchArenaBtn) {
        if (attemptsText === '-' || attemptsText === '...') {
          launchArenaBtn.disabled = true;
          launchArenaBtn.textContent = 'Memeriksa kuota...';
        } else {
          const attemptsLeft = parseInt(attemptsText, 10);
          if (!isNaN(attemptsLeft) && attemptsLeft <= 0) {
            launchArenaBtn.disabled = true;
            launchArenaBtn.textContent = 'Batas Kesempatan Hari Ini Habis';
          } else {
            launchArenaBtn.disabled = false;
            launchArenaBtn.textContent = 'Mulai tantang admin!';
          }
        }
      }
    }
  }
}

if (gatePinInput) {
  gatePinInput.addEventListener('input', async () => {
    const pin = gatePinInput.value.trim();
    if (gatePinError) gatePinError.textContent = '';
    if (pin.length === 6) {
      gatePinInput.disabled = true;
      if (gatePinError) gatePinError.textContent = 'Memverifikasi...';

      try {
        const res = await fetch(state.apiUrl, {
          method: 'POST',
          body: JSON.stringify({ verifyAdminPin: true, adminPin: pin })
        });
        const json = await res.json();
        if (json.status === 'success') {
          state.adminPin = pin;
          sessionStorage.setItem('BMT_ADMIN_PIN', pin);
          unlockAdminPanel();
        } else {
          if (gatePinError) gatePinError.textContent = json.message || 'PIN Admin tidak valid!';
          gatePinInput.disabled = false;
          gatePinInput.value = '';
          gatePinInput.focus();
        }
      } catch (e) {
        if (gatePinError) gatePinError.textContent = 'Gagal verifikasi: ' + e.message;
        gatePinInput.disabled = false;
      }
    }
  });

  gatePinInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      gatePinInput.dispatchEvent(new Event('input'));
    }
  });
}

function showAdminPinGate() {
  if (adminPinGate) adminPinGate.classList.remove('hidden');
  if (adminPanelContent) adminPanelContent.classList.add('hidden');
  if (gatePinInput) {
    gatePinInput.value = '';
    gatePinInput.disabled = false;
    setTimeout(() => gatePinInput.focus(), 100);
  }
}

function unlockAdminPanel() {
  if (adminPinGate) adminPinGate.classList.add('hidden');
  if (adminPanelContent) adminPanelContent.classList.remove('hidden');
  if (adminDailyQuotaInput) adminDailyQuotaInput.value = state.maxQuota;
  fetchLeaderboard();
}

if (toggleChallengeBtn) {
  toggleChallengeBtn.addEventListener('click', async () => {
    if (!state.adminPin) {
      showAdminPinGate();
      return;
    }
    const nextStatus = state.isOpen ? 'CLOSED' : 'OPEN';
    toggleChallengeBtn.disabled = true;
    toggleChallengeBtn.textContent = 'Menyimpan...';

    try {
      const res = await fetch(state.apiUrl, {
        method: 'POST',
        body: JSON.stringify({ setChallengeStatus: nextStatus, adminPin: state.adminPin })
      });
      const json = await res.json();
      if (json.status === 'success') {
        state.isOpen = (json.challengeStatus !== 'CLOSED');
        localStorage.setItem('BMT_IS_OPEN', state.isOpen ? 'true' : 'false');
        updateChallengeStatusUI();
      } else {
        alert(json.message || 'Gagal mengubah status');
        if (json.message && json.message.includes('PIN')) {
          sessionStorage.removeItem('BMT_ADMIN_PIN');
          state.adminPin = '';
          showAdminPinGate();
        }
      }
    } catch (e) {
      alert('Gagal mengubah status: ' + e.message);
    } finally {
      toggleChallengeBtn.disabled = false;
    }
  });
}

if (saveDailyQuotaBtn) {
  saveDailyQuotaBtn.addEventListener('click', async () => {
    if (!state.adminPin) {
      showAdminPinGate();
      return;
    }
    const val = parseInt(adminDailyQuotaInput.value, 10);
    if (isNaN(val) || val <= 0) {
      alert('Batas kuota harian harus berupa angka positif!');
      return;
    }
    saveDailyQuotaBtn.disabled = true;
    saveDailyQuotaBtn.textContent = 'Menyimpan...';

    try {
      const res = await fetch(state.apiUrl, {
        method: 'POST',
        body: JSON.stringify({ setDailyQuota: val, adminPin: state.adminPin })
      });
      const json = await res.json();
      if (json.status === 'success') {
        updateQuotaDisplay(undefined, json.dailyQuota);
        alert(`Batas kuota harian berhasil diubah menjadi ${json.dailyQuota}x!`);
      } else {
        alert(json.message || 'Gagal mengubah kuota');
        if (json.message && json.message.includes('PIN')) {
          sessionStorage.removeItem('BMT_ADMIN_PIN');
          state.adminPin = '';
          showAdminPinGate();
        }
      }
    } catch (e) {
      alert('Gagal mengubah batas kuota: ' + e.message);
    } finally {
      saveDailyQuotaBtn.disabled = false;
      saveDailyQuotaBtn.textContent = 'Simpan';
    }
  });
}

// Logika Papan Peringkat Kandidat (Leaderboard)
let currentLeaderboardData = [];

async function fetchLeaderboard() {
  if (!state.adminPin || !leaderboardTbody) return;
  leaderboardTbody.innerHTML = `<tr><td colspan="7" class="text-muted" style="text-align: center; padding: 16px;">Memuat papan peringkat...</td></tr>`;
  if (refreshLeaderboardBtn) {
    refreshLeaderboardBtn.disabled = true;
    refreshLeaderboardBtn.textContent = 'Memuat...';
  }

  try {
    const res = await fetch(`${state.apiUrl}?service=beat_my_type&action=get_leaderboard&adminPin=${encodeURIComponent(state.adminPin)}`);
    const json = await res.json();

    if (json.status === 'success' && Array.isArray(json.leaderboard)) {
      currentLeaderboardData = json.leaderboard;
      renderLeaderboardTable(currentLeaderboardData);
    } else {
      leaderboardTbody.innerHTML = `<tr><td colspan="7" class="error-text" style="text-align: center; padding: 16px;">${json.message || 'Gagal memuat peringkat.'}</td></tr>`;
    }
  } catch (err) {
    leaderboardTbody.innerHTML = `<tr><td colspan="7" class="error-text" style="text-align: center; padding: 16px;">Galat koneksi: ${err.message}</td></tr>`;
  } finally {
    if (refreshLeaderboardBtn) {
      refreshLeaderboardBtn.disabled = false;
      refreshLeaderboardBtn.textContent = 'Refresh';
    }
  }
}

function renderLeaderboardTable(items) {
  if (!leaderboardTbody) return;
  if (!items || items.length === 0) {
    leaderboardTbody.innerHTML = `<tr><td colspan="7" class="text-muted" style="text-align: center; padding: 16px;">Belum ada data penantang yang valid.</td></tr>`;
    return;
  }

  leaderboardTbody.innerHTML = items.map((it, idx) => {
    const rank = idx + 1;
    let rankBadgeClass = 'rank-other';
    if (rank === 1) rankBadgeClass = 'rank-1';
    else if (rank === 2) rankBadgeClass = 'rank-2';
    else if (rank === 3) rankBadgeClass = 'rank-3';

    const speedText = state.activeUnit === 'cpm'
      ? `${it.cpm} CPM <span class="text-muted">(${it.wpm} WPM)</span>`
      : `${it.wpm} WPM <span class="text-muted">(${it.cpm} CPM)</span>`;

    const hasAdminBenchmark = (state.adminCpm > 0 && state.adminAccuracy > 0);
    const isBeatAdmin = (it.status === 'BEAT_ADMIN') || 
      (hasAdminBenchmark && it.cpm > state.adminCpm && it.accuracy >= state.adminAccuracy && it.accuracy >= 90);

    return `
      <tr class="${isBeatAdmin ? 'row-beat-admin' : ''}">
        <td style="text-align: center;"><span class="rank-badge ${rankBadgeClass}">${rank}</span></td>
        <td>
          <strong>${escapeHtml(it.candidateName)}</strong>
          ${isBeatAdmin ? '<span class="badge-beat-admin">BEAT ADMIN</span>' : ''}
        </td>
        <td class="text-muted">${escapeHtml(it.candidateId)}</td>
        <td style="text-align: right;"><span class="score-badge">${it.score !== undefined ? it.score : '-'}</span></td>
        <td style="text-align: right;">${it.accuracy}%</td>
        <td style="text-align: right;">${speedText}</td>
        <td style="text-align: right;">${it.duration}s</td>
      </tr>
    `;
  }).join('');
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}

if (refreshLeaderboardBtn) {
  refreshLeaderboardBtn.addEventListener('click', fetchLeaderboard);
}

function updateSpeedLabels() {
  if (speedUnitLbl) speedUnitLbl.textContent = state.activeUnit.toUpperCase();
  const adminTargetVal = state.activeUnit === 'cpm' 
    ? (state.adminCpm || Math.round(state.adminWpm * 5)) 
    : state.adminWpm;
  if (adminWpmDisplay) adminWpmDisplay.textContent = adminTargetVal;
}

async function fetchTargetBenchmark() {
  try {
    const res = await fetch(`${state.apiUrl}?service=beat_my_type&action=get_target`);
    const json = await res.json();
    if (json.status === 'success') {
      state.targetText = json.targetText || '';
      state.adminName = json.adminName || 'Admin';
      state.adminWpm = json.adminWpm || 0;
      state.adminCpm = json.adminCpm || Math.round(state.adminWpm * 5);
      state.adminAccuracy = json.adminAccuracy || 0;
      localStorage.setItem('BMT_ADMIN_WPM', String(state.adminWpm));
      localStorage.setItem('BMT_ADMIN_CPM', String(state.adminCpm));
      localStorage.setItem('BMT_ADMIN_ACC', String(state.adminAccuracy));
      state.adminGhost = json.adminGhost || [];
      state.isOpen = (json.isOpen !== false);
      localStorage.setItem('BMT_IS_OPEN', state.isOpen ? 'true' : 'false');
      if (json.maxQuota !== undefined) {
        updateQuotaDisplay(undefined, json.maxQuota);
      }
      updateChallengeStatusUI();

      // Update Login Banner
      if (adminNameLogin) adminNameLogin.textContent = state.adminName;
      if (adminWpmLogin) adminWpmLogin.textContent = `${state.adminWpm} WPM / ${state.adminCpm} CPM`;
      if (adminAccLogin) adminAccLogin.textContent = state.adminAccuracy;

      // Update Dashboard & Race Display
      if (adminNameDashboard) adminNameDashboard.textContent = state.adminName;
      if (adminWpmDashboard) adminWpmDashboard.textContent = `${state.adminWpm} WPM / ${state.adminCpm} CPM`;
      if (adminAccDashboard) adminAccDashboard.textContent = state.adminAccuracy;
      if (adminNameDisplay) adminNameDisplay.textContent = state.adminName;
      updateSpeedLabels();

      if (currentLeaderboardData && currentLeaderboardData.length > 0) {
        renderLeaderboardTable(currentLeaderboardData);
      }
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

  if (state.adminPin) {
    unlockAdminPanel();
  } else {
    showAdminPinGate();
  }
}

async function checkSavedSession() {
  if (state.mode === 'admin') return;

  // Cek apakah ada sesi tes aktif yang terputus (di-refresh atau ditutup paksa)
  const activeSessionStr = localStorage.getItem('BMT_ACTIVE_SESSION');
  if (activeSessionStr) {
    try {
      const active = JSON.parse(activeSessionStr);
      if (active && active.candidateId) {
        state.candidateId = active.candidateId;
        state.candidateName = active.candidateName || 'Penantang';
        localStorage.removeItem('BMT_ACTIVE_SESSION');
        localStorage.removeItem(`BMT_HIST_${state.candidateId}`);
        await penalizeAbandonedSession(active);
      }
    } catch (e) {
      localStorage.removeItem('BMT_ACTIVE_SESSION');
    }
  }

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

async function penalizeAbandonedSession(active) {
  const duration = Math.max(1, Math.round(((active.lastUpdate || Date.now()) - active.startTime) / 1000));
  const chars = active.charIndex || 0;
  const wpm = Math.round(((chars / 5) / (duration / 60)));
  const cpm = Math.round((chars / duration) * 60);
  const totalKeys = (active.keystrokes || []).length;
  const accuracy = totalKeys === 0 ? 0 : Math.max(0, Math.round(((totalKeys - (active.totalErrors || 0)) / totalKeys) * 100));

  try {
    await fetch(state.apiUrl, {
      method: 'POST',
      body: JSON.stringify({
        candidateId: active.candidateId,
        candidateName: active.candidateName,
        textTyped: state.targetText || active.targetText || '',
        wpm: wpm,
        cpm: cpm,
        accuracy: accuracy,
        durationSeconds: duration,
        keystrokes: active.keystrokes || [],
        isForfeit: true
      })
    });
    alert(`Sesi tes sebelumnya terputus atau di-refresh!\n\nPercobaan tercatat apa adanya (${wpm} WPM / ${cpm} CPM, Akurasi: ${accuracy}%, Durasi: ${duration}s).\nSisa kesempatan Anda berkurang 1.`);
  } catch (err) {
    console.error('Gagal mencatat penalti refresh:', err);
  }
}

// Alur Autentikasi Dua Tahap (Email -> Nama Lengkap jika Baru)
async function handleLoginStep() {
  const cid = candidateIdInput.value.trim().toLowerCase();
  if (!cid) {
    candidateError.textContent = 'Harap isi email Anda!';
    candidateError.style.color = '';
    candidateIdInput.focus();
    return;
  }

  const isNameFieldVisible = !candidateNameInput.classList.contains('hidden');

  if (isNameFieldVisible) {
    // Tahap 2: Pengguna baru memasukkan nama lengkap
    const cname = candidateNameInput.value.trim();
    if (!cname) {
      candidateError.textContent = 'Harap isi nama lengkap Anda!';
      candidateError.style.color = '';
      candidateNameInput.focus();
      return;
    }
    candidateError.textContent = '';
    candidateError.style.color = '';
    state.candidateId = cid;
    state.candidateName = cname;

    localStorage.setItem(`BMT_NAME_${cid}`, cname);
    localStorage.setItem('BMT_USER_SESSION', JSON.stringify({ candidateId: cid, candidateName: cname }));
    showHistoryDashboard();
    return;
  }

  // Tahap 1: Pengguna memasukkan email
  candidateError.textContent = '';
  candidateError.style.color = '';

  // Cek cache identitas lokal seketika (0 ms)
  const cachedName = localStorage.getItem(`BMT_NAME_${cid}`);
  if (cachedName) {
    state.candidateId = cid;
    state.candidateName = cachedName;
    localStorage.setItem('BMT_USER_SESSION', JSON.stringify({ candidateId: cid, candidateName: cachedName }));
    showHistoryDashboard();
    return;
  }

  // Jika belum ada di cache, periksa pendaftaran ke server
  startTestBtn.disabled = true;
  const originalBtnText = startTestBtn.textContent;
  startTestBtn.textContent = 'Memeriksa...';

  try {
    const res = await fetch(`${state.apiUrl}?service=beat_my_type&action=get_history&candidateId=${encodeURIComponent(cid)}`);
    const json = await res.json();

    if (json.status === 'success' && json.isRegistered && json.candidateName) {
      // Email sudah terdaftar sebelumnya di spreadsheet
      const foundName = json.candidateName.trim();
      state.candidateId = cid;
      state.candidateName = foundName;
      localStorage.setItem(`BMT_NAME_${cid}`, foundName);
      localStorage.setItem('BMT_USER_SESSION', JSON.stringify({ candidateId: cid, candidateName: foundName }));

      if (json.history) {
        const quotaLimit = json.maxQuota || (json.admin && json.admin.maxQuota) || state.maxQuota;
        localStorage.setItem(`BMT_HIST_${cid}`, JSON.stringify({
          attemptsRemaining: json.attemptsRemaining,
          maxQuota: quotaLimit,
          history: json.history
        }));
      }
      showHistoryDashboard();
    } else {
      // Email baru: munculkan field nama
      candidateNameInput.classList.remove('hidden');
      candidateNameInput.value = '';
      candidateNameInput.focus();
      startTestBtn.textContent = 'Lanjutkan Masuk';
      candidateError.textContent = 'Email belum terdaftar. Silakan masukkan nama lengkap Anda:';
      candidateError.style.color = 'var(--text-muted)';
    }
  } catch (err) {
    // Fallback: jika offline/gagal koneksi, minta nama langsung
    candidateNameInput.classList.remove('hidden');
    candidateNameInput.focus();
    startTestBtn.textContent = 'Lanjutkan Masuk';
    candidateError.textContent = 'Silakan masukkan nama lengkap Anda:';
    candidateError.style.color = 'var(--text-muted)';
  } finally {
    startTestBtn.disabled = false;
    if (candidateNameInput.classList.contains('hidden')) {
      startTestBtn.textContent = originalBtnText;
    }
  }
}

startTestBtn.addEventListener('click', handleLoginStep);

candidateIdInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleLoginStep();
});

candidateNameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleLoginStep();
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
  candidateNameInput.classList.add('hidden');
  startTestBtn.textContent = 'Lanjut';
  candidateError.textContent = '';
  candidateError.style.color = '';
  candidateIdInput.focus();
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
      updateQuotaDisplay(
        parsed.attemptsRemaining !== undefined ? parsed.attemptsRemaining : state.maxQuota,
        parsed.maxQuota || state.maxQuota
      );
      renderHistory(parsed.history || []);
    } catch (e) {}
  } else {
    updateQuotaDisplay('-', state.maxQuota);
    if (launchArenaBtn) {
      launchArenaBtn.disabled = true;
      launchArenaBtn.textContent = 'Memeriksa kuota...';
    }
    historyList.innerHTML = '<p class="text-muted">Menyinkronkan riwayat...</p>';
  }

  // 2. Sinkronkan dengan Server di Latar Belakang (Single Round-Trip)
  try {
    const res = await fetch(`${state.apiUrl}?service=beat_my_type&action=get_history&candidateId=${encodeURIComponent(state.candidateId)}`);
    const json = await res.json();

    if (json.status === 'success') {
      if (json.candidateName && json.candidateName !== state.candidateName) {
        state.candidateName = json.candidateName;
        welcomeText.textContent = `Halo, ${state.candidateName}`;
        localStorage.setItem(`BMT_NAME_${state.candidateId}`, state.candidateName);
      }

      // Perbarui Data Admin jika disertakan
      if (json.admin) {
        state.targetText = json.admin.targetText || state.targetText;
        state.adminName = json.admin.adminName || 'Admin';
        state.adminWpm = json.admin.adminWpm || 0;
        state.adminCpm = json.admin.adminCpm || Math.round(state.adminWpm * 5);
        state.adminAccuracy = json.admin.adminAccuracy || 0;
        localStorage.setItem('BMT_ADMIN_WPM', String(state.adminWpm));
        localStorage.setItem('BMT_ADMIN_CPM', String(state.adminCpm));
        localStorage.setItem('BMT_ADMIN_ACC', String(state.adminAccuracy));
        state.adminGhost = json.admin.adminGhost || [];
        state.isOpen = (json.admin.isOpen !== false);
        localStorage.setItem('BMT_IS_OPEN', state.isOpen ? 'true' : 'false');
        updateChallengeStatusUI();

        if (adminNameDashboard) adminNameDashboard.textContent = state.adminName;
        if (adminWpmDashboard) adminWpmDashboard.textContent = `${state.adminWpm} WPM / ${state.adminCpm} CPM`;
        if (adminAccDashboard) adminAccDashboard.textContent = state.adminAccuracy;
        if (adminNameDisplay) adminNameDisplay.textContent = state.adminName;
        if (adminWpmDisplay) adminWpmDisplay.textContent = state.adminWpm;
      }

      // Perbarui Kuota dan Riwayat
      const quotaLimit = json.maxQuota || (json.admin && json.admin.maxQuota) || state.maxQuota;
      updateQuotaDisplay(json.attemptsRemaining, quotaLimit);
      updateChallengeStatusUI();

      renderHistory(json.history);

      // Simpan riwayat terbaru ke Cache Lokal
      localStorage.setItem(`BMT_HIST_${state.candidateId}`, JSON.stringify({
        attemptsRemaining: json.attemptsRemaining,
        maxQuota: quotaLimit,
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
  historyList.innerHTML = items.map(it => {
    const cpmVal = it.cpm !== undefined ? it.cpm : Math.round(it.wpm * 5);
    return `
    <div class="history-item">
      <div>
        <strong>${it.wpm} WPM</strong> <span class="text-muted">(${cpmVal} CPM)</span> | Akurasi: ${it.accuracy}% | Durasi: ${it.duration}s
        <div class="text-muted" style="font-size:0.75rem">${it.date} ${it.isToday ? '(Hari Ini)' : ''}</div>
      </div>
      <span class="${it.status === 'BEAT_ADMIN' ? 'status-win' : 'status-lost'}">
        ${it.status === 'BEAT_ADMIN' ? 'MENANG' : (it.status === 'FORFEIT' ? 'HANGUS (REFRESH)' : 'KALAH')}
      </span>
    </div>
  `;
  }).join('');
}

launchArenaBtn.addEventListener('click', () => {
  if (!state.isOpen && state.mode !== 'admin') {
    alert('Maaf, challenge sudah ditutup oleh Admin!');
    return;
  }
  if (!state.targetText) {
    alert('Target admin belum ditetapkan di spreadsheet!');
    return;
  }
  historyCard.classList.add('hidden');
  arenaCard.classList.remove('hidden');

  // Kunci sesi aktif ke localStorage untuk deteksi refresh
  const now = Date.now();
  state.sessionStartTime = now;
  localStorage.setItem('BMT_ACTIVE_SESSION', JSON.stringify({
    candidateId: state.candidateId,
    candidateName: state.candidateName,
    targetText: state.targetText,
    startTime: now,
    lastUpdate: now,
    charIndex: 0,
    totalErrors: 0,
    keystrokes: []
  }));

  setupArena();
});

// Admin Benchmark Trigger
setAdminBenchmarkBtn.addEventListener('click', () => {
  if (!state.adminPin) {
    showAdminPinGate();
    return;
  }
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
  if (liveSpeed) liveSpeed.textContent = '0';
  liveAcc.textContent = '100%';
  liveTime.textContent = '0s';
  updateSpeedLabels();

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
  if (!e.isTrusted) return;
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
      let hasActiveError = false;
      for (let i = 0; i < state.charIndex; i++) {
        if (charSpans[i].classList.contains('wrong')) {
          hasActiveError = true;
          break;
        }
      }
      if (!hasActiveError) return;

      if (charSpans[state.charIndex]) {
        charSpans[state.charIndex].classList.remove('cursor');
      }
      state.charIndex--;
      charSpans[state.charIndex].className = 'char cursor';
      state.keystrokes.push({ t: Math.round(now - state.startTime), k: 'Backspace', err: false });
      updateStats();
      saveSessionProgress();
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
    saveSessionProgress();

    if (state.charIndex >= state.targetText.length) {
      finishTest();
    }
  }
}

function saveSessionProgress() {
  if (state.mode !== 'challenger' || state.isFinished) return;
  const active = {
    candidateId: state.candidateId,
    candidateName: state.candidateName,
    targetText: state.targetText,
    startTime: state.sessionStartTime || Date.now(),
    lastUpdate: Date.now(),
    charIndex: state.charIndex,
    totalErrors: state.totalErrors,
    keystrokes: state.keystrokes
  };
  localStorage.setItem('BMT_ACTIVE_SESSION', JSON.stringify(active));
}

function updateStats() {
  if (!state.startTime) return;
  const elapsedSeconds = (performance.now() - state.startTime) / 1000;
  if (elapsedSeconds <= 0) return;

  const currentWpm = Math.round(((state.charIndex / 5) / (elapsedSeconds / 60)));
  const currentCpm = Math.round((state.charIndex / elapsedSeconds) * 60);
  const totalTyped = state.keystrokes.length;
  const accuracy = totalTyped === 0 ? 100 : Math.max(0, Math.round(((totalTyped - state.totalErrors) / totalTyped) * 100));

  if (liveSpeed) {
    liveSpeed.textContent = state.activeUnit === 'cpm' ? currentCpm : currentWpm;
  }
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
  localStorage.removeItem('BMT_ACTIVE_SESSION');

  const duration = Math.max(1, Math.round((performance.now() - state.startTime) / 1000));
  const finalWpm = Math.round(((state.targetText.length / 5) / (duration / 60)));
  const finalCpm = Math.round((state.targetText.length / duration) * 60);
  const totalKeys = state.keystrokes.length;
  const finalAccuracy = totalKeys === 0 ? 100 : Math.max(0, Math.round(((totalKeys - state.totalErrors) / totalKeys) * 100));

  resUserWpm.textContent = `${finalWpm} WPM (${finalCpm} CPM)`;
  resAccuracy.textContent = `${finalAccuracy}%`;
  resDuration.textContent = `${duration}s`;

  if (state.mode === 'admin') {
    await submitAdminBenchmark(finalWpm, finalCpm, finalAccuracy, duration);
  } else {
    await submitCandidateResult(finalWpm, finalCpm, finalAccuracy, duration);
  }
}

async function submitAdminBenchmark(wpm, cpm, accuracy, duration) {
  resultTitle.textContent = 'Benchmark Admin Tersimpan';
  resultBanner.className = 'result-banner banner-win';
  resultBanner.textContent = `Target ${state.adminName} (${wpm} WPM / ${cpm} CPM) berhasil ditetapkan!`;
  resAdminWpm.textContent = `${wpm} WPM (${cpm} CPM)`;
  resAttempts.textContent = 'Unlimited (Admin)';
  resultModal.classList.remove('hidden');

  try {
    const res = await fetch(state.apiUrl, {
      method: 'POST',
      body: JSON.stringify({
        isAdminBenchmark: true,
        adminPin: state.adminPin,
        adminName: state.adminName,
        targetText: state.targetText,
        wpm: wpm,
        cpm: cpm,
        accuracy: accuracy,
        durationSeconds: duration,
        keystrokes: state.keystrokes
      })
    });
    const json = await res.json();
    if (json.status === 'error') {
      resultBanner.className = 'result-banner banner-lost';
      resultBanner.textContent = json.message || 'Gagal menyimpan benchmark.';
    }
  } catch (err) {
    alert('Gagal mengirim benchmark ke Apps Script: ' + err.message);
  }
}

async function submitCandidateResult(wpm, cpm, accuracy, duration) {
  const adminCpmVal = state.adminCpm || Math.round(state.adminWpm * 5);
  resAdminWpm.textContent = `${state.adminWpm} WPM (${adminCpmVal} CPM)`;
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
        cpm: cpm,
        accuracy: accuracy,
        durationSeconds: duration,
        keystrokes: state.keystrokes
      })
    });

    const json = await res.json();

    if (json.status === 'closed') {
      resultBanner.className = 'result-banner banner-lost';
      resultBanner.textContent = json.message || 'Maaf, challenge sudah ditutup';
      return;
    }

    if (json.status === 'limit_exceeded') {
      resultBanner.className = 'result-banner banner-lost';
      resultBanner.textContent = json.message;
      updateQuotaDisplay(0, json.maxQuota || state.maxQuota);
      return;
    }

    if (json.result === 'BEAT_ADMIN') {
      resultBanner.className = 'result-banner banner-win';
      resultBanner.textContent = `SELAMAT! ANDA MENGALAHKAN ${state.adminName.toUpperCase()}!`;
    } else {
      resultBanner.className = 'result-banner banner-lost';
      resultBanner.textContent = `ANDA MASIH KALAH DIBANDINGKAN ${state.adminName.toUpperCase()}.`;
    }

    updateQuotaDisplay(json.attemptsRemaining !== undefined ? json.attemptsRemaining : '-', json.maxQuota || state.maxQuota);

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

// Peringatan sebelum reload/tutup halaman saat tes berjalan
window.addEventListener('beforeunload', (e) => {
  if (state.mode === 'challenger' && !state.isFinished && localStorage.getItem('BMT_ACTIVE_SESSION')) {
    e.preventDefault();
    e.returnValue = 'Tes sedang berlangsung! Jika halaman ditutup atau di-refresh, kesempatan Anda akan hangus.';
    return e.returnValue;
  }
});
