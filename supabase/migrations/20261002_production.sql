-- Oficina dos Bichos - schema de produção
-- Executar no Supabase SQL Editor ou via migration.

create extension if not exists pgcrypto;
create extension if not exists unaccent;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  city text not null default '',
  role text not null default 'client' check (role in ('client','admin','staff')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  species text not null check (species in ('Cachorro','Gato','Outro')),
  breed text not null default '',
  age_text text not null default '',
  weight_text text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null unique,
  sector text not null default '',
  duration_minutes integer not null default 60 check (duration_minutes > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.professionals (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  role_title text not null default 'Profissional',
  sector text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.professional_services (
  professional_id uuid not null references public.professionals(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (professional_id, service_id)
);

create table if not exists public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  specific_date date,
  weekday smallint check (weekday between 0 and 6),
  times time[] not null default '{}',
  is_closed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint availability_scope_check check (
    (specific_date is not null and weekday is null)
    or (specific_date is null and weekday is not null)
  )
);

create unique index if not exists availability_rule_date_unique
  on public.availability_rules(professional_id, service_id, specific_date)
  where specific_date is not null;

create unique index if not exists availability_rule_weekday_unique
  on public.availability_rules(professional_id, service_id, weekday)
  where specific_date is null;

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete restrict,
  service_id uuid not null references public.services(id) on delete restrict,
  professional_id uuid not null references public.professionals(id) on delete restrict,
  appointment_date date not null,
  appointment_time time not null,
  notes text not null default '',
  status text not null default 'scheduled' check (status in ('scheduled','confirmed','in_progress','completed','cancelled')),
  cancellation_reason text,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Proteção real contra dupla reserva. Agendamento cancelado deixa de ocupar a vaga.
create unique index if not exists appointments_active_slot_unique
  on public.appointments(professional_id, appointment_date, appointment_time)
  where status <> 'cancelled';

create index if not exists appointments_client_date_idx on public.appointments(client_id, appointment_date);
create index if not exists appointments_professional_date_idx on public.appointments(professional_id, appointment_date);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  price numeric(10,2) not null check (price >= 0),
  category text not null default 'Outros',
  stock integer not null default 0 check (stock >= 0),
  icon text not null default '🐾',
  image_url text,
  description text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending','confirmed','ready','completed','cancelled')),
  total numeric(10,2) not null default 0 check (total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10,2) not null check (unit_price >= 0),
  created_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin','staff')
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user not in ('postgres','supabase_admin') and not public.is_admin() then
    new.role = old.role;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role_trigger on public.profiles;
create trigger protect_profile_role_trigger
  before update on public.profiles
  for each row execute procedure public.protect_profile_role();

do $$
declare t text;
begin
  foreach t in array array['profiles','pets','services','professionals','availability_rules','appointments','products','orders'] loop
    execute format('drop trigger if exists %I_touch_updated_at on public.%I', t, t);
    execute format('create trigger %I_touch_updated_at before update on public.%I for each row execute procedure public.touch_updated_at()', t, t);
  end loop;
end $$;

alter table public.profiles enable row level security;
alter table public.pets enable row level security;
alter table public.services enable row level security;
alter table public.professionals enable row level security;
alter table public.professional_services enable row level security;
alter table public.availability_rules enable row level security;
alter table public.appointments enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Policies are recreated to keep the migration idempotent.
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles','pets','services','professionals','professional_services','availability_rules','appointments','products','orders','order_items')
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

create policy profiles_select on public.profiles
for select to authenticated
using (id = auth.uid() or public.is_admin());

create policy profiles_update on public.profiles
for update to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

create policy pets_select on public.pets
for select to authenticated
using (owner_id = auth.uid() or public.is_admin());

create policy pets_insert on public.pets
for insert to authenticated
with check (owner_id = auth.uid() or public.is_admin());

create policy pets_update on public.pets
for update to authenticated
using (owner_id = auth.uid() or public.is_admin())
with check (owner_id = auth.uid() or public.is_admin());

create policy pets_delete on public.pets
for delete to authenticated
using (owner_id = auth.uid() or public.is_admin());

create policy services_public_read on public.services
for select to anon, authenticated
using (active or public.is_admin());

create policy services_admin_write on public.services
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy professionals_public_read on public.professionals
for select to anon, authenticated
using (active or public.is_admin());

create policy professionals_admin_write on public.professionals
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy professional_services_public_read on public.professional_services
for select to anon, authenticated
using (true);

create policy professional_services_admin_write on public.professional_services
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy availability_public_read on public.availability_rules
for select to anon, authenticated
using (true);

create policy availability_admin_write on public.availability_rules
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy appointments_select on public.appointments
for select to authenticated
using (client_id = auth.uid() or public.is_admin());

create policy appointments_admin_insert on public.appointments
for insert to authenticated
with check (public.is_admin());

create policy appointments_admin_update on public.appointments
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy appointments_admin_delete on public.appointments
for delete to authenticated
using (public.is_admin());

create policy products_public_read on public.products
for select to anon, authenticated
using (active or public.is_admin());

create policy products_admin_write on public.products
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy orders_select on public.orders
for select to authenticated
using (client_id = auth.uid() or public.is_admin());

create policy orders_admin_write on public.orders
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy order_items_select on public.order_items
for select to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.id = order_id and (o.client_id = auth.uid() or public.is_admin())
  )
);

create policy order_items_admin_write on public.order_items
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Horários disponíveis sem expor dados de outros clientes.
create or replace function public.get_available_times(
  p_service_id uuid,
  p_professional_id uuid,
  p_date date
)
returns table(slot_time time)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_times time[];
  v_closed boolean;
  v_weekday smallint;
begin
  if p_date < (now() at time zone 'America/Sao_Paulo')::date then
    return;
  end if;

  if not exists (
    select 1 from public.professional_services ps
    join public.professionals p on p.id = ps.professional_id
    join public.services s on s.id = ps.service_id
    where ps.professional_id = p_professional_id
      and ps.service_id = p_service_id
      and p.active and s.active
  ) then
    return;
  end if;

  select ar.times, ar.is_closed
    into v_times, v_closed
  from public.availability_rules ar
  where ar.professional_id = p_professional_id
    and ar.service_id = p_service_id
    and ar.specific_date = p_date
  limit 1;

  if found then
    if v_closed then return; end if;
  else
    v_weekday := extract(dow from p_date)::smallint;
    select ar.times, ar.is_closed
      into v_times, v_closed
    from public.availability_rules ar
    where ar.professional_id = p_professional_id
      and ar.service_id = p_service_id
      and ar.specific_date is null
      and ar.weekday = v_weekday
    limit 1;

    if not found or v_closed then return; end if;
  end if;

  return query
  select t
  from unnest(coalesce(v_times, '{}'::time[])) t
  where not exists (
    select 1 from public.appointments a
    where a.professional_id = p_professional_id
      and a.appointment_date = p_date
      and a.appointment_time = t
      and a.status <> 'cancelled'
  )
    and (
      p_date > (now() at time zone 'America/Sao_Paulo')::date
      or t > (now() at time zone 'America/Sao_Paulo')::time
    )
  order by t;
end;
$$;

grant execute on function public.get_available_times(uuid,uuid,date) to anon, authenticated;

create or replace function public.book_appointment(
  p_pet_id uuid,
  p_service_id uuid,
  p_professional_id uuid,
  p_date date,
  p_time time,
  p_notes text default null
)
returns public.appointments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_row public.appointments;
  v_allowed boolean;
begin
  if v_user is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  if not exists (select 1 from public.pets where id = p_pet_id and owner_id = v_user and active) then
    raise exception 'PET_NOT_ALLOWED' using errcode = '42501';
  end if;

  select exists (
    select 1 from public.get_available_times(p_service_id, p_professional_id, p_date) x
    where x.slot_time = p_time
  ) into v_allowed;

  if not v_allowed then
    raise exception 'SLOT_UNAVAILABLE' using errcode = 'P0001';
  end if;

  begin
    insert into public.appointments (
      client_id, pet_id, service_id, professional_id,
      appointment_date, appointment_time, notes, status
    ) values (
      v_user, p_pet_id, p_service_id, p_professional_id,
      p_date, p_time, coalesce(p_notes,''), 'scheduled'
    ) returning * into v_row;
  exception when unique_violation then
    raise exception 'SLOT_UNAVAILABLE' using errcode = 'P0001';
  end;

  return v_row;
end;
$$;

grant execute on function public.book_appointment(uuid,uuid,uuid,date,time,text) to authenticated;

create or replace function public.cancel_my_appointment(p_appointment_id uuid)
returns public.appointments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.appointments;
begin
  update public.appointments
  set status = 'cancelled', cancelled_at = now(), updated_at = now()
  where id = p_appointment_id
    and client_id = auth.uid()
    and status not in ('cancelled','completed')
  returning * into v_row;

  if v_row.id is null then
    raise exception 'APPOINTMENT_NOT_CANCELLABLE' using errcode = 'P0001';
  end if;

  return v_row;
end;
$$;

grant execute on function public.cancel_my_appointment(uuid) to authenticated;

create or replace function public.upsert_availability_rule(
  p_professional_id uuid,
  p_service_id uuid,
  p_specific_date date,
  p_weekday smallint,
  p_times text[],
  p_is_closed boolean default false
)
returns public.availability_rules
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.availability_rules;
  v_times time[];
begin
  if not public.is_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  if (p_specific_date is null) = (p_weekday is null) then
    raise exception 'Escolha data específica OU dia da semana.' using errcode = '22023';
  end if;

  select coalesce(array_agg(x::time order by x::time), '{}'::time[])
  into v_times
  from unnest(coalesce(p_times, '{}'::text[])) x;

  if p_specific_date is not null then
    insert into public.availability_rules (professional_id, service_id, specific_date, weekday, times, is_closed)
    values (p_professional_id, p_service_id, p_specific_date, null, v_times, p_is_closed)
    on conflict (professional_id, service_id, specific_date) where specific_date is not null
    do update set times = excluded.times, is_closed = excluded.is_closed, updated_at = now()
    returning * into v_row;
  else
    insert into public.availability_rules (professional_id, service_id, specific_date, weekday, times, is_closed)
    values (p_professional_id, p_service_id, null, p_weekday, v_times, p_is_closed)
    on conflict (professional_id, service_id, weekday) where specific_date is null
    do update set times = excluded.times, is_closed = excluded.is_closed, updated_at = now()
    returning * into v_row;
  end if;

  return v_row;
end;
$$;

grant execute on function public.upsert_availability_rule(uuid,uuid,date,smallint,text[],boolean) to authenticated;

create or replace function public.create_professional_with_services(
  p_name text,
  p_role_title text,
  p_sector text,
  p_service_ids uuid[]
)
returns public.professionals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.professionals;
  v_slug text;
begin
  if not public.is_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  v_slug := regexp_replace(lower(unaccent(coalesce(p_name,'profissional'))), '[^a-z0-9]+', '-', 'g');
  v_slug := trim(both '-' from v_slug) || '-' || substr(gen_random_uuid()::text, 1, 8);

  insert into public.professionals (slug, name, role_title, sector)
  values (v_slug, p_name, coalesce(nullif(p_role_title,''),'Profissional'), p_sector)
  returning * into v_row;

  insert into public.professional_services (professional_id, service_id)
  select v_row.id, x from unnest(coalesce(p_service_ids, '{}'::uuid[])) x
  on conflict do nothing;

  return v_row;
end;
$$;

-- unaccent é opcional; esta extensão existe por padrão em muitos projetos, mas garantimos aqui.
create extension if not exists unaccent;
grant execute on function public.create_professional_with_services(text,text,text,uuid[]) to authenticated;

-- Dados iniciais do MVP.
insert into public.services (slug, name, sector, duration_minutes)
values
  ('veterinario','Veterinário','Clínica veterinária',60),
  ('vacinacao','Vacinação','Clínica veterinária',30),
  ('banho-tosa','Banho & Tosa','Estética',60),
  ('hotelzinho','Hotelzinho','Hotelzinho',60),
  ('creche-pet','Creche Pet','Creche Pet',60)
on conflict (slug) do update set name = excluded.name, sector = excluded.sector, duration_minutes = excluded.duration_minutes;

insert into public.professionals (slug, name, role_title, sector)
values
  ('vet-john','Dr. John Dale Neto','Médico-veterinário','Clínica veterinária'),
  ('banho-equipe','Equipe Banho & Tosa','Banho & Tosa','Estética'),
  ('hotel-equipe','Equipe Hotelzinho','Cuidados e hospedagem','Hotelzinho'),
  ('creche-equipe','Equipe Creche Pet','Cuidados e recreação','Creche Pet')
on conflict (slug) do update set name = excluded.name, role_title = excluded.role_title, sector = excluded.sector;

insert into public.professional_services (professional_id, service_id)
select p.id, s.id
from public.professionals p
join public.services s on
  (p.slug = 'vet-john' and s.slug in ('veterinario','vacinacao')) or
  (p.slug = 'banho-equipe' and s.slug = 'banho-tosa') or
  (p.slug = 'hotel-equipe' and s.slug = 'hotelzinho') or
  (p.slug = 'creche-equipe' and s.slug = 'creche-pet')
on conflict do nothing;

-- Grade inicial: segunda a sábado.
insert into public.availability_rules (professional_id, service_id, weekday, times, is_closed)
select ps.professional_id, ps.service_id, d.weekday,
       array['08:00','09:00','10:30','14:00','16:00','17:30']::time[], false
from public.professional_services ps
cross join (values (1),(2),(3),(4),(5),(6)) as d(weekday)
on conflict (professional_id, service_id, weekday) where specific_date is null do nothing;

insert into public.products (slug, name, price, category, stock, icon, description)
values
  ('racao-premium-10kg','Ração Premium 10kg',129.90,'Rações',12,'🥣','Ração completa e balanceada para cães adultos.'),
  ('brinquedo-mordedor','Brinquedo Mordedor',24.90,'Brinquedos',8,'🧸','Brinquedo resistente para enriquecer a rotina do pet.'),
  ('coleira-ajustavel','Coleira Ajustável',39.90,'Acessórios',6,'🦴','Coleira confortável e ajustável para passeios.'),
  ('shampoo-pet-500ml','Shampoo Pet 500ml',32.90,'Higiene',5,'🧴','Higiene suave para pele e pelagem.')
on conflict (slug) do nothing;

-- Função administrativa para promover um usuário pelo e-mail via SQL Editor.
create or replace function public.promote_admin_by_email(p_email text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare v_id uuid;
begin
  select id into v_id from auth.users where lower(email) = lower(p_email) limit 1;
  if v_id is null then raise exception 'Usuário não encontrado.'; end if;
  update public.profiles set role = 'admin', updated_at = now() where id = v_id;
end;
$$;
revoke all on function public.promote_admin_by_email(text) from public, anon, authenticated;


-- Checkout transacional da Loja Pet.
alter table public.orders add column if not exists delivery_method text not null default 'retirada';
alter table public.orders add column if not exists payment_method text not null default 'PIX';
alter table public.orders add column if not exists delivery_fee numeric(10,2) not null default 0;

create or replace function public.place_order(
  p_items jsonb,
  p_delivery_method text default 'retirada',
  p_payment_method text default 'PIX'
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_item jsonb;
  v_product public.products;
  v_qty integer;
  v_total numeric(10,2) := 0;
  v_delivery_fee numeric(10,2) := case when p_delivery_method = 'entrega' then 8 else 0 end;
  v_order public.orders;
begin
  if v_user is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_CART' using errcode = '22023';
  end if;

  -- Valida e bloqueia os produtos antes de criar o pedido.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := greatest(1, coalesce((v_item ->> 'quantity')::integer, 1));
    select * into v_product
    from public.products
    where slug = v_item ->> 'slug' and active
    for update;

    if v_product.id is null then
      raise exception 'PRODUCT_NOT_FOUND:%', v_item ->> 'slug' using errcode = 'P0001';
    end if;
    if v_product.stock < v_qty then
      raise exception 'INSUFFICIENT_STOCK:%', v_product.name using errcode = 'P0001';
    end if;
    v_total := v_total + (v_product.price * v_qty);
  end loop;

  insert into public.orders (client_id, status, total, delivery_method, payment_method, delivery_fee)
  values (v_user, 'pending', v_total + v_delivery_fee, p_delivery_method, p_payment_method, v_delivery_fee)
  returning * into v_order;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := greatest(1, coalesce((v_item ->> 'quantity')::integer, 1));
    select * into v_product from public.products where slug = v_item ->> 'slug' for update;

    insert into public.order_items (order_id, product_id, quantity, unit_price)
    values (v_order.id, v_product.id, v_qty, v_product.price);

    update public.products
    set stock = stock - v_qty, updated_at = now()
    where id = v_product.id;
  end loop;

  return v_order;
end;
$$;

grant execute on function public.place_order(jsonb,text,text) to authenticated;
