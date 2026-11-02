-- СТО НА ПРИМОРСКОМ: электронная сервисная книжка.
-- Применить один раз в SQL Editor проекта Supabase или через supabase db push.
-- Роль администратора этим файлом не выдаётся. Первый администратор создаётся скриптом npm run create-admin.

create extension if not exists pgcrypto;

do $$ begin
  create type public.user_role as enum ('client', 'admin');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.service_status as enum ('draft', 'published', 'cancelled');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.note_status as enum ('active', 'done');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.fuel_type as enum ('petrol', 'diesel', 'hybrid', 'electric', 'gas', 'unknown');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.transmission_type as enum ('manual', 'automatic', 'cvt', 'robot', 'unknown');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.claim_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.invitation_status as enum ('pending', 'accepted', 'expired', 'revoked');
exception when duplicate_object then null;
end $$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  phone text,
  email text,
  role public.user_role not null default 'client',
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_phone_length check (phone is null or char_length(phone) between 10 and 20)
);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete restrict,
  make text not null,
  model text not null,
  year integer,
  vin text,
  license_plate text,
  engine_info text,
  fuel_type public.fuel_type not null default 'unknown',
  transmission_type public.transmission_type not null default 'unknown',
  current_mileage integer not null default 0,
  image_path text,
  notes text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vehicles_year_range check (year is null or year between 1950 and 2100),
  constraint vehicles_mileage_nonnegative check (current_mileage >= 0)
);

create table if not exists public.service_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  template_key text not null default 'generic',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_records (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete restrict,
  customer_id uuid not null references public.profiles (id) on delete restrict,
  service_date timestamptz not null,
  mileage integer not null,
  work_order_number text,
  performed_by text,
  general_comment text,
  status public.service_status not null default 'draft',
  labor_total numeric(12, 2) not null default 0,
  parts_total numeric(12, 2) not null default 0,
  grand_total numeric(12, 2) not null default 0,
  next_service_mileage integer,
  next_service_date date,
  master_recommendations text,
  cancellation_reason text,
  cancelled_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  published_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_records_mileage_nonnegative check (mileage >= 0),
  constraint service_records_money_nonnegative check (labor_total >= 0 and parts_total >= 0 and grand_total >= 0),
  constraint service_records_next_mileage check (next_service_mileage is null or next_service_mileage >= 0)
);

create table if not exists public.service_record_items (
  id uuid primary key default gen_random_uuid(),
  service_record_id uuid not null references public.service_records (id) on delete cascade,
  category_id uuid references public.service_categories (id) on delete set null,
  service_name text not null,
  description text,
  technical_details jsonb not null default '{}'::jsonb,
  quantity numeric(12, 3) not null default 1,
  unit text not null default 'усл.',
  unit_price numeric(12, 2) not null default 0,
  total_price numeric(12, 2) not null default 0,
  is_completed boolean not null default true,
  created_at timestamptz not null default now(),
  constraint service_items_money_nonnegative check (quantity >= 0 and unit_price >= 0 and total_price >= 0),
  constraint service_items_details_object check (jsonb_typeof(technical_details) = 'object')
);

create table if not exists public.parts_used (
  id uuid primary key default gen_random_uuid(),
  service_record_id uuid not null references public.service_records (id) on delete cascade,
  service_record_item_id uuid references public.service_record_items (id) on delete set null,
  name text not null,
  manufacturer text,
  article_number text,
  quantity numeric(12, 3) not null,
  unit text not null default 'шт.',
  unit_price numeric(12, 2) not null default 0,
  total_price numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  constraint parts_used_money_nonnegative check (quantity > 0 and unit_price >= 0 and total_price >= 0)
);

