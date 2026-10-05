-- V6 - agenda semanal por faixa de horário + exceções + pedidos com entrega

alter table public.availability_rules
  add column if not exists start_time time,
  add column if not exists end_time time;

create table if not exists public.clinic_date_exceptions (
  specific_date date primary key,
  is_closed boolean not null default true,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.clinic_date_exceptions enable row level security;

drop policy if exists clinic_date_exceptions_admin_read on public.clinic_date_exceptions;
drop policy if exists clinic_date_exceptions_admin_write on public.clinic_date_exceptions;
create policy clinic_date_exceptions_admin_read on public.clinic_date_exceptions
for select to authenticated using (public.is_admin());
create policy clinic_date_exceptions_admin_write on public.clinic_date_exceptions
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop trigger if exists clinic_date_exceptions_touch_updated_at on public.clinic_date_exceptions;
create trigger clinic_date_exceptions_touch_updated_at
before update on public.clinic_date_exceptions
for each row execute procedure public.touch_updated_at();

-- Padroniza o horário semanal inicial para 09:00–18:00, segunda a sexta.
delete from public.availability_rules where specific_date is null;
insert into public.availability_rules (
  professional_id, service_id, specific_date, weekday, times, is_closed, start_time, end_time
)
select ps.professional_id, ps.service_id, null, d.weekday, '{}'::time[], false, '09:00'::time, '18:00'::time
from public.professional_services ps
cross join (values (1),(2),(3),(4),(5)) d(weekday)
on conflict (professional_id,service_id,weekday) where specific_date is null
  do update set start_time=excluded.start_time,end_time=excluded.end_time,is_closed=false,times='{}'::time[],updated_at=now();

create or replace function public.upsert_availability_window(
  p_professional_id uuid,
  p_service_id uuid,
  p_specific_date date,
  p_weekday smallint,
  p_start_time time,
  p_end_time time,
  p_is_closed boolean default false
)
returns public.availability_rules
language plpgsql security definer set search_path = public as $$
declare v_row public.availability_rules;
begin
  if not public.is_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode='42501';
  end if;

  if (p_specific_date is null) = (p_weekday is null) then
    raise exception 'Escolha data específica OU dia da semana.' using errcode='22023';
  end if;

  if not p_is_closed and (p_start_time is null or p_end_time is null or p_end_time <= p_start_time) then
    raise exception 'INVALID_TIME_WINDOW' using errcode='22023';
  end if;

  if p_specific_date is not null then
    insert into public.availability_rules (
      professional_id,service_id,specific_date,weekday,times,is_closed,start_time,end_time
    ) values (
      p_professional_id,p_service_id,p_specific_date,null,'{}'::time[],p_is_closed,p_start_time,p_end_time
    )
    on conflict (professional_id,service_id,specific_date) where specific_date is not null
    do update set
      times='{}'::time[],is_closed=excluded.is_closed,start_time=excluded.start_time,end_time=excluded.end_time,updated_at=now()
    returning * into v_row;
  else
    insert into public.availability_rules (
      professional_id,service_id,specific_date,weekday,times,is_closed,start_time,end_time
    ) values (
      p_professional_id,p_service_id,null,p_weekday,'{}'::time[],p_is_closed,p_start_time,p_end_time
    )
    on conflict (professional_id,service_id,weekday) where specific_date is null
    do update set
      times='{}'::time[],is_closed=excluded.is_closed,start_time=excluded.start_time,end_time=excluded.end_time,updated_at=now()
    returning * into v_row;
  end if;

  return v_row;
end; $$;

revoke all on function public.upsert_availability_window(uuid,uuid,date,smallint,time,time,boolean) from public,anon,authenticated;
grant execute on function public.upsert_availability_window(uuid,uuid,date,smallint,time,time,boolean) to authenticated;

create or replace function public.set_clinic_date_exception(
  p_date date,
  p_is_closed boolean,
  p_note text default ''
)
returns public.clinic_date_exceptions
language plpgsql security definer set search_path=public as $$
declare v_row public.clinic_date_exceptions;
begin
  if not public.is_admin() then raise exception 'ADMIN_REQUIRED' using errcode='42501'; end if;
  insert into public.clinic_date_exceptions (specific_date,is_closed,note)
  values (p_date,p_is_closed,coalesce(p_note,''))
  on conflict (specific_date) do update set is_closed=excluded.is_closed,note=excluded.note,updated_at=now()
  returning * into v_row;
  return v_row;
end; $$;

revoke all on function public.set_clinic_date_exception(date,boolean,text) from public,anon,authenticated;
grant execute on function public.set_clinic_date_exception(date,boolean,text) to authenticated;

create or replace function public.get_available_times(
  p_service_id uuid,
  p_professional_id uuid,
  p_date date
)
returns table(slot_time time)
language plpgsql security definer set search_path = public as $$
declare
  v_start time;
  v_end time;
  v_closed boolean;
  v_weekday smallint;
  v_duration integer;
  v_times time[];
begin
  if p_date < (now() at time zone 'America/Sao_Paulo')::date then return; end if;

  if exists (
    select 1 from public.clinic_date_exceptions c
    where c.specific_date=p_date and c.is_closed
  ) then return; end if;

  select s.duration_minutes into v_duration
  from public.professional_services ps
  join public.professionals p on p.id=ps.professional_id
  join public.services s on s.id=ps.service_id
  where ps.professional_id=p_professional_id and ps.service_id=p_service_id and p.active and s.active;

  if v_duration is null then return; end if;

  select ar.start_time,ar.end_time,ar.is_closed,ar.times
    into v_start,v_end,v_closed,v_times
  from public.availability_rules ar
  where ar.professional_id=p_professional_id
    and ar.service_id=p_service_id
    and ar.specific_date=p_date
  limit 1;

  if found then
    if v_closed then return; end if;
  else
    v_weekday := extract(dow from p_date)::smallint;
    select ar.start_time,ar.end_time,ar.is_closed,ar.times
      into v_start,v_end,v_closed,v_times
    from public.availability_rules ar
    where ar.professional_id=p_professional_id
      and ar.service_id=p_service_id
      and ar.specific_date is null
      and ar.weekday=v_weekday
    limit 1;
    if not found or v_closed then return; end if;
  end if;

  -- Compatibilidade com regras antigas baseadas em uma lista explícita de horários.
  if (v_start is null or v_end is null) and coalesce(array_length(v_times,1),0) > 0 then
    return query
    select t
    from unnest(v_times) t
    where not exists (
      select 1
      from public.appointments a
      join public.services existing_service on existing_service.id=a.service_id
      where a.professional_id=p_professional_id
        and a.appointment_date=p_date
        and a.status <> 'cancelled'
        and (p_date+t) < (p_date+a.appointment_time+make_interval(mins=>existing_service.duration_minutes))
        and (p_date+a.appointment_time) < (p_date+t+make_interval(mins=>v_duration))
    )
    and (p_date > (now() at time zone 'America/Sao_Paulo')::date or t > (now() at time zone 'America/Sao_Paulo')::time)
    order by t;
    return;
  end if;

  if v_start is null or v_end is null or v_end <= v_start then return; end if;

  return query
  select gs::time
  from generate_series(
    p_date + v_start,
    p_date + v_end - make_interval(mins=>v_duration),
    make_interval(mins=>v_duration)
  ) gs
  where not exists (
    select 1
    from public.appointments a
    join public.services existing_service on existing_service.id=a.service_id
    where a.professional_id=p_professional_id
      and a.appointment_date=p_date
      and a.status <> 'cancelled'
      and gs < (p_date+a.appointment_time+make_interval(mins=>existing_service.duration_minutes))
      and (p_date+a.appointment_time) < (gs+make_interval(mins=>v_duration))
  )
  and (
    p_date > (now() at time zone 'America/Sao_Paulo')::date
    or gs::time > (now() at time zone 'America/Sao_Paulo')::time
  )
  order by gs;
end; $$;

revoke all on function public.get_available_times(uuid,uuid,date) from public,anon,authenticated;
grant execute on function public.get_available_times(uuid,uuid,date) to anon,authenticated;

create or replace function public.book_appointment(
  p_pet_id uuid,
  p_service_id uuid,
  p_professional_id uuid,
  p_date date,
  p_time time,
  p_notes text default null
)
returns public.appointments
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_row public.appointments;
  v_allowed boolean;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if not exists (select 1 from public.pets where id=p_pet_id and owner_id=v_user and active) then
    raise exception 'PET_NOT_ALLOWED' using errcode='42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_professional_id::text || ':' || p_date::text,0));

  select exists(
    select 1 from public.get_available_times(p_service_id,p_professional_id,p_date) x
    where x.slot_time=p_time
  ) into v_allowed;

  if not v_allowed then raise exception 'SLOT_UNAVAILABLE' using errcode='P0001'; end if;

  insert into public.appointments (
    client_id,pet_id,service_id,professional_id,appointment_date,appointment_time,notes,status
  ) values (
    v_user,p_pet_id,p_service_id,p_professional_id,p_date,p_time,coalesce(p_notes,''),'scheduled'
  ) returning * into v_row;

  return v_row;
end; $$;

revoke all on function public.book_appointment(uuid,uuid,uuid,date,time,text) from public,anon,authenticated;
grant execute on function public.book_appointment(uuid,uuid,uuid,date,time,text) to authenticated;

-- Pedidos: endereço de entrega e novos status.
alter table public.orders
  add column if not exists delivery_street text,
  add column if not exists delivery_number text,
  add column if not exists delivery_neighborhood text,
  add column if not exists delivery_city text,
  add column if not exists delivery_cep text,
  add column if not exists delivery_complement text,
  add column if not exists delivery_reference text;

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check check (
  status in ('pending','confirmed','preparing','ready','out_for_delivery','completed','cancelled')
);

-- Troca a versão antiga de 3 parâmetros pela nova, que também recebe endereço.
drop function if exists public.place_order(jsonb,text,text);
create function public.place_order(
  p_items jsonb,
  p_delivery_method text,
  p_payment_method text,
  p_address jsonb
)
returns public.orders
language plpgsql security definer set search_path=public as $$
declare
  v_user uuid:=auth.uid();
  v_item jsonb;
  v_product public.products;
  v_qty integer;
  v_total numeric(10,2):=0;
  v_delivery_fee numeric(10,2):=case when p_delivery_method='entrega' then 8 else 0 end;
  v_order public.orders;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if p_delivery_method not in ('retirada','entrega') then raise exception 'INVALID_DELIVERY_METHOD' using errcode='22023'; end if;
  if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then raise exception 'EMPTY_CART' using errcode='22023'; end if;

  if p_delivery_method='entrega' then
    if nullif(trim(coalesce(p_address->>'street','')),'') is null
      or nullif(trim(coalesce(p_address->>'number','')),'') is null
      or nullif(trim(coalesce(p_address->>'neighborhood','')),'') is null
      or nullif(trim(coalesce(p_address->>'city','')),'') is null
      or nullif(trim(coalesce(p_address->>'cep','')),'') is null then
      raise exception 'DELIVERY_ADDRESS_REQUIRED' using errcode='22023';
    end if;
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty:=greatest(1,coalesce((v_item->>'quantity')::integer,1));
    select * into v_product from public.products where slug=v_item->>'slug' and active for update;
    if v_product.id is null then raise exception 'PRODUCT_NOT_FOUND:%',v_item->>'slug' using errcode='P0001'; end if;
    if v_product.stock<v_qty then raise exception 'INSUFFICIENT_STOCK:%',v_product.name using errcode='P0001'; end if;
    v_total:=v_total+(v_product.price*v_qty);
  end loop;

  insert into public.orders (
    client_id,status,total,delivery_method,payment_method,delivery_fee,
    delivery_street,delivery_number,delivery_neighborhood,delivery_city,delivery_cep,delivery_complement,delivery_reference
  ) values (
    v_user,'pending',v_total+v_delivery_fee,p_delivery_method,p_payment_method,v_delivery_fee,
    case when p_delivery_method='entrega' then nullif(trim(p_address->>'street'),'') else null end,
    case when p_delivery_method='entrega' then nullif(trim(p_address->>'number'),'') else null end,
    case when p_delivery_method='entrega' then nullif(trim(p_address->>'neighborhood'),'') else null end,
    case when p_delivery_method='entrega' then nullif(trim(p_address->>'city'),'') else null end,
    case when p_delivery_method='entrega' then nullif(trim(p_address->>'cep'),'') else null end,
    case when p_delivery_method='entrega' then nullif(trim(p_address->>'complement'),'') else null end,
    case when p_delivery_method='entrega' then nullif(trim(p_address->>'reference'),'') else null end
  ) returning * into v_order;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty:=greatest(1,coalesce((v_item->>'quantity')::integer,1));
    select * into v_product from public.products where slug=v_item->>'slug' for update;
    insert into public.order_items (order_id,product_id,quantity,unit_price)
    values (v_order.id,v_product.id,v_qty,v_product.price);
    update public.products set stock=stock-v_qty,updated_at=now() where id=v_product.id;
  end loop;

  return v_order;
end; $$;

revoke all on function public.place_order(jsonb,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.place_order(jsonb,text,text,jsonb) to authenticated;

create or replace function public.admin_reschedule_appointment(
  p_appointment_id uuid,
  p_date date,
  p_time time
)
returns public.appointments
language plpgsql security definer set search_path=public as $$
declare
  v_row public.appointments;
  v_old_status text;
  v_allowed boolean;
begin
  if not public.is_admin() then raise exception 'ADMIN_REQUIRED' using errcode='42501'; end if;
  select * into v_row from public.appointments where id=p_appointment_id for update;
  if v_row.id is null then raise exception 'APPOINTMENT_NOT_FOUND' using errcode='P0001'; end if;
  if v_row.status='cancelled' then raise exception 'CANCELLED_APPOINTMENT' using errcode='P0001'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_row.professional_id::text || ':' || p_date::text,0));
  v_old_status := v_row.status;
  update public.appointments set status='cancelled' where id=p_appointment_id;
  select exists(select 1 from public.get_available_times(v_row.service_id,v_row.professional_id,p_date) x where x.slot_time=p_time) into v_allowed;
  if not v_allowed then raise exception 'SLOT_UNAVAILABLE' using errcode='P0001'; end if;
  update public.appointments set appointment_date=p_date,appointment_time=p_time,status=v_old_status,cancelled_at=null,updated_at=now()
  where id=p_appointment_id returning * into v_row;
  return v_row;
end; $$;
revoke all on function public.admin_reschedule_appointment(uuid,date,time) from public,anon,authenticated;
grant execute on function public.admin_reschedule_appointment(uuid,date,time) to authenticated;
