"use client";

import { useState } from "react";
import type { Voice, VoiceEvent } from "@/lib/types";
import { Pill, ReopenTag, SeverityPill, StatusTag, StatusTrack, Timeline } from "./StatusBits";
import { addEvent, updateVoice } from "@/lib/api";
import { showToast } from "@/lib/toast";

/**
 * Tracking + rating/reopen view shared by the Pelapor "Riwayat" detail screen
 * and the Responder/PIC "Riwayat Voice Saya" detail screen — same as the
 * original prototype's renderDetail() reused across both roles.
 */
export default function VoiceTrackingDetail({
  voice,
  events,
  onChanged,
}: {
  voice: Voice;
  events: VoiceEvent[];
  onChanged: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [showError, setShowError] = useState(false);
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submitRating() {
    if (rating === 0) {
      showToast("Pilih rating bintang terlebih dahulu.");
      return;
    }
    if (rating <= 2 && !feedback.trim()) {
      setShowError(true);
      return;
    }
    setBusy(true);
    try {
      await updateVoice(voice.id, { rating, feedback: feedback.trim() || null });
      await addEvent(
        voice.id,
        `Rating ${rating}★ diberikan pelapor`,
        "Oleh Pelapor",
        feedback.trim() || null
      );
      if (rating <= 2) {
        setAsking(true);
      } else {
        showToast("Terima kasih atas rating Anda!");
        onChanged();
      }
    } finally {
      setBusy(false);
    }
  }

  async function reopen(yes: boolean) {
    setBusy(true);
    try {
      if (yes) {
        await updateVoice(voice.id, { status: "progress", reopened: true });
        await addEvent(voice.id, "Voice dibuka kembali (Reopened)", "Oleh Pelapor");
        showToast("Voice dibuka kembali & dikirim ulang ke PIC.");
      } else {
        showToast("Terima kasih atas feedback Anda.");
      }
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-4">
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <Pill>{voice.kategori}</Pill>
          <SeverityPill severity={voice.severity} />
          <StatusTag status={voice.status} />
          {voice.reopened ? <ReopenTag /> : null}
        </div>
        <div className="mb-1.5 text-[15px] font-extrabold">{voice.judul}</div>
        <div className="text-[11px] text-gray-400">
          ID: {voice.id} &middot; {voice.area} &middot; PIC: {voice.pic || "-"}
        </div>
        {voice.lokasi ? (
          <div className="mt-1 text-[11px] text-gray-400">📍 {voice.lokasi}</div>
        ) : null}
        <div className="mt-1 text-[11px] text-gray-400">
          👤 {voice.identity ? "Open Identity" : "Anonim"}
        </div>
        {voice.photo_url ? (
          <div className="mt-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={voice.photo_url}
              alt="Bukti foto"
              className="max-h-[150px] w-full rounded-xl object-cover"
            />
          </div>
        ) : null}
        <div className="mt-2.5 text-[12.5px] text-gray-600">{voice.detail}</div>
      </div>

      <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-4">
        <StatusTrack status={voice.status} />
      </div>

      <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-4">
        <Timeline events={events} />
      </div>

      {voice.status === "closed" ? (
        voice.rating > 0 ? (
          <div className="mt-1.5 rounded-2xl border border-gray-200 bg-white p-4">
            <h4 className="mb-2.5 text-[13.5px] font-bold">Rating Anda</h4>
            <div className="mb-2.5 flex gap-1.5 text-2xl">
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} className={n <= voice.rating ? "text-[#f5b400]" : "text-gray-200"}>
                  ★
                </span>
              ))}
            </div>
            {voice.feedback ? (
              <div className="mb-1 rounded-lg bg-gray-100 px-2.5 py-1.5 text-[11.5px] text-gray-600">
                {voice.feedback}
              </div>
            ) : null}
            <div className="py-1.5 text-center text-[12.5px] font-bold text-[#1f9d55]">
              ✓ Terima kasih atas feedback Anda
            </div>
          </div>
        ) : asking ? (
          <div className="mt-1.5 rounded-2xl border border-gray-200 bg-white p-4 text-center">
            <p className="mb-2.5 text-[12.5px] font-bold text-gray-900">
              Rating Anda rendah. Apakah Anda ingin membuka kembali (reopen) voice ini agar PIC
              menindaklanjuti lebih lanjut?
            </p>
            <div className="flex gap-2.5">
              <button
                disabled={busy}
                onClick={() => reopen(true)}
                className="flex-1 rounded-xl bg-gradient-to-br from-[#2b57c9] to-[#1d3f9e] py-3 text-sm font-bold text-white disabled:opacity-60"
              >
                Ya, Reopen
              </button>
              <button
                disabled={busy}
                onClick={() => reopen(false)}
                className="flex-1 rounded-xl border border-gray-200 bg-white py-3 text-sm font-bold text-[#16296b] disabled:opacity-60"
              >
                Tidak, Selesai
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-1.5 rounded-2xl border border-gray-200 bg-white p-4">
            <h4 className="mb-2.5 text-[13.5px] font-bold">Berikan rating &amp; feedback</h4>
            <div className="mb-2.5 flex gap-1.5 text-2xl">
              {[1, 2, 3, 4, 5].map((n) => (
                <span
                  key={n}
                  onClick={() => setRating(n)}
                  className={`cursor-pointer ${n <= rating ? "text-[#f5b400]" : "text-gray-200"}`}
                >
                  ★
                </span>
              ))}
            </div>
            <textarea
              value={feedback}
              onChange={(e) => {
                setFeedback(e.target.value);
                setShowError(false);
              }}
              placeholder="Ceritakan pengalaman Anda (wajib untuk rating 1-2, opsional untuk 3-5)"
              className="min-h-[70px] w-full rounded-xl border border-gray-200 p-2.5 text-[12.5px]"
            />
            {showError ? (
              <div className="mt-1 text-[11px] text-[#e0263d]">
                Mohon isi feedback untuk rating 1-2.
              </div>
            ) : null}
            <button
              disabled={busy}
              onClick={submitRating}
              className="mt-2.5 w-full rounded-xl bg-gradient-to-br from-[#2b57c9] to-[#1d3f9e] py-3 text-sm font-bold text-white disabled:opacity-60"
            >
              Kirim Rating
            </button>
          </div>
        )
      ) : null}
    </>
  );
}