create table if not exists public.vehicle_notes (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  content text not null,
  status public.note_status not null default 'active',
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_record_attachments (
  id uuid primary key default gen_random_uuid(),
  service_record_id uuid not null references public.service_records (id) on delete cascade,
  file_path text not null,
  file_name text not null,
  content_type text not null,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  first_name text not null,
  last_name text not null,
  phone text,
  status public.invitation_status not null default 'pending',
  invited_by uuid references public.profiles (id) on delete set null,
  auth_user_id uuid,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.vehicle_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  make text not null,
  model text not null,
  year integer,
  vin text,
  license_plate text,
  comment text,
  status public.claim_status not null default 'pending',
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_vehicle_id uuid references public.vehicles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint vehicle_claims_year check (year is null or year between 1950 and 2100)
);

create table if not exists public.service_intervals (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  category_id uuid references public.service_categories (id) on delete set null,
  next_mileage integer,
  next_date date,
  note text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint service_intervals_target check (next_mileage is not null or next_date is not null),
  constraint service_intervals_mileage check (next_mileage is null or next_mileage >= 0)
);

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

-- Заготовка канала уведомлений. Отправка писем, SMS и push здесь не выполняется.
create table if not exists public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  channel text not null check (channel in ('in_app', 'email', 'sms', 'push')),
  template text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'sent', 'skipped', 'failed')),
  scheduled_for timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists vehicles_vin_unique on public.vehicles (vin) where vin is not null;
create unique index if not exists vehicles_plate_unique on public.vehicles (license_plate) where license_plate is not null;
create index if not exists vehicles_owner_idx on public.vehicles (owner_id);
create index if not exists vehicles_plate_idx on public.vehicles (license_plate);
create index if not exists vehicles_vin_idx on public.vehicles (vin);
create index if not exists profiles_phone_idx on public.profiles (phone);
create index if not exists profiles_email_idx on public.profiles (email);
create index if not exists profiles_name_idx on public.profiles (last_name, first_name);
create index if not exists service_records_vehicle_idx on public.service_records (vehicle_id, service_date desc);
create index if not exists service_records_customer_idx on public.service_records (customer_id, service_date desc);
create index if not exists service_records_status_idx on public.service_records (status, service_date desc);
create index if not exists service_records_date_idx on public.service_records (service_date desc);
create index if not exists service_records_performer_idx on public.service_records (performed_by);
create index if not exists service_items_record_idx on public.service_record_items (service_record_id);
create index if not exists service_items_category_idx on public.service_record_items (category_id);
create index if not exists parts_record_idx on public.parts_used (service_record_id);
create index if not exists notes_user_idx on public.vehicle_notes (user_id, updated_at desc);
create index if not exists notes_vehicle_idx on public.vehicle_notes (vehicle_id);
create index if not exists attachments_record_idx on public.service_record_attachments (service_record_id);
create index if not exists audit_entity_idx on public.audit_logs (entity_type, entity_id, created_at desc);
create index if not exists claims_user_idx on public.vehicle_claims (user_id, status);
create index if not exists intervals_vehicle_idx on public.service_intervals (vehicle_id);

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists vehicles_touch on public.vehicles;
create trigger vehicles_touch before update on public.vehicles
for each row execute function public.touch_updated_at();

drop trigger if exists categories_touch on public.service_categories;
create trigger categories_touch before update on public.service_categories
for each row execute function public.touch_updated_at();

drop trigger if exists service_records_touch on public.service_records;
create trigger service_records_touch before update on public.service_records
for each row execute function public.touch_updated_at();

drop trigger if exists notes_touch on public.vehicle_notes;
create trigger notes_touch before update on public.vehicle_notes
for each row execute function public.touch_updated_at();

drop trigger if exists settings_touch on public.app_settings;
create trigger settings_touch before update on public.app_settings
for each row execute function public.touch_updated_at();

create or replace function public.normalize_vehicle()
returns trigger
language plpgsql
as $$
begin
  new.vin = nullif(upper(trim(coalesce(new.vin, ''))), '');
  new.license_plate = nullif(upper(trim(coalesce(new.license_plate, ''))), '');
  new.make = trim(new.make);
  new.model = trim(new.model);
  return new;
end;
$$;

drop trigger if exists vehicles_normalize on public.vehicles;
create trigger vehicles_normalize before insert or update on public.vehicles
for each row execute function public.normalize_vehicle();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.role() = 'service_role'
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    );
$$;

create or replace function public.protect_profile_sensitive_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.role is distinct from 'client'
       and auth.role() is distinct from 'service_role'
       and current_setting('app.allow_role_change', true) is distinct from '1' then
      new.role := 'client';
    end if;
    return new;
  end if;

  if new.role is distinct from old.role
     and auth.role() is distinct from 'service_role'
     and current_setting('app.allow_role_change', true) is distinct from '1' then
    raise exception 'app:role_locked';
  end if;

  if new.email is distinct from old.email
     and auth.role() is distinct from 'service_role'
     and current_setting('app.allow_email_sync', true) is distinct from '1' then
    new.email := old.email;
  end if;

  if auth.uid() = old.id and not public.is_admin() then
    new.is_demo := old.is_demo;
    new.id := old.id;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_protect on public.profiles;
