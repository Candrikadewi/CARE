"use client";

import { useEffect, useMemo, useState } from "react";
import PhoneFrame, { AppHeader, ContentScroll } from "./PhoneFrame";
import { classify, generateTitle, locationCheck, severityFor, type LocationCheckResult } from "@/lib/ai";
import { createVoice, fetchVoiceEvents, uploadPhoto } from "@/lib/api";
import { showToast } from "@/lib/toast";
import { fmtDate } from "@/lib/format";
import { DEPTS, type Voice, type VoiceEvent, type VoiceStatus } from "@/lib/types";
import { ReopenTag, StatusTag } from "./StatusBits";
import VoiceTrackingDetail from "./VoiceTrackingDetail";

type Screen =
  | "mytmmin"
  | "care-home"
  | "voice-home"
  | "isi-voice"
  | "preview"
  | "ai-processing"
  | "riwayat"
  | "detail";

interface Draft {
  area: string;
  lokasi: string;
  detail: string;
  judul: string;
  identity: "ya" | "tidak";
  photoFile: File | null;
  photoPreview: string | null;
}

const EMPTY_DRAFT: Draft = {
  area: "",
  lokasi: "",
  detail: "",
  judul: "",
  identity: "ya",
  photoFile: null,
  photoPreview: null,
};

