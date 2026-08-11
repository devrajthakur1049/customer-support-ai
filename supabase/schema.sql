-- ============================================================
-- Customer Support AI Assistant - Supabase schema
-- Run this in the Supabase SQL editor (or via `supabase db push`)
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- users
-- ------------------------------------------------------------
create table if not exists users (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null unique,
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- conversations
-- ------------------------------------------------------------
create table if not exists conversations (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references users(id) on delete cascade,
  status              text not null default 'active'
                        check (status in ('active', 'escalated', 'resolved')),
  classification       text
                        check (classification in
                          ('general_question', 'technical_issue', 'billing', 'urgent')),
  escalation_reason   text,
  escalated_at        timestamptz,
  escalation_notified boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_conversations_user_id on conversations(user_id);
create index if not exists idx_conversations_status on conversations(status);

-- keep updated_at current on every row change
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_conversations_updated_at on conversations;
create trigger trg_conversations_updated_at
  before update on conversations
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- messages
-- ------------------------------------------------------------
create table if not exists messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  role            text not null check (role in ('customer', 'ai', 'system', 'human_agent')),
  content         text not null check (char_length(trim(content)) > 0),
  created_at      timestamptz not null default now()
);

create index if not exists idx_messages_conversation_id on messages(conversation_id);
create index if not exists idx_messages_created_at on messages(created_at);

-- ------------------------------------------------------------
-- Notes
-- ------------------------------------------------------------
-- escalation_notified is the idempotency flag used by the escalation
-- service: it is only set to true AFTER the n8n webhook call succeeds,
-- and it is checked-and-set atomically (see escalationService.js) so a
-- conversation can only ever trigger one outbound notification.