create trigger profiles_protect before insert or update on public.profiles
for each row execute function public.protect_profile_sensitive_columns();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  perform set_config('app.allow_email_sync', '1', true);
  insert into public.profiles (id, first_name, last_name, phone, email, role)
  values (
    new.id,
    coalesce(meta->>'first_name', ''),
    coalesce(meta->>'last_name', ''),
    nullif(meta->>'phone', ''),
    new.email,
    'client'
  )
  on conflict (id) do update
    set email = excluded.email
    where public.profiles.email is null;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.sync_user_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('app.allow_email_sync', '1', true);
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
after update of email on auth.users
for each row
when (old.email is distinct from new.email)
execute function public.sync_user_email();

create or replace function public.block_non_draft_delete()
returns trigger
language plpgsql
as $$
begin
  if old.status <> 'draft' then
    raise exception 'app:published_locked';
  end if;
  return old;
end;
$$;

drop trigger if exists service_records_block_delete on public.service_records;
create trigger service_records_block_delete
before delete on public.service_records
for each row execute function public.block_non_draft_delete();

create or replace function public.audit_service_record()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  snapshot_old jsonb;
  snapshot_new jsonb;
begin
  if tg_op = 'DELETE' then
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, old_values)
    values (auth.uid(), 'service_record.deleted', 'service_record', old.id, to_jsonb(old));
    return old;
  end if;

  snapshot_new := jsonb_build_object(
    'status', new.status,
    'mileage', new.mileage,
    'service_date', new.service_date,
    'labor_total', new.labor_total,
    'parts_total', new.parts_total,
    'grand_total', new.grand_total,
    'next_service_mileage', new.next_service_mileage,
    'next_service_date', new.next_service_date,
    'master_recommendations', new.master_recommendations,
    'general_comment', new.general_comment,
    'work_order_number', new.work_order_number,
    'performed_by', new.performed_by,
    'cancellation_reason', new.cancellation_reason
  );

  if tg_op = 'INSERT' then
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, new_values)
    values (auth.uid(), 'service_record.created', 'service_record', new.id, snapshot_new);
    return new;
  end if;

  snapshot_old := jsonb_build_object(
    'status', old.status,
    'mileage', old.mileage,
    'service_date', old.service_date,
    'labor_total', old.labor_total,
    'parts_total', old.parts_total,
    'grand_total', old.grand_total,
    'next_service_mileage', old.next_service_mileage,
    'next_service_date', old.next_service_date,
    'master_recommendations', old.master_recommendations,
    'general_comment', old.general_comment,
    'work_order_number', old.work_order_number,
    'performed_by', old.performed_by,
    'cancellation_reason', old.cancellation_reason
  );

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, old_values, new_values)
  values (auth.uid(), 'service_record.updated', 'service_record', new.id, snapshot_old, snapshot_new);
  return new;
end;
$$;

drop trigger if exists service_records_audit on public.service_records;
create trigger service_records_audit
after insert or update or delete on public.service_records
for each row execute function public.audit_service_record();

