// ================================================
//  SHEETS-LOADER.JS (versi fix - tanpa proxy)
//  Langsung fetch CSV dari Google Sheets
// ================================================

const CACHE = {};

async function fetchSubjectQuestions(subjectId) {
  if (CACHE[subjectId]) return CACHE[subjectId];

  const config = SHEETS_CONFIG[subjectId];
  if (!config || !config.url) return null;

  // Coba beberapa proxy CORS secara berurutan
  const proxies = [
    url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    url => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    url => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  ];

  for (const makeProxy of proxies) {
    try {
      const proxyUrl = makeProxy(config.url);
      const response = await fetch(proxyUrl, {
        signal: AbortSignal.timeout(8000)
      });
      if (!response.ok) continue;
      const text = await response.text();
      if (!text || text.trim().length === 0) continue;
      const questions = parseCSV(text);
      if (questions && questions.length > 0) {
        CACHE[subjectId] = questions;
        return questions;
      }
    } catch (e) {
      continue;
    }
  }

  return null;
}

function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  const questions = [];

  // Cari baris pertama yang berisi soal (ada angka di kolom 1)
  let startRow = 0;
  for (let i = 0; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const firstCol = cols[0]?.replace(/"/g, '').trim();
    if (firstCol === '1' || firstCol === 1) {
      startRow = i;
      break;
    }
    // Lewati header
    if (i === 0 && (firstCol === 'No' || firstCol === 'no' || firstCol === 'NO')) {
      startRow = 1;
      break;
    }
  }

  for (let i = startRow; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (!cols || cols.length < 7) continue;

    const no = cols[0]?.replace(/"/g, '').trim();
    const pertanyaan = cols[1]?.replace(/"/g, '').trim();
    const opsiA = cols[2]?.replace(/"/g, '').trim();
    const opsiB = cols[3]?.replace(/"/g, '').trim();
    const opsiC = cols[4]?.replace(/"/g, '').trim();
    const opsiD = cols[5]?.replace(/"/g, '').trim();
    const jawaban = parseInt(cols[6]?.replace(/"/g, '').trim());

    if (!pertanyaan || pertanyaan.toLowerCase().includes('total') || pertanyaan.toLowerCase().includes('nilai')) continue;
    if (!opsiA || !opsiB || !opsiC || !opsiD) continue;
    if (isNaN(jawaban) || jawaban < 0 || jawaban > 3) continue;

    questions.push({
      q: pertanyaan,
      options: [opsiA, opsiB, opsiC, opsiD],
      answer: jawaban
    });

    if (questions.length >= 10) break;
  }

  return questions;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
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

function countConfigured() {
  return Object.values(SHEETS_CONFIG).filter(s => s.url && s.url.length > 0).length;
}
