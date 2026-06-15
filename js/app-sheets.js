// ================================================
//  APP-SHEETS.JS — versi lengkap dengan:
//  - Modal identitas (nama, NIM, kelas)
//  - Timer 2 menit per soal
//  - Dark/light mode toggle
//  - Materi lengkap
//  - Tanpa halaman profil
// ================================================

const STATE = {
  currentPage: 'dashboard',
  currentSubject: null,
  currentQuestion: 0,
  answers: [],
  soalTimer: null,
  soalTimeLeft: 120,
  history: JSON.parse(localStorage.getItem('quiz_history') || '[]'),
  currentIdentity: null,
  loadedQuestions: {}
};

// ==================== THEME ====================
function initTheme() {
  const saved = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeBtn(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  updateThemeBtn(next);
}

function updateThemeBtn(theme) {
  const icon = theme === 'dark' ? '☀️ Mode Terang' : '🌙 Mode Gelap';
  const iconTop = theme === 'dark' ? '☀️' : '🌙';
  const btn = document.getElementById('theme-btn');
  const btnTop = document.getElementById('theme-btn-top');
  if (btn) btn.textContent = icon;
  if (btnTop) btnTop.textContent = iconTop;
}

// ==================== ROUTER ====================
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const target = document.getElementById(`page-${page}`);
  if (target) { target.classList.add('active'); STATE.currentPage = page; }
  document.querySelectorAll(`.nav-item[data-page="${page}"]`).forEach(n => n.classList.add('active'));
  if (page === 'dashboard') renderDashboard();
  if (page === 'kuis') renderKuisPage();
  if (page === 'nilai') renderNilaiPage();
  if (page === 'leaderboard') renderLeaderboard();
  if (page === 'materi') renderMateriPage();
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('open');
  window.scrollTo(0, 0);
}

// ==================== MODAL IDENTITAS ====================
function showModalIdentitas(subjectId) {
  const sub = SHEETS_CONFIG[subjectId];
  if (!sub) return;
  STATE._pendingSubjectId = subjectId;
  document.getElementById('modal-subject-icon').textContent = sub.icon;
  document.getElementById('modal-subject-title').textContent = sub.title;

  // Isi ulang dari localStorage kalau ada
  const saved = JSON.parse(localStorage.getItem('user_identity') || '{}');
  if (saved.nama) document.getElementById('id-nama').value = saved.nama;
  if (saved.nim) document.getElementById('id-nim').value = saved.nim;
  if (saved.kelas) document.getElementById('id-kelas').value = saved.kelas;

  const modal = document.getElementById('modal-identitas');
  modal.style.display = 'flex';
  setTimeout(() => document.getElementById('id-nama').focus(), 100);
}

function tutupModalIdentitas() {
  document.getElementById('modal-identitas').style.display = 'none';
}

function submitIdentitas() {
  const nama = document.getElementById('id-nama').value.trim();
  const nim = document.getElementById('id-nim').value.trim();
  const kelas = document.getElementById('id-kelas').value.trim();

  if (!nama) { showToast('⚠️ Nama wajib diisi!', 'warning'); document.getElementById('id-nama').focus(); return; }
  if (!nim) { showToast('⚠️ NIM wajib diisi!', 'warning'); document.getElementById('id-nim').focus(); return; }
  if (!kelas) { showToast('⚠️ Kelas wajib diisi!', 'warning'); document.getElementById('id-kelas').focus(); return; }

  STATE.currentIdentity = { nama, nim, kelas };
  localStorage.setItem('user_identity', JSON.stringify({ nama, nim, kelas }));

  // Update sidebar
  document.querySelectorAll('.user-display-name').forEach(el => el.textContent = nama);
  document.querySelectorAll('.user-initial').forEach(el => el.textContent = nama.charAt(0).toUpperCase());

  tutupModalIdentitas();
  doStartQuiz(STATE._pendingSubjectId);
}

// ==================== QUIZ ====================
function startQuiz(subjectId) {
  const sub = SHEETS_CONFIG[subjectId];
  if (!sub) return;
  if (!sub.url) { showToast('⚠️ URL Google Sheets belum dikonfigurasi', 'warning'); return; }
  showModalIdentitas(subjectId);
}

async function doStartQuiz(subjectId) {
  const sub = SHEETS_CONFIG[subjectId];
  showPage('quiz');
  showQuizLoading(sub);

  try {
    let questions = STATE.loadedQuestions[subjectId];
    if (!questions) {
      questions = await fetchSubjectQuestions(subjectId);
      if (questions && questions.length > 0) STATE.loadedQuestions[subjectId] = questions;
    }

    if (!questions || questions.length === 0) {
      showToast('❌ Gagal memuat soal. Cek URL di config.js.', 'error');
      navigate('kuis');
      return;
    }

    STATE.currentSubject = { id: subjectId, ...sub, questions };
    STATE.currentQuestion = 0;
    STATE.answers = new Array(questions.length).fill(null);

    hideQuizLoading();
    renderQuestion();
    startSoalTimer();
  } catch (err) {
    showToast('❌ Terjadi kesalahan. Coba lagi.', 'error');
    navigate('kuis');
  }
}

function showQuizLoading(sub) {
  const c = document.getElementById('quiz-container-inner');
  if (c) c.innerHTML = `<div style="text-align:center;padding:80px 32px;">
    <div style="font-size:48px;margin-bottom:24px;animation:pulse 1.5s infinite;">${sub.icon}</div>
    <div style="font-size:18px;font-weight:700;margin-bottom:12px;color:var(--text-primary);">Memuat soal ${sub.title}...</div>
    <div style="font-size:13px;color:var(--text-muted);">Mengambil data dari Google Sheets</div>
    <div style="margin-top:24px;height:4px;width:200px;background:var(--border-subtle);border-radius:2px;overflow:hidden;margin-inline:auto;">
      <div style="height:100%;background:linear-gradient(135deg,#6366F1,#8B5CF6);border-radius:2px;animation:loadBar 2s ease infinite;"></div>
    </div>
    <style>@keyframes loadBar{0%{width:0%}100%{width:100%}}</style>
  </div>`;
}