export default function PelaporApp({
  voices,
  refetch,
  fromPic,
  onConsumedFromPic,
  initialScreen,
}: {
  voices: Voice[];
  refetch: () => void;
  fromPic: boolean;
  onConsumedFromPic: () => void;
  initialScreen?: Screen;
}) {
  const [screen, setScreen] = useState<Screen>(initialScreen ?? "mytmmin");
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [locCheck, setLocCheck] = useState<LocationCheckResult | null>(null);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [aiState, setAiState] = useState<{ step1: boolean; step2: boolean; step3: boolean; kategori: string; pic: string; severity: string }>({
    step1: false, step2: false, step3: false, kategori: "", pic: "", severity: "",
  });
  const [filter, setFilter] = useState<VoiceStatus | "semua">("semua");
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [events, setEvents] = useState<VoiceEvent[]>([]);

  useEffect(() => {
    if (currentId && screen === "detail") {
      fetchVoiceEvents(currentId).then(setEvents).catch(() => setEvents([]));
    }
  }, [currentId, screen, voices]);

  function go(s: Screen) {
    setScreen(s);
    if (s === "isi-voice") {
      setDraft(EMPTY_DRAFT);
      setLocCheck(null);
      setErrors({});
    }
  }

  function goRiwayat(f: VoiceStatus | "semua" = "semua") {
    setFilter(f);
    go("riwayat");
  }

  const currentVoice = useMemo(() => voices.find((v) => v.id === currentId) ?? null, [voices, currentId]);

  const stats = useMemo(() => {
    const c = { open: 0, verification: 0, progress: 0, closed: 0 };
    voices.forEach((v) => (c[v.status] += 1));
    return { total: voices.length, ...c };
  }, [voices]);

  function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setDraft((d) => ({ ...d, photoFile: f, photoPreview: ev.target?.result as string }));
    };
    reader.readAsDataURL(f);
  }

  function checkLocation(v: string) {
    setLocCheck(locationCheck(v));
  }

  function submitForm() {
    const nextErrors: Record<string, boolean> = {};
    if (!draft.area) showToast("Pilih Area terlebih dahulu.");
    if (!draft.lokasi.trim()) nextErrors.lokasi = true;
    if (!draft.detail.trim()) nextErrors.detail = true;
    if (!draft.photoFile) nextErrors.photo = true;
    setErrors(nextErrors);
    if (!draft.area || nextErrors.lokasi || nextErrors.detail || nextErrors.photo) return;

    const check = locationCheck(draft.lokasi);
    setLocCheck(check);
    if (!check.ok) {
      showToast("AI mendeteksi detail lokasi belum lengkap. Lihat saran di bawah kolom lokasi.");
      return;
    }
    setDraft((d) => ({ ...d, judul: generateTitle(d.detail) }));
    go("preview");
  }

  async function startAiProcessing() {
    setScreen("ai-processing");
    setAiState({ step1: false, step2: false, step3: false, kategori: "", pic: "", severity: "" });
    const kategori = classify(draft.detail);
    const severity = severityFor(draft.detail);

    await sleep(400);
    setAiState((s) => ({ ...s, step1: true, kategori }));
    await sleep(600);

    let photoUrl = "";
    try {
      photoUrl = draft.photoFile ? await uploadPhoto(draft.photoFile, "submissions") : "";
    } catch {
      showToast("Gagal mengunggah foto. Coba lagi.");
      go("isi-voice");
      return;
    }

    const created = await createVoice({
      area: draft.area,
      lokasi: draft.lokasi,
      detail: draft.detail,
      judul: draft.judul || generateTitle(draft.detail),
      identity: draft.identity === "ya",
      photoUrl,
      kategori,
      severity,
      dept: DEPTS[Math.floor(Math.random() * DEPTS.length)],
      mine: fromPic,
      reporter: fromPic ? "Anda (Manager)" : "Anda (Pelapor)",
    }).catch((err) => {
      showToast("Gagal mengirim voice: " + (err?.message || "unknown error"));
      return null;
    });

    if (!created) {
      go("isi-voice");
      return;
    }

    setAiState((s) => ({ ...s, step2: true, pic: created.pic || "" }));
    await sleep(500);
    setAiState((s) => ({ ...s, step3: true, severity }));

    if (fromPic) onConsumedFromPic();
    refetch();
    setCurrentId(created.id);
    showToast(`✅ Voice berhasil dikirim & diteruskan ke ${created.pic}! ID ${created.id}`);
    await sleep(400);
    go("detail");
  }

  const filteredVoices = filter === "semua" ? voices : voices.filter((v) => v.status === filter);

  return (
    <PhoneFrame>
      {screen === "mytmmin" && <MyTmminScreen onOpenCare={() => go("care-home")} />}
      {screen === "care-home" && <CareHomeScreen onOpenVoice={() => go("voice-home")} />}
      {screen === "voice-home" && (
        <VoiceHomeScreen
          stats={stats}
          onBack={() => go("care-home")}
          onBuat={() => go("isi-voice")}
          onRiwayat={goRiwayat}
        />
      )}
      {screen === "isi-voice" && (
        <IsiVoiceScreen
          draft={draft}
          setDraft={setDraft}
          errors={errors}
          locCheck={locCheck}
          onCheckLocation={checkLocation}
          onPhotoChange={onPhotoChange}
          onBack={() => go("voice-home")}
          onSubmit={submitForm}
        />
      )}
      {screen === "preview" && (
        <PreviewScreen draft={draft} onBack={() => go("isi-voice")} onSubmit={startAiProcessing} />
      )}
      {screen === "ai-processing" && <AiProcessingScreen state={aiState} />}
      {screen === "riwayat" && (
        <RiwayatScreen
          voices={filteredVoices}
          filter={filter}
          setFilter={goRiwayat}
          onBack={() => go("voice-home")}
          onOpen={(id) => {
            setCurrentId(id);
            go("detail");
          }}
        />
      )}
      {screen === "detail" && currentVoice && (
        <div className="flex h-full flex-col">
          <AppHeader title="Pantau Progress" sub="Detail & progres voice" onBack={() => go("riwayat")} />
          <ContentScroll>
            <VoiceTrackingDetail voice={currentVoice} events={events} onChanged={refetch} />
          </ContentScroll>
        </div>
      )}
    </PhoneFrame>
  );
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/* ---------------------------------------------------------------------- */

