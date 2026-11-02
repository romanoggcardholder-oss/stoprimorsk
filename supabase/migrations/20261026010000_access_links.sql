-- Персональные ссылки на сервисную книжку.
-- В таблице хранится только хеш токена. Сам токен не записывается и не возвращается функциями.
-- Миграция не удаляет клиентов, автомобили, историю и заметки.

create table if not exists public.access_grants (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete cascade,
  vehicle_id uuid references public.vehicles (id) on delete cascade,
  token_hash text not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint access_grants_hash_format check (token_hash ~ '^[0-9a-f]{64}$')
);

create unique index if not exists access_grants_hash_idx on public.access_grants (token_hash);

create unique index if not exists access_grants_active_scope_idx
  on public.access_grants (customer_id, coalesce(vehicle_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where revoked_at is null;

create index if not exists access_grants_customer_idx on public.access_grants (customer_id, created_at desc);

alter table public.vehicle_notes alter column user_id drop not null;

alter table public.vehicle_notes
  add column if not exists access_grant_id uuid references public.access_grants (id) on delete cascade;

alter table public.vehicle_notes drop constraint if exists vehicle_notes_author_present;
alter table public.vehicle_notes
  add constraint vehicle_notes_author_present check (user_id is not null or access_grant_id is not null);

create or replace function public.issue_access_grant(
  p_customer uuid,
  p_vehicle uuid,
  p_token_hash text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'app:forbidden';
  end if;
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'app:bad_token';
  end if;
  if not exists (
    select 1 from public.profiles where id = p_customer and role = 'client'
  ) then
    raise exception 'app:not_found';
  end if;
  if p_vehicle is not null and not exists (
    select 1 from public.vehicles where id = p_vehicle and owner_id = p_customer
  ) then
    raise exception 'app:vehicle_owner';
  end if;

  update public.access_grants
  set revoked_at = now()
  where customer_id = p_customer
    and revoked_at is null
    and vehicle_id is not distinct from p_vehicle;

  insert into public.access_grants (customer_id, vehicle_id, token_hash, created_by)
  values (p_customer, p_vehicle, p_token_hash, auth.uid())
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.revoke_access_grant(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'app:forbidden';
  end if;
  update public.access_grants
  set revoked_at = now()
  where id = p_id
    and revoked_at is null;
  if not found then
    raise exception 'app:not_found';
  end if;
end;
$$;

create or replace function public.open_service_book(p_token_hash text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_grant public.access_grants%rowtype;
  v_result jsonb;
begin
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    return null;
  end if;

  select * into v_grant
  from public.access_grants
  where token_hash = p_token_hash
    and revoked_at is null;

  if not found then
    return null;
  end if;

  select jsonb_build_object(
    'customer', jsonb_build_object(
      'first_name', p.first_name,
      'last_name', p.last_name
    ),
    'vehicles', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', v.id,
        'make', v.make,
        'model', v.model,
        'year', v.year,
        'vin', v.vin,
        'license_plate', v.license_plate,
        'engine_info', v.engine_info,
        'fuel_type', v.fuel_type,
        'transmission_type', v.transmission_type,
        'current_mileage', v.current_mileage,
        'image_path', v.image_path,
        'notes', v.notes,
        'created_at', v.created_at
      ) order by v.created_at desc)
      from public.vehicles v
      where v.owner_id = v_grant.customer_id
        and (v_grant.vehicle_id is null or v.id = v_grant.vehicle_id)
    ), '[]'::jsonb),
    'records', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id,
        'vehicle_id', r.vehicle_id,
        'service_date', r.service_date,
        'mileage', r.mileage,
        'work_order_number', r.work_order_number,
        'performed_by', r.performed_by,
        'general_comment', r.general_comment,
        'labor_total', r.labor_total,
        'parts_total', r.parts_total,
        'grand_total', r.grand_total,
        'next_service_mileage', r.next_service_mileage,
        'next_service_date', r.next_service_date,
        'master_recommendations', r.master_recommendations,
        'vehicle_label', v.make || ' ' || v.model,
        'license_plate', v.license_plate,
        'items', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', i.id,
            'service_name', i.service_name,
            'description', i.description,
            'technical_details', coalesce(i.technical_details, '{}'::jsonb),
            'is_completed', i.is_completed,
            'total_price', i.total_price,
            'category_name', c.name,
            'template_key', c.template_key
          ) order by i.created_at)
          from public.service_record_items i
          left join public.service_categories c on c.id = i.category_id
          where i.service_record_id = r.id
        ), '[]'::jsonb),
        'parts', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', part.id,
            'name', part.name,
            'manufacturer', part.manufacturer,
            'article_number', part.article_number,
            'quantity', part.quantity,
            'unit', part.unit,
            'unit_price', part.unit_price,
            'total_price', part.total_price
          ) order by part.created_at)
          from public.parts_used part
          where part.service_record_id = r.id
        ), '[]'::jsonb),
        'attachments', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', a.id,
            'file_name', a.file_name,
            'content_type', a.content_type,
            'file_path', a.file_path
          ) order by a.created_at)
          from public.service_record_attachments a
          where a.service_record_id = r.id
        ), '[]'::jsonb)
      ) order by r.service_date desc)
      from public.service_records r
      join public.vehicles v on v.id = r.vehicle_id
      where r.status = 'published'
        and r.customer_id = v_grant.customer_id
        and v.owner_id = v_grant.customer_id
        and (v_grant.vehicle_id is null or r.vehicle_id = v_grant.vehicle_id)
    ), '[]'::jsonb),
    'notes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', n.id,
        'vehicle_id', n.vehicle_id,
        'user_id', n.user_id,
        'title', n.title,
        'content', n.content,
        'status', n.status,
        'created_at', n.created_at,
        'updated_at', n.updated_at,
        'vehicle_label', v.make || ' ' || v.model
      ) order by n.updated_at desc)
      from public.vehicle_notes n
      join public.vehicles v on v.id = n.vehicle_id
      where v.owner_id = v_grant.customer_id
        and (v_grant.vehicle_id is null or n.vehicle_id = v_grant.vehicle_id)
        and (
          n.user_id = v_grant.customer_id
          or exists (
            select 1 from public.access_grants g
            where g.id = n.access_grant_id and g.customer_id = v_grant.customer_id
          )
        )
    ), '[]'::jsonb)
  )
  into v_result
  from public.profiles p
  where p.id = v_grant.customer_id;

  return v_result;