function hideQuizLoading() {
  const c = document.getElementById('quiz-container-inner');
  if (c) c.innerHTML = `
    <div class="quiz-header">
      <div class="quiz-progress-wrap">
        <div><div class="section-eyebrow" id="question-subject">Kuis</div></div>
        <div class="quiz-timer" id="quiz-timer-wrap">⏱️ <span id="quiz-timer-text">02:00</span></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-muted);margin-bottom:6px;">
        <span id="quiz-progress-text">1 / 10</span><span>Progress Soal</span>
      </div>
      <div class="quiz-progress-bar"><div class="quiz-progress-fill" id="quiz-progress-fill" style="width:0%"></div></div>
      <div class="soal-timer-bar"><div class="soal-timer-fill" id="soal-timer-fill" style="width:100%"></div></div>
    </div>
    <div class="question-card fade-in">
      <div class="question-number" id="question-number">Pertanyaan 1</div>
      <div class="question-text" id="question-text"></div>
      <div class="options-grid" id="options-container"></div>
    </div>
    <div class="quiz-actions">
      <button class="btn btn-ghost" id="btn-prev" onclick="prevQuestion()" style="display:none;">← Sebelumnya</button>
      <div style="margin-left:auto;display:flex;gap:10px;">
        <button class="btn btn-ghost" onclick="if(confirm('Yakin ingin mengakhiri kuis?')) finishQuiz()">Akhiri Kuis</button>
        <button class="btn btn-primary" id="btn-next" onclick="nextQuestion()" disabled>Selanjutnya →</button>
      </div>
    </div>`;
}

