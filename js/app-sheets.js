// ================================================
//  APP-SHEETS.JS
//  Versi app.js yang membaca dari Google Sheets
//  (Menggantikan hardcoded QUIZ_DATA)
// ================================================

const STATE = {
  currentPage: 'dashboard',
  currentSubject: null,
  currentQuestion: 0,
  answers: [],
  timer: null,
  timeLeft: 600,
  history: JSON.parse(localStorage.getItem('quiz_history') || '[]'),
  userData: JSON.parse(localStorage.getItem('user_data') || JSON.stringify({
    name: 'Mahasiswa', nim: '2024001', prodi: 'D4 Administrasi Bisnis'
  })),
  // Data soal yang sudah diload dari Sheets
  loadedQuestions: {}
};

// ---- ROUTER ----
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
  if (page === 'profil') renderProfilPage();
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
  renderRecentActivity();
  renderSubjectProgress();

  // Tampilkan status konfigurasi
  const configured = countConfigured();
  const total = Object.keys(SHEETS_CONFIG).length;
  const statusEl = document.getElementById('sheets-status');
  if (statusEl) {
    if (configured === total) {
      statusEl.innerHTML = `<span style="color:var(--accent-emerald)">✅ ${configured}/${total} mata kuliah terhubung ke Google Sheets</span>`;
    } else if (configured > 0) {
      statusEl.innerHTML = `<span style="color:var(--accent-amber)">⚠️ ${configured}/${total} mata kuliah terhubung. Isi URL di config.js untuk sisanya.</span>`;
    } else {
      statusEl.innerHTML = `<span style="color:#EF4444">❌ Belum ada URL Google Sheets. Buka file <code>data/config.js</code> dan isi URL-nya.</span>`;
    }
  }
}

function renderRecentActivity() {
  const container = document.getElementById('recent-activity');
  if (!container) return;
  const recent = [...STATE.history].reverse().slice(0, 5);
  if (recent.length === 0) {
    container.innerHTML = `<div class="empty-state" style="padding:40px;"><div class="empty-state-icon">📝</div><div class="empty-state-title">Belum ada aktivitas</div><div class="empty-state-text">Mulai kerjakan kuis untuk melihat aktivitas di sini</div></div>`;
    return;
  }
  container.innerHTML = recent.map(r => {
    const sub = SHEETS_CONFIG[r.subjectId];
    const grade = getGrade(r.score);
    return `<div class="lb-row fade-in">
      <div class="lb-rank">${sub ? sub.icon : '📝'}</div>
      <div class="lb-user"><div><div class="lb-name">${sub ? sub.title : r.subjectId}</div><div class="lb-sub">${new Date(r.date).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})}</div></div></div>
      <div>${r.correct}/${r.total} benar</div>
      <div><span class="score-pill" style="background:${grade.bg};color:${grade.color}">${r.score}%</span></div>
      <div style="color:var(--text-muted);font-size:12px">${r.time}</div>
    </div>`;
  }).join('');
}

function renderSubjectProgress() {
  const container = document.getElementById('subject-progress');
  if (!container) return;
  container.innerHTML = Object.entries(SHEETS_CONFIG).map(([id, sub]) => {
    const attempts = STATE.history.filter(h => h.subjectId === id);
    const best = attempts.length > 0 ? Math.max(...attempts.map(h => h.score)) : 0;
    return `<div class="flex items-center gap-12 mb-8" style="padding:10px 0;border-bottom:1px solid var(--border-subtle);">
      <span style="font-size:20px;width:28px;text-align:center;">${sub.icon}</span>
      <div style="flex:1;min-width:0;">
        <div style="font-size:13px;font-weight:600;margin-bottom:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${sub.title}</div>
        <div style="height:5px;background:var(--border-subtle);border-radius:3px;overflow:hidden;">
          <div style="height:100%;width:${best}%;background:${sub.color};border-radius:3px;transition:width 1.2s ease;"></div>
        </div>
      </div>
      <div style="font-size:13px;font-weight:700;color:${sub.color};min-width:40px;text-align:right;">${best > 0 ? best+'%' : '-'}</div>
    </div>`;
  }).join('');
}

