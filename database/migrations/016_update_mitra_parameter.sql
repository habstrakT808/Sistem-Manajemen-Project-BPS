-- Tabel referensi posisi mitra
create table if not exists public.mitra_positions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);

-- Tabel referensi pekerjaan mitra
create table if not exists public.mitra_occupations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);

-- Tambah kolom-kolom baru pada mitra (abaikan jika sudah ada)
alter table public.mitra add column if not exists posisi_id uuid references public.mitra_positions(id);
alter table public.mitra add column if not exists jeniskelamin text check (jeniskelamin in ('laki_laki','perempuan'));
alter table public.mitra add column if not exists pendidikan text check (pendidikan in ('sma','d4s1'));
alter table public.mitra add column if not exists pekerjaan_id uuid references public.mitra_occupations(id);
alter table public.mitra add column if not exists sobat_id text;
alter table public.mitra add column if not exists email text;

-- Index untuk lookup cepat (opsional)
create index if not exists idx_mitra_posisi_id on public.mitra(posisi_id);
create index if not exists idx_mitra_pekerjaan_id on public.mitra(pekerjaan_id);
create index if not exists idx_mitra_sobat_id on public.mitra(sobat_id);