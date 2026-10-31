-- Countersign: tickets, proposed actions, audit trail.
-- Idempotent: safe to run in the SQL editor and again via `supabase db push`.

create table if not exists public.tickets (
  id           uuid primary key default gen_random_uuid(),
  channel      text not null default 'telegram',      -- telegram | web | email
  customer_ref text not null,                          -- billing customer id, never raw PII
  subject      text,
  body         text not null,
  intent       text,                                   -- set by Gemma triage
  priority     smallint not null default 3,            -- 1 = urgent … 5 = low
  status       text not null default 'open'
               check (status in ('open', 'proposed', 'approved', 'resolved', 'escalated')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.actions (
  id           uuid primary key default gen_random_uuid(),
  ticket_id    uuid not null references public.tickets (id) on delete cascade,
  tool         text not null,                          -- refund | cancel_subscription | pause_subscription …
  args         jsonb not null default '{}'::jsonb,
  policy_ref   text,                                   -- e.g. "§6.7 trial auto-convert"
  mode         text not null default 'ask'
               check (mode in ('auto', 'ask', 'never')),
  status       text not null default 'proposed'
               check (status in ('proposed', 'approved', 'executed', 'confirmed', 'failed', 'blocked')),
  external_ref text,                                   -- billing id once confirmed (re_…, sub_…)
  approved_by  text,
  created_at   timestamptz not null default now(),
  executed_at  timestamptz
);

create table if not exists public.audit_log (
  id         bigint generated always as identity primary key,
  ticket_id  uuid references public.tickets (id) on delete cascade,
  action_id  uuid references public.actions (id) on delete set null,
  actor      text not null,                            -- ai | agent:<name> | system
  event      text not null,                            -- proposed | approved | executed | blocked | reply_sent …
  detail     jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists actions_ticket_id_idx   on public.actions (ticket_id);
create index if not exists audit_log_ticket_id_idx on public.audit_log (ticket_id);
create index if not exists tickets_status_idx      on public.tickets (status, priority);

-- Writes go through the API with the service role. The browser only reads (for Realtime).
alter table public.tickets   enable row level security;
alter table public.actions   enable row level security;
alter table public.audit_log enable row level security;

do $$
declare t text;
begin
  foreach t in array array['tickets', 'actions', 'audit_log'] loop
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'read for console') then
      execute format('create policy "read for console" on public.%I for select to anon, authenticated using (true)', t);
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
