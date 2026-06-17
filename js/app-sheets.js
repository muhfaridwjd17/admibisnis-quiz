const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwN-BwVKBlD17Q3lpdbo1u4y6VsV-lSA_gKD9NBGBhOAtCZzurTNBGg1Ps_OgqhCYNO/exec";

const STATE = {
  currentPage: 'dashboard',
  currentSubject: null,
  currentQuestion: 0,
  answers: [],
  soalTimer: null,
  soalTimeLeft: 120,
  history: JSON.parse(localStorage.getItem('quiz_history') || '[]'),
  remoteHistory: [],
  remoteLoaded: false,
  currentIdentity: null,
  loadedQuestions: {},
  cheatCount: 0,
  quizActive: false,
  nilaiFilter: { subject: 'all', search: '' },
  lbFilter: { subject: 'all', search: '' }
};

async function kirimHasilKeSheets(data) {
  if (!APPS_SCRIPT_URL) return;
  try {
    await fetch(APPS_SCRIPT_URL, { method:'POST', mode:'no-cors', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) });
  } catch(e) { console.warn('Gagal kirim ke Sheets:', e); }
}

// ==================== ADMIN AUTH ====================
// Catatan: ini situs statis (GitHub Pages) tanpa server asli, jadi
// kredensial disimpan di localStorage browser. Ini cukup untuk
// mencegah mahasiswa biasa iseng klik tab admin, tapi BUKAN
// keamanan tingkat tinggi — siapa pun yang membuka DevTools/source
// kode bisa melihat/melewatinya. Sesuai untuk kebutuhan kelas.
function getAdminCreds() {
  const saved = localStorage.getItem('admin_creds');
  if (saved) { try { return JSON.parse(saved); } catch(e) {} }
  const def = { username: 'admin', password: 'admin123' };
  localStorage.setItem('admin_creds', JSON.stringify(def));
  return def;
}
function isAdminLoggedIn() { return sessionStorage.getItem('admin_logged_in') === '1'; }
function setAdminLoggedIn(val) {
  if (val) sessionStorage.setItem('admin_logged_in', '1');
  else sessionStorage.removeItem('admin_logged_in');
}
function openAdminLoginModal() {
  document.getElementById('admin-login-username').value = '';
  document.getElementById('admin-login-password').value = '';
  document.getElementById('admin-login-password').type = 'password';
  const eyeBtn1 = document.querySelector('#admin-login-password + button');
  if (eyeBtn1) eyeBtn1.textContent = '👁️';
  document.getElementById('admin-login-error').style.display = 'none';
  document.getElementById('modal-admin-login').style.display = 'flex';
  setTimeout(()=>document.getElementById('admin-login-username').focus(), 100);
}
function closeAdminLoginModal() { document.getElementById('modal-admin-login').style.display = 'none'; }
function submitAdminLogin() {
  const u = document.getElementById('admin-login-username').value.trim();
  const p = document.getElementById('admin-login-password').value;
  const creds = getAdminCreds();
  if (u === creds.username && p === creds.password) {
    setAdminLoggedIn(true);
    closeAdminLoginModal();
    showToast('✅ Login admin berhasil', 'success');
    navigate('admin');
  } else {
    document.getElementById('admin-login-error').style.display = 'block';
  }
}
function adminLogout() {
  setAdminLoggedIn(false);
  showToast('👋 Anda telah logout dari mode admin', 'info');
  navigate('dashboard');
}
function openAdminChangePassModal() {
  document.getElementById('admin-cp-old').value = '';
  document.getElementById('admin-cp-new').value = '';
  document.getElementById('admin-cp-new2').value = '';
  ['admin-cp-old','admin-cp-new','admin-cp-new2'].forEach(id => {
    document.getElementById(id).type = 'password';
    const eyeBtn = document.querySelector('#'+id+' + button');
    if (eyeBtn) eyeBtn.textContent = '👁️';
  });
  document.getElementById('admin-cp-error').style.display = 'none';
  document.getElementById('modal-admin-changepass').style.display = 'flex';
  setTimeout(()=>document.getElementById('admin-cp-old').focus(), 100);
}
function closeAdminChangePassModal() { document.getElementById('modal-admin-changepass').style.display = 'none'; }
function togglePwdReveal(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === 'password') { input.type = 'text'; btn.textContent = '🙈'; }
  else { input.type = 'password'; btn.textContent = '👁️'; }
}
function submitChangeAdminPassword() {
  const oldP = document.getElementById('admin-cp-old').value;
  const newP = document.getElementById('admin-cp-new').value;
  const newP2 = document.getElementById('admin-cp-new2').value;
  const creds = getAdminCreds();
  const errEl = document.getElementById('admin-cp-error');
  function showErr(msg) { errEl.textContent = '⚠️ ' + msg; errEl.style.display = 'block'; }
  if (oldP !== creds.password) { showErr('Password lama salah.'); return; }
  if (!newP || newP.length < 4) { showErr('Password baru minimal 4 karakter.'); return; }
  if (newP !== newP2) { showErr('Konfirmasi password baru tidak cocok.'); return; }
  localStorage.setItem('admin_creds', JSON.stringify({ username: creds.username, password: newP }));
  closeAdminChangePassModal();
  showToast('✅ Password admin berhasil diubah', 'success');
}

function hapusSatuNilai(recordId) {
  if (!confirm('Hapus data ini secara permanen? Data juga akan terhapus dari Google Sheets.')) return;
  STATE.history = STATE.history.filter(r => r.recordId !== recordId);
  STATE.remoteHistory = STATE.remoteHistory.filter(r => r.recordId !== recordId);
  localStorage.setItem('quiz_history', JSON.stringify(STATE.history));
  kirimHasilKeSheets({ action: 'delete', recordId });
  showToast('🗑️ Data berhasil dihapus', 'warning');
  renderNilaiTable();
  if (STATE.currentPage === 'leaderboard') renderLbTable();
  if (STATE.currentPage === 'dashboard') renderDashboard();
  if (STATE.currentPage === 'admin') drawAdminDashboard();
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
  if (page === 'admin' && !isAdminLoggedIn()) {
    openAdminLoginModal();
    return;
  }
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
  if (page==='admin') renderAdminDashboard();
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
    STATE.cheatCount=0;
    STATE.quizActive=true;
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
  showToast('⏰ Waktu habis! Lanjut ke soal berikutnya.','warning');
  const qIdx=STATE.currentQuestion;
  if(STATE.answers[qIdx]===null) STATE.answers[qIdx]=-1;
  document.querySelectorAll('.option-btn').forEach(btn=>btn.disabled=true);
  const bn=document.getElementById('btn-next');if(bn)bn.disabled=false;
  setTimeout(()=>nextQuestion(),1200);
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
  if(oc)oc.innerHTML=q.options.map((opt,i)=>`<button class="option-btn ${STATE.answers[qIdx]===i?'selected':''}" onclick="selectOption(${i})"><span class="option-letter">${letters[i]}</span><span>${opt}</span></button>`).join('');
  const bp=g('btn-prev');if(bp)bp.style.display=qIdx===0?'none':'flex';
  const bn=g('btn-next');if(bn){bn.textContent=qIdx===total-1?'🏁 Selesai':'Selanjutnya →';bn.disabled=STATE.answers[qIdx]===null;}
  startSoalTimer();
}
function selectOption(optIdx) {
  const qIdx=STATE.currentQuestion;
  // Boleh ganti jawaban berkali-kali sebelum lanjut ke soal berikutnya — tidak ada feedback benar/salah di sini
  STATE.answers[qIdx]=optIdx;
  document.querySelectorAll('.option-btn').forEach((btn,i)=>{btn.classList.toggle('selected', i===optIdx);});
  const bn=document.getElementById('btn-next');if(bn)bn.disabled=false;
}
function nextQuestion(){
  stopSoalTimer();
  const qIdx=STATE.currentQuestion;
  const timeUsedThisSoal = 120 - STATE.soalTimeLeft;
  STATE.totalSoalTime = (STATE.totalSoalTime || 0) + timeUsedThisSoal;
  const sub=STATE.currentSubject;
  if(STATE.currentQuestion<sub.questions.length-1){STATE.currentQuestion++;renderQuestion();}else finishQuiz();
}
function prevQuestion(){stopSoalTimer();if(STATE.currentQuestion>0){STATE.currentQuestion--;renderQuestion();}}