create or replace function public.grant_admin_role(target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'app:forbidden';
  end if;
  perform set_config('app.allow_role_change', '1', true);
  update public.profiles set role = 'admin' where id = target;
  if not found then
    raise exception 'app:not_found';
  end if;
end;
$$;

create or replace function public.save_service_record(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_id uuid;
  v_existing public.service_records%rowtype;
  v_vehicle public.vehicles%rowtype;
  v_is_new boolean := false;
  v_item jsonb;
  v_part jsonb;
  v_item_id uuid;
  v_map jsonb := '{}'::jsonb;
  v_labor numeric(12, 2) := 0;
  v_parts numeric(12, 2) := 0;
  v_labor_price numeric(12, 2);
  v_unit_price numeric(12, 2);
  v_quantity numeric(12, 3);
  v_line numeric(12, 2);
  v_linked uuid;
  v_old_items jsonb;
  v_old_parts jsonb;
begin
  if not public.is_admin() then
    raise exception 'app:forbidden';
  end if;

  select * into v_vehicle
  from public.vehicles
  where id = (payload->>'vehicle_id')::uuid;

  if not found then
    raise exception 'app:not_found';
  end if;

  if v_vehicle.owner_id is distinct from (payload->>'customer_id')::uuid then
    raise exception 'app:vehicle_owner';
  end if;

  if coalesce((payload->>'mileage')::integer, -1) < 0 then
    raise exception 'app:negative';
  end if;

  v_id := nullif(payload->>'id', '')::uuid;
  if v_id is null then
    v_is_new := true;
    v_id := gen_random_uuid();
    insert into public.service_records (
      id, vehicle_id, customer_id, service_date, mileage, work_order_number,
      performed_by, general_comment, status, next_service_mileage, next_service_date,
      master_recommendations, created_by, updated_by
    ) values (
      v_id,
      v_vehicle.id,
      v_vehicle.owner_id,
      (payload->>'service_date')::timestamptz,
      (payload->>'mileage')::integer,
      nullif(payload->>'work_order_number', ''),
      nullif(payload->>'performed_by', ''),
      nullif(payload->>'general_comment', ''),
      'draft',
      nullif(payload->>'next_service_mileage', '')::integer,
      nullif(payload->>'next_service_date', '')::date,
      nullif(payload->>'master_recommendations', ''),
      v_actor,
      v_actor
    );
  else
    select * into v_existing from public.service_records where id = v_id for update;
    if not found then
      raise exception 'app:not_found';
    end if;
    if v_existing.status = 'cancelled' then
      raise exception 'app:cancelled';
    end if;

    update public.service_records set
      vehicle_id = v_vehicle.id,
      customer_id = v_vehicle.owner_id,
      service_date = (payload->>'service_date')::timestamptz,
      mileage = (payload->>'mileage')::integer,
      work_order_number = nullif(payload->>'work_order_number', ''),
      performed_by = nullif(payload->>'performed_by', ''),
      general_comment = nullif(payload->>'general_comment', ''),
      next_service_mileage = nullif(payload->>'next_service_mileage', '')::integer,
      next_service_date = nullif(payload->>'next_service_date', '')::date,
      master_recommendations = nullif(payload->>'master_recommendations', ''),
      updated_by = v_actor
    where id = v_id;
  end if;

  select coalesce(jsonb_agg(to_jsonb(i)), '[]'::jsonb) into v_old_items
  from public.service_record_items i where i.service_record_id = v_id;
  select coalesce(jsonb_agg(to_jsonb(p)), '[]'::jsonb) into v_old_parts
  from public.parts_used p where p.service_record_id = v_id;

  delete from public.parts_used where service_record_id = v_id;
  delete from public.service_record_items where service_record_id = v_id;

  for v_item in select value from jsonb_array_elements(coalesce(payload->'items', '[]'::jsonb))
  loop
    if coalesce(v_item->>'client_key', '') = '' or v_map ? (v_item->>'client_key') then
      raise exception 'app:bad_details';
    end if;
    if jsonb_typeof(coalesce(v_item->'technical_details', '{}'::jsonb)) <> 'object' then
      raise exception 'app:bad_details';
    end if;

    v_labor_price := round(coalesce(nullif(v_item->>'labor_price', '')::numeric, 0), 2);
    if v_labor_price < 0 then
      raise exception 'app:negative';
    end if;

    insert into public.service_record_items (
      service_record_id, category_id, service_name, description, technical_details,
      quantity, unit, unit_price, total_price, is_completed
    ) values (
      v_id,
      nullif(v_item->>'category_id', '')::uuid,
      coalesce(nullif(v_item->>'service_name', ''), 'Работа'),
      nullif(v_item->>'description', ''),
      coalesce(v_item->'technical_details', '{}'::jsonb),
      1,
      'усл.',
      v_labor_price,
      v_labor_price,
      coalesce((v_item->>'is_completed')::boolean, true)
    )
    returning id into v_item_id;

    v_map := v_map || jsonb_build_object(v_item->>'client_key', v_item_id);
    v_labor := v_labor + v_labor_price;
  end loop;

  for v_part in select value from jsonb_array_elements(coalesce(payload->'parts', '[]'::jsonb))
  loop
    v_quantity := coalesce(nullif(v_part->>'quantity', '')::numeric, 0);
    v_unit_price := round(coalesce(nullif(v_part->>'unit_price', '')::numeric, 0), 2);
    if v_quantity <= 0 then
      raise exception 'app:quantity';
    end if;
    if v_unit_price < 0 then
      raise exception 'app:negative';
    end if;
    v_line := round(v_quantity * v_unit_price, 2);
    v_linked := null;
    if coalesce(v_part->>'item_client_key', '') <> '' then
      if not (v_map ? (v_part->>'item_client_key')) then
        raise exception 'app:bad_details';
      end if;
      v_linked := (v_map ->> (v_part->>'item_client_key'))::uuid;
    end if;

    insert into public.parts_used (
      service_record_id, service_record_item_id, name, manufacturer, article_number,
      quantity, unit, unit_price, total_price
    ) values (
      v_id,
      v_linked,
      coalesce(nullif(v_part->>'name', ''), 'Материал'),
      nullif(v_part->>'manufacturer', ''),
      nullif(v_part->>'article_number', ''),
      v_quantity,
      coalesce(nullif(v_part->>'unit', ''), 'шт.'),
      v_unit_price,
      v_line
    );
    v_parts := v_parts + v_line;
  end loop;

  update public.service_records
  set labor_total = v_labor,
      parts_total = v_parts,
      grand_total = v_labor + v_parts,
      updated_by = v_actor
  where id = v_id;

  if not v_is_new and v_existing.status = 'published' then
    update public.vehicles
    set current_mileage = (payload->>'mileage')::integer
    where id = v_vehicle.id
      and current_mileage < (payload->>'mileage')::integer;
  end if;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, old_values, new_values)
  values (
    v_actor,
    case when v_is_new then 'service_record.items_created' else 'service_record.items_replaced' end,
    'service_record',
    v_id,
    jsonb_build_object('items', v_old_items, 'parts', v_old_parts),
    jsonb_build_object('items', coalesce(payload->'items', '[]'::jsonb), 'parts', coalesce(payload->'parts', '[]'::jsonb))
  );

  return v_id;
end;
$$;

create or replace function public.publish_service_record(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record public.service_records%rowtype;
begin
  if not public.is_admin() then
    raise exception 'app:forbidden';
  end if;

  select * into v_record from public.service_records where id = p_id for update;
  if not found then
    raise exception 'app:not_found';
  end if;
  if v_record.status = 'cancelled' then
    raise exception 'app:cancelled';
  end if;
  if v_record.status = 'published' then
    return;
  end if;
  if not exists (select 1 from public.service_record_items where service_record_id = p_id) then
    raise exception 'app:no_items';
  end if;

  update public.service_records
  set status = 'published',
      published_at = coalesce(published_at, now()),
      updated_by = auth.uid()
  where id = p_id;

  update public.vehicles
  set current_mileage = v_record.mileage
  where id = v_record.vehicle_id
    and current_mileage < v_record.mileage;
end;
$$;

create or replace function public.cancel_service_record(p_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'app:forbidden';
  end if;
  if char_length(trim(coalesce(p_reason, ''))) < 3 then
    raise exception 'app:reason';
  end if;

  update public.service_records
  set status = 'cancelled',
      cancellation_reason = trim(p_reason),
      cancelled_at = now(),
      updated_by = auth.uid()
  where id = p_id
    and status <> 'cancelled';

  if not found then
    raise exception 'app:not_found';
  end if;
end;
$$;

create or replace function public.delete_draft_service_record(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'app:forbidden';
  end if;
  delete from public.service_records where id = p_id and status = 'draft';
  if not found then
    raise exception 'app:not_draft';
  end if;
end;
$$;

revoke all on function public.grant_admin_role(uuid) from public, anon;
revoke all on function public.save_service_record(jsonb) from public, anon;
revoke all on function public.publish_service_record(uuid) from public, anon;
revoke all on function public.cancel_service_record(uuid, text) from public, anon;
revoke all on function public.delete_draft_service_record(uuid) from public, anon;
revoke all on function public.is_admin() from public, anon;

grant execute on function public.grant_admin_role(uuid) to authenticated;
grant execute on function public.save_service_record(jsonb) to authenticated;
grant execute on function public.publish_service_record(uuid) to authenticated;
grant execute on function public.cancel_service_record(uuid, text) to authenticated;
grant execute on function public.delete_draft_service_record(uuid) to authenticated;
grant execute on function public.is_admin() to authenticated;

alter table public.profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.service_categories enable row level security;
alter table public.service_records enable row level security;
alter table public.service_record_items enable row level security;
alter table public.parts_used enable row level security;
alter table public.vehicle_notes enable row level security;
alter table public.service_record_attachments enable row level security;
alter table public.audit_logs enable row level security;
alter table public.customer_invitations enable row level security;
alter table public.vehicle_claims enable row level security;
alter table public.service_intervals enable row level security;
alter table public.app_settings enable row level security;
alter table public.notification_outbox enable row level security;

drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin on public.profiles
for select to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update_own_or_admin on public.profiles;
create policy profiles_update_own_or_admin on public.profiles
for update to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

drop policy if exists vehicles_select_own_or_admin on public.vehicles;
create policy vehicles_select_own_or_admin on public.vehicles
for select to authenticated
using (owner_id = auth.uid() or public.is_admin());

drop policy if exists vehicles_admin_write on public.vehicles;
create policy vehicles_admin_write on public.vehicles
for insert to authenticated
with check (public.is_admin());

drop policy if exists vehicles_admin_update on public.vehicles;
create policy vehicles_admin_update on public.vehicles
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists vehicles_admin_delete on public.vehicles;
create policy vehicles_admin_delete on public.vehicles
for delete to authenticated
using (public.is_admin());

drop policy if exists categories_read on public.service_categories;
create policy categories_read on public.service_categories
for select to authenticated
using (is_active or public.is_admin());

drop policy if exists categories_admin_write on public.service_categories;
create policy categories_admin_write on public.service_categories
for insert to authenticated
with check (public.is_admin());

drop policy if exists categories_admin_update on public.service_categories;
create policy categories_admin_update on public.service_categories
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists records_select_published_own_or_admin on public.service_records;
create policy records_select_published_own_or_admin on public.service_records
for select to authenticated
using (
  public.is_admin()
  or (
    status = 'published'
    and customer_id = auth.uid()
    and exists (
      select 1 from public.vehicles v
      where v.id = service_records.vehicle_id and v.owner_id = auth.uid()
    )
  )
);

drop policy if exists items_select_visible_record on public.service_record_items;
create policy items_select_visible_record on public.service_record_items
for select to authenticated
using (
  exists (
    select 1 from public.service_records r
    where r.id = service_record_items.service_record_id
      and (
        public.is_admin()
        or (
          r.status = 'published'
          and r.customer_id = auth.uid()
          and exists (
            select 1 from public.vehicles v
            where v.id = r.vehicle_id and v.owner_id = auth.uid()
          )
        )
      )
  )
);

drop policy if exists parts_select_visible_record on public.parts_used;
create policy parts_select_visible_record on public.parts_used
for select to authenticated
using (
  exists (
    select 1 from public.service_records r
    where r.id = parts_used.service_record_id
      and (
        public.is_admin()
        or (
          r.status = 'published'
          and r.customer_id = auth.uid()
          and exists (
            select 1 from public.vehicles v
            where v.id = r.vehicle_id and v.owner_id = auth.uid()
          )
        )
      )
  )
);

drop policy if exists notes_select_own_or_admin on public.vehicle_notes;
create policy notes_select_own_or_admin on public.vehicle_notes
for select to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists notes_insert_own on public.vehicle_notes;
create policy notes_insert_own on public.vehicle_notes
for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.vehicles v
    where v.id = vehicle_notes.vehicle_id and v.owner_id = auth.uid()
  )
);

drop policy if exists notes_update_own on public.vehicle_notes;
create policy notes_update_own on public.vehicle_notes
for update to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.vehicles v
    where v.id = vehicle_notes.vehicle_id and v.owner_id = auth.uid()
  )
);

