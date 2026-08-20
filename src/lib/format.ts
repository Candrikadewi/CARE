const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Ags", "Sep", "Okt", "Nov", "Des",
];

export function fmtDate(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()} ${hh}:${mm}`;
}

export async function nextVoiceId(
  latestFn: () => Promise<string | null>
): Promise<string> {
  const latest = await latestFn();
  const n = latest ? parseInt(latest.replace("VO-2025-", ""), 10) + 1 : 7;
  return `VO-2025-${String(n).padStart(4, "0")}`;
}