function finishQuiz() {
  stopSoalTimer();
  STATE.quizActive=false;
  const sub=STATE.currentSubject;
  const correctNumbers=[], wrongNumbers=[];
  sub.questions.forEach((q,i)=>{ if(STATE.answers[i]===q.answer) correctNumbers.push(i+1); else wrongNumbers.push(i+1); });
  const correct=correctNumbers.length;
  const total=sub.questions.length, score=Math.round((correct/total)*100);
  const identity=STATE.currentIdentity||{nama:'Mahasiswa',nim:'-',kelas:'-'};
  const totalSecs = STATE.totalSoalTime || Math.round((Date.now() - (STATE.quizStartTime||Date.now()))/1000);
  const mm = Math.floor(totalSecs/60), ss = totalSecs%60;
  const timeStr = `${mm}m ${ss}s`;
  const recordId = Date.now()+'_'+Math.random().toString(36).slice(2);
  const cheatCount = STATE.cheatCount||0;
  const record={recordId,subjectId:sub.id,subjectTitle:sub.title,score,correct,total,nama:identity.nama,nim:identity.nim,kelas:identity.kelas,timeStr,cheatCount,date:new Date().toISOString()};
  STATE.history.push(record);
  localStorage.setItem('quiz_history',JSON.stringify(STATE.history));
  kirimHasilKeSheets(record);
  showPage('result');
  renderResult(correct,total,score,identity,correctNumbers,wrongNumbers);
}

function renderResult(correct,total,score,identity,correctNumbers,wrongNumbers) {
  const wrong=total-correct, grade=getGrade(score);
  updateTopbar('Hasil Kuis',STATE.currentSubject.title);
  const rec=STATE.history[STATE.history.length-1];
  const timeStr=rec&&rec.timeStr?rec.timeStr:'-';
  correctNumbers = correctNumbers || [];
  wrongNumbers = wrongNumbers || [];

  const resultPage=document.querySelector('#page-result .quiz-container');
  if(!resultPage)return;

  const radius=72,cx=90,cy=90,circ=2*Math.PI*radius,dash=(score/100)*circ;

  const numberChip = (n, color) => `<span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:6px;font-size:11px;font-weight:800;background:${color}18;color:${color};border:1px solid ${color}30;">${n}</span>`;

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
          ${correctNumbers.length?`<div style="display:flex;flex-wrap:wrap;gap:4px;justify-content:center;margin-top:10px;">${correctNumbers.map(n=>numberChip(n,'#10B981')).join('')}</div>`:''}
        </div>
        <div class="result-stat-v2">
          <span class="result-stat-icon">❌</span>
          <div class="result-stat-num" style="color:#EF4444;">${wrong}</div>
          <div class="result-stat-lbl">Salah</div>
          ${wrongNumbers.length?`<div style="display:flex;flex-wrap:wrap;gap:4px;justify-content:center;margin-top:10px;">${wrongNumbers.map(n=>numberChip(n,'#EF4444')).join('')}</div>`:''}
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
        ${score>=70?`<button class="btn btn-export print btn-lg" style="padding:13px 26px;font-size:14px;" onclick="downloadSertifikat('${identity.nama.replace(/'/g,"\\'")}','${identity.nim}','${identity.kelas}','${STATE.currentSubject.title.replace(/'/g,"\\'")}',${score},'${getGrade(score).label}','${timeStr}','${new Date().toISOString()}')">
          🏅 Sertifikat
        </button>`:''}
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
  grid.innerHTML=Object.entries(SHEETS_CONFIG).map(([id,sub])=>{const attempts=STATE.history.filter(h=>h.subjectId===id),best=attempts.length>0?Math.max(...attempts.map(h=>h.score)):0;return`<div class="subject-card" onclick="startQuiz('${id}')" style="--card-color:${sub.color}"><div class="subject-icon-wrap" style="background:${sub.color}20;border:1px solid ${sub.color}30;"><span>${sub.icon}</span></div><div class="subject-score-bar"><div class="subject-score-fill" style="width:${best}%;background:${sub.color};"></div></div><div class="subject-title">${sub.title}</div><div class="subject-desc">10 Soal · 2 menit per soal · ${attempts.length} percobaan</div><div class="subject-meta"><div class="subject-meta-info"><span>⏱️</span><span>2 menit/soal</span></div><div class="subject-arrow" style="background:${sub.color}20;color:${sub.color};">→</div></div></div>`;}).join('');
}

// ==================== NILAI PAGE ====================
// ==================== AMBIL DATA DARI GOOGLE SHEETS (SEMUA DEVICE/ORANG) ====================
async function fetchRemoteHistory(forceRefresh) {
  if (!APPS_SCRIPT_URL) return mergeHistory();
  if (STATE.remoteLoaded && !forceRefresh) return mergeHistory();

  const targetUrl = APPS_SCRIPT_URL + '?action=getAll';
  const attempts = [
    () => fetch(targetUrl, { signal: AbortSignal.timeout(8000) }),
    () => fetch('https://api.allorigins.win/raw?url='+encodeURIComponent(targetUrl), { signal: AbortSignal.timeout(8000) }),
    () => fetch('https://corsproxy.io/?'+encodeURIComponent(targetUrl), { signal: AbortSignal.timeout(8000) })
  ];

  for (const attempt of attempts) {
    try {
      const res = await attempt();
      if (!res.ok) continue;
      const json = await res.json();
      if (json.status === 'success' && Array.isArray(json.data)) {
        STATE.remoteHistory = json.data.map(row => {
          const cheatMatch = String(row.cheatLabel||'').match(/(\d+)x/);
          return {
            recordId: row.recordId,
            subjectTitle: row.subjectTitle,
            subjectId: findSubjectIdByTitle(row.subjectTitle),
            nama: row.nama, nim: row.nim, kelas: row.kelas,
            correct: Number(row.correct)||0, total: Number(row.total)||0,
            score: Number(row.score)||0,
            timeStr: '-',
            cheatCount: cheatMatch ? Number(cheatMatch[1]) : 0,
            date: row.tanggal ? String(row.tanggal) : new Date().toISOString()
          };
        });
        STATE.remoteLoaded = true;
        return mergeHistory();
      }
    } catch (e) { continue; }
  }
  console.warn('Gagal ambil data dari Sheets setelah semua percobaan');
  return mergeHistory();
}

function findSubjectIdByTitle(title) {
  for (const [id, sub] of Object.entries(SHEETS_CONFIG)) {
    if (sub.title === title) return id;
  }
  return null;
}

