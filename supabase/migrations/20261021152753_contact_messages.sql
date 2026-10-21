create table public.contact_messages (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(name) between 2 and 80),
 phone text not null check(phone ~ '^92[0-9]{10}$'),
 message text not null check(length(message) between 10 and 2000),
 status text not null default 'New' check(status in ('New','Handled')),
 created_at timestamptz not null default now()
);
alter table public.contact_messages enable row level security;
revoke all on public.contact_messages from anon,authenticated;
grant select,update(status) on public.contact_messages to authenticated;
grant all on public.contact_messages to service_role;
create policy contact_management_read on public.contact_messages for select to authenticated using((select private.salon_role()) in ('owner','receptionist'));
create policy contact_management_update on public.contact_messages for update to authenticated using((select private.salon_role()) in ('owner','receptionist')) with check((select private.salon_role()) in ('owner','receptionist'));
create index contact_phone_created on public.contact_messages(phone,created_at desc);
create function private.limit_contact_messages() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(new.phone,1));
 if exists(select 1 from public.contact_messages where phone=new.phone and created_at>now()-interval '2 minutes') then raise exception 'Please wait before sending another message'; end if;
 if (select count(*) from public.contact_messages where phone=new.phone and created_at>now()-interval '1 day')>=5 then raise exception 'Daily message limit reached'; end if;
 return new;
end $$;
revoke all on function private.limit_contact_messages() from public;
create trigger limit_contact_messages before insert on public.contact_messages for each row execute function private.limit_contact_messages();
