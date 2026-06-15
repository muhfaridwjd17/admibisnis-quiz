// ================================================
//  ADMINBIZ - Main Application Logic
// ================================================

// ---- STATE ----
const STATE = {
  currentPage: 'dashboard',
  currentSubject: null,
  currentQuestion: 0,
  answers: [],
  score: 0,
  timer: null,
  timeLeft: 600, // 10 minutes per quiz
  history: JSON.parse(localStorage.getItem('quiz_history') || '[]'),
  userData: JSON.parse(localStorage.getItem('user_data') || JSON.stringify({
    name: 'Mahasiswa',
    nim: '2024001',
    prodi: 'D4 Administrasi Bisnis',
    totalQuiz: 0,
    bestScore: 0,
    avgScore: 0
  }))
};

// ---- ROUTER ----
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const target = document.getElementById(`page-${page}`);
  if (target) {
    target.classList.add('active');
    STATE.currentPage = page;
  }

  document.querySelectorAll(`.nav-item[data-page="${page}"]`).forEach(n => n.classList.add('active'));

  // Page-specific init
  if (page === 'dashboard') renderDashboard();
  if (page === 'kuis') renderKuisPage();
  if (page === 'nilai') renderNilaiPage();
  if (page === 'leaderboard') renderLeaderboard();
  if (page === 'materi') renderMateriPage();
  if (page === 'profil') renderProfilPage();

  // Close mobile sidebar
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('open');

  window.scrollTo(0, 0);
}

// ---- DASHBOARD ----
function renderDashboard() {
  updateTopbar('Dashboard', 'Selamat datang kembali 👋');

  const h = STATE.history;
  const totalAttempts = h.length;
  const avg = totalAttempts > 0 ? Math.round(h.reduce((a, b) => a + b.score, 0) / totalAttempts) : 0;
  const best = totalAttempts > 0 ? Math.max(...h.map(x => x.score)) : 0;
  const passed = h.filter(x => x.score >= 70).length;

  document.getElementById('dash-total').textContent = totalAttempts;
  document.getElementById('dash-avg').textContent = avg + '%';
  document.getElementById('dash-best').textContent = best + '%';
  document.getElementById('dash-passed').textContent = passed;

  // Recent activity
  renderRecentActivity();
  renderSubjectProgress();
}