function mergeHistory() {
  // Gabungkan data lokal + remote, dedup berdasarkan recordId
  const map = {};
  STATE.remoteHistory.forEach(r => { if (r.recordId) map[r.recordId] = r; });
  STATE.history.forEach(r => { if (r.recordId) map[r.recordId] = r; }); // lokal menang kalau ada duplikat recordId
  return Object.values(map);
}

function renderNilaiPage() {
  updateTopbar('Nilai Saya','Riwayat dan rekap hasil kuis kamu');
  const container=document.getElementById('nilai-content');if(!container)return;
  const subjectOptions=Object.entries(SHEETS_CONFIG).map(([id,sub])=>`<option value="${id}">${sub.icon} ${sub.title}</option>`).join('');
  container.innerHTML=`
    <div class="filter-bar-wrap">
      <div class="filter-row">
        <div class="filter-group">
          <label class="filter-label">📚 Mata Kuliah</label>
          <select id="nilai-subject-filter" class="filter-select" onchange="applyNilaiFilter()">
            <option value="all">— Semua Mata Kuliah —</option>
            ${subjectOptions}
          </select>
        </div>
        <div class="filter-group">
          <label class="filter-label">🏅 Grade</label>
          <select id="nilai-grade-filter" class="filter-select" style="min-width:130px;" onchange="applyNilaiFilter()">
            <option value="all">— Semua Grade —</option>
            <option value="A">Grade A</option>
            <option value="B">Grade B</option>
            <option value="C">Grade C</option>
            <option value="D">Grade D</option>
            <option value="E">Grade E</option>
          </select>
        </div>
        <div class="filter-group" style="flex:1;">
          <label class="filter-label">🔍 Cari</label>
          <div style="display:flex;gap:8px;">
            <input type="text" id="nilai-search" class="filter-input" placeholder="Cari di semua kolom: nama, NIM, kelas, nilai, grade, tanggal..." onkeydown="if(event.key===\'Enter\')applyNilaiFilter()">
            <button class="btn-filter" onclick="applyNilaiFilter()">🔍 Filter</button>
            <button class="btn-filter-clear" onclick="clearNilaiFilter()">✕ Reset</button>
            <button class="btn-filter-clear" onclick="refreshNilaiData()" title="Muat ulang data dari semua device">🔄</button>
          </div>
        </div>
      </div>
      <div class="export-row">
        <span class="export-label">📤 Export</span>
        <button class="btn-export excel" onclick="exportNilaiExcel()">📊 Excel</button>
        <button class="btn-export pdf" onclick="exportNilaiPDF()">📄 PDF</button>
        <button class="btn-export print" onclick="printNilai()">🖨️ Print</button>
      </div>
    </div>
    <div id="nilai-table-wrap"><div class="empty-state" style="padding:50px;"><div class="empty-state-icon">⏳</div><div class="empty-state-title">Memuat data dari semua device...</div></div></div>`;
  document.getElementById('nilai-subject-filter').value=STATE.nilaiFilter.subject;
  document.getElementById('nilai-grade-filter').value=STATE.nilaiFilter.grade||'all';
  document.getElementById('nilai-search').value=STATE.nilaiFilter.search;
  fetchRemoteHistory().then(()=>applyNilaiFilter());
}

function refreshNilaiData() {
  showToast('🔄 Memuat ulang data...', 'info');
  fetchRemoteHistory(true).then(()=>{ applyNilaiFilter(); showToast('✅ Data terbaru dimuat', 'success'); });
}

function applyNilaiFilter() {
  STATE.nilaiFilter.subject = document.getElementById('nilai-subject-filter').value;
  STATE.nilaiFilter.grade = document.getElementById('nilai-grade-filter').value;
  STATE.nilaiFilter.search = document.getElementById('nilai-search').value.trim().toLowerCase();
  renderNilaiTable();
}
function clearNilaiFilter() {
  STATE.nilaiFilter={subject:'all',grade:'all',search:''};
  document.getElementById('nilai-subject-filter').value='all';
  document.getElementById('nilai-grade-filter').value='all';
  document.getElementById('nilai-search').value='';
  renderNilaiTable();
}