// ---- KUIS PAGE ----
function renderKuisPage() {
  updateTopbar('Pilih Kuis', 'Pilih mata kuliah untuk memulai kuis');
  const grid = document.getElementById('subjects-grid');
  if (!grid) return;
  grid.innerHTML = Object.entries(SHEETS_CONFIG).map(([id, sub]) => {
    const attempts = STATE.history.filter(h => h.subjectId === id);
    const best = attempts.length > 0 ? Math.max(...attempts.map(h => h.score)) : 0;
    const hasUrl = !!(sub.url);
    return `
      <div class="subject-card" onclick="startQuiz('${id}')" style="--color-accent:${sub.color}; opacity:${hasUrl ? 1 : 0.6};">
        <div class="subject-icon-wrap" style="background:${sub.color}20;border:1px solid ${sub.color}30;">
          <span>${sub.icon}</span>
          <div style="position:absolute;top:-2px;right:-2px;width:10px;height:10px;border-radius:50%;background:${hasUrl ? sub.color : '#475569'};box-shadow:${hasUrl ? '0 0 6px '+sub.color : 'none'};"></div>
        </div>
        <div class="subject-score-bar">
          <div class="subject-score-fill" style="width:${best}%;background:${sub.color};"></div>
        </div>
        <div class="subject-title">${sub.title}</div>
        <div class="subject-desc">${hasUrl ? '✅ Terhubung ke Google Sheets' : '⚠️ URL belum dikonfigurasi di config.js'}</div>
        <div class="subject-meta">
          <div class="subject-meta-info"><span>❓</span><span>10 Soal · ${attempts.length} Percobaan</span></div>
          <div class="subject-arrow" style="background:${sub.color}20;color:${sub.color};">→</div>
        </div>
      </div>`;
  }).join('');
}

// ---- START QUIZ ----
async function startQuiz(subjectId) {
  const sub = SHEETS_CONFIG[subjectId];
  if (!sub) return;

  if (!sub.url) {
    showToast('⚠️ URL Google Sheets belum diisi di config.js', 'warning');
    showSetupModal(subjectId);
    return;
  }

  // Tampilkan loading
  showPage('quiz');
  showQuizLoading(sub);

  try {
    // Fetch soal dari Google Sheets
    let questions = STATE.loadedQuestions[subjectId];
    if (!questions) {
      questions = await fetchSubjectQuestions(subjectId);
      if (questions && questions.length > 0) {
        STATE.loadedQuestions[subjectId] = questions;
      }
    }

    if (!questions || questions.length === 0) {
      showToast('❌ Gagal memuat soal. Cek URL di config.js.', 'error');
      navigate('kuis');
      return;
    }

    // Setup state
    STATE.currentSubject = { id: subjectId, ...sub, questions };
    STATE.currentQuestion = 0;
    STATE.answers = new Array(questions.length).fill(null);
    STATE.timeLeft = 600;

    hideQuizLoading();
    renderQuestion();
    startTimer();

  } catch (err) {
    console.error(err);
    showToast('❌ Terjadi kesalahan. Coba lagi.', 'error');
    navigate('kuis');
  }
}

function showQuizLoading(sub) {
  const container = document.getElementById('quiz-container-inner');
  if (container) {
    container.innerHTML = `
      <div style="text-align:center;padding:80px 32px;">
        <div style="font-size:48px;margin-bottom:24px;animation:pulse 1.5s infinite;">${sub.icon}</div>
        <div style="font-size:18px;font-weight:700;margin-bottom:12px;">Memuat soal ${sub.title}...</div>
        <div style="font-size:13px;color:var(--text-muted);">Mengambil data dari Google Sheets</div>
        <div style="margin-top:24px;height:4px;width:200px;background:var(--border-subtle);border-radius:2px;overflow:hidden;margin-inline:auto;">
          <div style="height:100%;background:var(--gradient-brand);border-radius:2px;animation:loadBar 2s ease infinite;"></div>
        </div>
      </div>
      <style>@keyframes loadBar{0%{width:0%}100%{width:100%}}</style>`;
  }
}