function MyTmminScreen({ onOpenCare }: { onOpenCare: () => void }) {
  const tiles = [
    ["🕐", "Presensi"], ["✈️", "Perjalanan Dinas"], ["🏦", "BCA"], ["💴", "Slip Gaji"],
    ["💳", "Pinjaman"], ["🎁", "Tunjangan"], ["📈", "Perkembangan"], ["📄", "CPE, COP, Izin COF"],
    ["📋", "Surat Keterangan"], ["🔗", "Koneksi Bros"], ["📅", "Kalender Event"],
  ];
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-none gap-1.5 overflow-x-auto bg-gradient-to-br from-[#c8102e] to-[#8f0d21] px-3.5 py-3">
        {["Integrity", "Yuusu", "5S", "Overtime", "Empowerment", "Teamwork", "Best 5 in First"].map((s) => (
          <span key={s} className="whitespace-nowrap rounded-lg bg-white/20 px-2.5 py-1 text-[10px] font-bold text-white">
            {s}
          </span>
        ))}
      </div>
      <ContentScroll>
        <div className="grid grid-cols-4 gap-3.5">
          {tiles.map(([ic, label]) => (
            <div key={label} className="flex flex-col items-center gap-1.5 rounded-xl px-0.5 py-1.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef2fd] text-xl text-[#2b57c9]">
                {ic}
              </div>
              <span className="text-center text-[10.5px] font-semibold leading-tight text-gray-600">{label}</span>
            </div>
          ))}
          <div
            onClick={onOpenCare}
            className="flex cursor-pointer flex-col items-center gap-1.5 rounded-xl px-0.5 py-1.5"
          >
            <div className="flex h-12 w-12 animate-pulse items-center justify-center rounded-2xl bg-gradient-to-br from-[#1f9d55] to-[#0f7a3d] text-xl text-white shadow-[0_0_0_4px_rgba(31,157,85,0.18)]">
              🤝
            </div>
            <span className="text-center text-[10.5px] font-extrabold leading-tight text-[#1f9d55]">CARE</span>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-dashed border-gray-200 bg-white px-3 py-2.5 text-[11.5px] text-gray-600">
          💡 Ketuk ikon <b>CARE</b> yang berkedip untuk mengakses menu CARE Voice.
        </div>
      </ContentScroll>
    </div>
  );
}

