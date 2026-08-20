import type { Kategori, Severity } from "./types";

/** Rule-based stand-in for "AI Klasifikasi Severity". Free, no external API. */
export function severityFor(text: string): Severity {
  const t = (text || "").toLowerCase();
  if (/kebakaran|meledak|ledakan|nyawa|fatal/.test(t)) return "Critical";
  if (/bahaya|celaka|kecelakaan|intimidasi|pelecehan|bocor|rusak parah|urgent/.test(t))
    return "High";
  if (/rusak|tidak berfungsi|mati|redup|terganggu|tidak nyaman/.test(t))
    return "Medium";
  return "Low";
}

/** Rule-based stand-in for "AI Analisis Konten" category detection. */
export function classify(text: string): Kategori {
  const t = (text || "").toLowerCase();
  if (/intimidasi|pelecehan|bully|pribadi|personal|ancam/.test(t)) return "Private";
  if (/toilet|kantin|locker|loker|shop|musholla|ruang istirahat|wastafel/.test(t))
    return "Fasilitas Shop";
  if (/gaji|lembur|shift|atasan|beban kerja|jam kerja|training/.test(t))
    return "Kesulitan Kerja";
  return "Fasilitas Plant";
}

/** Auto-generates a short title from the free-text detail, same as the prototype. */
export function generateTitle(detail: string): string {
  const text = (detail || "").trim().replace(/\s+/g, " ");
  if (!text) return "";
  const clause = text.split(/[.!?]/)[0];
  const words = clause.split(" ");
  const title = words.length > 9 ? words.slice(0, 9).join(" ") + "…" : clause;
  return title.charAt(0).toUpperCase() + title.slice(1);
}

export interface LocationCheckResult {
  ok: boolean;
  issues: string[];
}

/** "AI mendeteksi kelengkapan lokasi" heuristic. */
export function locationCheck(text: string): LocationCheckResult {
  const t = (text || "").trim();
  const issues: string[] = [];
  if (t.length < 8) {
    issues.push("Detail lokasi terlalu singkat, tambahkan informasi lebih spesifik.");
  }
  const hasLandmark =
    /line\s?\d|mesin|pilar|kolom|rak|rack|panel|pintu|gate|tiang|dinding|tangga|meja|loket|area\s?\d|krw|str/i.test(
      t
    );
  const hasDirection = /depan|belakang|samping|sebelah|dekat|atas|bawah|kiri|kanan|antara/i.test(
    t
  );
  if (!hasLandmark) {
    issues.push(
      "Sebutkan titik acuan yang jelas, contoh: dekat mesin X, dekat Line 2, atau dekat pilar A3."
    );
  }
  if (!hasDirection) {
    issues.push(
      "Sebutkan posisi relatif seperti depan/belakang/samping/dekat agar PIC mudah menemukan lokasi."
    );
  }
  return { ok: issues.length === 0, issues };
}