function hideQuizLoading() {
  // Rebuild quiz UI
  const container = document.getElementById('quiz-container-inner');
  if (container) {
    container.innerHTML = `
      <div class="quiz-header">
        <div class="quiz-progress-wrap">
          <div><div class="section-eyebrow" id="question-subject">Kuis</div></div>
          <div class="quiz-timer">⏱️ <span id="quiz-timer-text">10:00</span></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-muted);margin-bottom:8px;">
          <span id="quiz-progress-text">1 / 10</span><span>Progress</span>
        </div>
        <div class="quiz-progress-bar">
          <div class="quiz-progress-fill" id="quiz-progress-fill" style="width:0%"></div>
        </div>
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
}

function showSetupModal(subjectId) {
  const sub = SHEETS_CONFIG[subjectId];
  const modal = document.createElement('div');
  modal.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:1000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);`;
  modal.innerHTML = `
    <div style="background:#0F172A;border:1px solid rgba(99,102,241,0.3);border-radius:20px;padding:36px;max-width:520px;width:90%;">
      <div style="font-size:32px;margin-bottom:16px;text-align:center;">${sub.icon}</div>
      <h3 style="font-size:18px;font-weight:800;margin-bottom:8px;text-align:center;">URL Belum Dikonfigurasi</h3>
      <p style="color:var(--text-secondary);font-size:14px;text-align:center;margin-bottom:24px;line-height:1.7;">
        Kuis <strong>${sub.title}</strong> belum terhubung ke Google Sheets.<br>Isi URL di file <code style="background:rgba(99,102,241,0.15);padding:2px 6px;border-radius:4px;color:#a5b4fc;">data/config.js</code> untuk mata kuliah ini.
      </p>
      <div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:10px;padding:16px;margin-bottom:20px;font-size:12px;color:var(--text-secondary);line-height:1.8;">
        <strong style="color:#F59E0B;">Cara mendapatkan URL:</strong><br>
        1. Buka Google Sheets kamu<br>
        2. File → Share → Publish to web<br>
        3. Pilih sheet: <em>${sub.title.substring(0,40)}</em><br>
        4. Format: <strong>Comma-separated values (.csv)</strong><br>
        5. Klik Publish → Salin URL<br>
        6. Tempel di <code>config.js</code> bagian <code>${subjectId}: { url: "..." }</code>
      </div>
      <button onclick="this.closest('div[style]').remove()" class="btn btn-primary" style="width:100%;justify-content:center;">Mengerti</button>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

// ---- RENDER QUESTION ----
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
  const letters = ['A', 'B', 'C', 'D'];
  document.getElementById('options-container').innerHTML = q.options.map((opt, i) => `
    <button class="option-btn ${STATE.answers[qIdx] === i ? 'selected' : ''}"
      onclick="selectOption(${i})" ${STATE.answers[qIdx] !== null ? 'disabled' : ''}>
      <span class="option-letter">${letters[i]}</span>
      <span>${opt}</span>
    </button>`).join('');
  document.getElementById('btn-prev').style.display = qIdx === 0 ? 'none' : 'flex';
  document.getElementById('btn-next').textContent = qIdx === total - 1 ? '🏁 Selesai' : 'Selanjutnya →';
  document.getElementById('btn-next').disabled = STATE.answers[qIdx] === null;
}

function selectOption(optIdx) {
  const qIdx = STATE.currentQuestion;
  const q = STATE.currentSubject.questions[qIdx];
  STATE.answers[qIdx] = optIdx;
  const btns = document.querySelectorAll('.option-btn');
  btns.forEach((btn, i) => {
    btn.disabled = true;
    if (i === q.answer) btn.classList.add('correct');
    else if (i === optIdx && optIdx !== q.answer) btn.classList.add('wrong');
  });
  document.getElementById('btn-next').disabled = false;
  showToast(optIdx === q.answer ? '✅ Jawaban benar!' : '❌ Jawaban kurang tepat', optIdx === q.answer ? 'success' : 'error');
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
  if (STATE.currentQuestion > 0) { STATE.currentQuestion--; renderQuestion(); }
}

function startTimer() {
  clearInterval(STATE.timer);
  const el = document.getElementById('quiz-timer-text');
  STATE.timer = setInterval(() => {
    STATE.timeLeft--;
    const m = Math.floor(STATE.timeLeft / 60);
    const s = STATE.timeLeft % 60;
    if (el) el.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    if (STATE.timeLeft <= 60 && el) el.style.color = '#EF4444';
    if (STATE.timeLeft <= 0) { clearInterval(STATE.timer); finishQuiz(); }
  }, 1000);
}

function finishQuiz() {
  clearInterval(STATE.timer);
  const sub = STATE.currentSubject;
  const correct = sub.questions.filter((q, i) => STATE.answers[i] === q.answer).length;
  const total = sub.questions.length;
  const score = Math.round((correct / total) * 100);
  const timeUsed = 600 - STATE.timeLeft;
  const timeStr = `${Math.floor(timeUsed / 60)}m ${timeUsed % 60}s`;
  STATE.history.push({ subjectId: sub.id, subjectTitle: sub.title, score, correct, total, time: timeStr, date: new Date().toISOString() });
  localStorage.setItem('quiz_history', JSON.stringify(STATE.history));
  showPage('result');
  renderResult(correct, total, score, timeStr);
}

function renderResult(correct, total, score, time) {
  const wrong = total - correct;
  const grade = getGrade(score);
  updateTopbar('Hasil Kuis', STATE.currentSubject.title);
  const radius = 60, cx = 80, cy = 80;
  const circ = 2 * Math.PI * radius;
  const dash = (score / 100) * circ;
  document.getElementById('result-ring-svg').innerHTML = `
    <circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="10"/>
    <circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${grade.color}" stroke-width="10"
      stroke-dasharray="${circ}" stroke-dashoffset="${circ - dash}" stroke-linecap="round"
      style="transition:stroke-dashoffset 1.5s ease;"/>`;
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
    container.innerHTML = `<div class="empty-state fade-in"><div class="empty-state-icon">📊</div><div class="empty-state-title">Belum ada nilai</div><div class="empty-state-text">Kerjakan kuis terlebih dahulu</div><button class="btn btn-primary mt-16" onclick="navigate('kuis')">Mulai Kuis</button></div>`;
    return;
  }
  const bySubject = {};
  Object.entries(SHEETS_CONFIG).forEach(([id, sub]) => {
    const attempts = STATE.history.filter(h => h.subjectId === id);
    if (attempts.length > 0) bySubject[id] = { sub: { id, ...sub }, attempts };
  });
  container.innerHTML = Object.values(bySubject).map(({ sub, attempts }) => {
    const best = Math.max(...attempts.map(a => a.score));
    const avg = Math.round(attempts.reduce((a, b) => a + b.score, 0) / attempts.length);
    const grade = getGrade(best);
    return `<div class="card mb-16 fade-in"><div class="card-body">
      <div class="flex items-center justify-between mb-16">
        <div class="flex items-center gap-12">
          <div style="font-size:28px">${sub.icon}</div>
          <div><div style="font-weight:700;font-size:15px;">${sub.title}</div><div style="font-size:12px;color:var(--text-muted)">${attempts.length} percobaan</div></div>
        </div>
        <span class="score-pill" style="background:${grade.bg};color:${grade.color};font-size:16px;padding:6px 16px;">${best}%</span>
      </div>
      <div style="margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-muted);margin-bottom:6px;"><span>Rata-rata: ${avg}%</span><span>Terbaik: ${best}%</span></div>
        <div style="height:6px;background:var(--border-subtle);border-radius:3px;overflow:hidden;">
          <div style="height:100%;width:${best}%;background:${sub.color};border-radius:3px;"></div>
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        ${[...attempts].reverse().map(a => {
          const g = getGrade(a.score);
          return `<div style="background:var(--bg-glass);border:1px solid var(--border-subtle);border-radius:8px;padding:8px 12px;font-size:12px;">
            <div style="font-weight:700;color:${g.color};">${a.score}%</div>
            <div style="color:var(--text-muted);font-size:10px;">${new Date(a.date).toLocaleDateString('id-ID',{day:'numeric',month:'short'})}</div>
          </div>`;
        }).join('')}
      </div>
    </div></div>`;
  }).join('');
}

// ---- LEADERBOARD ----
function renderLeaderboard() {
  updateTopbar('Leaderboard', 'Peringkat berdasarkan nilai terbaik');
  const container = document.getElementById('lb-content');
  if (!container) return;
  const entries = Object.entries(SHEETS_CONFIG).map(([id, sub]) => {
    const attempts = STATE.history.filter(h => h.subjectId === id);
    if (attempts.length === 0) return null;
    const best = attempts.reduce((a, b) => a.score > b.score ? a : b);
    return { sub: { id, ...sub }, score: best.score, time: best.time, date: best.date };
  }).filter(Boolean).sort((a, b) => b.score - a.score);
  if (entries.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🏆</div><div class="empty-state-title">Leaderboard Kosong</div><div class="empty-state-text">Kerjakan kuis untuk masuk ke leaderboard!</div></div>`;
    return;
  }
  const medals = ['🥇', '🥈', '🥉'];
  container.innerHTML = `<div class="leaderboard-table">
    <div class="lb-header"><div style="text-align:center">Rank</div><div>Mata Kuliah</div><div class="lb-col-subject">Nilai</div><div class="lb-col-subject">Waktu</div><div class="lb-col-subject">Tanggal</div></div>
    ${entries.map((e, i) => {
      const grade = getGrade(e.score);
      return `<div class="lb-row ${i < 3 ? 'top-'+(i+1) : ''} fade-in">
        <div class="lb-rank">${i < 3 ? medals[i] : '#'+(i+1)}</div>
        <div class="lb-user">
          <div class="lb-avatar" style="background:${e.sub.color}20;color:${e.sub.color};font-size:18px;">${e.sub.icon}</div>
          <div><div class="lb-name">${e.sub.title}</div><div class="lb-sub">${STATE.userData.name}</div></div>
        </div>
        <div class="lb-col-subject"><span class="score-pill" style="background:${grade.bg};color:${grade.color};">${e.score}%</span></div>
        <div class="lb-col-subject" style="color:var(--text-muted);font-size:13px;">${e.time}</div>
        <div class="lb-col-subject" style="color:var(--text-muted);font-size:12px;">${new Date(e.date).toLocaleDateString('id-ID')}</div>
      </div>`;
    }).join('')}
  </div>`;
}