function renderRecentActivity() {
  const container = document.getElementById('recent-activity');
  if (!container) return;

  const recent = [...STATE.history].reverse().slice(0, 5);

  if (recent.length === 0) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">📝</div>
      <div class="empty-state-title">Belum ada aktivitas</div>
      <div class="empty-state-text">Mulai kerjakan kuis untuk melihat aktivitas di sini</div>
    </div>`;
    return;
  }

  container.innerHTML = recent.map(r => {
    const sub = QUIZ_DATA.subjects.find(s => s.id === r.subjectId);
    const grade = getGrade(r.score);
    return `<div class="lb-row fade-in">
      <div class="lb-rank">${sub ? sub.icon : '📝'}</div>
      <div class="lb-user">
        <div>
          <div class="lb-name">${sub ? sub.title : r.subjectId}</div>
          <div class="lb-sub">${new Date(r.date).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'})}</div>
        </div>
      </div>
      <div>${r.correct}/${r.total} benar</div>
      <div><span class="score-pill" style="background:${grade.bg};color:${grade.color}">${r.score}%</span></div>
      <div style="color:var(--text-muted); font-size:12px">${r.time}</div>
    </div>`;
  }).join('');
}

function renderSubjectProgress() {
  const container = document.getElementById('subject-progress');
  if (!container) return;

  container.innerHTML = QUIZ_DATA.subjects.map(sub => {
    const attempts = STATE.history.filter(h => h.subjectId === sub.id);
    const best = attempts.length > 0 ? Math.max(...attempts.map(h => h.score)) : 0;
    return `<div class="flex items-center gap-12 mb-8" style="padding:10px 0; border-bottom:1px solid var(--border-subtle);">
      <span style="font-size:20px; width:28px; text-align:center;">${sub.icon}</span>
      <div style="flex:1; min-width:0;">
        <div style="font-size:13px; font-weight:600; margin-bottom:6px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${sub.title}</div>
        <div style="height:5px; background:var(--border-subtle); border-radius:3px; overflow:hidden;">
          <div style="height:100%; width:${best}%; background:${sub.color}; border-radius:3px; transition:width 1.2s ease;"></div>
        </div>
      </div>
      <div style="font-size:13px; font-weight:700; color:${sub.color}; min-width:40px; text-align:right;">${best > 0 ? best+'%' : '-'}</div>
    </div>`;
  }).join('');
}

// ---- KUIS PAGE ----
function renderKuisPage() {
  updateTopbar('Pilih Kuis', 'Pilih mata kuliah untuk memulai kuis');
  const grid = document.getElementById('subjects-grid');
  if (!grid) return;

  grid.innerHTML = QUIZ_DATA.subjects.map(sub => {
    const attempts = STATE.history.filter(h => h.subjectId === sub.id);
    const best = attempts.length > 0 ? Math.max(...attempts.map(h => h.score)) : 0;
    return `
      <div class="subject-card" onclick="startQuiz('${sub.id}')" style="--color-accent:${sub.color}">
        <div class="subject-icon-wrap" style="background:${sub.color}20; border:1px solid ${sub.color}30;">
          <span>${sub.icon}</span>
          <div style="position:absolute;top:-2px;right:-2px;width:10px;height:10px;border-radius:50%;background:${sub.color};opacity:${attempts.length > 0 ? 1 : 0}; box-shadow:0 0 6px ${sub.color};"></div>
        </div>
        <div class="subject-score-bar">
          <div class="subject-score-fill" style="width:${best}%; background:${sub.color};"></div>
        </div>
        <div class="subject-title">${sub.title}</div>
        <div class="subject-desc">${sub.description}</div>
        <div class="subject-meta">
          <div class="subject-meta-info">
            <span>❓</span>
            <span>10 Soal · ${attempts.length} Percobaan</span>
          </div>
          <div class="subject-arrow" style="background:${sub.color}20; color:${sub.color};">→</div>
        </div>
      </div>`;
  }).join('');
}

// ---- START QUIZ ----
function startQuiz(subjectId) {
  const sub = QUIZ_DATA.subjects.find(s => s.id === subjectId);
  if (!sub) return;

  STATE.currentSubject = sub;
  STATE.currentQuestion = 0;
  STATE.answers = new Array(sub.questions.length).fill(null);
  STATE.score = 0;
  STATE.timeLeft = 600;

  showPage('quiz');
  renderQuestion();
  startTimer();
}

function showPage(p) {
  document.querySelectorAll('.page').forEach(pg => pg.classList.remove('active'));
  document.getElementById(`page-${p}`).classList.add('active');
}

function renderQuestion() {
  const sub = STATE.currentSubject;
  const qIdx = STATE.currentQuestion;
  const q = sub.questions[qIdx];
  const total = sub.questions.length;

  updateTopbar(`Kuis: ${sub.title}`, `Pertanyaan ${qIdx + 1} dari ${total}`);

  const pct = Math.round((qIdx / total) * 100);
  document.getElementById('quiz-progress-fill').style.width = pct + '%';
  document.getElementById('quiz-progress-text').textContent = `${qIdx + 1} / ${total}`;

  document.getElementById('question-subject').textContent = `${sub.icon} ${sub.title}`;
  document.getElementById('question-number').textContent = `Pertanyaan ${qIdx + 1}`;
  document.getElementById('question-text').textContent = q.q;

  const optContainer = document.getElementById('options-container');
  const letters = ['A', 'B', 'C', 'D'];
  optContainer.innerHTML = q.options.map((opt, i) => `
    <button class="option-btn ${STATE.answers[qIdx] === i ? 'selected' : ''}"
      onclick="selectOption(${i})" ${STATE.answers[qIdx] !== null ? 'disabled' : ''}>
      <span class="option-letter">${letters[i]}</span>
      <span>${opt}</span>
    </button>
  `).join('');

  // Nav buttons
  document.getElementById('btn-prev').style.display = qIdx === 0 ? 'none' : 'flex';
  document.getElementById('btn-next').textContent = qIdx === total - 1 ? '🏁 Selesai' : 'Selanjutnya →';
  document.getElementById('btn-next').disabled = STATE.answers[qIdx] === null;
}

function selectOption(optIdx) {
  const qIdx = STATE.currentQuestion;
  const q = STATE.currentSubject.questions[qIdx];

  STATE.answers[qIdx] = optIdx;

  // Show correct/wrong
  const btns = document.querySelectorAll('.option-btn');
  btns.forEach((btn, i) => {
    btn.disabled = true;
    if (i === q.answer) {
      btn.classList.add('correct');
    } else if (i === optIdx && optIdx !== q.answer) {
      btn.classList.add('wrong');
    }
  });

  document.getElementById('btn-next').disabled = false;

  // Feedback toast
  if (optIdx === q.answer) {
    showToast('✅ Jawaban benar!', 'success');
  } else {
    showToast('❌ Jawaban kurang tepat', 'error');
  }
}

function nextQuestion() {
  const sub = STATE.currentSubject;
  if (STATE.currentQuestion < sub.questions.length - 1) {
    STATE.currentQuestion++;
    renderQuestion();
  } else {
    finishQuiz();
  }
}

function prevQuestion() {
  if (STATE.currentQuestion > 0) {
    STATE.currentQuestion--;
    renderQuestion();
  }
}

function startTimer() {
  clearInterval(STATE.timer);
  const el = document.getElementById('quiz-timer-text');
  STATE.timer = setInterval(() => {
    STATE.timeLeft--;
    const m = Math.floor(STATE.timeLeft / 60);
    const s = STATE.timeLeft % 60;
    if (el) el.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    if (STATE.timeLeft <= 0) {
      clearInterval(STATE.timer);
      finishQuiz();
    }
  }, 1000);
}

function finishQuiz() {
  clearInterval(STATE.timer);
  const sub = STATE.currentSubject;
  const correct = sub.questions.filter((q, i) => STATE.answers[i] === q.answer).length;
  const total = sub.questions.length;
  const score = Math.round((correct / total) * 100);
  const timeUsed = 600 - STATE.timeLeft;
  const mm = Math.floor(timeUsed / 60);
  const ss = timeUsed % 60;
  const timeStr = `${mm}m ${ss}s`;

  // Save to history
  const record = {
    subjectId: sub.id,
    subjectTitle: sub.title,
    score,
    correct,
    total,
    time: timeStr,
    date: new Date().toISOString(),
    answers: STATE.answers
  };
  STATE.history.push(record);
  localStorage.setItem('quiz_history', JSON.stringify(STATE.history));

  // Show result
  showPage('result');
  renderResult(correct, total, score, timeStr);
}

function renderResult(correct, wrong_total, score, time) {
  const total = STATE.currentSubject.questions.length;
  const wrong = total - correct;
  const grade = getGrade(score);

  updateTopbar('Hasil Kuis', STATE.currentSubject.title);

  // SVG ring
  const radius = 60, cx = 80, cy = 80;
  const circ = 2 * Math.PI * radius;
  const dash = (score / 100) * circ;

  document.getElementById('result-ring-svg').innerHTML = `
    <circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="10"/>
    <circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${grade.color}" stroke-width="10"
      stroke-dasharray="${circ}" stroke-dashoffset="${circ - dash}"
      stroke-linecap="round" style="transition:stroke-dashoffset 1.5s ease;"/>
  `;

  document.getElementById('result-score-num').textContent = score + '%';
  document.getElementById('result-score-num').style.color = grade.color;
  document.getElementById('result-grade-text').textContent = grade.label;
  document.getElementById('result-grade-text').style.color = grade.color;
  document.getElementById('result-title').textContent = grade.message;
  document.getElementById('result-subtitle').textContent = grade.sub;
  document.getElementById('result-correct').textContent = correct;
  document.getElementById('result-wrong').textContent = wrong;
  document.getElementById('result-time').textContent = time;
}

function getGrade(score) {
  if (score >= 90) return { label: 'A', color: '#10B981', bg: 'rgba(16,185,129,0.15)', message: '🏆 Sempurna!', sub: 'Hasil luar biasa! Kamu menguasai materi ini dengan sangat baik.' };
  if (score >= 80) return { label: 'B', color: '#6366F1', bg: 'rgba(99,102,241,0.15)', message: '🎯 Hebat!', sub: 'Hasil sangat bagus! Terus tingkatkan untuk mencapai kesempurnaan.' };
  if (score >= 70) return { label: 'C', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', message: '👍 Cukup Baik', sub: 'Kamu lulus! Tetap semangat belajar untuk hasil yang lebih baik.' };
  if (score >= 60) return { label: 'D', color: '#F97316', bg: 'rgba(249,115,22,0.15)', message: '📚 Perlu Belajar Lagi', sub: 'Hampir lulus. Pelajari kembali materi yang kurang dikuasai.' };
  return { label: 'E', color: '#EF4444', bg: 'rgba(239,68,68,0.15)', message: '💪 Jangan Menyerah!', sub: 'Hasil di bawah target. Review materi dan coba lagi ya!' };
}

// ---- NILAI PAGE ----
function renderNilaiPage() {
  updateTopbar('Nilai Saya', 'Riwayat hasil kuis');
  const container = document.getElementById('nilai-content');
  if (!container) return;

  if (STATE.history.length === 0) {
    container.innerHTML = `<div class="empty-state fade-in">
      <div class="empty-state-icon">📊</div>
      <div class="empty-state-title">Belum ada nilai</div>
      <div class="empty-state-text">Kerjakan kuis terlebih dahulu untuk melihat nilai di sini</div>
      <button class="btn btn-primary mt-16" onclick="navigate('kuis')">Mulai Kuis</button>
    </div>`;
    return;
  }

  const bySubject = {};
  QUIZ_DATA.subjects.forEach(s => {
    const attempts = STATE.history.filter(h => h.subjectId === s.id);
    if (attempts.length > 0) {
      bySubject[s.id] = { subject: s, attempts };
    }
  });

  container.innerHTML = Object.values(bySubject).map(({ subject: sub, attempts }) => {
    const best = Math.max(...attempts.map(a => a.score));
    const avg = Math.round(attempts.reduce((a, b) => a + b.score, 0) / attempts.length);
    const grade = getGrade(best);

    return `<div class="card mb-16 fade-in">
      <div class="card-body">
        <div class="flex items-center justify-between mb-16">
          <div class="flex items-center gap-12">
            <div style="font-size:28px">${sub.icon}</div>
            <div>
              <div style="font-weight:700; font-size:15px;">${sub.title}</div>
              <div style="font-size:12px; color:var(--text-muted)">${attempts.length} percobaan</div>
            </div>
          </div>
          <div class="flex items-center gap-12">
            <div style="text-align:right">
              <div style="font-size:11px; color:var(--text-muted); margin-bottom:4px;">Nilai Terbaik</div>
              <span class="score-pill" style="background:${grade.bg}; color:${grade.color}; font-size:16px; padding:6px 16px;">${best}%</span>
            </div>
          </div>
        </div>
        <div style="margin-bottom:16px;">
          <div style="display:flex; justify-content:space-between; font-size:12px; color:var(--text-muted); margin-bottom:6px;">
            <span>Rata-rata: ${avg}%</span>
            <span>Terbaik: ${best}%</span>
          </div>
          <div style="height:6px; background:var(--border-subtle); border-radius:3px; overflow:hidden;">
            <div style="height:100%; width:${best}%; background:${sub.color}; border-radius:3px; transition:width 1s ease;"></div>
          </div>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          ${[...attempts].reverse().map(a => {
            const g = getGrade(a.score);
            return `<div style="background:var(--bg-glass); border:1px solid var(--border-subtle); border-radius:8px; padding:8px 12px; font-size:12px;">
              <div style="font-weight:700; color:${g.color};">${a.score}%</div>
              <div style="color:var(--text-muted); font-size:10px;">${new Date(a.date).toLocaleDateString('id-ID',{day:'numeric',month:'short'})}</div>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>`;
  }).join('');
}

// ---- LEADERBOARD ----
function renderLeaderboard() {
  updateTopbar('Leaderboard', 'Peringkat berdasarkan nilai terbaik');
  const container = document.getElementById('lb-content');
  if (!container) return;

  // Aggregate: best score per subject
  const entries = QUIZ_DATA.subjects.map(sub => {
    const attempts = STATE.history.filter(h => h.subjectId === sub.id);
    if (attempts.length === 0) return null;
    const best = attempts.reduce((a, b) => a.score > b.score ? a : b);
    return { sub, score: best.score, time: best.time, date: best.date };
  }).filter(Boolean).sort((a, b) => b.score - a.score);

  if (entries.length === 0) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">🏆</div>
      <div class="empty-state-title">Leaderboard Kosong</div>
      <div class="empty-state-text">Kerjakan kuis untuk masuk ke leaderboard!</div>
    </div>`;
    return;
  }

  const medals = ['🥇', '🥈', '🥉'];

  container.innerHTML = `<div class="leaderboard-table">
    <div class="lb-header">
      <div style="text-align:center">Rank</div>
      <div>Mata Kuliah</div>
      <div class="lb-col-subject">Nilai</div>
      <div class="lb-col-subject">Waktu</div>
      <div class="lb-col-subject">Tanggal</div>
    </div>
    ${entries.map((e, i) => {
      const grade = getGrade(e.score);
      return `<div class="lb-row ${i < 3 ? 'top-'+(i+1) : ''} fade-in">
        <div class="lb-rank">${i < 3 ? medals[i] : '#'+(i+1)}</div>
        <div class="lb-user">
          <div class="lb-avatar" style="background:${e.sub.color}20; color:${e.sub.color}; font-size:18px;">${e.sub.icon}</div>
          <div>
            <div class="lb-name">${e.sub.title}</div>
            <div class="lb-sub">${STATE.userData.name}</div>
          </div>
        </div>
        <div class="lb-col-subject"><span class="score-pill" style="background:${grade.bg}; color:${grade.color};">${e.score}%</span></div>
        <div class="lb-col-subject" style="color:var(--text-muted); font-size:13px;">${e.time}</div>
        <div class="lb-col-subject" style="color:var(--text-muted); font-size:12px;">${new Date(e.date).toLocaleDateString('id-ID')}</div>
      </div>`;
    }).join('')}
  </div>`;
}

// ---- MATERI PAGE ----
function renderMateriPage() {
  updateTopbar('Materi Pembelajaran', 'Ringkasan materi per mata kuliah');
  const grid = document.getElementById('materi-grid');
  if (!grid) return;

  const materi = [
    { sub: 'pkn', topics: ['Pancasila & UUD 1945', 'Hak & Kewajiban WN', 'Sistem Pemerintahan', 'Bela Negara'], tags: ['Kewarganegaraan', 'Hukum'] },
    { sub: 'mpi', topics: ['Teori Portofolio', 'CAPM & Beta', 'Analisis Efisien', 'Manajemen Risiko'], tags: ['Keuangan', 'Investasi'] },
    { sub: 'pk', topics: ['Motivasi Konsumen', 'Proses Keputusan', 'Persepsi & Sikap', 'Segmentasi'], tags: ['Pemasaran', 'Psikologi'] },
    { sub: 'kep', topics: ['Gaya Kepemimpinan', 'Teori Situasional', 'Kepemimpinan Transformasional', 'Emotional Intelligence'], tags: ['Manajemen', 'SDM'] },
    { sub: 'pp', topics: ['Konsep SERVQUAL', 'Kepuasan Pelanggan', 'Service Recovery', 'NPS & CSI'], tags: ['Layanan', 'CX'] },
    { sub: 'ebc', topics: ['Business Letters', 'Email Etiquette', 'Memo & Report', 'Presentation Skills'], tags: ['Bahasa Inggris', 'Komunikasi'] },
    { sub: 'sb', topics: ['Analisis SWOT', 'Strategi Bersaing', 'Break-even Analysis', 'Market Simulation'], tags: ['Strategi', 'Bisnis'] },
    { sub: 'akb', topics: ['Microsoft Excel', 'Database Bisnis', 'Cloud Computing', 'ERP System'], tags: ['IT', 'Teknologi'] },
    { sub: 'kb', topics: ['Five Forces Porter', 'BCG Matrix', 'GCG Principles', 'Blue Ocean Strategy'], tags: ['Strategi', 'Kebijakan'] },
    { sub: 'sim', topics: ['ERP & CRM', 'Data Warehouse', 'Big Data & BI', 'Keamanan Informasi'], tags: ['Sistem', 'Teknologi'] }
  ];

  grid.innerHTML = materi.map(m => {
    const sub = QUIZ_DATA.subjects.find(s => s.id === m.sub);
    return `<div class="materi-card fade-in">
      <div class="materi-card-header" style="background:${sub.color}08;">
        <div style="font-size:28px">${sub.icon}</div>
        <div>
          <div class="materi-card-title">${sub.title}</div>
          <div class="materi-tags" style="margin:0;">
            ${m.tags.map(t => `<span class="tag" style="background:${sub.color}15; color:${sub.color}; border-color:${sub.color}25;">${t}</span>`).join('')}
          </div>
        </div>
      </div>
      <div class="materi-card-body">
        <div style="font-size:12px; color:var(--text-muted); font-weight:700; letter-spacing:1px; text-transform:uppercase; margin-bottom:12px;">Topik Utama</div>
        ${m.topics.map((t, i) => `
          <div style="display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px solid var(--border-subtle);">
            <div style="width:22px; height:22px; min-width:22px; border-radius:6px; background:${sub.color}15; color:${sub.color}; font-size:11px; font-weight:800; display:flex; align-items:center; justify-content:center;">${i+1}</div>
            <span style="font-size:13px;">${t}</span>
          </div>`).join('')}
        <button class="btn btn-primary btn-sm mt-16" style="width:100%; justify-content:center;" onclick="startQuiz('${sub.id}')">
          🎯 Latihan Kuis
        </button>
      </div>
    </div>`;
  }).join('');
}

// ---- PROFIL PAGE ----
function renderProfilPage() {
  updateTopbar('Profil Saya', 'Informasi dan statistik pribadi');

  const h = STATE.history;
  const total = h.length;
  const avg = total > 0 ? Math.round(h.reduce((a, b) => a + b.score, 0) / total) : 0;
  const best = total > 0 ? Math.max(...h.map(x => x.score)) : 0;
  const passed = h.filter(x => x.score >= 70).length;

  document.getElementById('prof-name').textContent = STATE.userData.name;
  document.getElementById('prof-nim').textContent = STATE.userData.nim;
  document.getElementById('prof-prodi').textContent = STATE.userData.prodi;
  document.getElementById('prof-total').textContent = total;
  document.getElementById('prof-avg').textContent = avg + '%';
  document.getElementById('prof-best').textContent = best + '%';
  document.getElementById('prof-passed').textContent = passed;

  const initial = STATE.userData.name.charAt(0).toUpperCase();
  document.querySelectorAll('.prof-initial').forEach(el => el.textContent = initial);
}

// ---- UTILS ----
function updateTopbar(title, sub) {
  const t = document.getElementById('topbar-title');
  const s = document.getElementById('topbar-sub');
  if (t) t.textContent = title;
  if (s) s.textContent = sub;
}

function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  const colors = { success: '#10B981', error: '#EF4444', info: '#6366F1', warning: '#F59E0B' };
  toast.innerHTML = `<span>${msg}</span>`;
  toast.style.borderLeftColor = colors[type] || colors.info;
  toast.style.borderLeft = `3px solid ${colors[type] || colors.info}`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// ---- SAVE PROFILE ----
function saveProfile() {
  const name = document.getElementById('input-name').value.trim();
  const nim = document.getElementById('input-nim').value.trim();
  const prodi = document.getElementById('input-prodi').value.trim();

  if (name) STATE.userData.name = name;
  if (nim) STATE.userData.nim = nim;
  if (prodi) STATE.userData.prodi = prodi;

  localStorage.setItem('user_data', JSON.stringify(STATE.userData));
  renderProfilPage();
  showToast('✅ Profil berhasil disimpan!', 'success');
}

function clearHistory() {
  if (confirm('Yakin ingin menghapus semua riwayat kuis?')) {
    STATE.history = [];
    localStorage.removeItem('quiz_history');
    showToast('🗑️ Riwayat dihapus', 'warning');
    renderNilaiPage();
    renderDashboard();
  }
}

// ---- MOBILE SIDEBAR ----
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('open');
}

// ---- INIT ----
document.addEventListener('DOMContentLoaded', () => {
  navigate('dashboard');
  
  // Sidebar nav
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', () => navigate(item.dataset.page));
  });

  // Sidebar overlay
  document.getElementById('sidebar-overlay').addEventListener('click', toggleSidebar);

  // User initial in sidebar
  const initial = STATE.userData.name.charAt(0).toUpperCase();
  document.querySelectorAll('.user-initial').forEach(el => el.textContent = initial);
  document.querySelectorAll('.user-display-name').forEach(el => el.textContent = STATE.userData.name);
});
