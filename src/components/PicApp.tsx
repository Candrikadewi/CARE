"use client";

import { useEffect, useMemo, useState } from "react";
import PhoneFrame, { AppHeader, ContentScroll } from "./PhoneFrame";
import { addEvent, fetchVoiceEvents, updateVoice, uploadPhoto } from "@/lib/api";
import { showToast } from "@/lib/toast";
import { fmtDate } from "@/lib/format";
import {
  DEPTS, SECTION_HEADS, STATUS_LABEL, STATUS_ORDER,
  type Severity, type Voice, type VoiceEvent, type VoiceStatus,
} from "@/lib/types";
import { Pill, ReopenTag, SeverityPill, StatusTag, StatusTrack, Timeline } from "./StatusBits";
import VoiceTrackingDetail from "./VoiceTrackingDetail";

type Screen = "pic-beranda" | "pic-list" | "pic-detail" | "pic-my-list" | "pic-my-detail";

const STATUS_COLOR: Record<VoiceStatus, string> = {
  open: "#e0263d",
  verification: "#c98a00",
  progress: "#2b57c9",
  closed: "#1f9d55",
};

export default function PicApp({
  voices, refetch, onBuatVoice,
}: {
  voices: Voice[]; refetch: () => void; onBuatVoice: () => void;
}) {
  const [screen, setScreen] = useState<Screen>("pic-beranda");
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [myCurrentId, setMyCurrentId] = useState<string | null>(null);
  const [events, setEvents] = useState<VoiceEvent[]>([]);
  const [myFilter, setMyFilter] = useState<VoiceStatus | "semua">("semua");

  useEffect(() => {
    const id = screen === "pic-detail" ? currentId : screen === "pic-my-detail" ? myCurrentId : null;
    if (id) fetchVoiceEvents(id).then(setEvents).catch(() => setEvents([]));
  }, [screen, currentId, myCurrentId, voices]);

  const currentVoice = useMemo(() => voices.find((v) => v.id === currentId) ?? null, [voices, currentId]);
  const myVoice = useMemo(() => voices.find((v) => v.id === myCurrentId) ?? null, [voices, myCurrentId]);

  return (
    <PhoneFrame>
      {screen === "pic-beranda" && (
        <BerandaScreen
          voices={voices}
          onList={() => setScreen("pic-list")}
          onMyList={() => setScreen("pic-my-list")}
          onBuat={onBuatVoice}
        />
      )}
      {screen === "pic-list" && (
        <ListScreen
          voices={voices}
          onBack={() => setScreen("pic-beranda")}
          onOpen={(id) => { setCurrentId(id); setScreen("pic-detail"); }}
        />
      )}
      {screen === "pic-detail" && currentVoice && (
        <DetailScreen
          voice={currentVoice} events={events}
          onBack={() => setScreen("pic-list")}
          onChanged={refetch}
        />
      )}
      {screen === "pic-my-list" && (
        <MyListScreen
          voices={voices.filter((v) => v.mine)}
          filter={myFilter} setFilter={setMyFilter}
          onBack={() => setScreen("pic-beranda")}
          onOpen={(id) => { setMyCurrentId(id); setScreen("pic-my-detail"); }}
        />
      )}
      {screen === "pic-my-detail" && myVoice && (
        <div className="flex h-full flex-col">
          <AppHeader title="Pantau Progress" sub="Voice Saya" onBack={() => setScreen("pic-my-list")} />
          <ContentScroll>
            <VoiceTrackingDetail voice={myVoice} events={events} onChanged={refetch} />
          </ContentScroll>
        </div>
      )}
    </PhoneFrame>
  );
}

/* ---------------------------------------------------------------------- */