drop policy if exists notes_delete_own on public.vehicle_notes;
create policy notes_delete_own on public.vehicle_notes
for delete to authenticated
using (user_id = auth.uid());

drop policy if exists attachments_select_visible on public.service_record_attachments;
create policy attachments_select_visible on public.service_record_attachments
for select to authenticated
using (
  exists (
    select 1 from public.service_records r
    where r.id = service_record_attachments.service_record_id
      and (
        public.is_admin()
        or (
          r.status = 'published'
          and r.customer_id = auth.uid()
          and exists (
            select 1 from public.vehicles v
            where v.id = r.vehicle_id and v.owner_id = auth.uid()
          )
        )
      )
  )
);

drop policy if exists attachments_admin_write on public.service_record_attachments;
create policy attachments_admin_write on public.service_record_attachments
for insert to authenticated
with check (
  public.is_admin()
  and uploaded_by = auth.uid()
  and exists (select 1 from public.service_records r where r.id = service_record_id)
);

drop policy if exists attachments_admin_delete on public.service_record_attachments;
create policy attachments_admin_delete on public.service_record_attachments
for delete to authenticated
using (public.is_admin());

drop policy if exists audit_admin_read on public.audit_logs;
create policy audit_admin_read on public.audit_logs
for select to authenticated
using (public.is_admin());

