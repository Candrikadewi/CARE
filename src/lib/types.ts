export type VoiceStatus = "open" | "verification" | "progress" | "closed";
export type Severity = "Low" | "Medium" | "High" | "Critical";
export type Kategori =
  | "Kesulitan Kerja"
  | "Fasilitas Shop"
  | "Fasilitas Plant"
  | "Private";
export type HandlerRole = "Manager" | "Section Head";
export type VerifReason = "clarify" | "assigned" | null;

export interface Voice {
  id: string;
  judul: string;
  detail: string;
  area: string;
  lokasi: string;
  dept: string;
  status: VoiceStatus;
  kategori: Kategori;
  severity: Severity;
  identity: boolean;
  reporter: string;
  mine: boolean;
  photo_url: string | null;
  close_photo_url: string | null;
  close_note: string | null;
  pic: string | null;
  handler: string | null;
  handler_role: HandlerRole | null;
  verif_reason: VerifReason;
  rating: number;
  feedback: string | null;
  reopened: boolean;
  created_at: string;
  updated_at: string;
}

export interface VoiceEvent {
  id: string;
  voice_id: string;
  title: string;
  who: string;
  note: string | null;
  created_at: string;
}

export const STATUS_ORDER: VoiceStatus[] = [
  "open",
  "verification",
  "progress",
  "closed",
];

export const STATUS_LABEL: Record<VoiceStatus, string> = {
  open: "Open",
  verification: "In Verification",
  progress: "In Progress",
  closed: "Closed",
};

export const DEPTS = [
  "Assembly",
  "Welding",
  "Painting",
  "Quality",
  "Logistics",
] as const;

export const SECTION_HEADS = [
  "Andi Setiawan",
  "Rina Kusuma",
  "Budi Hartono",
  "Sari Melati",
] as const;