function CareHomeScreen({ onOpenVoice }: { onOpenVoice: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-none bg-gradient-to-br from-[#16296b] to-[#1c3f91] px-4.5 pb-6.5 pt-5.5 text-white">
        <div className="mb-2.5 flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-xl">🤝</div>
        <h1 className="m-0 mb-1 text-2xl tracking-wide">CARE</h1>
        <div className="text-[11px] font-semibold uppercase tracking-wide opacity-85">
          Connect &middot; Appreciate &middot; Respond &middot; Elevate
        </div>
        <div className="mt-2 text-xs leading-snug opacity-85">
          Satu platform untuk menyampaikan voice, mencatat aktivitas, dan membangun perbaikan bersama.
        </div>
      </div>
      <ContentScroll>
        <MenuCard icon="💬" iconBg="bg-[#eef2fd] text-[#2b57c9]" title="Voice" sub="Sampaikan masukan dan ide perbaikan Anda" onClick={onOpenVoice} />
        <MenuCard icon="🧾" iconBg="bg-[#fff2e3] text-[#f5821f]" title="TFT Logbook" sub="Catat aktivitas Time for Team" onClick={() => showToast("TFT Logbook belum tersedia di prototipe ini")} />
        <MenuCard icon="📝" iconBg="bg-[#e8f8ef] text-[#1f9d55]" title="Survey" sub="Isi survey dengan mudah" onClick={() => showToast("Survey belum tersedia di prototipe ini")} />
      </ContentScroll>
    </div>
  );
}

function MenuCard({ icon, iconBg, title, sub, onClick }: { icon: string; iconBg: string; title: string; sub: string; onClick: () => void }) {
  return (
    <div onClick={onClick} className="mb-3 flex cursor-pointer items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm">
      <div className={`flex h-10.5 w-10.5 flex-none items-center justify-center rounded-xl text-xl ${iconBg}`}>{icon}</div>
      <div className="flex-1">
        <b className="block text-sm">{title}</b>
        <small className="text-[11.5px] text-gray-600">{sub}</small>
      </div>
      <div className="text-gray-400">›</div>
    </div>
  );
}

function VoiceHomeScreen({
  stats, onBack, onBuat, onRiwayat,
}: {
  stats: { total: number; open: number; verification: number; progress: number; closed: number };
  onBack: () => void; onBuat: () => void; onRiwayat: (f: VoiceStatus | "semua") => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <AppHeader title="Voice" sub="Sampaikan masukan dan ide Anda" onBack={onBack} />
      <ContentScroll>
        <div onClick={onBuat} className="mb-2.5 flex cursor-pointer items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm">
          <div className="flex h-10.5 w-10.5 items-center justify-center rounded-xl bg-gradient-to-br from-[#2b57c9] to-[#1d3f9e] text-lg text-white">✏️</div>
          <div className="flex-1"><b className="block text-sm">Buat Voice</b><small className="text-[11.5px] text-gray-600">Sampaikan voice Anda</small></div>
          <div className="text-gray-400">›</div>
        </div>
        <div onClick={() => onRiwayat("semua")} className="mb-2.5 flex cursor-pointer items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm">
          <div className="flex h-10.5 w-10.5 items-center justify-center rounded-xl bg-gradient-to-br from-[#1f9d55] to-[#0f7a3d] text-lg text-white">🕓</div>
          <div className="flex-1"><b className="block text-sm">Riwayat</b><small className="text-[11.5px] text-gray-600">Lihat status &amp; update voice</small></div>
          <div className="text-gray-400">›</div>
        </div>

        <div className="mb-2.5 mt-4.5 text-xs font-bold uppercase tracking-wide text-gray-600">Ringkasan Voice Saya</div>
        <div className="grid grid-cols-2 gap-2.5">
          <StatCard label="Total Voice" value={stats.total} color="text-[#16296b]" onClick={() => onRiwayat("semua")} />
          <StatCard label="Open" value={stats.open} color="text-[#e0263d]" onClick={() => onRiwayat("open")} />
          <StatCard label="In Verification" value={stats.verification} color="text-[#c98a00]" onClick={() => onRiwayat("verification")} />
          <StatCard label="In Progress" value={stats.progress} color="text-[#2b57c9]" onClick={() => onRiwayat("progress")} />
          <StatCard label="Closed" value={stats.closed} color="text-[#1f9d55]" onClick={() => onRiwayat("closed")} />
        </div>
      </ContentScroll>
    </div>
  );
}

function StatCard({ label, value, color, onClick }: { label: string; value: number; color: string; onClick: () => void }) {
  return (
    <div onClick={onClick} className="cursor-pointer rounded-2xl border border-gray-200 bg-white p-3">
      <div className={`text-[22px] font-extrabold ${color}`}>{value}</div>
      <div className="mt-0.5 text-[11px] font-semibold text-gray-600">{label}</div>
    </div>
  );
}

function IsiVoiceScreen({
  draft, setDraft, errors, locCheck, onCheckLocation, onPhotoChange, onBack, onSubmit,
}: {
  draft: Draft; setDraft: React.Dispatch<React.SetStateAction<Draft>>;
  errors: Record<string, boolean>; locCheck: LocationCheckResult | null;
  onCheckLocation: (v: string) => void; onPhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBack: () => void; onSubmit: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <AppHeader title="Isi Voice" sub="Form sederhana — lengkapi detail Anda" onBack={onBack} />
      <ContentScroll>
        <Field label="Area">
          <select value={draft.area} onChange={(e) => setDraft((d) => ({ ...d, area: e.target.value }))} className="input">
            <option value="">Pilih Area</option>
            {["KRW 1", "KRW 2", "KRW 3", "STR 1", "STR 2"].map((a) => <option key={a}>{a}</option>)}
          </select>
        </Field>

        <Field label="Detail Lokasi">
          <input
            type="text" value={draft.lokasi}
            onChange={(e) => setDraft((d) => ({ ...d, lokasi: e.target.value }))}
            onBlur={(e) => e.target.value && onCheckLocation(e.target.value)}
            placeholder="Contoh: Depan Line 2, Dekat Mesin X" className="input"
          />
          <button onClick={() => onCheckLocation(draft.lokasi)} className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg bg-[#eef2fd] px-2.5 py-1.5 text-[11px] font-bold text-[#2b57c9]">
            🤖 Cek kelengkapan lokasi (AI)
          </button>
          {locCheck ? (
            <div className={`mt-2 rounded-xl border px-2.5 py-2.5 text-[11.5px] ${locCheck.ok ? "border-[#bfe8cf] bg-[#e8f8ef] text-[#146c37]" : "border-[#f6d3ab] bg-[#fff2e3] text-[#8a4d10]"}`}>
              {locCheck.ok ? "✅ AI: lokasi sudah cukup detail." : (
                <>
                  ⚠️ AI mendeteksi lokasi kurang lengkap:
                  <ul className="ml-4 mt-1.5 list-disc">
                    {locCheck.issues.map((i) => <li key={i}>{i}</li>)}
                  </ul>
                </>
              )}
            </div>
          ) : null}
          {errors.lokasi ? <div className="mt-1 text-[11px] text-[#e0263d]">Detail lokasi wajib diisi.</div> : null}
        </Field>

        <Field label="Detail Voice">
          <textarea
            value={draft.detail} onChange={(e) => setDraft((d) => ({ ...d, detail: e.target.value }))}
            placeholder="Jelaskan kondisi/hambatan yang terjadi secara spesifik dan jelas." className="input min-h-[80px]"
          />
          {errors.detail ? <div className="mt-1 text-[11px] text-[#e0263d]">Detail voice wajib diisi.</div> : null}
        </Field>

        <Field label={<>Foto <span className="font-bold text-[#e0263d]">*wajib</span></>}>
          <label className="block cursor-pointer rounded-xl border-[1.5px] border-dashed border-gray-200 bg-white p-4 text-center text-xs text-gray-600">
            📷 Tambah Foto — JPG, PNG (Maks. 5 MB)
            <input type="file" accept="image/*" onChange={onPhotoChange} className="hidden" />
          </label>
          {draft.photoPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={draft.photoPreview} alt="Preview" className="mt-2.5 max-h-[140px] w-full rounded-xl object-cover" />
          ) : null}
          {errors.photo ? <div className="mt-1 text-[11px] text-[#e0263d]">Foto wajib dilampirkan.</div> : null}
        </Field>

        <Field label="Identity Preference">
          <div className="flex overflow-hidden rounded-xl border border-gray-200">
            {(["ya", "tidak"] as const).map((val) => (
              <button
                key={val}
                onClick={() => setDraft((d) => ({ ...d, identity: val }))}
                className={`flex-1 py-2.5 text-[12.5px] font-bold ${draft.identity === val ? "bg-[#2b57c9] text-white" : "bg-white text-gray-600"}`}
              >
                {val === "ya" ? "Ya (Open Identity)" : "Tidak (Anonim)"}
              </button>
            ))}
          </div>
        </Field>

        <button onClick={onSubmit} className="w-full rounded-xl bg-gradient-to-br from-[#2b57c9] to-[#1d3f9e] py-3.5 text-sm font-bold text-white">
          Review Voice
        </button>
      </ContentScroll>
    </div>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-3.5">
      <label className="mb-1.5 block text-[12.5px] font-bold text-gray-900">{label}</label>
      {children}
    </div>
  );
}

function PreviewScreen({ draft, onBack, onSubmit }: { draft: Draft; onBack: () => void; onSubmit: () => void }) {
  const rows: [string, string][] = [
    ["Area", draft.area],
    ["Detail Lokasi", draft.lokasi],
    ["Detail Voice", draft.detail],
    ["Identity Preference", draft.identity === "ya" ? "Open Identity" : "Anonim"],
  ];
  return (
    <div className="flex h-full flex-col">
      <AppHeader title="Review Preview" sub="Periksa kembali sebelum dikirim" onBack={onBack} />
      <ContentScroll>
        <div className="mb-3.5 flex gap-2 rounded-xl border border-[#bfe8cf] bg-[#e8f8ef] px-3 py-2.5 text-xs text-[#146c37]">
          ✅ Mohon periksa kembali data Anda. Pastikan sudah sesuai sebelum dikirim.
        </div>
        {draft.photoPreview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={draft.photoPreview} alt="Preview" className="mb-3.5 max-h-[150px] w-full rounded-xl object-cover" />
        ) : null}
        <div className="mb-3.5 overflow-hidden rounded-2xl border border-gray-200 bg-white">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-2.5 border-b border-gray-100 px-3.5 py-2.5 text-[12.5px] last:border-b-0">
              <div className="w-2/5 flex-none text-gray-600">{k}</div>
              <div className="flex-1 text-right font-semibold">{v}</div>
            </div>
          ))}
        </div>
        <div className="mb-3.5 rounded-xl bg-[#eef2fd] px-3 py-2.5 text-[11.5px] text-[#1c3f91]">
          ℹ️ Anda masih bisa kembali (Back) untuk merevisi data jika diperlukan.
        </div>
        <div className="flex gap-2.5">
          <button onClick={onBack} className="flex-1 rounded-xl border border-gray-200 bg-white py-3 text-sm font-bold text-[#16296b]">Back</button>
          <button onClick={onSubmit} className="flex-1 rounded-xl bg-gradient-to-br from-[#2b57c9] to-[#1d3f9e] py-3 text-sm font-bold text-white">📨 Submit Voice</button>
        </div>
      </ContentScroll>
    </div>
  );
}