drop policy if exists invitations_admin on public.customer_invitations;
create policy invitations_admin on public.customer_invitations
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists claims_select on public.vehicle_claims;
create policy claims_select on public.vehicle_claims
for select to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists claims_insert_own on public.vehicle_claims;
create policy claims_insert_own on public.vehicle_claims
for insert to authenticated
with check (user_id = auth.uid() and status = 'pending');

drop policy if exists claims_admin_update on public.vehicle_claims;
create policy claims_admin_update on public.vehicle_claims
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists intervals_select on public.service_intervals;
create policy intervals_select on public.service_intervals
for select to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.vehicles v
    where v.id = service_intervals.vehicle_id and v.owner_id = auth.uid()
  )
);

drop policy if exists intervals_admin_write on public.service_intervals;
create policy intervals_admin_write on public.service_intervals
for insert to authenticated
with check (public.is_admin());

drop policy if exists intervals_admin_update on public.service_intervals;
create policy intervals_admin_update on public.service_intervals
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists intervals_admin_delete on public.service_intervals;
create policy intervals_admin_delete on public.service_intervals
for delete to authenticated
using (public.is_admin());

drop policy if exists settings_public_read on public.app_settings;
create policy settings_public_read on public.app_settings
for select to anon, authenticated
using (true);

