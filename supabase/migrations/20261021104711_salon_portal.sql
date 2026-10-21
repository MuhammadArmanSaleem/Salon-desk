-- Single salon only. Roles are stored here, never in user-editable auth metadata.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;
create extension if not exists btree_gist with schema extensions;

create table public.staff_profiles (
 id uuid primary key references auth.users(id), name text not null check (length(name) between 1 and 80),
 role text not null check (role in ('owner','receptionist','stylist')), active boolean not null default true
);
alter table public.staff_profiles enable row level security;
-- Narrow internal lookup avoids recursive profile policies. No caller can supply another user's id.
create function private.salon_role() returns text language sql stable security definer set search_path = '' as $$
 select role from public.staff_profiles where id = (select auth.uid()) and active = true and (select auth.uid()) is not null
$$;
revoke all on function private.salon_role() from public;
grant execute on function private.salon_role() to authenticated;
create policy staff_read on public.staff_profiles for select to authenticated using (id = (select auth.uid()) or (select private.salon_role()) in ('owner','receptionist'));
-- Profile writes are only performed by the owner's guarded server endpoint using the secret key.
grant select on public.staff_profiles to authenticated;
revoke insert,update,delete on public.staff_profiles from anon,authenticated;

create table public.salon_services (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 1 and 80),
 category text not null check(category in ('Makeup','Hair','Skin','Nails','Other')),
 price integer not null check(price between 1 and 10000000), duration integer not null check(duration between 15 and 720),
 active boolean not null default true
);
alter table public.salon_services enable row level security;
create policy services_read on public.salon_services for select to anon,authenticated using(active or (select private.salon_role()) in ('owner','receptionist'));
-- Separate anon policy avoids requiring access to the private helper for public visitors.
drop policy services_read on public.salon_services;
create policy services_public on public.salon_services for select to anon using(active);
create policy services_staff on public.salon_services for select to authenticated using(active or (select private.salon_role()) in ('owner','receptionist'));
create policy services_owner on public.salon_services for all to authenticated using((select private.salon_role())='owner') with check((select private.salon_role())='owner');
grant select on public.salon_services to anon,authenticated;
grant insert,update on public.salon_services to authenticated;

create table public.salon_clients (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 1 and 80),
 phone text not null unique check(phone ~ '^92[0-9]{10}$')
);
create table public.booking_requests (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 1 and 80),
 phone text not null check(phone ~ '^92[0-9]{10}$'), service_id uuid not null references public.salon_services,
 preferred_date date not null, preferred_time time not null, notes text not null default '' check(length(notes)<=500),
 status text not null default 'Pending' check(status in ('Pending','Booked','Declined')),
 created_at timestamptz not null default now()
);
create index requests_phone_created on public.booking_requests(phone,created_at desc);
create table public.salon_appointments (
 id uuid primary key default gen_random_uuid(), client_id uuid not null references public.salon_clients,
 service_id uuid not null references public.salon_services, service_name text not null,
 staff_id uuid not null references public.staff_profiles, starts_at timestamptz not null, ends_at timestamptz not null,
 total integer not null check(total>0), status text not null default 'Confirmed' check(status in ('Confirmed','Completed','Cancelled')),
 request_id uuid unique references public.booking_requests,
 created_at timestamptz not null default now(), check(ends_at>starts_at),
 exclude using gist(staff_id with =, tstzrange(starts_at,ends_at,'[)') with &&) where(status <> 'Cancelled')
);
create index appointments_client on public.salon_appointments(client_id);
create index appointments_start on public.salon_appointments(starts_at);
create index appointments_staff_start on public.salon_appointments(staff_id, starts_at);
create table public.salon_payments (
 id uuid primary key default gen_random_uuid(), appointment_id uuid not null references public.salon_appointments,
 amount integer not null check(amount>0), method text not null check(method in ('Cash','Bank transfer')),
 recorded_by uuid not null default auth.uid() references public.staff_profiles,
 created_at timestamptz not null default now()
);
create index payments_appointment on public.salon_payments(appointment_id);
alter table public.salon_clients enable row level security;
alter table public.booking_requests enable row level security;
alter table public.salon_appointments enable row level security;
alter table public.salon_payments enable row level security;
create policy clients_read on public.salon_clients for select to authenticated using(
 (select private.salon_role()) in ('owner','receptionist') or ((select private.salon_role())='stylist' and exists(select 1 from public.salon_appointments a where a.client_id=salon_clients.id and a.staff_id=(select auth.uid())))
);
create policy clients_insert on public.salon_clients for insert to authenticated with check((select private.salon_role()) in ('owner','receptionist'));
create policy clients_update on public.salon_clients for update to authenticated using((select private.salon_role()) in ('owner','receptionist')) with check((select private.salon_role()) in ('owner','receptionist'));
create policy requests_read on public.booking_requests for select to authenticated using((select private.salon_role()) in ('owner','receptionist'));
create policy requests_update on public.booking_requests for update to authenticated using((select private.salon_role()) in ('owner','receptionist')) with check((select private.salon_role()) in ('owner','receptionist'));
-- Anonymous requests are accepted by the validated server endpoint only; no public table access.
revoke all on public.booking_requests from anon;
create policy appointments_read on public.salon_appointments for select to authenticated using((select private.salon_role()) in ('owner','receptionist') or ((select private.salon_role())='stylist' and staff_id=(select auth.uid())));
create policy appointments_insert on public.salon_appointments for insert to authenticated with check((select private.salon_role()) in ('owner','receptionist'));
create policy appointments_update on public.salon_appointments for update to authenticated using((select private.salon_role()) in ('owner','receptionist') or ((select private.salon_role())='stylist' and staff_id=(select auth.uid()))) with check((select private.salon_role()) in ('owner','receptionist') or ((select private.salon_role())='stylist' and staff_id=(select auth.uid())));
create policy payments_read on public.salon_payments for select to authenticated using((select private.salon_role()) in ('owner','receptionist'));
create policy payments_insert on public.salon_payments for insert to authenticated with check((select private.salon_role()) in ('owner','receptionist') and recorded_by=(select auth.uid()));
grant select,insert,update on public.salon_clients to authenticated;
grant select on public.booking_requests to authenticated;
grant update(status) on public.booking_requests to authenticated;
grant select,insert on public.salon_appointments to authenticated;
grant update(status) on public.salon_appointments to authenticated;
grant select on public.salon_payments to authenticated;
grant insert(appointment_id,amount,method) on public.salon_payments to authenticated;
-- Defaults in some Supabase projects grant broader rights: revoke explicitly.
revoke delete on public.salon_clients,public.booking_requests,public.salon_appointments,public.salon_payments,public.staff_profiles,public.salon_services from anon,authenticated;
revoke insert,update on public.salon_payments from anon,authenticated;
grant insert(appointment_id,amount,method) on public.salon_payments to authenticated;
revoke update on public.salon_appointments,public.booking_requests from anon,authenticated;
grant update(status) on public.salon_appointments,public.booking_requests to authenticated;
revoke all on public.salon_clients,public.salon_appointments,public.salon_payments,public.staff_profiles from anon;

