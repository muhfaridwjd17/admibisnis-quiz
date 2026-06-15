const APPS_SCRIPT_URL = "";

const STATE = {
  currentPage: 'dashboard',
  currentSubject: null,
  currentQuestion: 0,
  answers: [],
  soalTimer: null,
  soalTimeLeft: 120,
  history: JSON.parse(localStorage.getItem('quiz_history') || '[]'),
  currentIdentity: null,
  loadedQuestions: {},
  nilaiFilter: { subject: 'all', search: '' },
  lbFilter: { subject: 'all', search: '' }
};

async function kirimHasilKeSheets(data) {
  if (!APPS_SCRIPT_URL) return;
  try {
    await fetch(APPS_SCRIPT_URL, { method:'POST', mode:'no-cors', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) });
  } catch(e) { console.warn('Gagal kirim ke Sheets:', e); }
}

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
  document.getElementById('theme-btn') && (document.getElementById('theme-btn').textContent = theme==='dark'?'☀️ Mode Terang':'🌙 Mode Gelap');
  document.getElementById('theme-btn-top') && (document.getElementById('theme-btn-top').textContent = theme==='dark'?'☀️':'🌙');
}

function navigate(page) {
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  const target = document.getElementById(`page-${page}`);
  if (target) { target.classList.add('active'); STATE.currentPage = page; }
  document.querySelectorAll(`.nav-item[data-page="${page}"]`).forEach(n=>n.classList.add('active'));
  if (page==='dashboard') renderDashboard();
  if (page==='kuis') renderKuisPage();
  if (page==='nilai') renderNilaiPage();
  if (page==='leaderboard') renderLeaderboard();
  if (page==='materi') renderMateriPage();
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('open');
  window.scrollTo(0,0);
}

function showModalIdentitas(subjectId) {
  const sub = SHEETS_CONFIG[subjectId];
  if (!sub) return;
  STATE._pendingSubjectId = subjectId;
  document.getElementById('modal-subject-icon').textContent = sub.icon;
  document.getElementById('modal-subject-title').textContent = sub.title;
  // Selalu kosongkan form agar setiap peserta mengisi ulang
  document.getElementById('id-nama').value = '';
  document.getElementById('id-nim').value = '';
  document.getElementById('id-kelas').value = '';
  document.getElementById('modal-identitas').style.display = 'flex';
  setTimeout(()=>document.getElementById('id-nama').focus(),100);
}
function tutupModalIdentitas() { document.getElementById('modal-identitas').style.display='none'; }
function submitIdentitas() {
  const nama=document.getElementById('id-nama').value.trim();
  const nim=document.getElementById('id-nim').value.trim();
  const kelas=document.getElementById('id-kelas').value.trim();
  if (!nama){showToast('⚠️ Nama wajib diisi!','warning');document.getElementById('id-nama').focus();return;}
  if (!nim){showToast('⚠️ NIM wajib diisi!','warning');document.getElementById('id-nim').focus();return;}
  if (!kelas){showToast('⚠️ Kelas wajib diisi!','warning');document.getElementById('id-kelas').focus();return;}
  STATE.currentIdentity={nama,nim,kelas};
  localStorage.setItem('user_identity',JSON.stringify({nama,nim,kelas}));
  document.querySelectorAll('.user-display-name').forEach(el=>el.textContent=nama);
  document.querySelectorAll('.user-initial').forEach(el=>el.textContent=nama.charAt(0).toUpperCase());
  tutupModalIdentitas();
  doStartQuiz(STATE._pendingSubjectId);
}

function startQuiz(subjectId) {
  const sub = SHEETS_CONFIG[subjectId];
  if (!sub||!sub.url){showToast('⚠️ URL Google Sheets belum dikonfigurasi','warning');return;}
  showModalIdentitas(subjectId);
}
async function doStartQuiz(subjectId) {
  const sub = SHEETS_CONFIG[subjectId];
  showPage('quiz');
  showQuizLoading(sub);
  try {
    let questions = STATE.loadedQuestions[subjectId];
    if (!questions) { questions = await fetchSubjectQuestions(subjectId); if (questions&&questions.length>0) STATE.loadedQuestions[subjectId]=questions; }
    if (!questions||questions.length===0){showToast('❌ Gagal memuat soal.','error');navigate('kuis');return;}
    STATE.currentSubject={id:subjectId,...sub,questions};
    STATE.currentQuestion=0;
    STATE.answers=new Array(questions.length).fill(null);
    hideQuizLoading();
    renderQuestion();
    startSoalTimer();
  } catch(err){showToast('❌ Terjadi kesalahan.','error');navigate('kuis');}
}

