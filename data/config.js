// ================================================
//  CONFIG.JS - Konfigurasi URL Google Sheets
//  
//  CARA MENGISI:
//  1. Buka Google Sheets kamu
//  2. File → Share → Publish to web
//  3. Pilih sheet (misal: "PKn - Pendidikan...") → Format: CSV → Publish
//  4. Salin URL yang muncul → tempel di bawah sesuai ID-nya
//  5. Ulangi untuk semua 10 sheet
// ================================================

const SHEETS_CONFIG = {
  // ⚠️ Ganti URL di bawah ini dengan URL CSV dari Google Sheets kamu
  // Format URL: https://docs.google.com/spreadsheets/d/[ID]/gviz/tq?tqx=out:csv&sheet=[NamaSheet]

  pkn: {
    title: "Pendidikan Kewarganegaraan",
    icon: "🏛️",
    color: "#EF4444",
    // Ganti dengan URL CSV sheet PKn kamu:
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSDF29IU_rHeGtGp1hRSUMzYCoEZsDSxWS4x0Dd92VkU_GbBm6tYWwFXIeKxgj3sGy-b-mWaBy8dqN-/pub?gid=598429022&single=true&output=csv"
  },
  mpi: {
    title: "Manajemen Portofolio & Investasi",
    icon: "📈",
    color: "#10B981",
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSDF29IU_rHeGtGp1hRSUMzYCoEZsDSxWS4x0Dd92VkU_GbBm6tYWwFXIeKxgj3sGy-b-mWaBy8dqN-/pub?gid=904994689&single=true&output=csv"
  },
  pk: {
    title: "Perilaku Konsumen",
    icon: "🛍️",
    color: "#8B5CF6",
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSDF29IU_rHeGtGp1hRSUMzYCoEZsDSxWS4x0Dd92VkU_GbBm6tYWwFXIeKxgj3sGy-b-mWaBy8dqN-/pub?gid=398797908&single=true&output=csv"
  },
  kep: {
    title: "Kepemimpinan",
    icon: "👑",
    color: "#F59E0B",
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSDF29IU_rHeGtGp1hRSUMzYCoEZsDSxWS4x0Dd92VkU_GbBm6tYWwFXIeKxgj3sGy-b-mWaBy8dqN-/pub?gid=233749169&single=true&output=csv"
  },
  pp: {
    title: "Pelayanan Prima",
    icon: "⭐",
    color: "#06B6D4",
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSDF29IU_rHeGtGp1hRSUMzYCoEZsDSxWS4x0Dd92VkU_GbBm6tYWwFXIeKxgj3sGy-b-mWaBy8dqN-/pub?gid=1056129585&single=true&output=csv"
  },
  ebc: {
    title: "English for Business Correspondent",
    icon: "✉️",
    color: "#3B82F6",
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSDF29IU_rHeGtGp1hRSUMzYCoEZsDSxWS4x0Dd92VkU_GbBm6tYWwFXIeKxgj3sGy-b-mWaBy8dqN-/pub?gid=847975520&single=true&output=csv"
  },
  sb: {
    title: "Simulasi Bisnis",
    icon: "🎯",
    color: "#EC4899",
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSDF29IU_rHeGtGp1hRSUMzYCoEZsDSxWS4x0Dd92VkU_GbBm6tYWwFXIeKxgj3sGy-b-mWaBy8dqN-/pub?gid=284350981&single=true&output=csv"
  },
  akb: {
    title: "Aplikasi Komputer Bisnis",
    icon: "💻",
    color: "#14B8A6",
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSDF29IU_rHeGtGp1hRSUMzYCoEZsDSxWS4x0Dd92VkU_GbBm6tYWwFXIeKxgj3sGy-b-mWaBy8dqN-/pub?gid=1649485378&single=true&output=csv"
  },
  kb: {
    title: "Kebijakan Bisnis",
    icon: "📋",
    color: "#F97316",
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSDF29IU_rHeGtGp1hRSUMzYCoEZsDSxWS4x0Dd92VkU_GbBm6tYWwFXIeKxgj3sGy-b-mWaBy8dqN-/pub?gid=1893432500&single=true&output=csv"
  },
  sim: {
    title: "Sistem Informasi Manajemen",
    icon: "🖥️",
    color: "#6366F1",
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSDF29IU_rHeGtGp1hRSUMzYCoEZsDSxWS4x0Dd92VkU_GbBm6tYWwFXIeKxgj3sGy-b-mWaBy8dqN-/pub?gid=1193891670&single=true&output=csv"
  }
};

// Cek apakah semua URL sudah diisi
function isConfigured() {
  return Object.values(SHEETS_CONFIG).every(s => s.url && s.url.length > 0);
}

// Cek berapa yang sudah diisi
function countConfigured() {
  return Object.values(SHEETS_CONFIG).filter(s => s.url && s.url.length > 0).length;
}
