"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchVoices, subscribeToVoiceChanges } from "@/lib/api";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { Voice } from "@/lib/types";
import PelaporApp from "@/components/PelaporApp";
import PicApp from "@/components/PicApp";
import Toast from "@/components/Toast";

type Role = "pelapor" | "pic";

export default function Home() {
  const [role, setRole] = useState<Role>("pelapor");
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fromPic, setFromPic] = useState(false);
  const [jumpKey, setJumpKey] = useState(0);

  const refetch = useCallback(() => {
    if (!isSupabaseConfigured) {
      setLoadError(
        "Supabase belum dikonfigurasi. Set NEXT_PUBLIC_SUPABASE_URL & NEXT_PUBLIC_SUPABASE_ANON_KEY."
      );
      setLoading(false);
      return;
    }
    fetchVoices()
      .then((v) => {
        setVoices(v);
        setLoadError(null);
      })
      .catch((err) => setLoadError(err?.message || "Gagal memuat data dari Supabase."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refetch();
    if (!isSupabaseConfigured) return;
    const unsubscribe = subscribeToVoiceChanges(refetch);
    return unsubscribe;
  }, [refetch]);

  function handleBuatVoiceFromPic() {
    setFromPic(true);
    setRole("pelapor");
    setJumpKey((t) => t + 1);
  }

  return (
    <div className="flex min-h-screen flex-col items-center px-4 pb-16 pt-7">
      <div className="mb-4 max-w-[720px] text-center">
        <h1 className="m-0 mb-1.5 text-[22px] font-bold text-[#16296b]">
          🤝 CARE — Voice Menu Flow
        </h1>
        <p className="m-0 text-[13.5px] text-gray-600">
          Pelapor mengajukan voice → AI menganalisis &amp; merutekan → Responder/PIC (Manager
          Level) menindaklanjuti. Data tersimpan di Supabase secara real-time.
        </p>
      </div>

      <div className="mb-5 flex gap-2 rounded-full bg-white p-1.5 shadow-lg">
        <button
          onClick={() => setRole("pelapor")}
          className={`flex items-center gap-1.5 rounded-full px-4.5 py-2.5 text-[13px] font-extrabold ${
            role === "pelapor" ? "bg-gradient-to-br from-[#16296b] to-[#1c3f91] text-white" : "text-gray-600"
          }`}
        >
          👤 Pelapor
        </button>
        <button
          onClick={() => setRole("pic")}
          className={`flex items-center gap-1.5 rounded-full px-4.5 py-2.5 text-[13px] font-extrabold ${
            role === "pic" ? "bg-gradient-to-br from-[#16296b] to-[#1c3f91] text-white" : "text-gray-600"
          }`}
        >
          🛠️ Responder / PIC
        </button>
      </div>

      {loadError ? (
        <div className="mb-4 max-w-[500px] rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">
          ⚠️ {loadError}
          <div className="mt-1 text-xs text-red-500">
            Pastikan NEXT_PUBLIC_SUPABASE_URL &amp; NEXT_PUBLIC_SUPABASE_ANON_KEY sudah diset dan
            schema.sql sudah dijalankan di project Supabase.
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="py-20 text-sm text-gray-400">Memuat data…</div>
      ) : (
        <div className="flex w-full max-w-[1180px] flex-wrap items-start justify-center gap-7">
          {role === "pelapor" ? (
            <PelaporApp
              key={jumpKey}
              voices={voices}
              refetch={refetch}
              fromPic={fromPic}
              onConsumedFromPic={() => setFromPic(false)}
              initialScreen={fromPic ? "isi-voice" : undefined}
            />
          ) : (
            <PicApp voices={voices} refetch={refetch} onBuatVoice={handleBuatVoiceFromPic} />
          )}
          <SideNote />
        </div>
      )}

      <Toast />
    </div>
  );
}

function SideNote() {
  return (
    <div className="w-[280px] max-w-full flex-none rounded-2xl bg-white p-4.5 text-[12.5px] leading-relaxed text-gray-600 shadow-lg">
      <h3 className="mb-2.5 text-[13.5px] font-bold text-[#16296b]">Cara demo</h3>
      <ol className="list-decimal space-y-2 pl-4.5">
        <li>Sebagai <b>Pelapor</b>, buat voice baru (Buat Voice → isi form → review → submit).</li>
        <li>Lihat animasi AI merutekan voice, lalu status awalnya <b>OPEN</b>.</li>
        <li>Beralih ke <b>Responder / PIC</b> — mulai dari Beranda Voice, lalu buka Riwayat Voice Member.</li>
        <li>Buka detailnya, pilih Aksi, lalu proses hingga <b>Closed</b> (wajib Catatan Penutupan &amp; foto bukti).</li>
        <li>Kembali ke <b>Pelapor</b> → Riwayat → beri rating. Rating 1–2 menawarkan opsi reopen.</li>
      </ol>
      <h3 className="mb-2.5 mt-4 text-[13.5px] font-bold text-[#16296b]">Legenda status</h3>
      <Leg color="#e0263d" label="Open — menunggu tindakan PIC" />
      <Leg color="#c98a00" label="In Verification — klarifikasi/penugasan berjalan" />
      <Leg color="#2b57c9" label="In Progress — sedang ditangani PIC" />
      <Leg color="#1f9d55" label="Closed — tuntas, menunggu rating" />
      <p className="mt-3">
        Data disimpan di Supabase (real-time) — buka di dua tab untuk melihat perubahan
        tersinkron langsung antar peran.
      </p>
    </div>
  );
}

function Leg({ color, label }: { color: string; label: string }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <div className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: color }} />
      {label}
    </div>
  );
}