// ==================== TIMER PER SOAL ====================
function startSoalTimer() {
  clearInterval(STATE.soalTimer);
  STATE.soalTimeLeft = 120; // 2 menit
  updateTimerDisplay();

  STATE.soalTimer = setInterval(() => {
    STATE.soalTimeLeft--;
    updateTimerDisplay();
    if (STATE.soalTimeLeft <= 0) {
      clearInterval(STATE.soalTimer);
      autoNextSoal();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const m = Math.floor(STATE.soalTimeLeft / 60);
  const s = STATE.soalTimeLeft % 60;
  const text = document.getElementById('quiz-timer-text');
  const wrap = document.getElementById('quiz-timer-wrap');
  const fill = document.getElementById('soal-timer-fill');
  const pct = (STATE.soalTimeLeft / 120) * 100;

  if (text) text.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;

  if (wrap) {
    wrap.className = 'quiz-timer';
    if (STATE.soalTimeLeft <= 20) wrap.classList.add('warning');
  }

  if (fill) {
    fill.style.width = pct + '%';
    fill.className = 'soal-timer-fill';
    if (pct < 50) fill.classList.add('warn');
    if (pct < 20) fill.classList.add('danger');
  }
}

function autoNextSoal() {
  // Waktu habis — tandai soal ini tidak dijawab lalu lanjut
  showToast('⏰ Waktu habis! Lanjut ke soal berikutnya.', 'warning');
  const qIdx = STATE.currentQuestion;
  // Jika belum dijawab, set -1 (tidak dijawab)
  if (STATE.answers[qIdx] === null) STATE.answers[qIdx] = -1;

  // Tampilkan jawaban benar
  const q = STATE.currentSubject.questions[qIdx];
  const btns = document.querySelectorAll('.option-btn');
  btns.forEach((btn, i) => {
    btn.disabled = true;
    if (i === q.answer) btn.classList.add('correct');
  });
  document.getElementById('btn-next').disabled = false;

  // Auto lanjut setelah 1.5 detik
  setTimeout(() => nextQuestion(), 1500);
}

function stopSoalTimer() {
  clearInterval(STATE.soalTimer);
}

// ==================== RENDER QUESTION ====================
function renderQuestion() {
  const sub = STATE.currentSubject;
  const qIdx = STATE.currentQuestion;
  const q = sub.questions[qIdx];
  const total = sub.questions.length;

  updateTopbar(`Kuis: ${sub.title}`, `Pertanyaan ${qIdx + 1} dari ${total}`);

  const pct = Math.round((qIdx / total) * 100);
  const pf = document.getElementById('quiz-progress-fill');
  if (pf) pf.style.width = pct + '%';
  const pt = document.getElementById('quiz-progress-text');
  if (pt) pt.textContent = `${qIdx + 1} / ${total}`;
  const qs = document.getElementById('question-subject');
  if (qs) qs.textContent = `${sub.icon} ${sub.title}`;
  const qn = document.getElementById('question-number');
  if (qn) qn.textContent = `Pertanyaan ${qIdx + 1}`;
  const qt = document.getElementById('question-text');
  if (qt) qt.textContent = q.q;

  const letters = ['A', 'B', 'C', 'D'];
  const oc = document.getElementById('options-container');
  if (oc) oc.innerHTML = q.options.map((opt, i) => `
    <button class="option-btn ${STATE.answers[qIdx] === i ? 'selected' : ''}"
      onclick="selectOption(${i})"
      ${STATE.answers[qIdx] !== null ? 'disabled' : ''}>
      <span class="option-letter">${letters[i]}</span>
      <span>${opt}</span>
    </button>`).join('');

  const bp = document.getElementById('btn-prev');
  if (bp) bp.style.display = qIdx === 0 ? 'none' : 'flex';
  const bn = document.getElementById('btn-next');
  if (bn) {
    bn.textContent = qIdx === total - 1 ? '🏁 Selesai' : 'Selanjutnya →';
    bn.disabled = STATE.answers[qIdx] === null;
  }

  // Reset timer untuk soal baru
  startSoalTimer();
}

function selectOption(optIdx) {
  stopSoalTimer();
  const qIdx = STATE.currentQuestion;
  const q = STATE.currentSubject.questions[qIdx];
  STATE.answers[qIdx] = optIdx;

  document.querySelectorAll('.option-btn').forEach((btn, i) => {
    btn.disabled = true;
    if (i === q.answer) btn.classList.add('correct');
    else if (i === optIdx && optIdx !== q.answer) btn.classList.add('wrong');
  });

  const bn = document.getElementById('btn-next');
  if (bn) bn.disabled = false;
  showToast(optIdx === q.answer ? '✅ Jawaban benar!' : '❌ Jawaban kurang tepat', optIdx === q.answer ? 'success' : 'error');
}

function nextQuestion() {
  stopSoalTimer();
  const sub = STATE.currentSubject;
  if (STATE.currentQuestion < sub.questions.length - 1) {
    STATE.currentQuestion++;
    renderQuestion();
  } else {
    finishQuiz();
  }
}

function prevQuestion() {
  stopSoalTimer();
  if (STATE.currentQuestion > 0) { STATE.currentQuestion--; renderQuestion(); }
}

function finishQuiz() {
  stopSoalTimer();
  const sub = STATE.currentSubject;
  const correct = sub.questions.filter((q, i) => STATE.answers[i] === q.answer).length;
  const total = sub.questions.length;
  const score = Math.round((correct / total) * 100);
  const identity = STATE.currentIdentity || { nama: 'Mahasiswa', nim: '-', kelas: '-' };

  const record = {
    subjectId: sub.id,
    subjectTitle: sub.title,
    score, correct, total,
    nama: identity.nama,
    nim: identity.nim,
    kelas: identity.kelas,
    date: new Date().toISOString()
  };
  STATE.history.push(record);
  localStorage.setItem('quiz_history', JSON.stringify(STATE.history));

  showPage('result');
  renderResult(correct, total, score, identity);
}

function renderResult(correct, total, score, identity) {
  const wrong = total - correct;
  const grade = getGrade(score);
  updateTopbar('Hasil Kuis', STATE.currentSubject.title);

  const radius = 60, cx = 80, cy = 80;
  const circ = 2 * Math.PI * radius;
  const dash = (score / 100) * circ;

  const svg = document.getElementById('result-ring-svg');
  if (svg) svg.innerHTML = `
    <circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="10"/>
    <circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${grade.color}" stroke-width="10"
      stroke-dasharray="${circ}" stroke-dashoffset="${circ - dash}" stroke-linecap="round"
      style="transition:stroke-dashoffset 1.5s ease;"/>`;

  const sn = document.getElementById('result-score-num');
  if (sn) { sn.textContent = score + '%'; sn.style.color = grade.color; }
  const gt = document.getElementById('result-grade-text');
  if (gt) { gt.textContent = grade.label; gt.style.color = grade.color; }

  const rt = document.getElementById('result-title'); if (rt) rt.textContent = grade.message;
  const rs = document.getElementById('result-subtitle'); if (rs) rs.textContent = grade.sub;
  const rc = document.getElementById('result-correct'); if (rc) rc.textContent = correct;
  const rw = document.getElementById('result-wrong'); if (rw) rw.textContent = wrong;
  const rtm = document.getElementById('result-time'); if (rtm) rtm.textContent = '-';

  const ri = document.getElementById('result-identity');
  if (ri) ri.innerHTML = `
    <div style="display:flex;gap:20px;justify-content:center;flex-wrap:wrap;">
      <span>👤 <strong>${identity.nama}</strong></span>
      <span>🎓 NIM: <strong>${identity.nim}</strong></span>
      <span>🏫 Kelas: <strong>${identity.kelas}</strong></span>
    </div>`;
}

function getGrade(score) {
  if (score >= 90) return { label:'A', color:'#10B981', message:'🏆 Sempurna!', sub:'Hasil luar biasa! Kamu menguasai materi ini dengan sangat baik.' };
  if (score >= 80) return { label:'B', color:'#6366F1', message:'🎯 Hebat!', sub:'Hasil sangat bagus! Terus tingkatkan untuk mencapai kesempurnaan.' };
  if (score >= 70) return { label:'C', color:'#F59E0B', message:'👍 Cukup Baik', sub:'Kamu lulus! Tetap semangat belajar untuk hasil yang lebih baik.' };
  if (score >= 60) return { label:'D', color:'#F97316', message:'📚 Perlu Belajar Lagi', sub:'Hampir lulus. Pelajari kembali materi yang kurang dikuasai.' };
  return { label:'E', color:'#EF4444', message:'💪 Jangan Menyerah!', sub:'Hasil di bawah target. Review materi dan coba lagi ya!' };
}

// ==================== DASHBOARD ====================
function renderDashboard() {
  updateTopbar('Dashboard', 'Selamat datang kembali 👋');
  const h = STATE.history;
  const total = h.length;
  const avg = total > 0 ? Math.round(h.reduce((a,b) => a + b.score, 0) / total) : 0;
  const best = total > 0 ? Math.max(...h.map(x => x.score)) : 0;
  const passed = h.filter(x => x.score >= 70).length;
  const el = id => document.getElementById(id);
  if (el('dash-total')) el('dash-total').textContent = total;
  if (el('dash-avg')) el('dash-avg').textContent = avg + '%';
  if (el('dash-best')) el('dash-best').textContent = best + '%';
  if (el('dash-passed')) el('dash-passed').textContent = passed;

  const configured = countConfigured();
  const totalSub = Object.keys(SHEETS_CONFIG).length;
  const ss = el('sheets-status');
  if (ss) {
    if (configured === totalSub) ss.innerHTML = `<span style="color:var(--accent-emerald)">✅ ${configured}/${totalSub} mata kuliah terhubung ke Google Sheets</span>`;
    else if (configured > 0) ss.innerHTML = `<span style="color:var(--accent-amber)">⚠️ ${configured}/${totalSub} mata kuliah terhubung.</span>`;
    else ss.innerHTML = `<span style="color:#EF4444">❌ Belum ada URL Google Sheets di config.js</span>`;
  }
  renderRecentActivity();
  renderSubjectProgress();
}

function renderRecentActivity() {
  const container = document.getElementById('recent-activity');
  if (!container) return;
  const recent = [...STATE.history].reverse().slice(0, 5);
  if (recent.length === 0) {
    container.innerHTML = `<div class="empty-state" style="padding:40px;"><div class="empty-state-icon">📝</div><div class="empty-state-title">Belum ada aktivitas</div></div>`;
    return;
  }
  container.innerHTML = recent.map(r => {
    const sub = SHEETS_CONFIG[r.subjectId];
    const grade = getGrade(r.score);
    return `<div class="lb-row fade-in">
      <div class="lb-rank">${sub ? sub.icon : '📝'}</div>
      <div class="lb-user"><div><div class="lb-name">${sub ? sub.title : r.subjectId}</div><div class="lb-sub">${new Date(r.date).toLocaleDateString('id-ID',{day:'numeric',month:'short'})}</div></div></div>
      <div style="font-size:13px;">${r.nama || '-'}</div>
      <div><span class="score-pill" style="background:${grade.bg||grade.color+'20'};color:${grade.color}">${r.score}%</span></div>
      <div style="color:var(--text-muted);font-size:12px;">${r.correct}/${r.total}</div>
    </div>`;
  }).join('');
}

function renderSubjectProgress() {
  const container = document.getElementById('subject-progress');
  if (!container) return;
  container.innerHTML = Object.entries(SHEETS_CONFIG).map(([id, sub]) => {
    const attempts = STATE.history.filter(h => h.subjectId === id);
    const best = attempts.length > 0 ? Math.max(...attempts.map(h => h.score)) : 0;
    return `<div class="flex items-center gap-12 mb-8" style="padding:8px 0;border-bottom:1px solid var(--border-subtle);">
      <span style="font-size:18px;width:24px;text-align:center;">${sub.icon}</span>
      <div style="flex:1;min-width:0;">
        <div style="font-size:12px;font-weight:600;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--text-primary);">${sub.title}</div>
        <div style="height:4px;background:var(--border-subtle);border-radius:2px;overflow:hidden;">
          <div style="height:100%;width:${best}%;background:${sub.color};border-radius:2px;transition:width 1.2s ease;"></div>
        </div>
      </div>
      <div style="font-size:12px;font-weight:700;color:${sub.color};min-width:36px;text-align:right;">${best > 0 ? best+'%' : '-'}</div>
    </div>`;
  }).join('');
}

// ==================== KUIS PAGE ====================
function renderKuisPage() {
  updateTopbar('Pilih Kuis', 'Pilih mata kuliah untuk memulai kuis');
  const grid = document.getElementById('subjects-grid');
  if (!grid) return;
  grid.innerHTML = Object.entries(SHEETS_CONFIG).map(([id, sub]) => {
    const attempts = STATE.history.filter(h => h.subjectId === id);
    const best = attempts.length > 0 ? Math.max(...attempts.map(h => h.score)) : 0;
    return `<div class="subject-card" onclick="startQuiz('${id}')" style="--color-accent:${sub.color}">
      <div class="subject-icon-wrap" style="background:${sub.color}20;border:1px solid ${sub.color}30;">
        <span>${sub.icon}</span>
      </div>
      <div class="subject-score-bar"><div class="subject-score-fill" style="width:${best}%;background:${sub.color};"></div></div>
      <div class="subject-title">${sub.title}</div>
      <div class="subject-desc">10 Soal · 2 menit per soal · ${attempts.length} percobaan</div>
      <div class="subject-meta">
        <div class="subject-meta-info"><span>⏱️</span><span>2 menit/soal</span></div>
        <div class="subject-arrow" style="background:${sub.color}20;color:${sub.color};">→</div>
      </div>
    </div>`;
  }).join('');
}

// ==================== NILAI ====================
function renderNilaiPage() {
  updateTopbar('Nilai Saya', 'Riwayat hasil kuis');
  const container = document.getElementById('nilai-content');
  if (!container) return;
  if (STATE.history.length === 0) {
    container.innerHTML = `<div class="empty-state fade-in"><div class="empty-state-icon">📊</div><div class="empty-state-title">Belum ada nilai</div><button class="btn btn-primary mt-16" onclick="navigate('kuis')">Mulai Kuis</button></div>`;
    return;
  }
  // Tampilkan semua history individual
  container.innerHTML = [...STATE.history].reverse().map((r, i) => {
    const sub = SHEETS_CONFIG[r.subjectId];
    const grade = getGrade(r.score);
    return `<div class="card mb-16 fade-in"><div class="card-body">
      <div class="flex items-center justify-between mb-16">
        <div class="flex items-center gap-12">
          <div style="font-size:28px">${sub ? sub.icon : '📝'}</div>
          <div>
            <div style="font-weight:700;font-size:15px;color:var(--text-primary);">${sub ? sub.title : r.subjectId}</div>
            <div style="font-size:12px;color:var(--text-muted);">${new Date(r.date).toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>
          </div>
        </div>
        <span class="score-pill" style="background:${grade.color}20;color:${grade.color};font-size:18px;padding:6px 18px;font-weight:800;">${r.score}%</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px;">
        <div style="text-align:center;padding:10px;background:var(--bg-glass);border-radius:8px;border:1px solid var(--border-subtle);">
          <div style="font-size:18px;font-weight:800;color:#10B981;">${r.correct}</div>
          <div style="font-size:11px;color:var(--text-muted);">Benar</div>
        </div>
        <div style="text-align:center;padding:10px;background:var(--bg-glass);border-radius:8px;border:1px solid var(--border-subtle);">
          <div style="font-size:18px;font-weight:800;color:#EF4444;">${r.total - r.correct}</div>
          <div style="font-size:11px;color:var(--text-muted);">Salah</div>
        </div>
        <div style="text-align:center;padding:10px;background:var(--bg-glass);border-radius:8px;border:1px solid var(--border-subtle);">
          <div style="font-size:14px;font-weight:800;color:var(--accent-indigo);">${grade.label}</div>
          <div style="font-size:11px;color:var(--text-muted);">Grade</div>
        </div>
      </div>
      <div style="font-size:12px;color:var(--text-muted);padding-top:10px;border-top:1px solid var(--border-subtle);">
        👤 ${r.nama || '-'} &nbsp;|&nbsp; 🎓 ${r.nim || '-'} &nbsp;|&nbsp; 🏫 Kelas ${r.kelas || '-'}
      </div>
    </div></div>`;
  }).join('');
}

// ==================== LEADERBOARD ====================
function renderLeaderboard() {
  updateTopbar('Leaderboard', 'Peringkat berdasarkan nilai terbaik');
  const container = document.getElementById('lb-content');
  if (!container) return;
  const entries = Object.entries(SHEETS_CONFIG).map(([id, sub]) => {
    const attempts = STATE.history.filter(h => h.subjectId === id);
    if (attempts.length === 0) return null;
    const best = attempts.reduce((a, b) => a.score > b.score ? a : b);
    return { sub: { id, ...sub }, score: best.score, nama: best.nama, kelas: best.kelas, date: best.date };
  }).filter(Boolean).sort((a, b) => b.score - a.score);

  if (entries.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🏆</div><div class="empty-state-title">Leaderboard Kosong</div></div>`;
    return;
  }
  const medals = ['🥇','🥈','🥉'];
  container.innerHTML = `<div class="leaderboard-table">
    <div class="lb-header"><div style="text-align:center">Rank</div><div>Mata Kuliah</div><div class="lb-col-subject">Nama</div><div class="lb-col-subject">Nilai</div><div class="lb-col-subject">Tanggal</div></div>
    ${entries.map((e, i) => {
      const grade = getGrade(e.score);
      return `<div class="lb-row ${i<3?'top-'+(i+1):''} fade-in">
        <div class="lb-rank">${i<3?medals[i]:'#'+(i+1)}</div>
        <div class="lb-user">
          <div class="lb-avatar" style="background:${e.sub.color}20;color:${e.sub.color};font-size:18px;">${e.sub.icon}</div>
          <div><div class="lb-name">${e.sub.title}</div><div class="lb-sub">Kelas ${e.kelas||'-'}</div></div>
        </div>
        <div class="lb-col-subject" style="font-size:13px;color:var(--text-primary);">${e.nama||'-'}</div>
        <div class="lb-col-subject"><span class="score-pill" style="background:${grade.color}20;color:${grade.color};">${e.score}%</span></div>
        <div class="lb-col-subject" style="color:var(--text-muted);font-size:12px;">${new Date(e.date).toLocaleDateString('id-ID')}</div>
      </div>`;
    }).join('')}
  </div>`;
}

// ==================== MATERI ====================
const MATERI_DATA = {
  pkn: {
    deskripsi: 'Mempelajari nilai-nilai kebangsaan, hak dan kewajiban warga negara, serta sistem pemerintahan Indonesia berdasarkan Pancasila dan UUD 1945.',
    topik: [
      { judul: 'Pancasila sebagai Dasar Negara', isi: 'Pancasila merupakan dasar filosofis negara Indonesia yang terdiri dari 5 sila. Tercantum dalam Pembukaan UUD 1945 alinea ke-4. Fungsi: dasar negara, ideologi nasional, pandangan hidup bangsa, dan sumber hukum.' },
      { judul: 'UUD 1945 dan Amandemen', isi: 'UUD 1945 adalah konstitusi tertinggi Indonesia. Telah diamandemen 4 kali (1999-2002). MPR berwenang mengubah UUD. Pasal 31 mengatur hak pendidikan, Pasal 27 ayat 3 mengatur bela negara, Pasal 30 mengatur pertahanan negara.' },
      { judul: 'Hak dan Kewajiban Warga Negara', isi: 'Hak WNI: pendidikan, pekerjaan, perlindungan hukum, bela negara. Kewajiban WNI: mematuhi hukum, membayar pajak, bela negara, menghormati HAM orang lain. Asas personalitas aktif: WNI di luar negeri tetap tunduk hukum Indonesia.' },
      { judul: 'Sistem Pemerintahan', isi: 'Indonesia menganut sistem presidensial. Presiden adalah kepala negara sekaligus kepala pemerintahan. Lembaga negara: MPR, DPR, DPD, Presiden, MA, MK, KY. Pemilu berdasarkan asas LUBER JURDIL (Langsung, Umum, Bebas, Rahasia, Jujur, Adil).' },
      { judul: 'Bhinneka Tunggal Ika', isi: 'Berasal dari kitab Sutasoma karangan Mpu Tantular (Majapahit), bahasa Kawi. Artinya "Berbeda-beda tetapi tetap satu jua". Menjadi semboyan persatuan Indonesia yang terdiri dari ratusan suku, bahasa, agama, dan budaya.' },
    ]
  },
  mpi: {
    deskripsi: 'Mempelajari teori dan praktik pengelolaan portofolio investasi, analisis risiko, dan berbagai instrumen keuangan di pasar modal.',
    topik: [
      { judul: 'Teori Portofolio Modern (Markowitz)', isi: 'Dikembangkan Harry Markowitz (1952). Inti: diversifikasi dapat mengurangi risiko tanpa mengorbankan return. Efficient Frontier: kumpulan portofolio optimal. Investor memilih portofolio berdasarkan risk-return trade-off sesuai preferensi masing-masing.' },
      { judul: 'Capital Asset Pricing Model (CAPM)', isi: 'CAPM: E(Ri) = Rf + βi × [E(Rm) - Rf]. Rf = risk-free rate, β = beta (sensitivitas thd pasar), E(Rm) = expected return pasar. Beta > 1: lebih volatil dari pasar. Beta < 1: lebih stabil. Dikembangkan William Sharpe.' },
      { judul: 'Risiko Investasi', isi: 'Risiko sistematis (market risk): tidak bisa dihilangkan dengan diversifikasi, contoh: inflasi, krisis ekonomi. Risiko tidak sistematis (unsystematic): bisa dihilangkan dengan diversifikasi, contoh: risiko perusahaan. Total risiko = sistematis + tidak sistematis.' },
      { judul: 'Efficient Market Hypothesis (EMH)', isi: 'Dikembangkan Eugene Fama. Bentuk lemah: harga mencerminkan info historis. Bentuk semi-kuat: harga mencerminkan semua info publik. Bentuk kuat: harga mencerminkan semua info (termasuk insider). Implikasi: sulit mengalahkan pasar secara konsisten.' },
      { judul: 'Instrumen Investasi', isi: 'Saham: kepemilikan perusahaan, return berupa dividen dan capital gain. Obligasi: surat utang, return berupa kupon (bunga). Zero-coupon bond: obligasi tanpa kupon, dijual di bawah nilai nominal. Reksa dana: kumpulan dana dikelola manajer investasi. Sharpe Ratio = (Return - Rf) / Standar Deviasi.' },
    ]
  },
  pk: {
    deskripsi: 'Mempelajari faktor-faktor yang mempengaruhi keputusan pembelian konsumen, termasuk aspek psikologis, sosial, dan budaya.',
    topik: [
      { judul: 'Hierarki Kebutuhan Maslow', isi: 'Abraham Maslow (1943) menyusun kebutuhan manusia dari dasar ke puncak: (1) Fisiologis: makan, minum, tidur. (2) Keamanan: perlindungan, stabilitas. (3) Sosial: cinta, rasa memiliki. (4) Penghargaan: status, prestasi. (5) Aktualisasi diri: potensi penuh. Kebutuhan bawah harus terpenuhi dulu.' },
      { judul: 'Proses Pengambilan Keputusan', isi: '5 tahap: (1) Pengenalan masalah → (2) Pencarian informasi → (3) Evaluasi alternatif → (4) Keputusan pembelian → (5) Perilaku pasca pembelian. Disonansi kognitif terjadi SETELAH pembelian: rasa ragu apakah keputusan sudah benar.' },
      { judul: 'Faktor yang Mempengaruhi Konsumen', isi: 'Budaya: nilai, norma masyarakat. Sosial: kelompok referensi primer (keluarga, teman dekat) paling berpengaruh. Psikologis: motivasi, persepsi, pembelajaran, sikap. Pribadi: usia, pekerjaan, gaya hidup. Persepsi dipengaruhi selective exposure, distortion, dan retention.' },
      { judul: 'Segmentasi Pasar', isi: 'Demografis: usia, jenis kelamin, pendapatan. Geografis: wilayah, kota/desa. Psikografis: gaya hidup, kepribadian, nilai. Behavioral: frekuensi pembelian, loyalitas. Brand loyalty merupakan hasil pembelajaran operant (penguatan positif dari penggunaan produk berulang).' },
      { judul: 'Jenis Perilaku Pembelian', isi: 'Complex buying: keterlibatan tinggi, beda merek signifikan (misal: mobil). Variety seeking: keterlibatan rendah, sering ganti merek. Habitual buying: keterlibatan rendah, tidak beda merek (misal: garam). Impulse buying: pembelian tanpa rencana sebelumnya. High involvement biasanya untuk produk mahal.' },
    ]
  },
  kep: {
    deskripsi: 'Mempelajari berbagai teori, gaya, dan pendekatan kepemimpinan yang efektif dalam konteks organisasi dan bisnis.',
    topik: [
      { judul: 'Gaya-Gaya Kepemimpinan', isi: 'Otoriter: pemimpin pengambil keputusan tunggal. Demokratis: libatkan bawahan dalam keputusan. Laissez-faire: beri kebebasan penuh kepada bawahan, minimal intervensi. Transformasional: ubah nilai dan motivasi pengikut. Transaksional: reward-punishment berbasis kinerja.' },
      { judul: 'Teori Situasional (Hersey & Blanchard)', isi: 'Gaya kepemimpinan disesuaikan kematangan bawahan. Kematangan rendah (M1) → Telling/Directing: perintah langsung. Kematangan sedang (M2) → Selling/Coaching: jual ide. Kematangan cukup (M3) → Participating: ikutsertakan. Kematangan tinggi (M4) → Delegating: serahkan tugas.' },
      { judul: 'Kepemimpinan Transformasional vs Transaksional', isi: 'Transformasional (Burns/Bass): inspirasi visi, ubah nilai pengikut, karisma, stimulasi intelektual. Pemimpin transaksional: fokus pada pertukaran (reward untuk kinerja), lebih pada status quo. Transformasional umumnya menghasilkan kinerja lebih tinggi jangka panjang.' },
      { judul: 'Teori X dan Teori Y (McGregor)', isi: 'Teori X: bawahan malas, tidak suka tanggung jawab, perlu dikontrol ketat. Teori Y: bawahan kreatif, bisa mandiri, suka tanggung jawab jika kondisi mendukung. Asumsi pemimpin mempengaruhi gaya memimpin. Teori Y cenderung hasilkan lingkungan kerja lebih positif.' },
      { judul: 'Sumber Kekuasaan & Emotional Intelligence', isi: 'French & Raven: Legitimate (posisi formal), Reward (imbalan), Coercive (hukuman), Expert (keahlian), Referent (kekaguman). EQ (Daniel Goleman): self-awareness, self-regulation, motivation, empathy, social skills. Servant leadership: utamakan pelayanan kepada pengikut dan komunitas.' },
    ]
  },
  pp: {
    deskripsi: 'Mempelajari konsep, standar, dan teknik memberikan pelayanan terbaik kepada pelanggan untuk mencapai kepuasan dan loyalitas.',
    topik: [
      { judul: 'Konsep Pelayanan Prima (A3)', isi: 'Pelayanan prima = memenuhi dan melampaui harapan pelanggan. Standar A3: Attitude (sikap positif, ramah, sopan), Attention (perhatian penuh kepada pelanggan, mendengarkan aktif), Action (tindakan nyata untuk memenuhi kebutuhan pelanggan). Tujuan: kepuasan pelanggan, loyalitas, dan keunggulan bisnis.' },
      { judul: 'SERVQUAL (Parasuraman)', isi: '5 dimensi kualitas layanan: (1) Tangible: fasilitas fisik yang terlihat. (2) Reliability: kemampuan layanan tepat waktu dan akurat. (3) Responsiveness: kecepatan dan kesediaan membantu. (4) Assurance: pengetahuan dan kesopanan karyawan. (5) Empathy: perhatian individual kepada pelanggan.' },
      { judul: 'Mengukur Kepuasan Pelanggan', isi: 'CSI (Customer Satisfaction Index): indeks kepuasan berdasarkan survei. NPS (Net Promoter Score): ukur kecenderungan rekomendasikan produk/jasa (skala 0-10). Promoter (9-10), Passive (7-8), Detractor (0-6). NPS = % Promoter - % Detractor. CLV (Customer Lifetime Value): total nilai pelanggan sepanjang waktu.' },
      { judul: 'Penanganan Keluhan (LAST)', isi: 'LAST: Listen (dengarkan keluhan dengan penuh perhatian), Apologize (minta maaf dengan tulus), Solve (selesaikan masalah dengan tepat), Thank (ucapkan terima kasih atas masukan). Service recovery: upaya aktif memperbaiki layanan yang gagal untuk mempertahankan kepuasan pelanggan.' },
      { judul: 'Prinsip-Prinsip Pelayanan Unggul', isi: 'Underpromise & overdeliver: janjikan lebih sedikit, berikan lebih banyak. Customer-centric: pelanggan sebagai pusat semua keputusan. Konsistensi: standar layanan yang sama di setiap interaksi. Proaktif: antisipasi kebutuhan pelanggan sebelum diminta. Empati: pahami perasaan dan situasi pelanggan.' },
    ]
  },
  ebc: {
    deskripsi: 'Mempelajari teknik penulisan surat bisnis, email profesional, memo, dan berbagai bentuk korespondensi bisnis dalam bahasa Inggris.',
    topik: [
      { judul: 'Structure of Business Letters', isi: 'Parts of a business letter: (1) Letterhead/Date, (2) Inside address, (3) Salutation, (4) Body (opening, middle, closing paragraph), (5) Complimentary close, (6) Signature. "Yours faithfully" = when you don\'t know the name. "Yours sincerely" = when you know the name.' },
      { judul: 'Salutations and Closings', isi: 'Formal salutations: "Dear Mr./Ms. [Surname]" (known name), "Dear Sir/Madam" or "To Whom It May Concern" (unknown name). Formal closings: "Yours faithfully", "Yours sincerely", "Best regards". Avoid informal: "Hi", "Hey", "Cheers" in business letters. Always match salutation with appropriate closing.' },
      { judul: 'Email Etiquette', isi: 'Subject line: brief and informative (e.g., "Meeting Request – March 15"). CC (Carbon Copy): copy to relevant parties. BCC (Blind Carbon Copy): copy without others knowing. Opening: "I am writing to...", "With reference to your email...". Closing: "Please feel free to contact me", "I look forward to your reply".' },
      { judul: 'Memorandum (Memo)', isi: 'Memo is for internal communication within an organization. Format: TO:, FROM:, DATE:, SUBJECT: (header). No salutation or complimentary close needed. Tone: formal but concise. Purpose: announcements, reminders, policy updates, meeting summaries. Different from letters which are for external communication.' },
      { judul: 'Polite Language & Requests', isi: 'Polite requests: "I would appreciate it if you could...", "Could you please...", "Would it be possible to...". Avoid direct commands: "Send immediately", "Give me". Enclosure notation: "Enc:" or "Enclosure:" indicates additional documents. Postscript (P.S.): additional note after signature (use sparingly in business).' },
    ]
  },
  sb: {
    deskripsi: 'Mempelajari simulasi pengambilan keputusan bisnis dalam berbagai skenario, termasuk strategi kompetitif, analisis keuangan, dan pengelolaan sumber daya.',
    topik: [
      { judul: 'Analisis SWOT', isi: 'Strengths (Kekuatan): keunggulan internal perusahaan. Weaknesses (Kelemahan): kekurangan internal. Opportunities (Peluang): faktor eksternal yang menguntungkan. Threats (Ancaman): faktor eksternal yang merugikan. Gunakan SWOT untuk merumuskan strategi: SO, WO, ST, WT.' },
      { judul: 'Strategi Bersaing (Porter)', isi: 'Cost Leadership: menjadi produsen berbiaya terendah. Differentiation: produk/jasa unik yang bernilai bagi pelanggan. Focus: melayani segmen pasar tertentu. Market penetration: tingkatkan penjualan produk ada di pasar ada. Market development: pasar baru, produk lama. Product development: produk baru, pasar lama. Diversification: produk baru, pasar baru.' },
      { judul: 'Analisis Break-Even Point', isi: 'BEP = Total Biaya Tetap / (Harga Jual - Biaya Variabel per Unit). Di titik BEP: Total Pendapatan = Total Biaya (laba = 0). Di atas BEP: perusahaan untung. Di bawah BEP: perusahaan rugi. BEP penting untuk menentukan target penjualan minimum dan harga jual.' },
      { judul: 'Key Performance Indicators (KPI)', isi: 'KPI: ukuran kuantitatif pencapaian target bisnis. ROI = (Net Profit / Total Investment) × 100%. Market Share = (Penjualan Perusahaan / Total Penjualan Industri) × 100%. Cash flow positif: arus kas masuk > arus kas keluar. Balanced Scorecard: keuangan, pelanggan, proses internal, learning & growth.' },
      { judul: 'Pengambilan Keputusan Bisnis', isi: 'Pricing strategy mempertimbangkan: biaya produksi, harga pesaing, dan nilai bagi pelanggan (value-based pricing). Cash flow ≠ profit: perusahaan bisa profit tapi cash flow negatif. Analisis sensitivitas: uji dampak perubahan variabel kunci. Simulasi Monte Carlo: perkiraan berbagai skenario probabilitas.' },
    ]
  },
  akb: {
    deskripsi: 'Mempelajari penerapan aplikasi komputer dalam kegiatan bisnis, meliputi Microsoft Office, database, dan teknologi informasi pendukung bisnis.',
    topik: [
      { judul: 'Microsoft Excel — Fungsi Dasar', isi: 'SUM: menjumlahkan. AVERAGE: rata-rata. COUNT: menghitung sel berisi angka. MAX/MIN: nilai terbesar/terkecil. IF: logika kondisional. VLOOKUP: cari nilai berdasarkan kolom referensi. HLOOKUP: cari nilai berdasarkan baris referensi. Shortcut penting: Ctrl+Z (undo), Ctrl+S (save), Ctrl+C/V (copy/paste), F2 (edit sel).' },
      { judul: 'Microsoft Excel — Fitur Lanjutan', isi: 'Pivot Table: meringkas dan menganalisis data besar, drag-drop field. Conditional Formatting: format otomatis berdasarkan kondisi (warna sel jika nilai > 70). Data Validation: batasi input data. Filter & Sort: tampilkan/urutkan data. Chart/Grafik: visualisasi data. Format file Excel: .xlsx (Excel 2007+), .xls (Excel lama), .csv (comma-separated).' },
      { judul: 'Microsoft Word — Fitur Bisnis', isi: 'Mail Merge: buat surat massal dengan data berbeda otomatis dari database (Excel/Access). Track Changes: lacak perubahan dokumen. Table of Contents: daftar isi otomatis. Header/Footer: informasi di atas/bawah setiap halaman. Watermark: tanda air dokumen. Macro: otomatisasi tugas berulang.' },
      { judul: 'Database & Microsoft Access', isi: 'Database: kumpulan data terstruktur. DBMS (Database Management System): software pengelola database. Microsoft Access: DBMS desktop untuk bisnis skala kecil-menengah. Tabel, Query, Form, Report adalah objek utama Access. SQL: bahasa standar untuk query database. Relasi antar tabel menggunakan primary key dan foreign key.' },
      { judul: 'Cloud Computing & Teknologi Bisnis', isi: 'Cloud computing: akses data/aplikasi via internet, tidak perlu infrastruktur sendiri. Manfaat: akses kapan/di mana saja, hemat biaya IT, skalabilitas. ERP (Enterprise Resource Planning): sistem terintegrasi kelola seluruh proses bisnis. Contoh: SAP, Oracle. CRM: kelola hubungan pelanggan. Google Workspace, Microsoft 365 = cloud office.' },
    ]
  },
  kb: {
    deskripsi: 'Mempelajari formulasi dan implementasi kebijakan bisnis perusahaan, analisis lingkungan, serta berbagai kerangka strategis dalam pengambilan keputusan.',
    topik: [
      { judul: "Porter's Five Forces", isi: '5 kekuatan kompetitif: (1) Persaingan antar pesaing yang ada. (2) Ancaman pendatang baru (barrier to entry). (3) Ancaman produk/jasa substitusi. (4) Daya tawar pemasok. (5) Daya tawar pembeli. Semakin kuat kelima kekuatan, semakin rendah profitabilitas industri. Gunakan untuk analisis daya tarik industri.' },
      { judul: 'BCG Matrix', isi: 'Stars: pangsa pasar tinggi, pertumbuhan tinggi — investasi. Cash Cows: pangsa pasar tinggi, pertumbuhan rendah — pertahankan, hasilkan kas. Question Marks: pangsa pasar rendah, pertumbuhan tinggi — putuskan invest atau divestasi. Dogs: pangsa pasar rendah, pertumbuhan rendah — pertimbangkan divestasi.' },
      { judul: 'Strategi Korporat', isi: 'Merger: dua perusahaan bergabung jadi satu entitas baru. Akuisisi: satu perusahaan membeli perusahaan lain. Diversifikasi terkait: masuk bisnis yang berhubungan dengan bisnis utama. Diversifikasi konglomerat: masuk bisnis yang tidak berhubungan sama sekali. Blue Ocean Strategy (Kim & Mauborgne): ciptakan ruang pasar baru tanpa pesaing.' },
      { judul: 'Good Corporate Governance (GCG)', isi: '5 prinsip GCG: Transparency (keterbukaan informasi), Accountability (kejelasan fungsi dan tanggung jawab), Responsibility (kepatuhan terhadap peraturan), Independency (pengelolaan profesional tanpa konflik kepentingan), Fairness (keadilan bagi seluruh stakeholder). Stakeholder: semua pihak yang dipengaruhi oleh/mempengaruhi perusahaan.' },
      { judul: 'Balanced Scorecard & VRIO', isi: 'Balanced Scorecard (Kaplan & Norton): 4 perspektif: Keuangan, Pelanggan, Proses Internal, Pembelajaran & Pertumbuhan. VRIO Framework (Barney): sumber daya memberikan keunggulan kompetitif berkelanjutan jika Valuable (bernilai), Rare (langka), Inimitable (sulit ditiru), Organized (terorganisasi). CSR: tanggung jawab perusahaan ke masyarakat dan lingkungan.' },
    ]
  },
  sim: {
    deskripsi: 'Mempelajari konsep, jenis, dan penerapan sistem informasi dalam mendukung operasional dan pengambilan keputusan manajemen.',
    topik: [
      { judul: 'Konsep Dasar SIM', isi: 'SIM (Sistem Informasi Manajemen): sistem yang menyediakan informasi untuk mendukung pengambilan keputusan manajerial. Komponen: hardware, software, data, prosedur, orang. Hirarki sistem: TPS (Transaction Processing System) → MIS → DSS → EIS/ESS. Data → diproses → Informasi → digunakan → Pengambilan Keputusan.' },
      { judul: 'ERP (Enterprise Resource Planning)', isi: 'ERP: sistem informasi terintegrasi yang mengelola seluruh proses bisnis (keuangan, SDM, produksi, distribusi, penjualan) dalam satu platform. Contoh: SAP, Oracle, Microsoft Dynamics. Keunggulan: data real-time, eliminasi duplikasi data, efisiensi proses. Tantangan: implementasi mahal dan kompleks.' },
      { judul: 'DSS dan EIS', isi: 'DSS (Decision Support System): membantu manajer menengah/atas dalam keputusan semi-terstruktur. Menggunakan model analitik dan database. EIS/ESS (Executive Information System): menyajikan informasi ringkasan untuk eksekutif senior dalam format visual/dashboard. Akses mudah ke KPI, tren pasar, dan kinerja perusahaan.' },
      { judul: 'CRM dan Data Warehouse', isi: 'CRM (Customer Relationship Management): kelola interaksi dan hubungan dengan pelanggan. Contoh: Salesforce, HubSpot. Data Warehouse: database besar dioptimalkan untuk analisis historis, bukan transaksi harian. OLAP vs OLTP: OLAP untuk analisis multi-dimensi, OLTP untuk transaksi real-time. Data Mart: subset data warehouse untuk departemen tertentu.' },
      { judul: 'Big Data & Business Intelligence', isi: 'Big Data — 3V: Volume (data sangat besar), Velocity (kecepatan tinggi), Variety (berbagai format). BI (Business Intelligence): mengubah data mentah jadi wawasan bisnis. Tools: Tableau, Power BI, Google Data Studio. Keamanan informasi — CIA: Confidentiality (kerahasiaan), Integrity (keutuhan data), Availability (ketersediaan). Interoperabilitas: kemampuan sistem berbeda saling berkomunikasi.' },
    ]
  }
};

function renderMateriPage() {
  updateTopbar('Materi Pembelajaran', 'Rangkuman materi lengkap per mata kuliah');
  const grid = document.getElementById('materi-grid');
  if (!grid) return;

  grid.innerHTML = Object.entries(SHEETS_CONFIG).map(([id, sub]) => {
    const m = MATERI_DATA[id];
    if (!m) return '';
    const topikHTML = m.topik.map((t, i) => `
      <div class="materi-topik" onclick="toggleTopik(this)" style="border:1px solid var(--border-subtle);border-radius:10px;margin-bottom:8px;overflow:hidden;cursor:pointer;">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:var(--bg-glass);">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:22px;height:22px;min-width:22px;border-radius:6px;background:${sub.color}20;color:${sub.color};font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;">${i+1}</div>
            <span style="font-size:13px;font-weight:600;color:var(--text-primary);">${t.judul}</span>
          </div>
          <span class="topik-arrow" style="color:var(--text-muted);font-size:12px;transition:transform 0.3s;">▼</span>
        </div>
        <div class="topik-isi" style="display:none;padding:14px 16px;font-size:13px;color:var(--text-secondary);line-height:1.7;border-top:1px solid var(--border-subtle);background:var(--bg-primary);">${t.isi}</div>
      </div>`).join('');

    return `<div class="materi-card fade-in">
      <div class="materi-card-header" style="background:${sub.color}10;border-bottom:1px solid var(--border-subtle);">
        <div style="font-size:32px;">${sub.icon}</div>
        <div>
          <div class="materi-card-title" style="color:var(--text-primary);">${sub.title}</div>
          <div style="font-size:12px;color:var(--text-secondary);margin-top:4px;">${m.deskripsi}</div>
        </div>
      </div>
      <div class="materi-card-body">
        <div style="font-size:11px;color:var(--text-muted);font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:12px;">📖 ${m.topik.length} Topik Utama — Klik untuk buka</div>
        ${topikHTML}
        <button class="btn btn-primary btn-sm mt-16" style="width:100%;justify-content:center;" onclick="startQuiz('${id}')">🎯 Latihan Kuis</button>
      </div>
    </div>`;
  }).join('');
}

function toggleTopik(el) {
  const isi = el.querySelector('.topik-isi');
  const arrow = el.querySelector('.topik-arrow');
  const isOpen = isi.style.display !== 'none';
  isi.style.display = isOpen ? 'none' : 'block';
  arrow.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
}

// ==================== UTILS ====================
function showPage(p) {
  document.querySelectorAll('.page').forEach(pg => pg.classList.remove('active'));
  const el = document.getElementById(`page-${p}`);
  if (el) el.classList.add('active');
}

function updateTopbar(title, sub) {
  const t = document.getElementById('topbar-title');
  const s = document.getElementById('topbar-sub');
  if (t) t.textContent = title;
  if (s) s.textContent = sub;
}

function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  const colors = { success:'#10B981', error:'#EF4444', info:'#6366F1', warning:'#F59E0B' };
  toast.innerHTML = `<span>${msg}</span>`;
  toast.style.borderLeft = `3px solid ${colors[type] || colors.info}`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity='0'; toast.style.transition='opacity 0.3s'; setTimeout(()=>toast.remove(),300); }, 2500);
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

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('open');
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  navigate('dashboard');
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', () => navigate(item.dataset.page));
  });
  document.getElementById('sidebar-overlay').addEventListener('click', toggleSidebar);

  // Isi nama dari identity tersimpan
  const saved = JSON.parse(localStorage.getItem('user_identity') || '{}');
  if (saved.nama) {
    document.querySelectorAll('.user-display-name').forEach(el => el.textContent = saved.nama);
    document.querySelectorAll('.user-initial').forEach(el => el.textContent = saved.nama.charAt(0).toUpperCase());
  }

  // Close modal kalau klik di luar
  document.getElementById('modal-identitas').addEventListener('click', function(e) {
    if (e.target === this) tutupModalIdentitas();
  });

  // Enter key di form identitas
  ['id-nama','id-nim','id-kelas'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') submitIdentitas(); });
  });
});
