import { supabase } from "./supabase";
import type { Voice, VoiceEvent, VoiceStatus } from "./types";

export async function fetchVoices(): Promise<Voice[]> {
  const { data, error } = await supabase
    .from("voices")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Voice[];
}

export async function fetchVoiceEvents(voiceId: string): Promise<VoiceEvent[]> {
  const { data, error } = await supabase
    .from("voice_events")
    .select("*")
    .eq("voice_id", voiceId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data as VoiceEvent[];
}

export async function uploadPhoto(file: File, prefix: string): Promise<string> {
  const path = `${prefix}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const { error } = await supabase.storage.from("voice-photos").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("voice-photos").getPublicUrl(path);
  return data.publicUrl;
}

async function nextId(): Promise<string> {
  const { data, error } = await supabase
    .from("voices")
    .select("id")
    .order("id", { ascending: false })
    .limit(1);
  if (error) throw error;
  const latest = data?.[0]?.id as string | undefined;
  const n = latest ? parseInt(latest.replace("VO-2025-", ""), 10) + 1 : 7;
  return `VO-2025-${String(n).padStart(4, "0")}`;
}

export interface NewVoiceInput {
  area: string;
  lokasi: string;
  detail: string;
  judul: string;
  identity: boolean;
  photoUrl: string;
  kategori: Voice["kategori"];
  severity: Voice["severity"];
  dept: string;
  mine: boolean;
  reporter: string;
}

/** Creates the voice row, routes it to a PIC via the DB function, and writes the opening timeline. */
export async function createVoice(input: NewVoiceInput): Promise<Voice> {
  const id = await nextId();

  const { data: picName, error: routeErr } = await supabase.rpc("route_pic", {
    p_kategori: input.kategori,
  });
  if (routeErr) throw routeErr;

  const now = new Date().toISOString();
  const row = {
    id,
    judul: input.judul,
    detail: input.detail,
    area: input.area,
    lokasi: input.lokasi,
    dept: input.dept,
    status: "open" as VoiceStatus,
    kategori: input.kategori,
    severity: input.severity,
    identity: input.identity,
    reporter: input.identity ? input.reporter : "Anonim",
    mine: input.mine,
    photo_url: input.photoUrl,
    pic: picName,
    handler: picName,
    handler_role: "Manager",
    created_at: now,
  };

  const { data, error } = await supabase.from("voices").insert(row).select().single();
  if (error) throw error;

  await supabase.from("voice_events").insert([
    {
      voice_id: id,
      title: `Voice disubmit (${input.identity ? "Open Identity" : "Anonim"})`,
      who: "Oleh Pelapor",
    },
    {
      voice_id: id,
      title: `AI menganalisis & merutekan ke ${picName}`,
      who: "Sistem",
    },
  ]);

  return data as Voice;
}

export async function updateVoice(id: string, patch: Partial<Voice>): Promise<void> {
  const { error } = await supabase.from("voices").update(patch).eq("id", id);
  if (error) throw error;
}

export async function addEvent(
  voiceId: string,
  title: string,
  who: string,
  note?: string | null
): Promise<void> {
  const { error } = await supabase
    .from("voice_events")
    .insert({ voice_id: voiceId, title, who, note: note ?? null });
  if (error) throw error;
}

/** Live-refresh hook target: subscribes to any insert/update on voices or voice_events. */
export function subscribeToVoiceChanges(onChange: () => void) {
  const channel = supabase
    .channel("voices-realtime")
    .on("postgres_changes", { event: "*", schema: "public", table: "voices" }, onChange)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "voice_events" },
      onChange
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
