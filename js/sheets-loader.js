// ================================================
//  SHEETS-LOADER.JS
//  Mengambil dan mem-parse data soal dari Google Sheets CSV
// ================================================

// Cache data yang sudah diload (supaya tidak fetch berulang)
const CACHE = {};

/**
 * Fetch soal dari Google Sheets (CSV format)
 * @param {string} subjectId - ID mata kuliah (misal: 'pkn')
 * @returns {Promise<Array>} - Array soal dalam format internal
 */
async function fetchSubjectQuestions(subjectId) {
  // Cek cache dulu
  if (CACHE[subjectId]) {
    return CACHE[subjectId];
  }

  const config = SHEETS_CONFIG[subjectId];
  if (!config || !config.url) {
    console.warn(`URL belum diisi untuk: ${subjectId}`);
    return null;
  }

  try {
    // Fetch CSV dari Google Sheets
    // Pakai allorigins.win sebagai proxy untuk bypass CORS
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(config.url)}`;
    
    const response = await fetch(proxyUrl, { cache: 'force-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    const csvText = data.contents;
    
    // Parse CSV
    const questions = parseCSV(csvText);
    
    // Simpan ke cache
    CACHE[subjectId] = questions;
    return questions;

  } catch (err) {
    console.error(`Gagal load data ${subjectId}:`, err);
    return null;
  }
}

/**
 * Parse CSV text menjadi array soal
 * Format kolom: No | Pertanyaan | Opsi A | Opsi B | Opsi C | Opsi D | Jawaban(0-3) | ...
 */
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  const questions = [];

  // Skip baris 1 (header sheet title) dan baris 2 (header kolom)
  // Soal mulai dari baris ke-3 (index 2)
  const startRow = lines[0].includes('No') ? 1 : 2;

  for (let i = startRow; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (!cols || cols.length < 7) continue;

    const no = cols[0]?.trim();
    const pertanyaan = cols[1]?.trim();
    const opsiA = cols[2]?.trim();
    const opsiB = cols[3]?.trim();
    const opsiC = cols[4]?.trim();
    const opsiD = cols[5]?.trim();
    const jawaban = parseInt(cols[6]?.trim());

    // Skip baris kosong atau baris total
    if (!no || !pertanyaan || pertanyaan.toLowerCase().includes('total')) continue;
    if (isNaN(jawaban) || jawaban < 0 || jawaban > 3) continue;
    if (!opsiA || !opsiB || !opsiC || !opsiD) continue;

    questions.push({
      q: pertanyaan,
      options: [opsiA, opsiB, opsiC, opsiD],
      answer: jawaban
    });

    // Maksimal 10 soal
    if (questions.length >= 10) break;
  }

  return questions;
}

/**
 * Parse satu baris CSV dengan benar (handle koma dalam quotes)
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

/**
 * Load semua mata kuliah sekaligus (untuk preload)
 */
async function preloadAllSubjects() {
  const ids = Object.keys(SHEETS_CONFIG);
  const promises = ids.map(id => fetchSubjectQuestions(id));
  await Promise.allSettled(promises);
}

/**
 * Cek status koneksi ke Google Sheets
 */
async function checkSheetsConnection(subjectId) {
  const config = SHEETS_CONFIG[subjectId];
  if (!config?.url) return { ok: false, reason: 'URL belum diisi' };

  try {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(config.url)}`;
    const res = await fetch(proxyUrl);
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
    const data = await res.json();
    const qs = parseCSV(data.contents);
    return { ok: true, count: qs.length };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}