function AiProcessingScreen({ state }: { state: { step1: boolean; step2: boolean; step3: boolean; kategori: string; pic: string; severity: string } }) {
  const steps = [
    { done: state.step1, icon: "🧠", title: "AI Analisis Konten", desc: "Memahami isi voice, cek kelengkapan informasi, ekstrak detail lokasi…", result: state.step1 ? `✅ Konten dipahami, informasi lengkap. Kategori terdeteksi: ${state.kategori}.` : "" },
    { done: state.step2, icon: "🧭", title: "AI Auto Routing ke PIC", desc: "Menentukan PIC paling tepat berdasarkan kategori, lokasi, & beban kerja…", result: state.step2 ? `✅ Diteruskan ke ${state.pic} (${state.kategori}).` : "" },
    { done: state.step3, icon: "📊", title: "AI Klasifikasi Severity", desc: "Menentukan tingkat severity voice (Low / Medium / High / Critical)…", result: state.step3 ? `✅ Severity: ${state.severity}.` : "" },
  ];
  return (
    <div className="flex h-full flex-col">
      <AppHeader title="Memproses Voice" sub="Sistem sedang menganalisis voice Anda" />
      <ContentScroll>
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          {steps.map((s, i) => (
            <div key={s.title} className={`flex gap-3 border-b border-gray-100 py-3 last:border-b-0 ${s.done || (i === 0) ? "opacity-100" : "opacity-40"}`}>
              <div className={`flex h-8.5 w-8.5 flex-none items-center justify-center rounded-xl text-base ${s.done ? "bg-[#e8f8ef] text-[#1f9d55]" : "bg-[#eef2fd] text-[#2b57c9]"}`}>{s.icon}</div>
              <div>
                <div className="text-[13px] font-bold">{s.title}</div>
                <div className="mt-0.5 text-[11.5px] text-gray-600">{s.desc}</div>
                {s.result ? <div className="mt-1 text-[11.5px] font-bold text-[#1f9d55]">{s.result}</div> : null}
              </div>
            </div>
          ))}
        </div>
      </ContentScroll>
    </div>
  );
}