// ---- MATERI ----
function renderMateriPage() {
  updateTopbar('Materi Pembelajaran', 'Ringkasan materi per mata kuliah');
  const grid = document.getElementById('materi-grid');
  if (!grid) return;
  const topics = {
    pkn: ['Pancasila & UUD 1945', 'Hak & Kewajiban WN', 'Sistem Pemerintahan', 'Bela Negara'],
    mpi: ['Teori Portofolio', 'CAPM & Beta', 'Analisis Efisien', 'Manajemen Risiko'],
    pk:  ['Motivasi Konsumen', 'Proses Keputusan', 'Persepsi & Sikap', 'Segmentasi'],
    kep: ['Gaya Kepemimpinan', 'Teori Situasional', 'Transformasional', 'Emotional Intelligence'],
    pp:  ['Konsep SERVQUAL', 'Kepuasan Pelanggan', 'Service Recovery', 'NPS & CSI'],
    ebc: ['Business Letters', 'Email Etiquette', 'Memo & Report', 'Presentation Skills'],
    sb:  ['Analisis SWOT', 'Strategi Bersaing', 'Break-even Analysis', 'Market Simulation'],
    akb: ['Microsoft Excel', 'Database Bisnis', 'Cloud Computing', 'ERP System'],
    kb:  ['Five Forces Porter', 'BCG Matrix', 'GCG Principles', 'Blue Ocean Strategy'],
    sim: ['ERP & CRM', 'Data Warehouse', 'Big Data & BI', 'Keamanan Informasi'],
  };
  grid.innerHTML = Object.entries(SHEETS_CONFIG).map(([id, sub]) => {
    const t = topics[id] || [];
    return `<div class="materi-card fade-in">
      <div class="materi-card-header" style="background:${sub.color}08;">
        <div style="font-size:28px">${sub.icon}</div>
        <div><div class="materi-card-title">${sub.title}</div></div>
      </div>
      <div class="materi-card-body">
        <div style="font-size:12px;color:var(--text-muted);font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:12px;">Topik Utama</div>
        ${t.map((tp, i) => `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border-subtle);">
          <div style="width:22px;height:22px;min-width:22px;border-radius:6px;background:${sub.color}15;color:${sub.color};font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;">${i+1}</div>
          <span style="font-size:13px;">${tp}</span>
        </div>`).join('')}
        <button class="btn btn-primary btn-sm mt-16" style="width:100%;justify-content:center;" onclick="startQuiz('${id}')">🎯 Latihan Kuis</button>
      </div>
    </div>`;
  }).join('');
}

// ---- PROFIL ----
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
  document.querySelectorAll('.prof-initial').forEach(el => el.textContent = STATE.userData.name.charAt(0).toUpperCase());
}

// ---- UTILS ----
function showPage(p) {
  document.querySelectorAll('.page').forEach(pg => pg.classList.remove('active'));
  document.getElementById(`page-${p}`).classList.add('active');
}
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
  toast.style.borderLeft = `3px solid ${colors[type] || colors.info}`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(() => toast.remove(), 300); }, 2500);
}
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
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('open');
}
document.addEventListener('DOMContentLoaded', () => {
  navigate('dashboard');
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', () => navigate(item.dataset.page));
  });
  document.getElementById('sidebar-overlay').addEventListener('click', toggleSidebar);
  document.querySelectorAll('.user-initial').forEach(el => el.textContent = STATE.userData.name.charAt(0).toUpperCase());
  document.querySelectorAll('.user-display-name').forEach(el => el.textContent = STATE.userData.name);
});