create function private.check_appointment() returns trigger language plpgsql security invoker set search_path='' as $$
declare s public.salon_services;
begin
 if tg_op='INSERT' then
  select * into s from public.salon_services where id=new.service_id and active;
  if not found then raise exception 'Service unavailable'; end if;
  if not exists(select 1 from public.staff_profiles where id=new.staff_id and active and role='stylist') then raise exception 'Choose an active stylist'; end if;
  new.service_name:=s.name; new.total:=s.price; new.ends_at:=new.starts_at+make_interval(mins=>s.duration);
 elsif (select private.salon_role())='stylist' and (new.status<>'Completed' or old.status<>'Confirmed') then
  raise exception 'Stylists can only complete confirmed appointments';
 end if;
 return new;
end $$;
revoke all on function private.check_appointment() from public;
create trigger check_appointment before insert or update on public.salon_appointments for each row execute function private.check_appointment();
create function private.check_payment() returns trigger language plpgsql security invoker set search_path='' as $$
declare price integer; state text; paid bigint;
begin
 select total,status into price,state from public.salon_appointments where id=new.appointment_id for update;
 if not found or state='Cancelled' then raise exception 'Appointment unavailable for payments'; end if;
 select coalesce(sum(amount),0) into paid from public.salon_payments where appointment_id=new.appointment_id;
 if paid+new.amount>price then raise exception 'Payment exceeds remaining balance'; end if;
 return new;
end $$;
revoke all on function private.check_payment() from public;
create trigger check_payment before insert on public.salon_payments for each row execute function private.check_payment();
-- Narrow server-only throttle. Trigger runs for the server secret, never exposed as an RPC.
create function private.limit_booking_requests() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(new.phone,0));
 if exists(select 1 from public.booking_requests where phone=new.phone and created_at>now()-interval '2 minutes') then raise exception 'Please wait before submitting another request'; end if;
 if (select count(*) from public.booking_requests where phone=new.phone and created_at>now()-interval '1 day')>=5 then raise exception 'Daily request limit reached'; end if;
 return new;
end $$;
revoke all on function private.limit_booking_requests() from public;
create trigger limit_booking_requests before insert on public.booking_requests for each row execute function private.limit_booking_requests();

-- Invoker RPC makes request confirmation transactional; RLS applies to every statement.
create function public.confirm_salon_request(request_id uuid, stylist_id uuid, start_time timestamptz) returns uuid language plpgsql security invoker set search_path='' as $$
declare r public.booking_requests; c uuid; appointment uuid;
begin
 if coalesce((select private.salon_role()),'') not in ('owner','receptionist') then raise exception 'Forbidden'; end if;
 select * into r from public.booking_requests where id=request_id and status='Pending' for update;
 if not found then raise exception 'Request already handled or unavailable'; end if;
 insert into public.salon_clients(name,phone) values(r.name,r.phone) on conflict(phone) do update set phone=excluded.phone returning id into c;
 insert into public.salon_appointments(client_id,service_id,service_name,staff_id,starts_at,ends_at,total,request_id)
 values(c,r.service_id,'',stylist_id,start_time,start_time+interval '1 minute',1,r.id) returning id into appointment;
 update public.booking_requests set status='Booked' where id=r.id;
 return appointment;
end $$;
revoke all on function public.confirm_salon_request(uuid,uuid,timestamptz) from public,anon;
grant execute on function public.confirm_salon_request(uuid,uuid,timestamptz) to authenticated;
grant all on public.staff_profiles,public.salon_services,public.salon_clients,public.booking_requests,public.salon_appointments,public.salon_payments to service_role;
insert into public.salon_services(name,category,price,duration) values
 ('Bridal Makeup','Makeup',35000,180),('Party Makeup','Makeup',12000,90),('Haircut & Blowdry','Hair',3500,60),('Glow Facial','Skin',5500,60),('Manicure & Pedicure','Nails',4500,60);