function RiwayatScreen({
  voices, filter, setFilter, onBack, onOpen,
}: {
  voices: Voice[]; filter: VoiceStatus | "semua"; setFilter: (f: VoiceStatus | "semua") => void;
  onBack: () => void; onOpen: (id: string) => void;
}) {
  const chips: { key: VoiceStatus | "semua"; label: string; activeCls: string }[] = [
    { key: "semua", label: "Semua", activeCls: "bg-[#16296b] border-[#16296b]" },
    { key: "open", label: "Open", activeCls: "bg-[#e0263d] border-[#e0263d]" },
    { key: "verification", label: "In Verification", activeCls: "bg-[#c98a00] border-[#c98a00]" },
    { key: "progress", label: "In Progress", activeCls: "bg-[#2b57c9] border-[#2b57c9]" },
    { key: "closed", label: "Closed", activeCls: "bg-[#1f9d55] border-[#1f9d55]" },
  ];
  return (
    <div className="flex h-full flex-col">
      <AppHeader title="Riwayat Voice" sub="Pantau progres voice Anda" onBack={onBack} />
      <ContentScroll>
        <div className="mb-3.5 flex gap-1.5 overflow-x-auto pb-1">
          {chips.map((c) => (
            <button
              key={c.key} onClick={() => setFilter(c.key)}
              className={`flex-none whitespace-nowrap rounded-full border px-3 py-1.5 text-[11.5px] font-bold ${
                filter === c.key ? `${c.activeCls} text-white` : "border-gray-200 bg-white text-gray-600"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        {voices.length === 0 ? (
          <div className="py-10 text-center text-[12.5px] text-gray-400">Belum ada voice pada kategori ini.</div>
        ) : (
          voices.map((v) => (
            <div key={v.id} onClick={() => onOpen(v.id)} className="mb-2.5 cursor-pointer rounded-2xl border border-gray-200 bg-white p-3.5">
              <div className="mb-1.5 flex items-start justify-between gap-2">
                <div className="text-[13.5px] font-bold text-gray-900">{v.judul}{v.reopened ? <ReopenTag /> : null}</div>
                <StatusTag status={v.status} />
              </div>
              <div className="text-[11px] text-gray-600">{v.area} • {v.kategori}</div>
              <div className="mt-1 text-[10.5px] text-gray-400">ID: {v.id} &middot; {fmtDate(v.created_at)}</div>
            </div>
          ))
        )}
      </ContentScroll>
    </div>
  );
}