function showQuizLoading(sub) {
  const c=document.getElementById('quiz-container-inner');
  if(c) c.innerHTML=`<div style="text-align:center;padding:80px 32px;"><div style="font-size:48px;margin-bottom:24px;animation:pulse 1.5s infinite;">${sub.icon}</div><div style="font-size:18px;font-weight:700;margin-bottom:12px;color:var(--text-primary);">Memuat soal ${sub.title}...</div><div style="font-size:13px;color:var(--text-muted);">Mengambil data dari Google Sheets</div><div style="margin-top:24px;height:4px;width:200px;background:var(--border-subtle);border-radius:2px;overflow:hidden;margin-inline:auto;"><div style="height:100%;background:linear-gradient(135deg,#6366F1,#8B5CF6);border-radius:2px;animation:loadBar 2s ease infinite;"></div></div><style>@keyframes loadBar{0%{width:0%}100%{width:100%}}</style></div>`;
}
function hideQuizLoading() {
  const c=document.getElementById('quiz-container-inner');
  if(c) c.innerHTML=`
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

function startSoalTimer() {
  clearInterval(STATE.soalTimer);
  STATE.soalTimeLeft=120;
  updateTimerDisplay();
  STATE.soalTimer=setInterval(()=>{STATE.soalTimeLeft--;updateTimerDisplay();if(STATE.soalTimeLeft<=0){clearInterval(STATE.soalTimer);autoNextSoal();}},1000);
}
function updateTimerDisplay() {
  const m=Math.floor(STATE.soalTimeLeft/60), s=STATE.soalTimeLeft%60;
  const pct=(STATE.soalTimeLeft/120)*100;
  const text=document.getElementById('quiz-timer-text'), wrap=document.getElementById('quiz-timer-wrap'), fill=document.getElementById('soal-timer-fill');
  if(text) text.textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  if(wrap){wrap.className='quiz-timer';if(STATE.soalTimeLeft<=20)wrap.classList.add('warning');}
  if(fill){fill.style.width=pct+'%';fill.className='soal-timer-fill';if(pct<50)fill.classList.add('warn');if(pct<20)fill.classList.add('danger');}
}
function autoNextSoal() {
  STATE.totalSoalTime = (STATE.totalSoalTime || 0) + 120;
  showToast('⏰ Waktu habis! Lanjut ke soal berikutnya.','warning');
  const qIdx=STATE.currentQuestion;
  if(STATE.answers[qIdx]===null) STATE.answers[qIdx]=-1;
  const q=STATE.currentSubject.questions[qIdx];
  document.querySelectorAll('.option-btn').forEach((btn,i)=>{btn.disabled=true;if(i===q.answer)btn.classList.add('correct');});
  const bn=document.getElementById('btn-next');if(bn)bn.disabled=false;
  setTimeout(()=>nextQuestion(),1500);
}
function stopSoalTimer(){clearInterval(STATE.soalTimer);}

function renderQuestion() {
  const sub=STATE.currentSubject, qIdx=STATE.currentQuestion, q=sub.questions[qIdx], total=sub.questions.length;
  updateTopbar(`Kuis: ${sub.title}`,`Pertanyaan ${qIdx+1} dari ${total}`);
  const pct=Math.round((qIdx/total)*100);
  const g=id=>document.getElementById(id);
  if(g('quiz-progress-fill'))g('quiz-progress-fill').style.width=pct+'%';
  if(g('quiz-progress-text'))g('quiz-progress-text').textContent=`${qIdx+1} / ${total}`;
  if(g('question-subject'))g('question-subject').textContent=`${sub.icon} ${sub.title}`;
  if(g('question-number'))g('question-number').textContent=`Pertanyaan ${qIdx+1}`;
  if(g('question-text'))g('question-text').textContent=q.q;
  const letters=['A','B','C','D'];
  const oc=g('options-container');
  if(oc)oc.innerHTML=q.options.map((opt,i)=>`<button class="option-btn ${STATE.answers[qIdx]===i?'selected':''}" onclick="selectOption(${i})" ${STATE.answers[qIdx]!==null?'disabled':''}><span class="option-letter">${letters[i]}</span><span>${opt}</span></button>`).join('');
  const bp=g('btn-prev');if(bp)bp.style.display=qIdx===0?'none':'flex';
  const bn=g('btn-next');if(bn){bn.textContent=qIdx===total-1?'🏁 Selesai':'Selanjutnya →';bn.disabled=STATE.answers[qIdx]===null;}
  startSoalTimer();
}
function selectOption(optIdx) {
  const timeUsedThisSoal = 120 - STATE.soalTimeLeft;
  STATE.totalSoalTime = (STATE.totalSoalTime || 0) + timeUsedThisSoal;
  stopSoalTimer();
  const qIdx=STATE.currentQuestion, q=STATE.currentSubject.questions[qIdx];
  STATE.answers[qIdx]=optIdx;
  document.querySelectorAll('.option-btn').forEach((btn,i)=>{btn.disabled=true;if(i===q.answer)btn.classList.add('correct');else if(i===optIdx&&optIdx!==q.answer)btn.classList.add('wrong');});
  const bn=document.getElementById('btn-next');if(bn)bn.disabled=false;
  showToast(optIdx===q.answer?'✅ Jawaban benar!':'❌ Jawaban kurang tepat',optIdx===q.answer?'success':'error');
}
function nextQuestion(){stopSoalTimer();const sub=STATE.currentSubject;if(STATE.currentQuestion<sub.questions.length-1){STATE.currentQuestion++;renderQuestion();}else finishQuiz();}
function prevQuestion(){stopSoalTimer();if(STATE.currentQuestion>0){STATE.currentQuestion--;renderQuestion();}}

function finishQuiz() {
  stopSoalTimer();
  const sub=STATE.currentSubject;
  const correct=sub.questions.filter((q,i)=>STATE.answers[i]===q.answer).length;
  const total=sub.questions.length, score=Math.round((correct/total)*100);
  const identity=STATE.currentIdentity||{nama:'Mahasiswa',nim:'-',kelas:'-'};
  const totalSecs = STATE.totalSoalTime || Math.round((Date.now() - (STATE.quizStartTime||Date.now()))/1000);
  const mm = Math.floor(totalSecs/60), ss = totalSecs%60;
  const timeStr = `${mm}m ${ss}s`;
  const record={subjectId:sub.id,subjectTitle:sub.title,score,correct,total,nama:identity.nama,nim:identity.nim,kelas:identity.kelas,timeStr,date:new Date().toISOString()};
  STATE.history.push(record);
  localStorage.setItem('quiz_history',JSON.stringify(STATE.history));
  kirimHasilKeSheets(record);
  showPage('result');
  renderResult(correct,total,score,identity);
}

function renderResult(correct,total,score,identity) {
  const wrong=total-correct, grade=getGrade(score);
  updateTopbar('Hasil Kuis',STATE.currentSubject.title);
  const rec=STATE.history[STATE.history.length-1];
  const timeStr=rec&&rec.timeStr?rec.timeStr:'-';

  const resultPage=document.querySelector('#page-result .quiz-container');
  if(!resultPage)return;

  const radius=72,cx=90,cy=90,circ=2*Math.PI*radius,dash=(score/100)*circ;

  resultPage.innerHTML=`
    <div class="result-card-v2 fade-in" style="--result-accent:${grade.color};">
      <div class="result-ring-wrap">
        <svg width="180" height="180" viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg">
          <circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="rgba(128,128,128,0.12)" stroke-width="12"/>
          <circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${grade.color}" stroke-width="12"
            stroke-dasharray="${circ}" stroke-dashoffset="${circ}" stroke-linecap="round"
            style="transition:stroke-dashoffset 1.5s cubic-bezier(0.4,0,0.2,1);"
            id="result-ring-circle"/>
        </svg>
        <div class="result-ring-inner">
          <div class="result-score-big" style="color:${grade.color};">${score}%</div>
          <div class="result-grade-badge" style="color:${grade.color};background:${grade.color}18;">Grade ${grade.label}</div>
        </div>
      </div>

      <span class="result-emoji">${grade.emoji}</span>
      <div class="result-main-title">${grade.message}</div>
      <div class="result-main-sub">${grade.sub}</div>

      <div class="result-identity-bar">
        <span>👤 <strong>${identity.nama}</strong></span>
        <span style="color:var(--border-glass);">|</span>
        <span>🎓 NIM: <strong>${identity.nim}</strong></span>
        <span style="color:var(--border-glass);">|</span>
        <span>🏫 Kelas: <strong>${identity.kelas}</strong></span>
      </div>

      <div class="result-stats-v2">
        <div class="result-stat-v2">
          <span class="result-stat-icon">✅</span>
          <div class="result-stat-num" style="color:#10B981;">${correct}</div>
          <div class="result-stat-lbl">Benar</div>
        </div>
        <div class="result-stat-v2">
          <span class="result-stat-icon">❌</span>
          <div class="result-stat-num" style="color:#EF4444;">${wrong}</div>
          <div class="result-stat-lbl">Salah</div>
        </div>
        <div class="result-stat-v2">
          <span class="result-stat-icon">⏱️</span>
          <div class="result-stat-num" style="color:#F59E0B;font-size:20px;">${timeStr}</div>
          <div class="result-stat-lbl">Total Waktu</div>
        </div>
      </div>

      <div class="result-actions">
        <button class="btn btn-primary btn-lg" onclick="if(STATE.currentSubject) showModalIdentitas(STATE.currentSubject.id)">
          🔄 Coba Lagi
        </button>
        <button class="btn btn-secondary btn-lg" onclick="navigate('nilai')">
          📊 Lihat Nilai
        </button>
        <button class="btn btn-ghost btn-lg" onclick="navigate('kuis')">
          ← Kuis Lain
        </button>
      </div>
    </div>`;

  // Animasi ring setelah render
  setTimeout(()=>{
    const circle=document.getElementById('result-ring-circle');
    if(circle) circle.style.strokeDashoffset=circ-dash;
  },100);

  if(APPS_SCRIPT_URL)showToast('📊 Nilai terkirim ke Google Sheets!','success');
}

function getGrade(score) {
  if(score>=90)return{label:'A',color:'#10B981',bg:'rgba(16,185,129,0.15)',emoji:'🏆',message:'Sempurna!',sub:'Luar biasa! Kamu menguasai materi ini dengan sangat baik. Pertahankan terus!'};
  if(score>=80)return{label:'B',color:'#6366F1',bg:'rgba(99,102,241,0.15)',emoji:'🎯',message:'Hebat Sekali!',sub:'Hasil yang sangat bagus! Sedikit lagi menuju nilai sempurna.'};
  if(score>=70)return{label:'C',color:'#F59E0B',bg:'rgba(245,158,11,0.15)',emoji:'👍',message:'Cukup Baik!',sub:'Kamu lulus! Tetap semangat belajar untuk hasil yang lebih baik lagi.'};
  if(score>=60)return{label:'D',color:'#F97316',bg:'rgba(249,115,22,0.15)',emoji:'📚',message:'Perlu Belajar Lagi',sub:'Hampir lulus. Pelajari kembali materi yang masih kurang dikuasai.'};
  return{label:'E',color:'#EF4444',bg:'rgba(239,68,68,0.15)',emoji:'💪',message:'Jangan Menyerah!',sub:'Hasil di bawah target. Review materi dan coba lagi, kamu pasti bisa!'};
}

// ==================== DASHBOARD ====================
function renderDashboard() {
  updateTopbar('Dashboard','Selamat datang kembali 👋');
  const h=STATE.history, total=h.length;
  const avg=total>0?Math.round(h.reduce((a,b)=>a+b.score,0)/total):0;
  const best=total>0?Math.max(...h.map(x=>x.score)):0;
  const passed=h.filter(x=>x.score>=70).length;
  const g=id=>document.getElementById(id);
  if(g('dash-total'))g('dash-total').textContent=total;
  if(g('dash-avg'))g('dash-avg').textContent=avg+'%';
  if(g('dash-best'))g('dash-best').textContent=best+'%';
  if(g('dash-passed'))g('dash-passed').textContent=passed;
  const configured=countConfigured(), totalSub=Object.keys(SHEETS_CONFIG).length;
  const ss=g('sheets-status');
  if(ss){
    const scriptOk=APPS_SCRIPT_URL?'&nbsp;·&nbsp;<span style="color:#10B981">📊 Pengiriman nilai aktif</span>':'&nbsp;·&nbsp;<span style="color:#F59E0B">⚠️ URL Apps Script belum diisi</span>';
    ss.innerHTML=configured===totalSub?`<span style="color:#10B981">✅ ${configured}/${totalSub} mata kuliah terhubung</span>${scriptOk}`:`<span style="color:#F59E0B">⚠️ ${configured}/${totalSub} terhubung</span>${scriptOk}`;
  }
  renderRecentActivity();
  renderSubjectProgress();
}
function renderRecentActivity() {
  const container=document.getElementById('recent-activity');if(!container)return;
  const recent=[...STATE.history].reverse().slice(0,5);
  if(recent.length===0){container.innerHTML=`<div class="empty-state" style="padding:40px;"><div class="empty-state-icon">📝</div><div class="empty-state-title">Belum ada aktivitas</div></div>`;return;}
  container.innerHTML=recent.map(r=>{const sub=SHEETS_CONFIG[r.subjectId],grade=getGrade(r.score);return`<div class="lb-row fade-in"><div class="lb-rank">${sub?sub.icon:'📝'}</div><div class="lb-user"><div><div class="lb-name">${sub?sub.title:r.subjectId}</div><div class="lb-sub">${new Date(r.date).toLocaleDateString('id-ID',{day:'numeric',month:'short'})}</div></div></div><div style="font-size:13px;color:var(--text-primary);">${r.nama||'-'}</div><div><span class="score-pill" style="background:${grade.color}20;color:${grade.color}">${r.score}%</span></div><div style="color:var(--text-muted);font-size:12px;">${r.correct}/${r.total}</div></div>`;}).join('');
}
function renderSubjectProgress() {
  const container=document.getElementById('subject-progress');if(!container)return;
  container.innerHTML=Object.entries(SHEETS_CONFIG).map(([id,sub])=>{const attempts=STATE.history.filter(h=>h.subjectId===id),best=attempts.length>0?Math.max(...attempts.map(h=>h.score)):0;return`<div class="flex items-center gap-12 mb-8" style="padding:8px 0;border-bottom:1px solid var(--border-subtle);"><span style="font-size:18px;width:24px;text-align:center;">${sub.icon}</span><div style="flex:1;min-width:0;"><div style="font-size:12px;font-weight:600;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--text-primary);">${sub.title}</div><div style="height:4px;background:var(--border-subtle);border-radius:2px;overflow:hidden;"><div style="height:100%;width:${best}%;background:${sub.color};border-radius:2px;transition:width 1.2s ease;"></div></div></div><div style="font-size:12px;font-weight:700;color:${sub.color};min-width:36px;text-align:right;">${best>0?best+'%':'-'}</div></div>`;}).join('');
}

// ==================== KUIS PAGE ====================
function renderKuisPage() {
  updateTopbar('Pilih Kuis','Pilih mata kuliah untuk memulai kuis');
  const grid=document.getElementById('subjects-grid');if(!grid)return;
  grid.innerHTML=Object.entries(SHEETS_CONFIG).map(([id,sub])=>{const attempts=STATE.history.filter(h=>h.subjectId===id),best=attempts.length>0?Math.max(...attempts.map(h=>h.score)):0;return`<div class="subject-card" onclick="startQuiz('${id}')" style="--color-accent:${sub.color}"><div class="subject-icon-wrap" style="background:${sub.color}20;border:1px solid ${sub.color}30;"><span>${sub.icon}</span></div><div class="subject-score-bar"><div class="subject-score-fill" style="width:${best}%;background:${sub.color};"></div></div><div class="subject-title">${sub.title}</div><div class="subject-desc">10 Soal · 2 menit per soal · ${attempts.length} percobaan</div><div class="subject-meta"><div class="subject-meta-info"><span>⏱️</span><span>2 menit/soal</span></div><div class="subject-arrow" style="background:${sub.color}20;color:${sub.color};">→</div></div></div>`;}).join('');
}

// ==================== NILAI PAGE ====================
function renderNilaiPage() {
  updateTopbar('Nilai Saya','Riwayat dan rekap hasil kuis kamu');
  const container=document.getElementById('nilai-content');if(!container)return;
  const subjectOptions=Object.entries(SHEETS_CONFIG).map(([id,sub])=>`<option value="${id}">${sub.icon} ${sub.title}</option>`).join('');
  container.innerHTML=`
    <div style="background:var(--bg-glass);border:1px solid var(--border-subtle);border-radius:16px;padding:20px 24px;margin-bottom:24px;display:flex;flex-direction:column;gap:16px;">
      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;">
        <div style="display:flex;flex-direction:column;gap:6px;">
          <label style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--text-muted);">📚 Mata Kuliah</label>
          <select id="nilai-subject-filter" onchange="applyNilaiFilter()" style="padding:10px 14px;background:var(--bg-secondary);border:1px solid var(--border-subtle);border-radius:10px;color:var(--text-primary);font-size:13px;font-family:inherit;cursor:pointer;outline:none;min-width:240px;">
            <option value="all">— Semua Mata Kuliah —</option>
            ${subjectOptions}
          </select>
        </div>
        <div style="flex:1;min-width:220px;display:flex;flex-direction:column;gap:6px;">
          <label style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--text-muted);">🔍 Cari</label>
          <div style="display:flex;gap:8px;">
            <input type="text" id="nilai-search" placeholder="Cari nama, NIM, atau kelas..." onkeydown="if(event.key===\'Enter\')applyNilaiFilter()" style="flex:1;padding:10px 14px;background:var(--bg-secondary);border:1px solid var(--border-subtle);border-radius:10px;color:var(--text-primary);font-size:13px;font-family:inherit;outline:none;">
            <button onclick="applyNilaiFilter()" style="padding:10px 20px;background:linear-gradient(135deg,#6366F1,#8B5CF6);border:none;border-radius:10px;color:white;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap;">🔍 Filter</button>
            <button onclick="clearNilaiFilter()" style="padding:10px 16px;background:var(--bg-glass);border:1px solid var(--border-subtle);border-radius:10px;color:var(--text-secondary);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;white-space:nowrap;">✕ Reset</button>
          </div>
        </div>
      </div>
      <div style="display:flex;gap:8px;padding-top:12px;border-top:1px solid var(--border-subtle);flex-wrap:wrap;align-items:center;">
        <span style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--text-muted);margin-right:4px;">📤 Export:</span>
        <button onclick="exportNilaiExcel()" style="padding:8px 16px;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.3);border-radius:8px;color:#10B981;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">📊 Excel</button>
        <button onclick="exportNilaiPDF()" style="padding:8px 16px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.25);border-radius:8px;color:#EF4444;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">📄 PDF</button>
        <button onclick="printNilai()" style="padding:8px 16px;background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.25);border-radius:8px;color:#6366F1;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">🖨️ Print</button>
      </div>
    </div>
    <div id="nilai-table-wrap"></div>`;
  document.getElementById('nilai-subject-filter').value=STATE.nilaiFilter.subject;
  document.getElementById('nilai-search').value=STATE.nilaiFilter.search;
  applyNilaiFilter();
}

function applyNilaiFilter() {
  STATE.nilaiFilter.subject = document.getElementById('nilai-subject-filter').value;
  STATE.nilaiFilter.search = document.getElementById('nilai-search').value.trim().toLowerCase();
  renderNilaiTable();
}
function clearNilaiFilter() {
  STATE.nilaiFilter={subject:'all',search:''};
  document.getElementById('nilai-subject-filter').value='all';
  document.getElementById('nilai-search').value='';
  renderNilaiTable();
}

function getFilteredNilai() {
  return [...STATE.history].reverse().filter(r=>{
    const matchSubject = STATE.nilaiFilter.subject==='all' || r.subjectId===STATE.nilaiFilter.subject;
    const s = STATE.nilaiFilter.search;
    const matchSearch = !s || (r.nama||'').toLowerCase().includes(s) || (r.nim||'').toLowerCase().includes(s) || (r.kelas||'').toLowerCase().includes(s);
    return matchSubject && matchSearch;
  });
}

function renderNilaiTable() {
  const wrap=document.getElementById('nilai-table-wrap');if(!wrap)return;
  const filtered=getFilteredNilai();

  if(filtered.length===0){
    wrap.innerHTML=`<div class="empty-state" style="padding:60px;"><div class="empty-state-icon">🔍</div><div class="empty-state-title">Tidak ada hasil ditemukan</div><div class="empty-state-text">Coba ubah filter atau kata kunci pencarian</div></div>`;
    return;
  }

  wrap.innerHTML=`
    <div style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">Menampilkan <strong style="color:var(--text-primary);">${filtered.length}</strong> hasil</div>
    <div class="nilai-table-container" id="nilai-printable">
      <table class="data-table">
        <thead>
          <tr>
            <th>No</th>
            <th>Tanggal</th>
            <th>Nama</th>
            <th>NIM</th>
            <th>Kelas</th>
            <th>Mata Kuliah</th>
            <th>Benar</th>
            <th>Salah</th>
            <th>Nilai</th>
            <th>Grade</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map((r,i)=>{
            const sub=SHEETS_CONFIG[r.subjectId], grade=getGrade(r.score);
            return`<tr>
              <td style="text-align:center;color:var(--text-muted);">${i+1}</td>
              <td style="font-size:12px;">${new Date(r.date).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})}</td>
              <td><strong>${r.nama||'-'}</strong></td>
              <td style="font-family:monospace;font-size:12px;">${r.nim||'-'}</td>
              <td style="text-align:center;">${r.kelas||'-'}</td>
              <td>${sub?`${sub.icon} ${sub.title}`:r.subjectId}</td>
              <td style="text-align:center;color:#10B981;font-weight:700;">${r.correct}</td>
              <td style="text-align:center;color:#EF4444;font-weight:700;">${r.total-r.correct}</td>
              <td style="text-align:center;"><span class="score-pill" style="background:${grade.color}20;color:${grade.color};font-weight:800;">${r.score}%</span></td>
              <td style="text-align:center;"><span style="background:${grade.color};color:white;padding:3px 10px;border-radius:6px;font-size:12px;font-weight:800;">${grade.label}</span></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

// ==================== LEADERBOARD PAGE ====================
function renderLeaderboard() {
  updateTopbar('Leaderboard','Peringkat nilai terbaik semua peserta kuis');
  const container=document.getElementById('lb-content');if(!container)return;
  const subjectOptions=Object.entries(SHEETS_CONFIG).map(([id,sub])=>`<option value="${id}">${sub.icon} ${sub.title}</option>`).join('');
  container.innerHTML=`
    <div style="background:var(--bg-glass);border:1px solid var(--border-subtle);border-radius:16px;padding:20px 24px;margin-bottom:24px;display:flex;flex-direction:column;gap:16px;">
      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;">
        <div style="display:flex;flex-direction:column;gap:6px;">
          <label style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--text-muted);">📚 Mata Kuliah</label>
          <select id="lb-subject-filter" onchange="applyLbFilter()" style="padding:10px 14px;background:var(--bg-secondary);border:1px solid var(--border-subtle);border-radius:10px;color:var(--text-primary);font-size:13px;font-family:inherit;cursor:pointer;outline:none;min-width:240px;">
            <option value="all">— Semua Mata Kuliah —</option>
            ${subjectOptions}
          </select>
        </div>
        <div style="flex:1;min-width:220px;display:flex;flex-direction:column;gap:6px;">
          <label style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--text-muted);">🔍 Cari</label>
          <div style="display:flex;gap:8px;">
            <input type="text" id="lb-search" placeholder="Cari nama, NIM, atau kelas..." onkeydown="if(event.key===\'Enter\')applyLbFilter()" style="flex:1;padding:10px 14px;background:var(--bg-secondary);border:1px solid var(--border-subtle);border-radius:10px;color:var(--text-primary);font-size:13px;font-family:inherit;outline:none;">
            <button onclick="applyLbFilter()" style="padding:10px 20px;background:linear-gradient(135deg,#6366F1,#8B5CF6);border:none;border-radius:10px;color:white;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap;">🔍 Filter</button>
            <button onclick="clearLbFilter()" style="padding:10px 16px;background:var(--bg-glass);border:1px solid var(--border-subtle);border-radius:10px;color:var(--text-secondary);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;white-space:nowrap;">✕ Reset</button>
          </div>
        </div>
      </div>
      <div style="display:flex;gap:8px;padding-top:12px;border-top:1px solid var(--border-subtle);flex-wrap:wrap;align-items:center;">
        <span style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--text-muted);margin-right:4px;">📤 Export:</span>
        <button onclick="exportLbExcel()" style="padding:8px 16px;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.3);border-radius:8px;color:#10B981;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">📊 Excel</button>
        <button onclick="exportLbPDF()" style="padding:8px 16px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.25);border-radius:8px;color:#EF4444;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">📄 PDF</button>
        <button onclick="printLb()" style="padding:8px 16px;background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.25);border-radius:8px;color:#6366F1;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">🖨️ Print</button>
      </div>
    </div>
    <div id="lb-table-wrap"></div>`;
  document.getElementById('lb-subject-filter').value=STATE.lbFilter.subject;
  document.getElementById('lb-search').value=STATE.lbFilter.search;
  applyLbFilter();
}

function applyLbFilter() {
  STATE.lbFilter.subject=document.getElementById('lb-subject-filter').value;
  STATE.lbFilter.search=document.getElementById('lb-search').value.trim().toLowerCase();
  renderLbTable();
}
function clearLbFilter() {
  STATE.lbFilter={subject:'all',search:''};
  document.getElementById('lb-subject-filter').value='all';
  document.getElementById('lb-search').value='';
  renderLbTable();
}

function getFilteredLb() {
  // Ambil nilai terbaik per orang per subject
  const bestMap={};
  STATE.history.forEach(r=>{
    const key=`${r.nim||r.nama}-${r.subjectId}`;
    if(!bestMap[key]||r.score>bestMap[key].score) bestMap[key]=r;
  });

  return Object.values(bestMap)
    .filter(r=>{
      const matchSubject=STATE.lbFilter.subject==='all'||r.subjectId===STATE.lbFilter.subject;
      const s=STATE.lbFilter.search;
      const matchSearch=!s||(r.nama||'').toLowerCase().includes(s)||(r.nim||'').toLowerCase().includes(s)||(r.kelas||'').toLowerCase().includes(s);
      return matchSubject&&matchSearch;
    })
    .sort((a,b)=>b.score-a.score);
}

function renderLbTable() {
  const wrap=document.getElementById('lb-table-wrap');if(!wrap)return;
  const filtered=getFilteredLb();
  const medals=['🥇','🥈','🥉'];

  if(filtered.length===0){
    wrap.innerHTML=`<div class="empty-state" style="padding:60px;"><div class="empty-state-icon">🏆</div><div class="empty-state-title">Tidak ada hasil ditemukan</div><div class="empty-state-text">Coba ubah filter atau kata kunci pencarian</div></div>`;
    return;
  }

  wrap.innerHTML=`
    <div style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">Menampilkan <strong style="color:var(--text-primary);">${filtered.length}</strong> hasil</div>
    <div class="nilai-table-container" id="lb-printable">
      <table class="data-table">
        <thead>
          <tr>
            <th style="text-align:center;">Rank</th>
            <th>Nama</th>
            <th>NIM</th>
            <th>Kelas</th>
            <th>Mata Kuliah</th>
            <th style="text-align:center;">Benar</th>
            <th style="text-align:center;">Nilai</th>
            <th style="text-align:center;">Grade</th>
            <th>Tanggal</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map((r,i)=>{
            const sub=SHEETS_CONFIG[r.subjectId], grade=getGrade(r.score);
            const rankIcon=i<3?medals[i]:`#${i+1}`;
            return`<tr class="${i<3?'top-rank':''}">
              <td style="text-align:center;font-size:18px;">${rankIcon}</td>
              <td><div style="display:flex;align-items:center;gap:10px;"><div style="width:32px;height:32px;min-width:32px;border-radius:50%;background:linear-gradient(135deg,#6366F1,#8B5CF6);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;color:white;">${(r.nama||'?').charAt(0).toUpperCase()}</div><strong>${r.nama||'-'}</strong></div></td>
              <td style="font-family:monospace;font-size:12px;">${r.nim||'-'}</td>
              <td style="text-align:center;">${r.kelas||'-'}</td>
              <td>${sub?`${sub.icon} ${sub.title}`:r.subjectId}</td>
              <td style="text-align:center;color:#10B981;font-weight:700;">${r.correct}/${r.total}</td>
              <td style="text-align:center;"><span class="score-pill" style="background:${grade.color}20;color:${grade.color};font-weight:800;">${r.score}%</span></td>
              <td style="text-align:center;"><span style="background:${grade.color};color:white;padding:3px 10px;border-radius:6px;font-size:12px;font-weight:800;">${grade.label}</span></td>
              <td style="font-size:12px;color:var(--text-muted);">${new Date(r.date).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

// ==================== EXPORT FUNCTIONS ====================
function exportToExcel(data, filename) {
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(','), ...data.map(row => headers.map(h => `"${(row[h]||'').toString().replace(/"/g,'""')}"`).join(','))];
  const blob = new Blob(['\uFEFF'+csvRows.join('\n')], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download=filename+'.csv'; a.click();
  URL.revokeObjectURL(url);
  showToast('📊 File Excel berhasil didownload!','success');
}