function getFilteredNilai() {
  const all = mergeHistory().sort((a,b)=> new Date(b.date) - new Date(a.date));
  return all.filter(r=>{
    const matchSubject = STATE.nilaiFilter.subject==='all' || r.subjectId===STATE.nilaiFilter.subject;
    const grade=getGrade(r.score);
    const matchGrade = !STATE.nilaiFilter.grade || STATE.nilaiFilter.grade==='all' || grade.label===STATE.nilaiFilter.grade;
    const s = STATE.nilaiFilter.search;
    if (!s) return matchSubject && matchGrade;
    const sub=SHEETS_CONFIG[r.subjectId];
    const haystack=[
      r.nama, r.nim, r.kelas, sub?sub.title:r.subjectTitle, r.subjectTitle,
      String(r.correct), String(r.total-r.correct), String(r.total), String(r.score)+'%', String(r.score),
      grade.label, r.timeStr||'', new Date(r.date).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}),
      new Date(r.date).toLocaleDateString('id-ID')
    ].filter(Boolean).join(' ').toLowerCase();
    return matchSubject && matchGrade && haystack.includes(s);
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
    <div class="result-count-text">📋 Menampilkan <strong>${filtered.length}</strong> hasil ${STATE.nilaiFilter.search?'untuk pencarian "'+STATE.nilaiFilter.search+'"':''}</div>
    <div class="nilai-table-container" id="nilai-printable">
      <table class="data-table data-table-center">
        <thead>
          <tr>
            <th>No</th>
            <th>Tanggal</th>
            <th class="col-left">Nama</th>
            <th>NIM</th>
            <th>Kelas</th>
            <th class="col-left">Mata Kuliah</th>
            <th>Benar</th>
            <th>Salah</th>
            <th>Waktu</th>
            <th>Nilai</th>
            <th>Grade</th>
            <th class="no-print">Aksi</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map((r,i)=>{
            const sub=SHEETS_CONFIG[r.subjectId], grade=getGrade(r.score);
            return`<tr>
              <td>${i+1}</td>
              <td>${new Date(r.date).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})}</td>
              <td class="col-left"><strong>${r.nama||'-'}</strong></td>
              <td style="font-family:monospace;">${r.nim||'-'}</td>
              <td>${r.kelas||'-'}</td>
              <td class="col-left">${sub?`${sub.icon} ${sub.title}`:r.subjectId}</td>
              <td style="color:#10B981;font-weight:700;">${r.correct}</td>
              <td style="color:#EF4444;font-weight:700;">${r.total-r.correct}</td>
              <td style="font-size:12px;color:var(--text-muted);">⏱️ ${r.timeStr||'-'}</td>
              <td><span class="score-pill" style="background:${grade.color}20;color:${grade.color};font-weight:800;">${r.score}%</span></td>
              <td><span style="background:${grade.color};color:white;padding:3px 10px;border-radius:6px;font-size:12px;font-weight:800;">${grade.label}</span></td>
              <td class="no-print" style="display:flex;gap:6px;justify-content:center;">
                ${r.score>=70?`<button class="btn-row-delete" style="background:rgba(217,119,6,0.1);border-color:rgba(217,119,6,0.3);" onclick="downloadSertifikat('${(r.nama||'-').replace(/'/g,"\\'")}','${r.nim||'-'}','${r.kelas||'-'}','${(r.subjectTitle||'-').replace(/'/g,"\\'")}',${r.score},'${grade.label}','${r.timeStr||'-'}','${r.date}')" title="Download sertifikat">🏅</button>`:'<span style="color:var(--text-muted);font-size:11px;">-</span>'}
              </td>
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
    <div class="filter-bar-wrap">
      <div class="filter-row">
        <div class="filter-group">
          <label class="filter-label">📚 Mata Kuliah</label>
          <select id="lb-subject-filter" class="filter-select" onchange="applyLbFilter()">
            <option value="all">— Semua Mata Kuliah —</option>
            ${subjectOptions}
          </select>
        </div>
        <div class="filter-group">
          <label class="filter-label">🏅 Grade</label>
          <select id="lb-grade-filter" class="filter-select" style="min-width:130px;" onchange="applyLbFilter()">
            <option value="all">— Semua Grade —</option>
            <option value="A">Grade A</option>
            <option value="B">Grade B</option>
            <option value="C">Grade C</option>
            <option value="D">Grade D</option>
            <option value="E">Grade E</option>
          </select>
        </div>
        <div class="filter-group" style="flex:1;">
          <label class="filter-label">🔍 Cari</label>
          <div style="display:flex;gap:8px;">
            <input type="text" id="lb-search" class="filter-input" placeholder="Cari di semua kolom: nama, NIM, kelas, nilai, grade, tanggal..." onkeydown="if(event.key===\'Enter\')applyLbFilter()">
            <button class="btn-filter" onclick="applyLbFilter()">🔍 Filter</button>
            <button class="btn-filter-clear" onclick="clearLbFilter()">✕ Reset</button>
            <button class="btn-filter-clear" onclick="refreshLbData()" title="Muat ulang data dari semua device">🔄</button>
          </div>
        </div>
      </div>
      <div class="export-row">
        <span class="export-label">📤 Export</span>
        <button class="btn-export excel" onclick="exportLbExcel()">📊 Excel</button>
        <button class="btn-export pdf" onclick="exportLbPDF()">📄 PDF</button>
        <button class="btn-export print" onclick="printLb()">🖨️ Print</button>
      </div>
    </div>
    <div id="lb-table-wrap"><div class="empty-state" style="padding:50px;"><div class="empty-state-icon">⏳</div><div class="empty-state-title">Memuat data dari semua device...</div></div></div>`;
  document.getElementById('lb-subject-filter').value=STATE.lbFilter.subject;
  document.getElementById('lb-grade-filter').value=STATE.lbFilter.grade||'all';
  document.getElementById('lb-search').value=STATE.lbFilter.search;
  fetchRemoteHistory().then(()=>applyLbFilter());
}

function refreshLbData() {
  showToast('🔄 Memuat ulang data...', 'info');
  fetchRemoteHistory(true).then(()=>{ applyLbFilter(); showToast('✅ Data terbaru dimuat', 'success'); });
}

function applyLbFilter() {
  STATE.lbFilter.subject=document.getElementById('lb-subject-filter').value;
  STATE.lbFilter.grade=document.getElementById('lb-grade-filter').value;
  STATE.lbFilter.search=document.getElementById('lb-search').value.trim().toLowerCase();
  renderLbTable();
}
function clearLbFilter() {
  STATE.lbFilter={subject:'all',grade:'all',search:''};
  document.getElementById('lb-subject-filter').value='all';
  document.getElementById('lb-grade-filter').value='all';
  document.getElementById('lb-search').value='';
  renderLbTable();
}

function getFilteredLb() {
  // Ambil nilai terbaik per orang per subject, dari data lokal + Sheets
  const bestMap={};
  mergeHistory().forEach(r=>{
    const key=`${r.nim||r.nama}-${r.subjectId}`;
    if(!bestMap[key]||r.score>bestMap[key].score) bestMap[key]=r;
  });

  return Object.values(bestMap)
    .filter(r=>{
      const matchSubject=STATE.lbFilter.subject==='all'||r.subjectId===STATE.lbFilter.subject;
      const grade=getGrade(r.score);
      const matchGrade = !STATE.lbFilter.grade || STATE.lbFilter.grade==='all' || grade.label===STATE.lbFilter.grade;
      const s=STATE.lbFilter.search;
      if(!s) return matchSubject && matchGrade;
      const sub=SHEETS_CONFIG[r.subjectId];
      const haystack=[
        r.nama, r.nim, r.kelas, sub?sub.title:r.subjectTitle, r.subjectTitle,
        String(r.correct), String(r.total-r.correct), String(r.total), `${r.correct}/${r.total}`, String(r.score)+'%', String(r.score),
        grade.label, r.timeStr||'', new Date(r.date).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}),
        new Date(r.date).toLocaleDateString('id-ID')
      ].filter(Boolean).join(' ').toLowerCase();
      return matchSubject&&matchGrade&&haystack.includes(s);
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
    <div class="result-count-text">🏆 Menampilkan <strong>${filtered.length}</strong> hasil ${STATE.lbFilter.search?'untuk pencarian "'+STATE.lbFilter.search+'"':''}</div>
    <div class="nilai-table-container" id="lb-printable">
      <table class="data-table data-table-center">
        <thead>
          <tr>
            <th>Rank</th>
            <th class="col-left">Nama</th>
            <th>NIM</th>
            <th>Kelas</th>
            <th class="col-left">Mata Kuliah</th>
            <th>Benar</th>
            <th>Salah</th>
            <th>Waktu</th>
            <th>Nilai</th>
            <th>Grade</th>
            <th>Tanggal</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map((r,i)=>{
            const sub=SHEETS_CONFIG[r.subjectId], grade=getGrade(r.score);
            const rankIcon=i<3?medals[i]:`#${i+1}`;
            return`<tr class="${i<3?'top-rank':''}">
              <td style="font-size:18px;">${rankIcon}</td>
              <td class="col-left"><div style="display:flex;align-items:center;gap:10px;"><div style="width:32px;height:32px;min-width:32px;border-radius:50%;background:linear-gradient(135deg,#6366F1,#8B5CF6);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;color:white;">${(r.nama||'?').charAt(0).toUpperCase()}</div><strong>${r.nama||'-'}</strong></div></td>
              <td style="font-family:monospace;">${r.nim||'-'}</td>
              <td>${r.kelas||'-'}</td>
              <td class="col-left">${sub?`${sub.icon} ${sub.title}`:r.subjectId}</td>
              <td style="color:#10B981;font-weight:700;">${r.correct}</td>
              <td style="color:#EF4444;font-weight:700;">${r.total-r.correct}</td>
              <td style="font-size:12px;color:var(--text-muted);">⏱️ ${r.timeStr||'-'}</td>
              <td><span class="score-pill" style="background:${grade.color}20;color:${grade.color};font-weight:800;">${r.score}%</span></td>
              <td><span style="background:${grade.color};color:white;padding:3px 10px;border-radius:6px;font-size:12px;font-weight:800;">${grade.label}</span></td>
              <td style="font-size:12px;color:var(--text-muted);">${new Date(r.date).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

// ==================== EXPORT: EXCEL (XLSX ASLI VIA SHEETJS) ====================
function ensureXLSXLoaded(callback) {
  if (window.XLSX) { callback(); return; }
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
  script.onload = callback;
  script.onerror = () => showToast('❌ Gagal memuat modul Excel. Cek koneksi internet.', 'error');
  document.head.appendChild(script);
}

function exportToExcelReal(rows, headers, filename, sheetName) {
  ensureXLSXLoaded(() => {
    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Lebar kolom otomatis
    ws['!cols'] = headers.map((h,i) => {
      const maxLen = Math.max(h.length, ...rows.map(r => String(r[i]||'').length));
      return { wch: Math.min(Math.max(maxLen+3, 10), 40) };
    });

    // Style header
    const headerRange = XLSX.utils.decode_range(ws['!ref']);
    for (let c = headerRange.s.c; c <= headerRange.e.c; c++) {
      const cellRef = XLSX.utils.encode_cell({r:0, c});
      if (!ws[cellRef]) continue;
      ws[cellRef].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: 'F97316' } },
        alignment: { horizontal: 'center', vertical: 'center' }
      };
    }

    // Freeze header row
    ws['!freeze'] = { xSplit: 0, ySplit: 1 };

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, filename + '.xlsx');
    showToast('📊 File Excel (.xlsx) berhasil didownload!', 'success');
  });
}

function exportNilaiExcel() {
  const filtered = getFilteredNilai();
  if (!filtered.length) { showToast('⚠️ Tidak ada data untuk diexport', 'warning'); return; }
  const headers = ['No','Tanggal','Nama','NIM','Kelas','Mata Kuliah','Benar','Salah','Total Soal','Waktu Pengerjaan','Nilai (%)','Grade'];
  const rows = filtered.map((r,i) => {
    const sub = SHEETS_CONFIG[r.subjectId];
    const grade = getGrade(r.score);
    return [i+1, new Date(r.date).toLocaleDateString('id-ID'), r.nama||'-', r.nim||'-', r.kelas||'-',
      sub?sub.title:(r.subjectTitle||r.subjectId), r.correct, r.total-r.correct, r.total, r.timeStr||'-', r.score, grade.label];
  });
  exportToExcelReal(rows, headers, 'Nilai_Kuis_AdminBiz_'+new Date().toLocaleDateString('id-ID').replace(/\//g,'-'), 'Nilai Kuis');
}

function exportLbExcel() {
  const filtered = getFilteredLb();
  if (!filtered.length) { showToast('⚠️ Tidak ada data untuk diexport', 'warning'); return; }
  const headers = ['Rank','Nama','NIM','Kelas','Mata Kuliah','Benar','Salah','Total Soal','Waktu Pengerjaan','Nilai (%)','Grade','Tanggal'];
  const rows = filtered.map((r,i) => {
    const sub = SHEETS_CONFIG[r.subjectId];
    const grade = getGrade(r.score);
    return [i+1, r.nama||'-', r.nim||'-', r.kelas||'-', sub?sub.title:(r.subjectTitle||r.subjectId),
      r.correct, r.total-r.correct, r.total, r.timeStr||'-', r.score, grade.label, new Date(r.date).toLocaleDateString('id-ID')];
  });
  exportToExcelReal(rows, headers, 'Leaderboard_AdminBiz_'+new Date().toLocaleDateString('id-ID').replace(/\//g,'-'), 'Leaderboard');
}

// ==================== EXPORT: PDF & PRINT (DESAIN PREMIUM) ====================
function buildPrintDocument(title, subtitle, headers, rows, accentColor, statsHtml) {
  const rowsHtml = rows.map((r, i) => `<tr class="${i % 2 === 0 ? 'even' : 'odd'}">${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('');
  const headerHtml = headers.map(h => `<th>${h}</th>`).join('');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title>
  <style>
    @page { margin: 1.6cm; size: A4 landscape; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1C0A00; padding: 0; background: white; }

    .doc-header {
      display: flex; align-items: center; justify-content: space-between;
      padding-bottom: 18px; margin-bottom: 20px;
      border-bottom: 3px solid ${accentColor};
    }
    .doc-brand { display: flex; align-items: center; gap: 14px; }
    .doc-logo {
      width: 48px; height: 48px; border-radius: 12px;
      background: linear-gradient(135deg, ${accentColor}, #EF4444);
      display: flex; align-items: center; justify-content: center;
      font-size: 24px; color: white;
    }
    .doc-brand-text h1 { font-size: 20px; font-weight: 800; color: #1C0A00; letter-spacing: -0.5px; }
    .doc-brand-text p { font-size: 11px; color: #78716C; margin-top: 2px; }
    .doc-meta { text-align: right; font-size: 10px; color: #78716C; }
    .doc-meta strong { color: ${accentColor}; }

    .doc-title-bar { margin-bottom: 16px; }
    .doc-title-bar h2 { font-size: 16px; font-weight: 800; color: #1C0A00; margin-bottom: 3px; }
    .doc-title-bar p { font-size: 11px; color: #78716C; }

    .doc-stats { display: flex; gap: 12px; margin-bottom: 18px; }
    .doc-stat {
      flex: 1; padding: 12px 16px; border-radius: 10px;
      background: linear-gradient(135deg, ${accentColor}10, ${accentColor}05);
      border: 1px solid ${accentColor}25; text-align: center;
    }
    .doc-stat .num { font-size: 22px; font-weight: 900; color: ${accentColor}; }
    .doc-stat .lbl { font-size: 9px; font-weight: 700; color: #78716C; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }

    table { width: 100%; border-collapse: collapse; font-size: 10.5px; border-radius: 10px; overflow: hidden; }
    thead th {
      background: linear-gradient(135deg, ${accentColor}, #EF4444);
      color: white; padding: 10px 12px; text-align: left;
      font-size: 9.5px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;
    }
    tbody td { padding: 9px 12px; border-bottom: 1px solid #F1E4D8; }
    tbody tr.even { background: #FFFBF5; }
    tbody tr.odd { background: white; }
    tbody tr:last-child td { border-bottom: 2px solid ${accentColor}40; }

    .doc-footer {
      margin-top: 24px; padding-top: 14px; border-top: 1px solid #F1E4D8;
      display: flex; justify-content: space-between; font-size: 9px; color: #A8A29E;
    }

    @media print {
      .no-print { display: none; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style></head><body>

  <div class="doc-header">
    <div class="doc-brand">
      <div class="doc-logo">🎓</div>
      <div class="doc-brand-text">
        <h1>ADMINBIZ</h1>
        <p>Portal Akademik D4 Administrasi Bisnis · PNUP</p>
      </div>
    </div>
    <div class="doc-meta">
      Dicetak: <strong>${new Date().toLocaleString('id-ID', {dateStyle:'long', timeStyle:'short'})}</strong><br>
      Total Data: <strong>${rows.length} baris</strong>
    </div>
  </div>

  <div class="doc-title-bar">
    <h2>${title}</h2>
    <p>${subtitle}</p>
  </div>

  ${statsHtml || ''}

  <table>
    <thead><tr>${headerHtml}</tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>

  <div class="doc-footer">
    <span>Portal AdminBiz · Sistem Kuis Interaktif Administrasi Bisnis</span>
    <span>Halaman dicetak otomatis dari sistem</span>
  </div>

  <script>window.onload = function(){ window.print(); }<\/script>
  </body></html>`;
}

function exportNilaiPDF() { printNilai(); }
function exportLbPDF() { printLb(); }

function printNilai() {
  const filtered = getFilteredNilai();
  if (!filtered.length) { showToast('⚠️ Tidak ada data untuk diexport', 'warning'); return; }

  const headers = ['No','Tanggal','Nama','NIM','Kelas','Mata Kuliah','Benar','Salah','Waktu','Nilai','Grade'];
  const rows = filtered.map((r,i) => {
    const sub = SHEETS_CONFIG[r.subjectId];
    const grade = getGrade(r.score);
    return [i+1, new Date(r.date).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}),
      `<strong>${r.nama||'-'}</strong>`, r.nim||'-', r.kelas||'-', sub?`${sub.icon} ${sub.title}`:(r.subjectTitle||r.subjectId),
      `<span style="color:#059669;font-weight:700;">${r.correct}</span>`,
      `<span style="color:#E11D48;font-weight:700;">${r.total-r.correct}</span>`,
      r.timeStr||'-',
      `<strong style="color:${grade.color};">${r.score}%</strong>`,
      `<span style="background:${grade.color};color:white;padding:2px 8px;border-radius:5px;font-weight:700;font-size:9px;">${grade.label}</span>`];
  });

  const avg = Math.round(filtered.reduce((a,b)=>a+b.score,0)/filtered.length);
  const best = Math.max(...filtered.map(r=>r.score));
  const passed = filtered.filter(r=>r.score>=70).length;
  const statsHtml = `<div class="doc-stats">
    <div class="doc-stat"><div class="num">${filtered.length}</div><div class="lbl">Total Peserta</div></div>
    <div class="doc-stat"><div class="num">${avg}%</div><div class="lbl">Rata-rata Nilai</div></div>
    <div class="doc-stat"><div class="num">${best}%</div><div class="lbl">Nilai Tertinggi</div></div>
    <div class="doc-stat"><div class="num">${passed}</div><div class="lbl">Lulus (≥70%)</div></div>
  </div>`;

  const win = window.open('', '_blank');
  win.document.write(buildPrintDocument('Laporan Nilai Kuis', 'Rekap hasil kuis mahasiswa Administrasi Bisnis', headers, rows, '#F97316', statsHtml));
  win.document.close();
  showToast('📄 Membuka preview cetak...', 'success');
}

function printLb() {
  const filtered = getFilteredLb();
  if (!filtered.length) { showToast('⚠️ Tidak ada data untuk diexport', 'warning'); return; }

  const medals = ['🥇','🥈','🥉'];
  const headers = ['Rank','Nama','NIM','Kelas','Mata Kuliah','Benar','Salah','Waktu','Nilai','Grade','Tanggal'];
  const rows = filtered.map((r,i) => {
    const sub = SHEETS_CONFIG[r.subjectId];
    const grade = getGrade(r.score);
    return [i<3?medals[i]:`#${i+1}`, `<strong>${r.nama||'-'}</strong>`, r.nim||'-', r.kelas||'-',
      sub?`${sub.icon} ${sub.title}`:(r.subjectTitle||r.subjectId),
      `<span style="color:#059669;font-weight:700;">${r.correct}</span>`,
      `<span style="color:#E11D48;font-weight:700;">${r.total-r.correct}</span>`,
      r.timeStr||'-',
      `<strong style="color:${grade.color};">${r.score}%</strong>`,
      `<span style="background:${grade.color};color:white;padding:2px 8px;border-radius:5px;font-weight:700;font-size:9px;">${grade.label}</span>`,
      new Date(r.date).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})];
  });

  const statsHtml = `<div class="doc-stats">
    <div class="doc-stat"><div class="num">${filtered.length}</div><div class="lbl">Total Entri</div></div>
    <div class="doc-stat"><div class="num">${filtered[0]?.score||0}%</div><div class="lbl">Peringkat Tertinggi</div></div>
    <div class="doc-stat"><div class="num">${new Set(filtered.map(r=>r.subjectId)).size}</div><div class="lbl">Mata Kuliah</div></div>
  </div>`;

  const win = window.open('', '_blank');
  win.document.write(buildPrintDocument('Leaderboard Kuis', 'Peringkat nilai terbaik peserta kuis', headers, rows, '#F97316', statsHtml));
  win.document.close();
  showToast('📄 Membuka preview cetak...', 'success');
}

// ==================== SERTIFIKAT PDF ====================
function generateCertId(nim, date) {
  const d = new Date(date);
  const datePart = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  return `ABZ-${datePart}-${(nim||'XXXX').slice(-4)}`;
}

function downloadSertifikat(nama, nim, kelas, subjectTitle, score, gradeLabel, timeStr, dateStr) {
  if (score < 70) { showToast('⚠️ Sertifikat hanya tersedia untuk nilai lulus (≥70%)', 'warning'); return; }
  const grade = getGrade(score);
  const tanggal = dateStr ? new Date(dateStr) : new Date();
  const certId = generateCertId(nim, tanggal);
  const tanggalStr = tanggal.toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' });

  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Sertifikat - ${nama}</title>
  <style>
    @page { margin: 0; size: A4 landscape; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Georgia', 'Times New Roman', serif; background: #FFFBF0; }
    .cert-wrap {
      width: 100%; height: 100vh; padding: 28px;
      background: linear-gradient(135deg, #FFFBF0 0%, #FFF7ED 100%);
      display: flex; align-items: center; justify-content: center;
    }
    .cert-border {
      width: 100%; height: 100%; max-width: 1000px;
      border: 3px solid #D97706; border-radius: 4px;
      padding: 8px; position: relative;
    }
    .cert-inner {
      width: 100%; height: 100%;
      border: 1.5px solid #F59E0B; border-radius: 2px;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 36px 56px; text-align: center; position: relative;
    }
    .cert-corner { position: absolute; width: 28px; height: 28px; border: 2.5px solid #D97706; }
    .cert-corner.tl { top: -2px; left: -2px; border-right: none; border-bottom: none; }
    .cert-corner.tr { top: -2px; right: -2px; border-left: none; border-bottom: none; }
    .cert-corner.bl { bottom: -2px; left: -2px; border-right: none; border-top: none; }
    .cert-corner.br { bottom: -2px; right: -2px; border-left: none; border-top: none; }
    .cert-logo { font-size: 36px; margin-bottom: 6px; }
    .cert-brand { font-size: 13px; font-weight: 700; letter-spacing: 3px; color: #92400E; text-transform: uppercase; margin-bottom: 24px; }
    .cert-label { font-size: 12px; letter-spacing: 4px; text-transform: uppercase; color: #B45309; margin-bottom: 10px; }
    .cert-title { font-size: 38px; font-weight: 700; color: #1C0A00; margin-bottom: 22px; letter-spacing: 1px; }
    .cert-sub { font-size: 13px; color: #57534E; margin-bottom: 4px; }
    .cert-name { font-size: 32px; font-weight: 700; color: #B45309; font-style: italic; margin: 10px 0 18px; border-bottom: 1.5px solid #F59E0B; padding-bottom: 10px; display: inline-block; min-width: 380px; }
    .cert-desc { font-size: 14px; color: #44403C; line-height: 1.8; max-width: 560px; margin-bottom: 22px; }
    .cert-desc strong { color: #1C0A00; }
    .cert-score-row { display: flex; gap: 36px; margin-bottom: 26px; }
    .cert-score-item { text-align: center; }
    .cert-score-num { font-size: 26px; font-weight: 700; color: #B45309; }
    .cert-score-lbl { font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; color: #78716C; margin-top: 2px; }
    .cert-footer { display: flex; justify-content: space-between; align-items: flex-end; width: 100%; max-width: 640px; margin-top: 12px; }
    .cert-footer-block { text-align: center; font-size: 11px; color: #57534E; }
    .cert-footer-block .line { width: 140px; border-top: 1px solid #A8A29E; margin-bottom: 6px; }
    .cert-id { position: absolute; bottom: 14px; right: 24px; font-size: 9px; color: #A8A29E; font-family: monospace; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style></head><body>
  <div class="cert-wrap">
    <div class="cert-border">
      <div class="cert-inner">
        <div class="cert-corner tl"></div><div class="cert-corner tr"></div>
        <div class="cert-corner bl"></div><div class="cert-corner br"></div>

        <div class="cert-logo">🎓</div>
        <div class="cert-brand">AdminBiz · Portal Akademik D4 Administrasi Bisnis PNUP</div>

        <div class="cert-label">Sertifikat Pencapaian</div>
        <div class="cert-title">${grade.label === 'A' ? 'Penghargaan Prestasi' : 'Kelulusan Kuis'}</div>

        <div class="cert-sub">Diberikan kepada</div>
        <div class="cert-name">${nama}</div>

        <div class="cert-desc">
          NIM <strong>${nim}</strong> dari kelas <strong>${kelas}</strong>, atas keberhasilannya menyelesaikan kuis
          mata kuliah <strong>${subjectTitle}</strong> dengan hasil yang membanggakan pada portal AdminBiz.
        </div>

        <div class="cert-score-row">
          <div class="cert-score-item"><div class="cert-score-num">${score}%</div><div class="cert-score-lbl">Nilai Akhir</div></div>
          <div class="cert-score-item"><div class="cert-score-num">${grade.label}</div><div class="cert-score-lbl">Grade</div></div>
          <div class="cert-score-item"><div class="cert-score-num">${timeStr||'-'}</div><div class="cert-score-lbl">Waktu Pengerjaan</div></div>
        </div>

        <div class="cert-footer">
          <div class="cert-footer-block">
            <div class="line"></div>
            ${tanggalStr}<br>Tanggal Penerbitan
          </div>
          <div class="cert-footer-block">
            <div class="line"></div>
            Portal AdminBiz<br>Sistem Otomatis
          </div>
        </div>

        <div class="cert-id">ID: ${certId}</div>
      </div>
    </div>
  </div>
  <script>window.onload = function(){ window.print(); }<\/script>
  </body></html>`);
  win.document.close();
  showToast('🏅 Membuka preview sertifikat...', 'success');
}

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
function clearHistory(){
  if(confirm('Yakin ingin menghapus semua riwayat kuis? Data di Google Sheets juga akan ikut terhapus.')){
    STATE.history=[];
    STATE.remoteHistory=[];
    localStorage.removeItem('quiz_history');
    kirimHasilKeSheets({ action: 'deleteAll' });
    showToast('🗑️ Semua riwayat dihapus','warning');
    renderNilaiPage();
    renderDashboard();
    if (STATE.currentPage === 'leaderboard') renderLbTable();
    if (STATE.currentPage === 'admin') drawAdminDashboard();
  }
}
function toggleSidebar(){document.getElementById('sidebar').classList.toggle('open');document.getElementById('sidebar-overlay').classList.toggle('open');}

// ==================== DETEKSI KECURANGAN (PINDAH TAB / WINDOW) ====================
let lastCheatTime = 0;
function handleTabSwitch() {
  if (!STATE.quizActive) return;
  const now = Date.now();
  if (now - lastCheatTime < 1000) return; // hindari hitung ganda dari event blur+visibilitychange
  lastCheatTime = now;
  STATE.cheatCount = (STATE.cheatCount || 0) + 1;
  showToast(`⚠️ Terdeteksi pindah tab/jendela! (${STATE.cheatCount}x) — ini akan tercatat.`, 'warning');
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') handleTabSwitch();
});
window.addEventListener('blur', () => {
  if (STATE.quizActive) handleTabSwitch();
});

// ==================== DASHBOARD DOSEN (ANALITIK KELAS) ====================
async function renderAdminDashboard() {
  updateTopbar('Dashboard Admin', 'Analitik performa seluruh mahasiswa');
  const container = document.getElementById('admin-content');
  if (!container) return;

  // Isi dropdown filter mata kuliah sekali saja
  const filterEl = document.getElementById('admin-subject-filter');
  if (filterEl && filterEl.options.length <= 1) {
    Object.entries(SHEETS_CONFIG).forEach(([id, sub]) => {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = `${sub.icon} ${sub.title}`;
      filterEl.appendChild(opt);
    });
  }

  container.innerHTML = `<div class="empty-state" style="padding:50px;"><div class="empty-state-icon">⏳</div><div class="empty-state-title">Memuat data analitik...</div></div>`;
  await fetchRemoteHistory();
  drawAdminDashboard();
}

function refreshAdminData() {
  showToast('🔄 Memuat ulang data analitik...', 'info');
  fetchRemoteHistory(true).then(() => { drawAdminDashboard(); showToast('✅ Data terbaru dimuat', 'success'); });
}

function drawAdminDashboard() {
  const container = document.getElementById('admin-content');
  if (!container) return;

  const subjectFilter = document.getElementById('admin-subject-filter')?.value || 'all';
  const all = mergeHistory().filter(r => subjectFilter === 'all' || r.subjectId === subjectFilter);

  if (all.length === 0) {
    container.innerHTML = `<div class="empty-state" style="padding:60px;"><div class="empty-state-icon">📭</div><div class="empty-state-title">Belum ada data kuis</div><div class="empty-state-text">Data akan muncul setelah mahasiswa mengerjakan kuis</div></div>`;
    return;
  }

  // ---- Statistik ringkas ----
  const totalPeserta = new Set(all.map(r => r.nim || r.nama)).size;
  const totalKuis = all.length;
  const avgScore = Math.round(all.reduce((a, b) => a + b.score, 0) / all.length);
  const passRate = Math.round((all.filter(r => r.score >= 70).length / all.length) * 100);
  const cheatCount = all.filter(r => (r.cheatCount || 0) > 0).length;

  // ---- Distribusi grade ----
  const gradeCounts = { A: 0, B: 0, C: 0, D: 0, E: 0 };
  all.forEach(r => { gradeCounts[getGrade(r.score).label]++; });
  const gradeColors = { A: '#10B981', B: '#6366F1', C: '#F59E0B', D: '#F97316', E: '#EF4444' };
  const maxGradeCount = Math.max(...Object.values(gradeCounts), 1);

  // ---- Rata-rata per mata kuliah ----
  const bySubject = {};
  all.forEach(r => {
    const key = r.subjectId || r.subjectTitle;
    if (!bySubject[key]) bySubject[key] = { title: r.subjectTitle, scores: [] };
    bySubject[key].scores.push(r.score);
  });
  const subjectAverages = Object.entries(bySubject).map(([id, data]) => ({
    id, title: data.title,
    avg: Math.round(data.scores.reduce((a,b)=>a+b,0) / data.scores.length),
    count: data.scores.length,
    color: SHEETS_CONFIG[id]?.color || '#6366F1',
    icon: SHEETS_CONFIG[id]?.icon || '📝'
  })).sort((a,b) => b.avg - a.avg);

  // ---- Daftar mahasiswa (urut terbaru) ----
  const sortedAll = [...all].sort((a,b) => new Date(b.date) - new Date(a.date));

  container.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; background:var(--bg-glass); border:1px solid var(--border-subtle); border-radius:14px; padding:14px 18px; margin-bottom:24px;">
      <div style="display:flex; align-items:center; gap:10px; font-size:13px; color:var(--text-secondary);">
        <span style="font-size:18px;">🔓</span>
        Login sebagai <strong style="color:var(--text-primary);">${getAdminCreds().username}</strong>
      </div>
      <div style="display:flex; gap:8px;">
        <button class="btn btn-ghost btn-sm" onclick="openAdminChangePassModal()">🔑 Ubah Password</button>
        <button class="btn btn-ghost btn-sm" onclick="adminLogout()">🚪 Logout</button>
      </div>
    </div>
    <div class="stats-grid stagger" style="margin-bottom:24px;">
      <div class="stat-card"><span class="stat-card-icon">👥</span><div class="stat-card-value">${totalPeserta}</div><div class="stat-card-label">Total Peserta</div></div>
      <div class="stat-card"><span class="stat-card-icon">📝</span><div class="stat-card-value">${totalKuis}</div><div class="stat-card-label">Total Pengerjaan Kuis</div></div>
      <div class="stat-card"><span class="stat-card-icon">📈</span><div class="stat-card-value">${avgScore}%</div><div class="stat-card-label">Rata-rata Nilai Kelas</div></div>
      <div class="stat-card"><span class="stat-card-icon">✅</span><div class="stat-card-value">${passRate}%</div><div class="stat-card-label">Tingkat Kelulusan</div></div>
    </div>

    ${cheatCount > 0 ? `
    <div style="background:rgba(239,68,68,0.08); border:1.5px solid rgba(239,68,68,0.25); border-radius:14px; padding:14px 18px; margin-bottom:24px; display:flex; align-items:center; gap:12px;">
      <span style="font-size:24px;">⚠️</span>
      <div><strong style="color:#EF4444;">${cheatCount} pengerjaan</strong> <span style="color:var(--text-secondary);">terdeteksi indikasi kecurangan (pindah tab/jendela saat kuis berlangsung). Lihat detail di tabel di bawah.</span></div>
    </div>` : ''}

    <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:24px;">
      <div class="card">
        <div class="card-body">
          <div class="section-eyebrow" style="margin-bottom:16px;">📊 Distribusi Grade</div>
          <div style="display:flex; flex-direction:column; gap:10px;">
            ${Object.entries(gradeCounts).map(([grade, count]) => {
              const pct = Math.round((count / maxGradeCount) * 100);
              const pctOfTotal = Math.round((count / all.length) * 100);
              return `<div style="display:flex; align-items:center; gap:10px;">
                <span style="width:20px; font-weight:800; color:${gradeColors[grade]};">${grade}</span>
                <div style="flex:1; height:18px; background:var(--border); border-radius:6px; overflow:hidden;">
                  <div style="height:100%; width:${pct}%; background:${gradeColors[grade]}; border-radius:6px; transition:width 1s ease; display:flex; align-items:center; justify-content:flex-end; padding-right:6px;">
                    ${count > 0 ? `<span style="font-size:10px; font-weight:800; color:white;">${count}</span>` : ''}
                  </div>
                </div>
                <span style="width:42px; text-align:right; font-size:11px; color:var(--text-muted);">${pctOfTotal}%</span>
              </div>`;
            }).join('')}
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-body">
          <div class="section-eyebrow" style="margin-bottom:16px;">📚 Rata-rata per Mata Kuliah</div>
          <div style="display:flex; flex-direction:column; gap:10px; max-height:200px; overflow-y:auto;">
            ${subjectAverages.map(s => `
              <div style="display:flex; align-items:center; gap:10px;">
                <span style="font-size:16px; width:22px; text-align:center;">${s.icon}</span>
                <div style="flex:1; min-width:0;">
                  <div style="font-size:12px; font-weight:600; margin-bottom:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${s.title}</div>
                  <div style="height:5px; background:var(--border); border-radius:3px; overflow:hidden;">
                    <div style="height:100%; width:${s.avg}%; background:${s.color}; border-radius:3px; transition:width 1s ease;"></div>
                  </div>
                </div>
                <span style="font-size:12px; font-weight:800; color:${s.color}; min-width:36px; text-align:right;">${s.avg}%</span>
              </div>`).join('')}
          </div>
        </div>
      </div>
    </div>

    <div class="section-header" style="margin-bottom:14px; display:flex; justify-content:space-between; align-items:flex-end; flex-wrap:wrap; gap:12px;">
      <div>
        <div class="section-eyebrow">Detail</div>
        <div class="section-title" style="font-size:16px;">Seluruh Hasil Pengerjaan (${sortedAll.length})</div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="clearHistory()">🗑️ Hapus Semua Data</button>
    </div>
    <div class="nilai-table-container">
      <table class="data-table data-table-center">
        <thead>
          <tr>
            <th>Tanggal</th>
            <th class="col-left">Nama</th>
            <th>NIM</th>
            <th>Kelas</th>
            <th class="col-left">Mata Kuliah</th>
            <th>Nilai</th>
            <th>Grade</th>
            <th>Indikasi</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          ${sortedAll.map(r => {
            const sub = SHEETS_CONFIG[r.subjectId];
            const grade = getGrade(r.score);
            const cheat = r.cheatCount || 0;
            return `<tr>
              <td style="font-size:12px;">${new Date(r.date).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})}</td>
              <td class="col-left"><strong>${r.nama||'-'}</strong></td>
              <td style="font-family:monospace;">${r.nim||'-'}</td>
              <td>${r.kelas||'-'}</td>
              <td class="col-left">${sub?`${sub.icon} ${sub.title}`:r.subjectTitle}</td>
              <td><span class="score-pill" style="background:${grade.color}20;color:${grade.color};font-weight:800;">${r.score}%</span></td>
              <td><span style="background:${grade.color};color:white;padding:3px 10px;border-radius:6px;font-size:12px;font-weight:800;">${grade.label}</span></td>
              <td>${cheat > 0 ? `<span style="color:#EF4444;font-weight:700;font-size:11px;">⚠️ ${cheat}x pindah tab</span>` : `<span style="color:var(--text-muted);font-size:11px;">-</span>`}</td>
              <td><button class="btn-row-delete" onclick="hapusSatuNilai('${r.recordId}')" title="Hapus data ini">🗑️</button></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

document.addEventListener('DOMContentLoaded',()=>{
  initTheme();
  navigate('dashboard');
  document.querySelectorAll('.nav-item[data-page]').forEach(item=>{item.addEventListener('click',()=>navigate(item.dataset.page));});
  document.getElementById('sidebar-overlay').addEventListener('click',toggleSidebar);
  const saved=JSON.parse(localStorage.getItem('user_identity')||'{}');
  if(saved.nama){document.querySelectorAll('.user-display-name').forEach(el=>el.textContent=saved.nama);document.querySelectorAll('.user-initial').forEach(el=>el.textContent=saved.nama.charAt(0).toUpperCase());}
  document.getElementById('modal-identitas').addEventListener('click',function(e){if(e.target===this)tutupModalIdentitas();});
  ['id-nama','id-nim','id-kelas'].forEach(id=>{const el=document.getElementById(id);if(el)el.addEventListener('keydown',e=>{if(e.key==='Enter')submitIdentitas();});});
  document.getElementById('modal-admin-login').addEventListener('click',function(e){if(e.target===this)closeAdminLoginModal();});
  ['admin-login-username','admin-login-password'].forEach(id=>{const el=document.getElementById(id);if(el)el.addEventListener('keydown',e=>{if(e.key==='Enter')submitAdminLogin();});});
  document.getElementById('modal-admin-changepass').addEventListener('click',function(e){if(e.target===this)closeAdminChangePassModal();});
  ['admin-cp-old','admin-cp-new','admin-cp-new2'].forEach(id=>{const el=document.getElementById(id);if(el)el.addEventListener('keydown',e=>{if(e.key==='Enter')submitChangeAdminPassword();});});
});
