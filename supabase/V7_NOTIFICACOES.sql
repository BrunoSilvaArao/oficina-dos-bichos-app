-- Oficina dos Bichos V7 - central de notificações no app

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  audience text not null default 'client' check (audience in ('client','admin')),
  kind text not null default 'info',
  title text not null,
  body text not null,
  appointment_id uuid references public.appointments(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx on public.notifications(user_id, created_at desc);
create index if not exists notifications_audience_created_idx on public.notifications(audience, created_at desc);
alter table public.notifications enable row level security;

drop policy if exists notifications_select on public.notifications;
drop policy if exists notifications_update on public.notifications;
create policy notifications_select on public.notifications for select to authenticated
using ((user_id = auth.uid() and audience='client') or (audience='admin' and public.is_admin()));
create policy notifications_update on public.notifications for update to authenticated
using ((user_id = auth.uid() and audience='client') or (audience='admin' and public.is_admin()))
with check ((user_id = auth.uid() and audience='client') or (audience='admin' and public.is_admin()));

create or replace function public.notify_appointment_events()
returns trigger language plpgsql security definer set search_path=public as $$
declare
  v_pet text;
  v_service text;
  v_professional text;
  v_status_label text;
begin
  select name into v_pet from public.pets where id=new.pet_id;
  select name into v_service from public.services where id=new.service_id;
  select name into v_professional from public.professionals where id=new.professional_id;

  if tg_op='INSERT' then
    insert into public.notifications(user_id,audience,kind,title,body,appointment_id)
    values(new.client_id,'client','appointment','Agendamento recebido',
      format('%s foi agendado para %s em %s às %s com %s.',coalesce(v_pet,'Seu pet'),coalesce(v_service,'atendimento'),to_char(new.appointment_date,'DD/MM/YYYY'),to_char(new.appointment_time,'HH24:MI'),coalesce(v_professional,'a equipe')),new.id);
    insert into public.notifications(user_id,audience,kind,title,body,appointment_id)
    values(null,'admin','appointment','Novo agendamento',
      format('%s • %s • %s às %s • %s.',coalesce(v_pet,'Pet'),coalesce(v_service,'Atendimento'),to_char(new.appointment_date,'DD/MM/YYYY'),to_char(new.appointment_time,'HH24:MI'),coalesce(v_professional,'Equipe')),new.id);
    return new;
  end if;

  if new.appointment_date is distinct from old.appointment_date or new.appointment_time is distinct from old.appointment_time then
    insert into public.notifications(user_id,audience,kind,title,body,appointment_id)
    values(new.client_id,'client','appointment','Agendamento reagendado',
      format('%s foi reagendado para %s às %s com %s.',coalesce(v_service,'Seu atendimento'),to_char(new.appointment_date,'DD/MM/YYYY'),to_char(new.appointment_time,'HH24:MI'),coalesce(v_professional,'a equipe')),new.id);
  end if;

  if new.status is distinct from old.status and not (new.status='cancelled' and new.cancelled_at is null) then
    v_status_label := case new.status when 'scheduled' then 'Agendado' when 'confirmed' then 'Confirmado' when 'in_progress' then 'Em andamento' when 'completed' then 'Concluído' when 'cancelled' then 'Cancelado' else new.status end;
    insert into public.notifications(user_id,audience,kind,title,body,appointment_id)
    values(new.client_id,'client','appointment',
      case new.status when 'confirmed' then 'Agendamento confirmado' when 'in_progress' then 'Atendimento iniciado' when 'completed' then 'Atendimento concluído' when 'cancelled' then 'Agendamento cancelado' else 'Agendamento atualizado' end,
      format('%s • %s em %s às %s. Status: %s.',coalesce(v_pet,'Seu pet'),coalesce(v_service,'Atendimento'),to_char(new.appointment_date,'DD/MM/YYYY'),to_char(new.appointment_time,'HH24:MI'),v_status_label),new.id);
    if new.status='cancelled' then
      insert into public.notifications(user_id,audience,kind,title,body,appointment_id)
      values(null,'admin','appointment','Agendamento cancelado',format('%s • %s • %s às %s. O horário foi liberado.',coalesce(v_pet,'Pet'),coalesce(v_service,'Atendimento'),to_char(new.appointment_date,'DD/MM/YYYY'),to_char(new.appointment_time,'HH24:MI')),new.id);
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists notify_appointment_events_trigger on public.appointments;
create trigger notify_appointment_events_trigger after insert or update on public.appointments for each row execute procedure public.notify_appointment_events();
revoke all on function public.notify_appointment_events() from public,anon,authenticated;

create or replace function public.notify_order_events()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_status_label text;
begin
  if tg_op='INSERT' then
    insert into public.notifications(user_id,audience,kind,title,body,order_id)
    values(new.client_id,'client','order','Pedido recebido',format('Seu pedido #%s foi recebido. Total: R$ %s. Tipo: %s.',upper(substr(new.id::text,1,8)),to_char(new.total,'FM999999990D00'),case when new.delivery_method='entrega' then 'Entrega' else 'Retirada na clínica' end),new.id);
    insert into public.notifications(user_id,audience,kind,title,body,order_id)
    values(null,'admin','order','Novo pedido da loja',format('Pedido #%s • R$ %s • %s.',upper(substr(new.id::text,1,8)),to_char(new.total,'FM999999990D00'),case when new.delivery_method='entrega' then 'Entrega' else 'Retirada' end),new.id);
    return new;
  end if;
  if new.status is distinct from old.status then
    v_status_label := case new.status when 'pending' then 'Pedido recebido' when 'confirmed' then 'Confirmado' when 'preparing' then 'Em preparação' when 'ready' then 'Pronto' when 'out_for_delivery' then 'Saiu para entrega' when 'completed' then 'Finalizado' when 'cancelled' then 'Cancelado' else new.status end;
    insert into public.notifications(user_id,audience,kind,title,body,order_id)
    values(new.client_id,'client','order','Status do pedido atualizado',format('Pedido #%s: %s.',upper(substr(new.id::text,1,8)),v_status_label),new.id);
  end if;
  return new;
end; $$;

drop trigger if exists notify_order_events_trigger on public.orders;
create trigger notify_order_events_trigger after insert or update on public.orders for each row execute procedure public.notify_order_events();
revoke all on function public.notify_order_events() from public,anon,authenticated;