drop policy if exists settings_admin_write on public.app_settings;
create policy settings_admin_write on public.app_settings
for insert to authenticated
with check (public.is_admin());

drop policy if exists settings_admin_update on public.app_settings;
create policy settings_admin_update on public.app_settings
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists notifications_select_own on public.notification_outbox;
create policy notifications_select_own on public.notification_outbox
for select to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists notifications_admin_insert on public.notification_outbox;
create policy notifications_admin_insert on public.notification_outbox
for insert to authenticated
with check (public.is_admin());

create or replace view public.vehicle_directory
with (security_invoker = true) as
select
  v.id,
  v.owner_id,
  v.make,
  v.model,
  v.year,
  v.vin,
  v.license_plate,
  v.engine_info,
  v.fuel_type,
  v.transmission_type,
  v.current_mileage,
  v.image_path,
  v.notes,
  v.is_demo,
  v.created_at,
  v.updated_at,
  p.first_name as owner_first_name,
  p.last_name as owner_last_name,
  p.phone as owner_phone,
  p.email as owner_email
from public.vehicles v
join public.profiles p on p.id = v.owner_id;

create or replace view public.service_directory
with (security_invoker = true) as
select
  r.id,
  r.vehicle_id,
  r.customer_id,
  r.service_date,
  r.mileage,
  r.work_order_number,
  r.performed_by,
  r.status,
  r.labor_total,
  r.parts_total,
  r.grand_total,
  r.published_at,
  r.is_demo,
  r.created_at,
  v.make,
  v.model,
  v.year,
  v.license_plate,
  v.vin,
  p.first_name,
  p.last_name,
  p.phone