function BerandaScreen({
  voices, onList, onMyList, onBuat,
}: { voices: Voice[]; onList: () => void; onMyList: () => void; onBuat: () => void }) {
  const counts = useMemo(() => {
    const c: Record<VoiceStatus, number> = { open: 0, verification: 0, progress: 0, closed: 0 };
    voices.forEach((v) => (c[v.status] += 1));
    return c;
  }, [voices]);
  const total = voices.length || 1;

  const stops: string[] = [];
  let acc = 0;
  STATUS_ORDER.forEach((k) => {
    const pct = (counts[k] / total) * 100;
    stops.push(`${STATUS_COLOR[k]} ${acc.toFixed(2)}% ${(acc + pct).toFixed(2)}%`);
    acc += pct;
  });

  const deptData = useMemo(() => {
    const d: Record<string, Record<VoiceStatus, number>> = {};
    DEPTS.forEach((dep) => (d[dep] = { open: 0, verification: 0, progress: 0, closed: 0 }));
    voices.forEach((v) => { if (d[v.dept]) d[v.dept][v.status] += 1; });
    return d;
  }, [voices]);
  const maxTotal = Math.max(
    ...DEPTS.map((d) => Object.values(deptData[d]).reduce((a, b) => a + b, 0)),
    1
  );

  const openCount = counts.open;

  return (
    <div className="flex h-full flex-col">
      <AppHeader
        title="CARE Voice – Manager" sub="Beranda Voice"
        right={
          <div className="relative flex h-8.5 w-8.5 flex-none items-center justify-center rounded-xl bg-white/10 text-base">
            🔔
            {openCount > 0 ? (
              <span className="absolute -right-1 -top-1 min-w-[15px] rounded-full bg-[#e0263d] px-1 text-center text-[9px] font-bold text-white">{openCount}</span>
            ) : null}
          </div>
        }
      />
      <ContentScroll>
        <div className="mb-3.5 rounded-2xl border border-gray-200 bg-white p-3.5">
          <h4 className="mb-3 text-[13px] font-bold">Progress Voice (Divisi)</h4>
          <div className="flex items-center gap-4">
            <div className="h-[104px] w-[104px] flex-none rounded-full" style={{ background: `conic-gradient(${stops.join(",")})` }} />
            <div className="flex-1 text-[11.5px]">
              {STATUS_ORDER.map((k) => (
                <div key={k} className="mb-1.5 flex items-center justify-between gap-1.5 last:mb-0">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: STATUS_COLOR[k] }} />
                    {STATUS_LABEL[k]}
                  </span>
                  <b>{Math.round((counts[k] / total) * 100)}%</b>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-3.5 rounded-2xl border border-gray-200 bg-white p-3.5">
          <h4 className="mb-3 text-[13px] font-bold">Progress per Departemen (Divisi)</h4>
          <div className="flex items-end gap-2.5">
            {DEPTS.map((d) => {
              const dd = deptData[d];
              return (
                <div key={d} className="flex flex-1 flex-col">
                  <div className="flex h-[110px] flex-col-reverse overflow-hidden rounded-t bg-gray-100">
                    {STATUS_ORDER.map((k) => {
                      const h = maxTotal ? (dd[k] / maxTotal) * 100 : 0;
                      return h > 0 ? <div key={k} style={{ height: `${h}%`, background: STATUS_COLOR[k] }} /> : null;
                    })}
                  </div>
                  <div className="mt-1.5 text-center text-[8.5px] font-bold text-gray-600">{d}</div>
                </div>
              );
            })}
          </div>
        </div>

        <SummaryBox letter="A" title="Summary Voice Member" list={voices} />
        <SummaryBox letter="B" title="Summary Voice Saya" list={voices.filter((v) => v.mine)} />

        <button onClick={onBuat} className="mb-3.5 w-full rounded-xl bg-gradient-to-br from-[#2b57c9] to-[#1d3f9e] py-3.5 text-sm font-bold text-white">
          ➕ Buat Voice
        </button>
        <div className="mb-2.5 text-xs font-bold uppercase tracking-wide text-gray-600">Riwayat</div>
        <div className="flex gap-2.5">
          <button onClick={onList} className="flex-1 rounded-xl border border-gray-200 bg-white py-3 text-[13px] font-bold text-[#16296b]">👥 Riwayat Voice Member</button>
          <button onClick={onMyList} className="flex-1 rounded-xl border border-gray-200 bg-white py-3 text-[13px] font-bold text-[#16296b]">👤 Riwayat Voice Saya</button>
        </div>
      </ContentScroll>
    </div>
  );
}

function SummaryBox({ letter, title, list }: { letter: string; title: string; list: Voice[] }) {
  const c: Record<VoiceStatus, number> = { open: 0, verification: 0, progress: 0, closed: 0 };
  const sev: Record<Severity, number> = { Low: 0, Medium: 0, High: 0, Critical: 0 };
  list.forEach((v) => { c[v.status] += 1; sev[v.severity] += 1; });
  return (
    <div className="mb-3.5 rounded-2xl border border-gray-200 bg-white p-3.5">
      <h4 className="mb-2.5 flex items-center gap-2 text-[13px] font-bold">
        <span className="flex h-5 w-5 flex-none items-center justify-center rounded-md bg-[#16296b] text-[11px] font-extrabold text-white">{letter}</span>
        {title}
      </h4>
      <div className="mb-2.5 text-2xl font-extrabold text-[#16296b]">
        {list.length} <span className="text-[11px] font-semibold text-gray-600">Total Voice</span>
      </div>
      <div className="mb-2 flex flex-wrap gap-2">
        <Chip n={sev.Low} l="Low" color="text-[#1f9d55]" />
        <Chip n={sev.Medium} l="Medium" color="text-[#c98a00]" />
        <Chip n={sev.High} l="High" color="text-[#f5821f]" />
        <Chip n={sev.Critical} l="Critical" color="text-[#8f1230]" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Chip n={c.open} l="Open" color="text-[#e0263d]" />
        <Chip n={c.verification} l="Verif." color="text-[#c98a00]" />
        <Chip n={c.progress} l="Progress" color="text-[#2b57c9]" />
        <Chip n={c.closed} l="Closed" color="text-[#1f9d55]" />
      </div>
    </div>
  );
}

function Chip({ n, l, color }: { n: number; l: string; color: string }) {
  return (
    <div className="min-w-[58px] flex-1 rounded-lg bg-gray-100 px-1 py-1.5 text-center">
      <div className={`text-sm font-extrabold ${color}`}>{n}</div>
      <div className="mt-0.5 text-[8.5px] font-bold text-gray-600">{l}</div>
    </div>
  );
}

function ListScreen({ voices, onBack, onOpen }: { voices: Voice[]; onBack: () => void; onOpen: (id: string) => void }) {
  const [status, setStatus] = useState<VoiceStatus | "semua">("semua");
  const [sort, setSort] = useState<"terbaru" | "terlama">("terbaru");
  const [q, setQ] = useState("");

  const items = useMemo(() => {
    let arr = voices.slice();
    if (status !== "semua") arr = arr.filter((v) => v.status === status);
    if (q.trim()) arr = arr.filter((v) => v.judul.toLowerCase().includes(q.trim().toLowerCase()));
    arr.sort((a, b) =>
      sort === "terbaru"
        ? +new Date(b.created_at) - +new Date(a.created_at)
        : +new Date(a.created_at) - +new Date(b.created_at)
    );
    return arr;
  }, [voices, status, sort, q]);

  return (
    <div className="flex h-full flex-col">
      <AppHeader
        title="Voice Member Masuk"
        sub={`Menampilkan ${items.length} voice${status !== "semua" ? ` dengan status ${STATUS_LABEL[status]}` : ""}.`}
        onBack={onBack}
      />
      <ContentScroll>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 Cari judul voice..." className="input mb-2.5" />
        <div className="mb-3.5 flex gap-2">
          <select value={status} onChange={(e) => setStatus(e.target.value as VoiceStatus | "semua")} className="input">
            <option value="semua">Semua Status</option>
            {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as "terbaru" | "terlama")} className="input">
            <option value="terbaru">Terbaru</option>
            <option value="terlama">Terlama</option>
          </select>
        </div>
        {items.length === 0 ? (
          <div className="py-10 text-center text-[12.5px] text-gray-400">Tidak ada voice yang cocok.</div>
        ) : (
          items.map((v) => (
            <div key={v.id} onClick={() => onOpen(v.id)} className="mb-2.5 cursor-pointer rounded-2xl border border-gray-200 bg-white p-3.5">
              <div className="mb-1.5 flex items-start justify-between gap-2">
                <div className="text-[13.5px] font-bold text-gray-900">{v.judul}{v.reopened ? <ReopenTag /> : null}</div>
                <StatusTag status={v.status} />
              </div>
              <div className="text-[11px] text-gray-600">{v.kategori} • {v.area} – {v.dept}</div>
              <div className="mt-1 text-[10.5px] text-gray-400">{v.id} &middot; {fmtDate(v.created_at)}</div>
            </div>
          ))
        )}
      </ContentScroll>
    </div>
  );
}