end;
$$;

create or replace function public.book_save_note(
  p_token_hash text,
  p_note_id uuid,
  p_vehicle_id uuid,
  p_title text,
  p_content text,
  p_status text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_grant public.access_grants%rowtype;
  v_id uuid;
  v_title text := trim(coalesce(p_title, ''));
  v_content text := trim(coalesce(p_content, ''));
begin
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'app:not_found';
  end if;
  if char_length(v_title) < 2 or char_length(v_title) > 160
     or char_length(v_content) < 2 or char_length(v_content) > 4000
     or p_status not in ('active', 'done') then
    raise exception 'app:bad_details';
  end if;

  select * into v_grant
  from public.access_grants
  where token_hash = p_token_hash
    and revoked_at is null;
  if not found then
    raise exception 'app:not_found';
  end if;

  if not exists (
    select 1 from public.vehicles v
    where v.id = p_vehicle_id
      and v.owner_id = v_grant.customer_id
      and (v_grant.vehicle_id is null or v.id = v_grant.vehicle_id)
  ) then
    raise exception 'app:vehicle_owner';
  end if;

  if p_note_id is null then
    insert into public.vehicle_notes (vehicle_id, user_id, access_grant_id, title, content, status)
    values (p_vehicle_id, null, v_grant.id, v_title, v_content, p_status)
    returning id into v_id;
    return v_id;
  end if;

  update public.vehicle_notes n
  set vehicle_id = p_vehicle_id,
      title = v_title,
      content = v_content,
      status = p_status
  where n.id = p_note_id
    and exists (
      select 1 from public.vehicles v
      where v.id = n.vehicle_id
        and v.owner_id = v_grant.customer_id
        and (v_grant.vehicle_id is null or v.id = v_grant.vehicle_id)
    )
    and (
      n.user_id = v_grant.customer_id
      or exists (
        select 1 from public.access_grants g
        where g.id = n.access_grant_id and g.customer_id = v_grant.customer_id
      )
    );
  if not found then
    raise exception 'app:not_found';
  end if;
  return p_note_id;
end;
$$;

create or replace function public.book_delete_note(p_token_hash text, p_note_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_grant public.access_grants%rowtype;
begin
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'app:not_found';
  end if;

  select * into v_grant
  from public.access_grants
  where token_hash = p_token_hash
    and revoked_at is null;
  if not found then
    raise exception 'app:not_found';
  end if;

  delete from public.vehicle_notes n
  where n.id = p_note_id
    and exists (
      select 1 from public.vehicles v
      where v.id = n.vehicle_id
        and v.owner_id = v_grant.customer_id
        and (v_grant.vehicle_id is null or v.id = v_grant.vehicle_id)
    )
    and (
      n.user_id = v_grant.customer_id
      or exists (
        select 1 from public.access_grants g
        where g.id = n.access_grant_id and g.customer_id = v_grant.customer_id
      )
    );
  if not found then
    raise exception 'app:not_found';
  end if;
end;
$$;

revoke all on function public.issue_access_grant(uuid, uuid, text) from public, anon;
revoke all on function public.revoke_access_grant(uuid) from public, anon;
revoke all on function public.open_service_book(text) from public;
revoke all on function public.book_save_note(text, uuid, uuid, text, text, text) from public;
revoke all on function public.book_delete_note(text, uuid) from public;

grant execute on function public.issue_access_grant(uuid, uuid, text) to authenticated;
grant execute on function public.revoke_access_grant(uuid) to authenticated;
grant execute on function public.open_service_book(text) to anon, authenticated;
grant execute on function public.book_save_note(text, uuid, uuid, text, text, text) to anon, authenticated;
grant execute on function public.book_delete_note(text, uuid) to anon, authenticated;

alter table public.access_grants enable row level security;

revoke all on table public.access_grants from anon, authenticated;
grant select (id, customer_id, vehicle_id, created_at, revoked_at, created_by)
  on public.access_grants to authenticated;

drop policy if exists access_grants_admin_select on public.access_grants;
create policy access_grants_admin_select on public.access_grants
for select to authenticated
using (public.is_admin());

drop policy if exists notes_select_own_or_admin on public.vehicle_notes;
create policy notes_select_own_or_admin on public.vehicle_notes
for select to authenticated
using (
  public.is_admin()
  or user_id = auth.uid()
  or exists (
    select 1 from public.vehicles v
    where v.id = vehicle_notes.vehicle_id and v.owner_id = auth.uid()
  )
);