function exportNilaiExcel() {
  const filtered=getFilteredNilai();
  if(!filtered.length){showToast('⚠️ Tidak ada data untuk diexport','warning');return;}
  const data=filtered.map((r,i)=>({
    'No':i+1,'Tanggal':new Date(r.date).toLocaleDateString('id-ID'),'Nama':r.nama||'-','NIM':r.nim||'-','Kelas':r.kelas||'-',
    'Mata Kuliah':r.subjectTitle||r.subjectId,'Benar':r.correct,'Salah':r.total-r.correct,'Total Soal':r.total,'Nilai (%)':r.score,'Grade':getGrade(r.score).label
  }));
  exportToExcel(data,'Nilai_Kuis_AdminBiz_'+new Date().toLocaleDateString('id-ID').replace(/\//g,'-'));
}

function exportLbExcel() {
  const filtered=getFilteredLb();
  if(!filtered.length){showToast('⚠️ Tidak ada data untuk diexport','warning');return;}
  const data=filtered.map((r,i)=>({
    'Rank':i+1,'Nama':r.nama||'-','NIM':r.nim||'-','Kelas':r.kelas||'-',
    'Mata Kuliah':r.subjectTitle||r.subjectId,'Benar':r.correct,'Total':r.total,'Nilai (%)':r.score,'Grade':getGrade(r.score).label,
    'Tanggal':new Date(r.date).toLocaleDateString('id-ID')
  }));
  exportToExcel(data,'Leaderboard_AdminBiz_'+new Date().toLocaleDateString('id-ID').replace(/\//g,'-'));
}

function exportNilaiPDF() { exportPDF('nilai-printable','Nilai Kuis - AdminBiz'); }
function exportLbPDF() { exportPDF('lb-printable','Leaderboard - AdminBiz'); }

function exportPDF(elementId, title) {
  const el=document.getElementById(elementId);
  if(!el){showToast('⚠️ Tidak ada data untuk diexport','warning');return;}
  const win=window.open('','_blank');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title><style>
    body{font-family:Arial,sans-serif;padding:24px;color:#1a1a1a;font-size:13px;}
    h2{color:#4F46E5;margin-bottom:4px;}
    .sub{color:#666;font-size:12px;margin-bottom:20px;}
    table{width:100%;border-collapse:collapse;}
    th{background:#1E1B4B;color:white;padding:10px 12px;text-align:left;font-size:12px;}
    td{padding:8px 12px;border-bottom:1px solid #eee;}
    tr:nth-child(even){background:#F8F9FA;}
    .score{font-weight:bold;}
    @media print{@page{margin:1.5cm;}}
  </style></head><body>
  <h2>${title}</h2>
  <div class="sub">Dicetak pada: ${new Date().toLocaleString('id-ID')} · Portal AdminBiz D4 Administrasi Bisnis PNUP</div>
  ${el.innerHTML}
  <script>window.onload=function(){window.print();}<\/script>
  </body></html>`);
  win.document.close();
  showToast('📄 Membuka preview PDF...','success');
}

function printNilai() { exportPDF('nilai-printable','Nilai Kuis - AdminBiz'); }
function printLb() { exportPDF('lb-printable','Leaderboard - AdminBiz'); }

// ==================== MATERI ====================
const MATERI_DATA={pkn:{deskripsi:'Mempelajari nilai-nilai kebangsaan, hak dan kewajiban warga negara, serta sistem pemerintahan Indonesia.',topik:[{judul:'Pancasila sebagai Dasar Negara',isi:'Pancasila merupakan dasar filosofis negara Indonesia yang terdiri dari 5 sila. Tercantum dalam Pembukaan UUD 1945 alinea ke-4. Fungsi: dasar negara, ideologi nasional, pandangan hidup bangsa, dan sumber hukum.'},{judul:'UUD 1945 dan Amandemen',isi:'UUD 1945 adalah konstitusi tertinggi Indonesia. Telah diamandemen 4 kali (1999-2002). MPR berwenang mengubah UUD. Pasal 31: hak pendidikan. Pasal 27 ayat 3: bela negara. Pasal 30: pertahanan negara.'},{judul:'Hak dan Kewajiban Warga Negara',isi:'Hak WNI: pendidikan, pekerjaan, perlindungan hukum. Kewajiban WNI: mematuhi hukum, membayar pajak, bela negara. Asas personalitas aktif: WNI di luar negeri tetap tunduk hukum Indonesia.'},{judul:'Sistem Pemerintahan Indonesia',isi:'Indonesia menganut sistem presidensial. Presiden adalah kepala negara sekaligus kepala pemerintahan. Lembaga negara: MPR, DPR, DPD, Presiden, MA, MK, KY. Pemilu berdasarkan asas LUBER JURDIL.'},{judul:'Bhinneka Tunggal Ika',isi:'Berasal dari kitab Sutasoma karangan Mpu Tantular (Majapahit), bahasa Kawi. Artinya "Berbeda-beda tetapi tetap satu jua". Semboyan persatuan bangsa Indonesia yang majemuk.'}]},mpi:{deskripsi:'Mempelajari teori dan praktik pengelolaan portofolio investasi, analisis risiko, dan instrumen keuangan.',topik:[{judul:'Teori Portofolio Modern (Markowitz)',isi:'Dikembangkan Harry Markowitz (1952). Diversifikasi mengurangi risiko tanpa mengorbankan return. Efficient Frontier: kumpulan portofolio optimal berdasarkan risk-return trade-off.'},{judul:'Capital Asset Pricing Model (CAPM)',isi:'E(Ri) = Rf + βi × [E(Rm) - Rf]. Beta > 1: lebih volatil dari pasar. Beta < 1: lebih stabil dari pasar. Contoh: Rf=4%, Rm=10%, β=1,5 → E(Ri) = 4% + 1,5×(10%-4%) = 13%.'},{judul:'Risiko Investasi',isi:'Risiko sistematis (market risk): tidak bisa dihilangkan dengan diversifikasi — inflasi, krisis ekonomi. Risiko tidak sistematis: bisa dihilangkan dengan diversifikasi — risiko perusahaan spesifik.'},{judul:'Efficient Market Hypothesis (EMH)',isi:'Bentuk lemah: harga mencerminkan info historis. Bentuk semi-kuat: harga mencerminkan semua info publik. Bentuk kuat: harga mencerminkan semua info termasuk insider information.'},{judul:'Instrumen & Pengukuran Kinerja',isi:'Saham: kepemilikan perusahaan. Obligasi: surat utang berbunga. Zero-coupon bond: dijual di bawah nilai nominal. Sharpe Ratio = (Return Portfolio - Risk-Free Rate) / Standar Deviasi Portfolio.'}]},pk:{deskripsi:'Mempelajari faktor-faktor yang mempengaruhi keputusan pembelian konsumen.',topik:[{judul:'Hierarki Kebutuhan Maslow',isi:'Dari dasar ke puncak: (1) Fisiologis: makan, minum, tidur. (2) Keamanan: perlindungan, stabilitas. (3) Sosial: cinta, rasa memiliki. (4) Penghargaan: status, prestasi. (5) Aktualisasi diri.'},{judul:'Proses Pengambilan Keputusan',isi:'5 tahap: Pengenalan masalah → Pencarian informasi → Evaluasi alternatif → Keputusan pembelian → Perilaku pasca pembelian. Disonansi kognitif terjadi SETELAH pembelian.'},{judul:'Faktor yang Mempengaruhi Konsumen',isi:'Budaya: nilai dan norma masyarakat. Sosial: kelompok referensi primer (keluarga, teman dekat) paling berpengaruh. Psikologis: motivasi, persepsi, pembelajaran. Pribadi: usia, gaya hidup.'},{judul:'Segmentasi Pasar',isi:'Demografis: usia, jenis kelamin, pendapatan. Geografis: wilayah. Psikografis: gaya hidup, kepribadian — paling sulit diukur tapi powerful. Behavioral: frekuensi pembelian, loyalitas merek.'},{judul:'Jenis Perilaku Pembelian',isi:'Complex buying: keterlibatan tinggi, beda merek signifikan (mobil, rumah). Habitual buying: keterlibatan rendah, tidak beda merek (garam). Impulse buying: pembelian tanpa rencana. High involvement = produk mahal dan jarang dibeli.'}]},kep:{deskripsi:'Mempelajari berbagai teori, gaya, dan pendekatan kepemimpinan efektif dalam organisasi.',topik:[{judul:'Gaya-Gaya Kepemimpinan',isi:'Otoriter: pemimpin pengambil keputusan tunggal, bawahan hanya melaksanakan. Demokratis: libatkan bawahan dalam pengambilan keputusan. Laissez-faire: kebebasan penuh kepada bawahan. Transformasional: ubah nilai dan motivasi pengikut.'},{judul:'Teori Situasional (Hersey & Blanchard)',isi:'Gaya disesuaikan kematangan bawahan. M1 (rendah) → Telling/Directing: perintah langsung. M2 → Selling/Coaching: jual ide. M3 → Participating: ikutsertakan bawahan. M4 (tinggi) → Delegating: serahkan tugas penuh.'},{judul:'Kepemimpinan Transformasional vs Transaksional',isi:'Transformasional (Burns/Bass): inspirasi visi bersama, ubah nilai pengikut, karisma, stimulasi intelektual. Transaksional: fokus pertukaran reward untuk kinerja, lebih mempertahankan status quo.'},{judul:'Teori X dan Teori Y (McGregor)',isi:'Teori X: bawahan malas, tidak suka tanggung jawab, perlu dikontrol ketat dan diarahkan. Teori Y: bawahan kreatif, bisa mandiri, suka tanggung jawab jika kondisi kerja mendukung.'},{judul:'Sumber Kekuasaan & Emotional Intelligence',isi:'French & Raven: Legitimate (posisi formal), Reward (imbalan), Coercive (hukuman), Expert (keahlian), Referent (kekaguman). EQ Goleman: self-awareness, self-regulation, motivation, empathy, social skills.'}]},pp:{deskripsi:'Mempelajari konsep dan teknik memberikan pelayanan terbaik kepada pelanggan.',topik:[{judul:'Konsep Pelayanan Prima (A3)',isi:'Attitude (sikap positif, ramah, sopan terhadap pelanggan), Attention (perhatian penuh, mendengarkan aktif), Action (tindakan nyata untuk memenuhi kebutuhan). Tujuan akhir: kepuasan dan loyalitas pelanggan jangka panjang.'},{judul:'SERVQUAL (Parasuraman)',isi:'5 dimensi kualitas layanan: Tangible (fasilitas fisik yang terlihat), Reliability (kemampuan layanan tepat waktu dan akurat), Responsiveness (kecepatan membantu), Assurance (pengetahuan dan kesopanan), Empathy (perhatian individual).'},{judul:'Mengukur Kepuasan Pelanggan',isi:'CSI (Customer Satisfaction Index): indeks kepuasan berdasarkan survei. NPS (Net Promoter Score) = % Promoter (skor 9-10) - % Detractor (skor 0-6). CLV (Customer Lifetime Value): total nilai pelanggan sepanjang hubungan dengan perusahaan.'},{judul:'Penanganan Keluhan (LAST)',isi:'Listen: dengarkan keluhan dengan penuh perhatian tanpa memotong. Apologize: minta maaf dengan tulus meski bukan kesalahan kita. Solve: selesaikan masalah dengan tepat dan cepat. Thank: ucapkan terima kasih atas masukan pelanggan.'},{judul:'Prinsip Pelayanan Unggul',isi:'Underpromise & overdeliver: janjikan sedikit, berikan lebih dari yang dijanjikan. Customer-centric: pelanggan sebagai pusat semua keputusan. Konsistensi standar layanan di setiap interaksi dan saluran komunikasi.'}]},ebc:{deskripsi:'Mempelajari teknik penulisan surat bisnis dan korespondensi profesional dalam bahasa Inggris.',topik:[{judul:'Structure of Business Letters',isi:'Parts of a business letter: (1) Letterhead/Date, (2) Inside address, (3) Salutation, (4) Body — opening, middle, closing paragraph, (5) Complimentary close, (6) Signature block. Each part has specific function and placement.'},{judul:'Salutations and Closings',isi:'"Yours faithfully" = when you do NOT know the recipient\'s name (used with Dear Sir/Madam). "Yours sincerely" = when you KNOW the recipient\'s name (used with Dear Mr./Ms. [Name]). Both A and C: "Dear Sir/Madam" AND "To Whom It May Concern" are both acceptable for unknown recipients.'},{judul:'Email Etiquette in Business',isi:'Subject line: brief and informative — e.g., "Meeting Request – March 15". CC (Carbon Copy): copy to relevant parties who need to be informed. BCC (Blind Carbon Copy): hidden copy. Opening: "I am writing to...", "With reference to your email...". Always professional.'},{judul:'Memorandum (Memo)',isi:'Memo is for INTERNAL communication within an organization. Standard format: TO:, FROM:, DATE:, SUBJECT: header block. No formal salutation or complimentary close needed. Tone: formal but concise. Purpose: announcements, reminders, policy updates.'},{judul:'Polite Language & Business Requests',isi:'"I would appreciate it if you could..." = most polite. "Could you please..." = polite request. "Would it be possible to..." = very formal polite. Avoid: "You must send...", "Give me..." — too direct and impolite in business context. Enclosure notation indicates additional documents.'}]},sb:{deskripsi:'Mempelajari simulasi pengambilan keputusan bisnis dalam berbagai skenario strategis.',topik:[{judul:'Analisis SWOT',isi:'Strengths (kekuatan internal perusahaan), Weaknesses (kelemahan internal), Opportunities (peluang eksternal yang menguntungkan), Threats (ancaman eksternal yang merugikan). Strategi: SO (manfaatkan kekuatan-peluang), WO, ST, WT.'},{judul:'Strategi Bersaing Porter',isi:'Cost Leadership: jadi produsen berbiaya terendah di industri. Differentiation: tawarkan produk/jasa unik bernilai tinggi. Focus: layani segmen sempit. Market penetration: tingkatkan penjualan produk ada di pasar ada. Blue Ocean: ciptakan pasar baru tanpa pesaing.'},{judul:'Break-Even Point (BEP)',isi:'BEP Unit = Total Biaya Tetap / (Harga Jual - Biaya Variabel per Unit). Di titik BEP: Total Pendapatan = Total Biaya, Laba = 0. Di atas BEP = untung. Di bawah BEP = rugi. BEP penting untuk menentukan target penjualan minimum.'},{judul:'Key Performance Indicators (KPI)',isi:'ROI = (Net Profit / Total Investment) × 100%. Market Share = (Penjualan Perusahaan / Total Industri) × 100%. Cash flow positif: arus kas masuk > arus kas keluar. Perbedaan: cash flow ≠ profit — bisa profit tapi cash flow negatif.'},{judul:'Pengambilan Keputusan Bisnis',isi:'Pricing strategy mempertimbangkan tiga hal: biaya produksi (floor price), harga pesaing (benchmark), dan nilai bagi pelanggan (ceiling price). Balanced Scorecard: 4 perspektif kinerja: Keuangan, Pelanggan, Proses Internal, Pembelajaran & Pertumbuhan.'}]},akb:{deskripsi:'Mempelajari penerapan aplikasi komputer dalam kegiatan bisnis sehari-hari.',topik:[{judul:'Microsoft Excel — Fungsi Dasar & Penting',isi:'SUM (jumlah), AVERAGE (rata-rata), COUNT (hitung angka), IF (logika kondisi), VLOOKUP (cari nilai berdasarkan kolom). Shortcut: Ctrl+Z (undo), Ctrl+S (simpan), Ctrl+C/V (copy/paste), F2 (edit sel). Format file: .xlsx (Excel modern), .xls (lama), .csv (universal).'},{judul:'Microsoft Excel — Fitur Analitik',isi:'Pivot Table: meringkas dan menganalisis data besar dengan drag-drop field — SANGAT powerful untuk laporan. Conditional Formatting: format otomatis berdasarkan kondisi (warnai sel merah jika nilai < 60). Data Validation: batasi jenis input data. Filter & Sort untuk tampilkan/urutkan data.'},{judul:'Microsoft Word — Fitur Bisnis',isi:'Mail Merge: buat surat/undangan massal otomatis dari sumber data Excel atau Access. Track Changes: lacak setiap perubahan dokumen. Table of Contents: daftar isi otomatis dari heading. Header/Footer: informasi konsisten di setiap halaman. Macro: otomatisasi tugas berulang dengan VBA.'},{judul:'Database & Microsoft Access',isi:'Database: kumpulan data terstruktur dan saling terkait. DBMS: software pengelola database. Microsoft Access: DBMS desktop untuk bisnis kecil-menengah, berbasis GUI. Objek utama: Table (data), Query (pertanyaan ke data), Form (input), Report (output cetak). Relasi: primary key & foreign key.'},{judul:'Cloud Computing & Integrasi Bisnis',isi:'Cloud computing manfaat: akses kapan/di mana saja, hemat biaya infrastruktur IT, skalabel sesuai kebutuhan. ERP (Enterprise Resource Planning): sistem terintegrasi kelola seluruh proses bisnis (SAP, Oracle). CRM: kelola interaksi pelanggan (Salesforce). Google Workspace & Microsoft 365 = cloud office suite.'}]},kb:{deskripsi:'Mempelajari formulasi dan implementasi kebijakan bisnis serta kerangka strategis perusahaan.',topik:[{judul:"Porter's Five Forces",isi:'5 kekuatan kompetitif yang menentukan daya tarik industri: (1) Intensitas persaingan antar pesaing yang ada. (2) Ancaman pendatang baru (barrier to entry). (3) Ancaman produk/jasa substitusi. (4) Daya tawar pemasok. (5) Daya tawar pembeli. Semakin kuat kelima kekuatan, semakin rendah profitabilitas.'},{judul:'BCG Matrix',isi:'Stars: pangsa pasar tinggi, pertumbuhan tinggi → investasi agresif. Cash Cows: pangsa tinggi, tumbuh rendah → pertahankan, hasilkan kas untuk Stars. Question Marks: pangsa rendah, tumbuh tinggi → putuskan: investasi atau divestasi. Dogs: keduanya rendah → pertimbangkan divestasi.'},{judul:'Strategi Korporat',isi:'Merger: dua perusahaan bergabung menjadi satu entitas baru yang setara. Akuisisi: satu perusahaan membeli dan mengontrol perusahaan lain. Diversifikasi konglomerat: masuk bisnis yang TIDAK berhubungan dengan bisnis utama. Blue Ocean Strategy: ciptakan ruang pasar baru tanpa pesaing.'},{judul:'Good Corporate Governance (GCG)',isi:'5 prinsip GCG: Transparency (keterbukaan informasi), Accountability (kejelasan fungsi dan pertanggungjawaban), Responsibility (kepatuhan terhadap peraturan), Independency (profesional tanpa konflik kepentingan), Fairness (keadilan bagi seluruh stakeholder). CSR: tanggung jawab ke masyarakat dan lingkungan.'},{judul:'Balanced Scorecard & VRIO',isi:'Balanced Scorecard (Kaplan & Norton): ukur kinerja dari 4 perspektif seimbang — Keuangan, Pelanggan, Proses Internal, Pembelajaran & Pertumbuhan. VRIO (Barney): sumber daya berikan keunggulan kompetitif berkelanjutan jika Valuable, Rare, Inimitable (tidak dapat ditiru), dan Organized.'}]},sim:{deskripsi:'Mempelajari konsep dan penerapan sistem informasi dalam mendukung manajemen bisnis.',topik:[{judul:'Konsep Dasar SIM',isi:'SIM (Sistem Informasi Manajemen): sistem yang menyediakan informasi untuk mendukung pengambilan keputusan manajerial. Hirarki: TPS (transaksi harian) → MIS (laporan terstruktur) → DSS (semi-terstruktur) → EIS (ringkasan eksekutif). Data → diproses → Informasi → digunakan untuk keputusan.'},{judul:'ERP (Enterprise Resource Planning)',isi:'ERP: sistem informasi TERINTEGRASI yang mengelola seluruh proses bisnis dalam satu platform — keuangan, SDM, produksi, distribusi, penjualan. Contoh populer: SAP, Oracle, Microsoft Dynamics. Keunggulan: data real-time, eliminasi duplikasi data, efisiensi lintas departemen.'},{judul:'DSS dan EIS',isi:'DSS (Decision Support System): bantu manajer menengah/atas membuat keputusan SEMI-TERSTRUKTUR menggunakan model analitik dan simulasi. EIS/ESS (Executive Information System): sajikan informasi ringkasan dan KPI dalam format dashboard visual untuk eksekutif senior.'},{judul:'CRM dan Data Warehouse',isi:'CRM (Customer Relationship Management): sistem kelola seluruh interaksi dan hubungan dengan pelanggan sepanjang siklus hidup (Salesforce, HubSpot). Data Warehouse: basis data besar dioptimalkan untuk ANALISIS historis, bukan transaksi. OLAP untuk analisis multi-dimensi, OLTP untuk transaksi real-time.'},{judul:'Big Data & Business Intelligence',isi:'Big Data dicirikan 3V: Volume (data sangat besar), Velocity (kecepatan tinggi), Variety (berbagai format). BI Tools (Tableau, Power BI): ubah data mentah jadi wawasan bisnis yang actionable. Keamanan informasi CIA: Confidentiality (kerahasiaan), Integrity (keutuhan), Availability (ketersediaan). Interoperabilitas: sistem berbeda saling berkomunikasi.'}]}};

function renderMateriPage() {
  updateTopbar('Materi Pembelajaran','Rangkuman materi lengkap — klik topik untuk membuka');
  const grid=document.getElementById('materi-grid');if(!grid)return;
  grid.innerHTML=Object.entries(SHEETS_CONFIG).map(([id,sub])=>{
    const m=MATERI_DATA[id];if(!m)return'';
    const topikHTML=m.topik.map((t,i)=>`
      <div class="materi-topik" onclick="toggleTopik(this)" style="border:1px solid var(--border-subtle);border-radius:10px;margin-bottom:8px;overflow:hidden;cursor:pointer;">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:var(--bg-glass);">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:22px;height:22px;min-width:22px;border-radius:6px;background:${sub.color}20;color:${sub.color};font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;">${i+1}</div>
            <span style="font-size:13px;font-weight:600;color:var(--text-primary);">${t.judul}</span>
          </div>
          <span class="topik-arrow" style="color:var(--text-muted);font-size:12px;transition:transform 0.3s;">▼</span>
        </div>
        <div class="topik-isi" style="display:none;padding:14px 16px;font-size:13px;color:var(--text-secondary);line-height:1.8;border-top:1px solid var(--border-subtle);background:var(--bg-primary);">${t.isi}</div>
      </div>`).join('');
    return`<div class="materi-card fade-in">
      <div class="materi-card-header" style="background:${sub.color}10;border-bottom:1px solid var(--border-subtle);">
        <div style="font-size:32px;">${sub.icon}</div>
        <div><div class="materi-card-title" style="color:var(--text-primary);">${sub.title}</div><div style="font-size:12px;color:var(--text-secondary);margin-top:4px;">${m.deskripsi}</div></div>
      </div>
      <div class="materi-card-body">
        <div style="font-size:11px;color:var(--text-muted);font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:12px;">📖 ${m.topik.length} Topik — Klik untuk buka</div>
        ${topikHTML}
        <button class="btn btn-primary btn-sm mt-16" style="width:100%;justify-content:center;" onclick="startQuiz('${id}')">🎯 Latihan Kuis</button>
      </div>
    </div>`;
  }).join('');
}
function toggleTopik(el){const isi=el.querySelector('.topik-isi'),arrow=el.querySelector('.topik-arrow'),isOpen=isi.style.display!=='none';isi.style.display=isOpen?'none':'block';arrow.style.transform=isOpen?'rotate(0deg)':'rotate(180deg)';}

function showPage(p){document.querySelectorAll('.page').forEach(pg=>pg.classList.remove('active'));const el=document.getElementById(`page-${p}`);if(el)el.classList.add('active');}
function updateTopbar(title,sub){const t=document.getElementById('topbar-title'),s=document.getElementById('topbar-sub');if(t)t.textContent=title;if(s)s.textContent=sub;}
function showToast(msg,type='info'){
  const container=document.getElementById('toast-container');if(!container)return;
  const toast=document.createElement('div');toast.className='toast';
  const colors={success:'#10B981',error:'#EF4444',info:'#6366F1',warning:'#F59E0B'};
  toast.innerHTML=`<span>${msg}</span>`;toast.style.borderLeft=`3px solid ${colors[type]||colors.info}`;
  container.appendChild(toast);
  setTimeout(()=>{toast.style.opacity='0';toast.style.transition='opacity 0.3s';setTimeout(()=>toast.remove(),300);},2500);
}
function clearHistory(){if(confirm('Yakin ingin menghapus semua riwayat kuis?')){STATE.history=[];localStorage.removeItem('quiz_history');showToast('🗑️ Riwayat dihapus','warning');renderNilaiPage();renderDashboard();}}
function toggleSidebar(){document.getElementById('sidebar').classList.toggle('open');document.getElementById('sidebar-overlay').classList.toggle('open');}

document.addEventListener('DOMContentLoaded',()=>{
  initTheme();
  navigate('dashboard');
  document.querySelectorAll('.nav-item[data-page]').forEach(item=>{item.addEventListener('click',()=>navigate(item.dataset.page));});
  document.getElementById('sidebar-overlay').addEventListener('click',toggleSidebar);
  const saved=JSON.parse(localStorage.getItem('user_identity')||'{}');
  if(saved.nama){document.querySelectorAll('.user-display-name').forEach(el=>el.textContent=saved.nama);document.querySelectorAll('.user-initial').forEach(el=>el.textContent=saved.nama.charAt(0).toUpperCase());}
  document.getElementById('modal-identitas').addEventListener('click',function(e){if(e.target===this)tutupModalIdentitas();});
  ['id-nama','id-nim','id-kelas'].forEach(id=>{const el=document.getElementById(id);if(el)el.addEventListener('keydown',e=>{if(e.key==='Enter')submitIdentitas();});});
});