from public.service_records r
join public.vehicles v on v.id = r.vehicle_id
join public.profiles p on p.id = r.customer_id;

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.vehicles to authenticated;
grant select, insert, update on public.service_categories to authenticated;
grant select on public.service_records to authenticated;
grant select on public.service_record_items to authenticated;
grant select on public.parts_used to authenticated;
grant select, insert, update, delete on public.vehicle_notes to authenticated;
grant select, insert, delete on public.service_record_attachments to authenticated;
grant select on public.audit_logs to authenticated;
grant select, insert, update, delete on public.customer_invitations to authenticated;
grant select, insert, update on public.vehicle_claims to authenticated;
grant select, insert, update, delete on public.service_intervals to authenticated;
grant select on public.app_settings to anon, authenticated;
grant insert, update on public.app_settings to authenticated;
grant select, insert on public.notification_outbox to authenticated;
grant select on public.vehicle_directory to authenticated;
grant select on public.service_directory to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('vehicle-images', 'vehicle-images', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('service-attachments', 'service-attachments', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

drop policy if exists vehicle_images_admin_all on storage.objects;
create policy vehicle_images_admin_all on storage.objects
for all to authenticated
using (bucket_id = 'vehicle-images' and public.is_admin())
with check (bucket_id = 'vehicle-images' and public.is_admin());

drop policy if exists vehicle_images_owner_read on storage.objects;
create policy vehicle_images_owner_read on storage.objects
for select to authenticated
using (
  bucket_id = 'vehicle-images'
  and exists (
    select 1 from public.vehicles v
    where v.id::text = (storage.foldername(name))[1]
      and v.owner_id = auth.uid()
  )
);

drop policy if exists service_files_admin_all on storage.objects;
create policy service_files_admin_all on storage.objects
for all to authenticated
using (bucket_id = 'service-attachments' and public.is_admin())
with check (bucket_id = 'service-attachments' and public.is_admin());

drop policy if exists service_files_owner_read on storage.objects;
create policy service_files_owner_read on storage.objects
for select to authenticated
using (
  bucket_id = 'service-attachments'
  and exists (
    select 1
    from public.service_records r
    join public.vehicles v on v.id = r.vehicle_id
    where r.id::text = (storage.foldername(name))[1]
      and r.status = 'published'
      and r.customer_id = auth.uid()
      and v.owner_id = auth.uid()
  )
);

insert into public.service_categories (name, slug, template_key, sort_order)
values
  ('Замена моторного масла', 'engine-oil', 'engine_oil', 10),
  ('Замена масляного фильтра', 'oil-filter', 'filter', 20),
  ('Замена воздушного фильтра', 'air-filter', 'filter', 30),
  ('Замена салонного фильтра', 'cabin-filter', 'filter', 40),
  ('Замена топливного фильтра', 'fuel-filter', 'filter', 50),
  ('Замена масла в АКПП', 'atf', 'transmission_oil', 60),
  ('Замена масла в МКПП', 'mtf', 'transmission_oil', 70),
  ('Замена фильтра трансмиссии', 'transmission-filter', 'filter', 80),
  ('Замена ремня ГРМ', 'timing-belt', 'timing', 90),
  ('Замена роликов ГРМ', 'timing-rollers', 'timing', 100),
  ('Замена передних тормозных колодок', 'brake-pads-front', 'brake_pads', 110),
  ('Замена задних тормозных колодок', 'brake-pads-rear', 'brake_pads', 120),
  ('Замена барабанных тормозных колодок', 'brake-shoes', 'brake_pads', 130),
  ('Замена тормозной жидкости', 'brake-fluid', 'fluid', 140),
  ('Замена охлаждающей жидкости', 'coolant', 'fluid', 150),
  ('Замена жидкости ГУР', 'power-steering-fluid', 'fluid', 160)
on conflict (slug) do nothing;

insert into public.app_settings (key, value)
values
  ('phone_display', to_jsonb('+7 989 768 07 07'::text)),
  ('phone_href', to_jsonb('tel:+79897680707'::text)),
  ('address', to_jsonb('г. Новороссийск, ул. Видова, 222, Т/Ц Приморский.'::text)),
  ('about', to_jsonb('Электронная сервисная книжка и обслуживание автомобилей в Новороссийске. Меняем масла, фильтры, ремни ГРМ и тормозные компоненты и сохраняем историю работ.'::text)),
  ('map_url', to_jsonb('https://yandex.ru/maps/?text=%D0%B3.%20%D0%9D%D0%BE%D0%B2%D0%BE%D1%80%D0%BE%D1%81%D1%81%D0%B8%D0%B9%D1%81%D0%BA%2C%20%D1%83%D0%BB.%20%D0%92%D0%B8%D0%B4%D0%BE%D0%B2%D0%B0%2C%20222%2C%20%D0%A2%2F%D0%A6%20%D0%9F%D1%80%D0%B8%D0%BC%D0%BE%D1%80%D1%81%D0%BA%D0%B8%D0%B9'::text))
on conflict (key) do nothing;
