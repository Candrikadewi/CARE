-- CARE Voice — Supabase schema
-- Run this once in the Supabase SQL Editor for a fresh "CARE" project.
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE throughout.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.pic_roster (
  name text primary key,
  kategori text[] not null,
  workload int not null default 0
);

create table if not exists public.voices (
  id text primary key,                         -- e.g. VO-2025-0007
  judul text not null,
  detail text not null,
  area text not null,
  lokasi text not null,
  dept text not null default 'Assembly',
  status text not null default 'open'
    check (status in ('open','verification','progress','closed')),
  kategori text not null,
  severity text not null default 'Low'
    check (severity in ('Low','Medium','High','Critical')),
  identity boolean not null default true,       -- true = Open Identity, false = Anonim
  reporter text not null default 'Anonim',
  mine boolean not null default false,           -- true = filed by the Manager themself ("Voice Saya")
  photo_url text,
  close_photo_url text,
  close_note text,
  pic text,                                      -- AI-assigned Manager-level PIC
  handler text,                                  -- current handler (Manager or Section Head)
  handler_role text default 'Manager',
  verif_reason text,                             -- 'clarify' | 'assigned' | null
  rating int not null default 0 check (rating between 0 and 5),
  feedback text,
  reopened boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.voice_events (
  id uuid primary key default gen_random_uuid(),
  voice_id text not null references public.voices(id) on delete cascade,
  title text not null,
  who text not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_voice_events_voice_id on public.voice_events(voice_id);
create index if not exists idx_voices_status on public.voices(status);
create index if not exists idx_voices_mine on public.voices(mine);

-- keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_voices_updated_at on public.voices;
create trigger trg_voices_updated_at
  before update on public.voices
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- AI auto-routing: pick the least-loaded PIC matching a kategori, atomically
-- ---------------------------------------------------------------------------

create or replace function public.route_pic(p_kategori text)
returns text
language plpgsql
as $$
declare
  chosen text;
begin
  select name into chosen
  from public.pic_roster
  where p_kategori = any(kategori)
  order by workload asc
  limit 1
  for update skip locked;

  if chosen is null then
    select name into chosen from public.pic_roster order by workload asc limit 1 for update skip locked;
  end if;

  if chosen is not null then
    update public.pic_roster set workload = workload + 1 where name = chosen;
  end if;

  return chosen;
end;
$$;

-- ---------------------------------------------------------------------------
-- Seed data — mirrors the HTML prototype's demo voices, safe to re-run
-- ---------------------------------------------------------------------------

insert into public.pic_roster (name, kategori, workload) values
  ('Andi', array['Kesulitan Kerja','Fasilitas Plant'], 2),
  ('Rina', array['Kesulitan Kerja'], 1),
  ('Sari', array['Fasilitas Shop'], 3),
  ('Budi', array['Fasilitas Shop'], 1),
  ('Joko', array['Fasilitas Plant'], 0),
  ('Tim Committee', array['Private'], 1)
on conflict (name) do update set kategori = excluded.kategori;

insert into public.voices (id, judul, detail, area, lokasi, dept, status, kategori, severity, identity, reporter, mine, pic, handler, handler_role, verif_reason, rating, feedback, close_note, created_at)
values
  ('VO-2025-0001','Toilet shop lantai 2 bocor','Air menggenang di depan toilet shop lantai 2, licin dan berbahaya.','KRW 1','Depan toilet shop lantai 2, dekat tangga','Assembly','closed','Fasilitas Shop','High',true,'Budi Santoso',false,'Sari','Sari','Manager',null,5,null,'Sudah diperbaiki, saluran air dibersihkan.','2025-05-02T08:10:00Z'),
  ('VO-2025-0002','Jadwal lembur mendadak tanpa info','Info lembur baru diberikan H-1, sulit atur jadwal pribadi.','KRW 2','Papan pengumuman dekat pintu masuk Line 3','Welding','progress','Kesulitan Kerja','Low',false,'Anonim',false,'Rina','Rina','Manager',null,0,null,null,'2025-05-04T09:20:00Z'),
  ('VO-2025-0003','AC ruang istirahat mati','AC di ruang istirahat plant tidak dingin sejak minggu lalu.','STR 1','Ruang istirahat plant, dekat pintu belakang','Painting','verification','Fasilitas Plant','Medium',true,'Anda (Manager)',true,'Joko','Joko','Manager','clarify',0,null,null,'2025-05-05T13:00:00Z'),
  ('VO-2025-0004','Rekan kerja sering intimidasi','Ada rekan kerja yang bersikap intimidatif ke anggota tim lain.','KRW 3','Area kerja Line 4, dekat pilar B2','Quality','verification','Private','High',false,'Anonim',false,'Tim Committee','Andi Setiawan','Section Head','assigned',0,null,null,'2025-05-06T15:40:00Z'),
  ('VO-2025-0006','Kran wastafel shop rusak total','Kran wastafel di shop rusak total dan airnya mengalir terus tidak bisa dimatikan.','KRW 1','Wastafel shop, dekat pintu masuk','Logistics','progress','Fasilitas Shop','Medium',true,'Anda (Manager)',true,'Budi','Budi','Manager',null,2,'Kran baru bocor lagi setelah 2 hari.','Kran sudah diganti.','2025-04-20T10:00:00Z'),
  ('VO-2025-0005','Lampu area line 2 redup','Lampu area line 2 terlihat redup terutama pada shift malam sehingga area kerja kurang terang.','KRW 1','Depan Line 2, Dekat Mesin X','Logistics','open','Fasilitas Plant','Medium',true,'Dedi Kurniawan',false,'Andi','Andi','Manager',null,0,null,null,'2025-05-12T09:15:00Z')
on conflict (id) do nothing;

update public.voices set reopened = true where id = 'VO-2025-0006';

insert into public.voice_events (voice_id, title, who, note, created_at) values
  ('VO-2025-0001','Voice disubmit (Open Identity)','Oleh Pelapor',null,'2025-05-02T08:10:00Z'),
  ('VO-2025-0001','AI menganalisis & merutekan ke Sari','Sistem',null,'2025-05-02T08:10:00Z'),
  ('VO-2025-0001','Manager menangani voice ini secara langsung','Manager: Sari',null,'2025-05-02T10:10:00Z'),
  ('VO-2025-0001','Voice ditutup oleh PIC (Mark Closed)','Manager: Sari','Sudah diperbaiki, saluran air dibersihkan.','2025-05-03T04:10:00Z'),

  ('VO-2025-0002','Voice disubmit (Anonim)','Oleh Pelapor',null,'2025-05-04T09:20:00Z'),
  ('VO-2025-0002','AI menganalisis & merutekan ke Rina','Sistem',null,'2025-05-04T09:20:00Z'),
  ('VO-2025-0002','Manager menangani voice ini secara langsung','Manager: Rina',null,'2025-05-04T12:20:00Z'),
  ('VO-2025-0002','Update progress','Manager: Rina','Sedang koordinasi dengan supervisor shift terkait H-1 notice.','2025-05-05T05:20:00Z'),

  ('VO-2025-0003','Voice disubmit (Open Identity)','Oleh Pelapor',null,'2025-05-05T13:00:00Z'),
  ('VO-2025-0003','AI menganalisis & merutekan ke Joko','Sistem',null,'2025-05-05T13:00:00Z'),
  ('VO-2025-0003','PIC menanyakan klarifikasi','Manager: Joko','Sejak kapan tepatnya AC mati total? Apakah ada suara aneh dari unit AC?','2025-05-05T15:00:00Z'),

  ('VO-2025-0004','Voice disubmit (Anonim)','Oleh Pelapor',null,'2025-05-06T15:40:00Z'),
  ('VO-2025-0004','AI menganalisis & merutekan ke Tim Committee','Sistem',null,'2025-05-06T15:40:00Z'),
  ('VO-2025-0004','Manager assign ke Section Head: Andi Setiawan','Manager','Mohon tangani dengan hati-hati, ini kasus sensitif.','2025-05-06T16:40:00Z'),

  ('VO-2025-0006','Voice disubmit (Open Identity)','Oleh Pelapor',null,'2025-04-20T10:00:00Z'),
  ('VO-2025-0006','AI menganalisis & merutekan ke Budi','Sistem',null,'2025-04-20T10:00:00Z'),
  ('VO-2025-0006','Manager menangani voice ini secara langsung','Manager: Budi',null,'2025-04-20T13:00:00Z'),
  ('VO-2025-0006','Voice ditutup oleh PIC (Mark Closed)','Manager: Budi','Kran sudah diganti.','2025-04-21T08:00:00Z'),
  ('VO-2025-0006','Rating 2★ diberikan pelapor','Oleh Pelapor','Kran baru bocor lagi setelah 2 hari.','2025-04-21T16:00:00Z'),
  ('VO-2025-0006','Voice dibuka kembali (Reopened)','Oleh Pelapor',null,'2025-04-21T16:00:00Z'),

  ('VO-2025-0005','Voice disubmit (Open Identity)','Oleh Pelapor',null,'2025-05-12T09:15:00Z'),
  ('VO-2025-0005','AI menganalisis & merutekan ke Andi','Sistem',null,'2025-05-12T09:15:00Z')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- This is an MVP without real authentication (roles are switched client-side,
-- same as the HTML prototype). RLS is enabled but policies are permissive for
-- the anon key so the demo works end-to-end. Tighten this before storing real
-- sensitive reports — see README "Security note".
-- ---------------------------------------------------------------------------

alter table public.voices enable row level security;
alter table public.voice_events enable row level security;
alter table public.pic_roster enable row level security;

drop policy if exists "voices_select_all" on public.voices;
create policy "voices_select_all" on public.voices for select using (true);
drop policy if exists "voices_insert_all" on public.voices;
create policy "voices_insert_all" on public.voices for insert with check (true);
drop policy if exists "voices_update_all" on public.voices;
create policy "voices_update_all" on public.voices for update using (true) with check (true);

drop policy if exists "voice_events_select_all" on public.voice_events;
create policy "voice_events_select_all" on public.voice_events for select using (true);
drop policy if exists "voice_events_insert_all" on public.voice_events;
create policy "voice_events_insert_all" on public.voice_events for insert with check (true);

drop policy if exists "pic_roster_select_all" on public.pic_roster;
create policy "pic_roster_select_all" on public.pic_roster for select using (true);
drop policy if exists "pic_roster_update_all" on public.pic_roster;
create policy "pic_roster_update_all" on public.pic_roster for update using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Storage bucket for voice photos (submission evidence + closure evidence)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('voice-photos', 'voice-photos', true)
on conflict (id) do nothing;

drop policy if exists "voice_photos_public_read" on storage.objects;
create policy "voice_photos_public_read" on storage.objects
  for select using (bucket_id = 'voice-photos');

drop policy if exists "voice_photos_public_upload" on storage.objects;
create policy "voice_photos_public_upload" on storage.objects
  for insert with check (bucket_id = 'voice-photos');

-- ---------------------------------------------------------------------------
-- Realtime — let clients subscribe to live changes
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.voices;
alter publication supabase_realtime add table public.voice_events;