function MyListScreen({
  voices, filter, setFilter, onBack, onOpen,
}: {
  voices: Voice[]; filter: VoiceStatus | "semua"; setFilter: (f: VoiceStatus | "semua") => void;
  onBack: () => void; onOpen: (id: string) => void;
}) {
  const items = filter === "semua" ? voices : voices.filter((v) => v.status === filter);
  const chips: { key: VoiceStatus | "semua"; label: string; activeCls: string }[] = [
    { key: "semua", label: "Semua", activeCls: "bg-[#16296b] border-[#16296b]" },
    { key: "open", label: "Open", activeCls: "bg-[#e0263d] border-[#e0263d]" },
    { key: "verification", label: "In Verification", activeCls: "bg-[#c98a00] border-[#c98a00]" },
    { key: "progress", label: "In Progress", activeCls: "bg-[#2b57c9] border-[#2b57c9]" },
    { key: "closed", label: "Closed", activeCls: "bg-[#1f9d55] border-[#1f9d55]" },
  ];
  return (
    <div className="flex h-full flex-col">
      <AppHeader title="Riwayat Voice Saya" sub="Voice yang Anda ajukan sendiri" onBack={onBack} />
      <ContentScroll>
        <div className="mb-3.5 flex gap-1.5 overflow-x-auto pb-1">
          {chips.map((c) => (
            <button key={c.key} onClick={() => setFilter(c.key)}
              className={`flex-none whitespace-nowrap rounded-full border px-3 py-1.5 text-[11.5px] font-bold ${filter === c.key ? `${c.activeCls} text-white` : "border-gray-200 bg-white text-gray-600"}`}>
              {c.label}
            </button>
          ))}
        </div>
        {items.length === 0 ? (
          <div className="py-10 text-center text-[12.5px] text-gray-400">Belum ada voice yang Anda ajukan.</div>
        ) : (
          items.map((v) => (
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

/* ------------------------------- Detail Voice --------------------------- */

function DetailScreen({
  voice, events, onBack, onChanged,
}: { voice: Voice; events: VoiceEvent[]; onBack: () => void; onChanged: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <AppHeader title="Detail Voice" sub="Tindak lanjuti voice member" onBack={onBack} />
      <ContentScroll>
        <div className="mb-3.5 rounded-2xl border border-gray-200 bg-white p-4">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <StatusTag status={voice.status} />
            <Pill>{voice.kategori} • {voice.dept}</Pill>
            <SeverityPill severity={voice.severity} />
            {voice.reopened ? <ReopenTag /> : null}
          </div>
          <div className="mb-1.5 text-[15px] font-extrabold">{voice.judul}</div>
          <div className="text-[11px] text-gray-400">ID: {voice.id}</div>
          <div className="mt-1 text-[11px] text-gray-400">🗓 {fmtDate(voice.created_at)}</div>
          <div className="mt-1 text-[11px] text-gray-400">👤 Reporter: {voice.identity ? voice.reporter : "Anonim"}</div>
          {voice.lokasi ? <div className="mt-1 text-[11px] text-gray-400">📍 {voice.lokasi}</div> : null}
          {voice.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={voice.photo_url} alt="Bukti foto" className="mt-2.5 max-h-[150px] w-full rounded-xl object-cover" />
          ) : null}
          <div className="mt-2.5 text-[12.5px] text-gray-600">{voice.detail}</div>
        </div>

        <div className="mb-3.5 rounded-2xl border border-gray-200 bg-white p-4">
          <StatusTrack status={voice.status} />
        </div>

        {voice.status === "open" && <OpenActions voice={voice} onChanged={onChanged} />}
        {voice.status === "verification" && <VerificationActions voice={voice} onChanged={onChanged} />}
        {voice.status === "progress" && <ProgressActions voice={voice} onChanged={onChanged} />}
        {voice.status === "closed" && <ClosedSummary voice={voice} />}

        <div className="mb-3.5 rounded-2xl border border-gray-200 bg-white p-4">
          <Timeline events={events} />
        </div>
      </ContentScroll>
    </div>
  );
}

function OpenActions({ voice, onChanged }: { voice: Voice; onChanged: () => void }) {
  const [action, setAction] = useState<"" | "tanya" | "proceed" | "assign">("");
  const [target, setTarget] = useState<string>(SECTION_HEADS[0]);
  const [notes, setNotes] = useState("");
  const [showError, setShowError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!action || !notes.trim()) {
      setShowError(true);
      showToast("Pilih aksi dan isi catatan terlebih dahulu.");
      return;
    }
    setBusy(true);
    try {
      if (action === "tanya") {
        await updateVoice(voice.id, { status: "verification", verif_reason: "clarify" });
        await addEvent(voice.id, "PIC menanyakan klarifikasi", `${voice.handler_role || "Manager"}: ${voice.handler || voice.pic}`, notes.trim());
        showToast("Pertanyaan dikirim ke reporter. Status → In Verification.");
      } else if (action === "proceed") {
        const handler = voice.handler || voice.pic || "";
        await updateVoice(voice.id, { status: "progress", handler, handler_role: "Manager" });
        await addEvent(voice.id, "Manager menangani voice ini secara langsung", `Manager: ${handler}`, notes.trim());
        showToast("Voice diterima. Status → In Progress.");
      } else if (action === "assign") {
        await updateVoice(voice.id, { status: "verification", verif_reason: "assigned", handler: target, handler_role: "Section Head" });
        await addEvent(voice.id, `Manager assign ke Section Head: ${target}`, "Manager", notes.trim());
        showToast(`Voice ditugaskan ke ${target}. Status → In Verification.`);
      }
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-3.5 rounded-2xl border border-gray-200 bg-white p-4">
      <h4 className="mb-2.5 text-[13px] font-bold">Pilih Aksi</h4>
      <select value={action} onChange={(e) => setAction(e.target.value as typeof action)} className="input">
        <option value="">Pilih Aksi</option>
        <option value="tanya">Tanya User</option>
        <option value="proceed">Proceed</option>
        <option value="assign">Assign PIC</option>
      </select>
      {action === "assign" ? (
        <select value={target} onChange={(e) => setTarget(e.target.value)} className="input">
          {SECTION_HEADS.map((h) => <option key={h}>{h}</option>)}
        </select>
      ) : null}
      <label className="mb-1.5 block text-[12.5px] font-bold text-gray-900">
        Catatan / Notes <span className="font-bold text-[#e0263d]">*</span>
      </label>
      <textarea
        value={notes}
        onChange={(e) => { setNotes(e.target.value); setShowError(false); }}
        placeholder="Tulis catatan..." className="input mb-2 min-h-[70px]"
      />
      {showError ? <div className="mb-2 text-[11px] text-[#e0263d]">Pilih aksi dan isi catatan terlebih dahulu.</div> : null}
      <button disabled={busy} onClick={send} className="mt-1.5 w-full rounded-xl bg-gradient-to-br from-[#2b57c9] to-[#1d3f9e] py-3 text-sm font-bold text-white disabled:opacity-60">
        📨 Send
      </button>
    </div>
  );
}

function VerificationActions({ voice, onChanged }: { voice: Voice; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const assigned = voice.verif_reason === "assigned";
  async function proceedFromVerification() {
    setBusy(true);
    try {
      await updateVoice(voice.id, { status: "progress" });
      await addEvent(
        voice.id,
        assigned ? "Section Head mulai menangani voice (In Progress)" : "Klarifikasi selesai, PIC mulai menangani voice",
        `${voice.handler_role || "Manager"}: ${voice.handler || voice.pic}`
      );
      showToast("Status → In Progress.");
      onChanged();
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mb-3.5 rounded-2xl border border-gray-200 bg-white p-4">
      <h4 className="mb-2.5 text-[13px] font-bold">Alur Status</h4>
      <p className="mb-2.5 text-xs text-gray-600">
        {assigned ? (
          <>Ditangani oleh Section Head: <b>{voice.handler}</b>. Menunggu Section Head memulai penanganan.</>
        ) : (
          "Menunggu klarifikasi dari reporter atas pertanyaan yang dikirim."
        )}
      </p>
      <button disabled={busy} onClick={proceedFromVerification} className="w-full rounded-xl bg-gradient-to-br from-[#2b57c9] to-[#1d3f9e] py-3 text-sm font-bold text-white disabled:opacity-60">
        ✅ {assigned ? "Section Head Klik Proceed (Simulasi)" : "Klarifikasi Selesai, Mulai Tangani"}
      </button>
    </div>
  );
}

function ProgressActions({ voice, onChanged }: { voice: Voice; onChanged: () => void }) {
  const [updateText, setUpdateText] = useState("");
  const [closeNote, setCloseNote] = useState("");
  const [closePhotoFile, setClosePhotoFile] = useState<File | null>(null);
  const [closePhotoPreview, setClosePhotoPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function addUpdate() {
    if (!updateText.trim()) { showToast("Tulis update progress terlebih dahulu."); return; }
    setBusy(true);
    try {
      await addEvent(voice.id, "Update progress", `${voice.handler_role || "Manager"}: ${voice.handler || voice.pic}`, updateText.trim());
      showToast("Update progress ditambahkan.");
      setUpdateText("");
      onChanged();
    } finally { setBusy(false); }
  }

  function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setClosePhotoFile(f); setClosePhotoPreview(ev.target?.result as string); };
    reader.readAsDataURL(f);
  }

  async function markClosed() {
    if (!closeNote.trim() || !closePhotoFile) { showToast("Lengkapi catatan penutupan dan foto bukti."); return; }
    setBusy(true);
    try {
      const url = await uploadPhoto(closePhotoFile, "closures");
      await updateVoice(voice.id, { status: "closed", close_photo_url: url, close_note: closeNote.trim() });
      await addEvent(voice.id, "Voice ditutup oleh PIC (Mark Closed)", `${voice.handler_role || "Manager"}: ${voice.handler || voice.pic}`, closeNote.trim());
      showToast("Voice berhasil di-Mark Closed.");
      onChanged();
    } finally { setBusy(false); }
  }

  return (
    <>
      <div className="mb-3.5 rounded-2xl border border-gray-200 bg-white p-4">
        <h4 className="mb-2.5 text-[13px] font-bold">Tindakan / Progress</h4>
        <p className="mb-2 text-[11.5px] text-gray-600">
          Ditangani oleh {voice.handler_role}: <b>{voice.handler}</b>
        </p>
        <textarea value={updateText} onChange={(e) => setUpdateText(e.target.value)} placeholder="Tulis update progress..." className="input mb-2 min-h-[60px]" />
        <button disabled={busy} onClick={addUpdate} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-[12.5px] font-bold text-[#16296b] disabled:opacity-60">
          ➕ Tambah Update
        </button>
      </div>
      <div className="mb-3.5 rounded-2xl border border-gray-200 bg-white p-4">
        <h4 className="mb-2.5 text-[13px] font-bold">
          Aksi Penutupan <span className="font-normal text-gray-400">(hanya tersedia untuk handler)</span>
        </h4>
        <label className="mb-1.5 block text-[12.5px] font-bold text-gray-900">
          Catatan Penutupan <span className="font-bold text-[#e0263d]">*</span>
        </label>
        <textarea value={closeNote} onChange={(e) => setCloseNote(e.target.value)} placeholder="Tuliskan catatan penutupan..." className="input mb-2.5 min-h-[60px]" />
        <label className="mb-1.5 block text-[12.5px] font-bold text-gray-900">
          Upload Foto Bukti <span className="font-bold text-[#e0263d]">*</span>
        </label>
        <label className="block cursor-pointer rounded-xl border-[1.5px] border-dashed border-gray-200 bg-white p-4 text-center text-xs text-gray-600">
          📷 Tap untuk upload foto (JPG/PNG, maks. 5 MB)
          <input type="file" accept="image/*" onChange={onPhoto} className="hidden" />
        </label>
        {closePhotoPreview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={closePhotoPreview} alt="Preview" className="mt-2.5 max-h-[140px] w-full rounded-xl object-cover" />
        ) : null}
        <button
          disabled={busy || !closeNote.trim() || !closePhotoFile}
          onClick={markClosed}
          className="mt-2.5 w-full rounded-xl bg-gradient-to-br from-[#2b57c9] to-[#1d3f9e] py-3 text-sm font-bold text-white disabled:opacity-50"
        >
          ✅ Mark Closed
        </button>
      </div>
    </>
  );
}

function ClosedSummary({ voice }: { voice: Voice }) {
  return (
    <div className="mb-3.5 rounded-2xl border border-gray-200 bg-white p-4">
      <h4 className="mb-2.5 text-[13px] font-bold">✅ Voice berhasil di-Mark Closed</h4>
      {voice.close_photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={voice.close_photo_url} alt="Foto bukti" className="mb-2.5 max-h-[150px] w-full rounded-xl object-cover" />
      ) : null}
      {voice.close_note ? (
        <div className="mb-2.5 rounded-lg bg-gray-100 px-2.5 py-1.5 text-[11.5px] text-gray-600">{voice.close_note}</div>
      ) : null}
      <p className="mb-2.5 text-[11.5px] text-gray-600">
        🔔 Reporter akan menerima notifikasi untuk melakukan verifikasi penutupan.
      </p>
      {voice.rating > 0 ? (
        <>
          <div className="mb-1 flex gap-1.5 text-xl">
            {[1, 2, 3, 4, 5].map((n) => (
              <span key={n} className={n <= voice.rating ? "text-[#f5b400]" : "text-gray-200"}>★</span>
            ))}
          </div>
          {voice.feedback ? <div className="rounded-lg bg-gray-100 px-2.5 py-1.5 text-[11.5px] text-gray-600">{voice.feedback}</div> : null}
        </>
      ) : (
        <p className="text-xs text-gray-600">Menunggu rating dari pelapor.</p>
      )}
    </div>
  );
}
