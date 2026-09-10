-- Выполнить в Supabase: Project -> SQL Editor -> New query -> вставить целиком -> Run

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint unique not null,
  first_name text,
  username text,
  created_at timestamptz default now()
);

create table if not exists ayahs (
  id serial primary key,
  surah_number int not null,
  ayah_number int not null,
  text_uthmani text not null,      -- эталонный арабский текст с огласовками
  text_simple text not null,       -- тот же текст без огласовок, для мягкой сверки
  unique (surah_number, ayah_number)
);

create table if not exists recitation_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) not null,
  ayah_id int references ayahs(id) not null,
  transcript text not null,
  word_results jsonb not null,     -- [{word, status: "ok"|"mismatch"|"missing", index}]
  score numeric not null,          -- доля верно прочитанных слов, 0..1
  created_at timestamptz default now()
);

create table if not exists memorization_progress (
  user_id uuid references users(id) not null,
  ayah_id int references ayahs(id) not null,
  best_score numeric default 0,
  attempts_count int default 0,
  last_attempt_at timestamptz,
  primary key (user_id, ayah_id)
);

-- Row Level Security: пользователь физически не видит чужие записи
alter table users enable row level security;
alter table recitation_attempts enable row level security;
alter table memorization_progress enable row level security;

-- ayahs — общий справочник, читать могут все авторизованные
alter table ayahs enable row level security;
create policy "ayahs readable by all" on ayahs for select using (true);

-- Доступ к остальным таблицам выдаётся только через service_role на сервере
-- (сервер сам проверяет telegram_id из подписанной initData и подставляет user_id).
-- Политики ниже — заглушка "по умолчанию запрещено всё для anon-ключа":
create policy "no public access to users" on users for all using (false);
create policy "no public access to attempts" on recitation_attempts for all using (false);
create policy "no public access to progress" on memorization_progress for all using (false);
