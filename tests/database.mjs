import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { readFileSync, readdirSync } from "node:fs";
import assert from "node:assert/strict";
const db = new PGlite({ extensions: { btree_gist } });
await db.exec(`create schema auth; create schema extensions;
create role anon; create role authenticated; create role service_role bypassrls;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth,public to anon,authenticated,service_role;
grant execute on function auth.uid() to anon,authenticated,service_role;
`);
for (const f of readdirSync(new URL("../supabase/migrations/", import.meta.url))
  .filter((f) => f.endsWith(".sql"))
  .sort())
  await db.exec(
    readFileSync(
      new URL("../supabase/migrations/" + f, import.meta.url),
      "utf8",
    ),
  );
const owner = "10000000-0000-4000-8000-000000000001",
  reception = "10000000-0000-4000-8000-000000000002",
  stylist = "10000000-0000-4000-8000-000000000003",
  other = "10000000-0000-4000-8000-000000000004";
await db.exec(`insert into auth.users values('${owner}'),('${reception}'),('${stylist}'),('${other}');
insert into public.staff_profiles values('${owner}','Owner','owner',true),('${reception}','Reception','receptionist',true),('${stylist}','Stylist','stylist',true),('${other}','Other stylist','stylist',true);`);
const service = (await db.query("select id from salon_services limit 1"))
  .rows[0].id;
const as = async (role, id) => {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    id || "",
  ]);
  await db.exec("set role " + role);
};
await as("anon");
assert.equal(
  (await db.query("select count(*)::int n from salon_services")).rows[0].n,
  5,
);
await assert.rejects(db.query("select * from salon_clients"));
await assert.rejects(db.query("select * from booking_requests"));
console.log(
  "PASS anonymous visitors see services but cannot read clients or requests",
);
await as("authenticated", reception);
const c = (
  await db.query(
    "insert into salon_clients(name,phone) values('Test Client','923001234567') returning id",
  )
).rows[0].id;
const a = (
  await db.query(
    "insert into salon_appointments(client_id,service_id,staff_id,service_name,total,starts_at,ends_at) values($1,$2,$3,'',1,'2026-12-01 12:00+05','2026-12-01 12:01+05') returning *",
    [c, service, stylist],
  )
).rows[0];
assert.equal(a.total, 35000);
await assert.rejects(
  db.query(
    "insert into salon_appointments(client_id,service_id,staff_id,service_name,total,starts_at,ends_at) values($1,$2,$3,'',1,'2026-12-01 13:00+05','2026-12-01 13:01+05')",
    [c, service, stylist],
  ),
  /conflicting key|exclusion/,
);
await assert.rejects(
  db.query(
    "insert into salon_services(name,category,price,duration) values('Bad','Hair',1,30)",
  ),
);
await assert.rejects(
  db.query("update staff_profiles set role='owner' where id=$1", [reception]),
);
await db.query(
  "insert into salon_payments(appointment_id,amount,method) values($1,10000,'Cash')",
  [a.id],
);
await assert.rejects(
  db.query(
    "insert into salon_payments(appointment_id,amount,method) values($1,30000,'Cash')",
    [a.id],
  ),
  /exceeds/,
);
console.log(
  "PASS reception books, cannot escalate or manage services; database rejects overlap and overpayment",
);
await as("authenticated", other);
assert.equal(
  (await db.query("select * from salon_appointments")).rows.length,
  0,
);
assert.equal((await db.query("select * from salon_clients")).rows.length, 0);
await as("authenticated", stylist);
assert.equal(
  (await db.query("select * from salon_appointments")).rows.length,
  1,
);
assert.equal((await db.query("select * from salon_clients")).rows.length, 1);
assert.equal((await db.query("select * from salon_payments")).rows.length, 0);
await assert.rejects(
  db.query("update salon_appointments set total=1 where id=$1", [a.id]),
);
await assert.rejects(
  db.query("update salon_appointments set status='Cancelled' where id=$1", [
    a.id,
  ]),
);
await db.query("update salon_appointments set status='Completed' where id=$1", [
  a.id,
]);
console.log(
  "PASS stylist sees only assigned bookings/clients, cannot see payments or change totals, can complete service",
);
await as("service_role");
const r = (
  await db.query(
    "insert into booking_requests(name,phone,service_id,preferred_date,preferred_time) values('New Client','923009999999',$1,'2026-12-02','12:00') returning id",
    [service],
  )
).rows[0].id;
await assert.rejects(
  db.query(
    "insert into booking_requests(name,phone,service_id,preferred_date,preferred_time) values('New Client','923009999999',$1,'2026-12-02','12:00')",
    [service],
  ),
  /Please wait/,
);
await as("authenticated", reception);
await db.query("select confirm_salon_request($1,$2,'2026-12-02 12:00+05')", [
  r,
  stylist,
]);
assert.equal(
  (await db.query("select status from booking_requests where id=$1", [r]))
    .rows[0].status,
  "Booked",
);
await assert.rejects(
  db.query("select confirm_salon_request($1,$2,'2026-12-02 12:00+05')", [
    r,
    stylist,
  ]),
  /already handled/,
);
console.log(
  "PASS website requests throttle duplicates; confirmation is atomic and cannot double-book the request",
);
await as("authenticated", owner);
await db.query(
  "insert into salon_services(name,category,price,duration) values('Owner service','Hair',2000,30)",
);
await as("postgres");
await db.query("update staff_profiles set active=false where id=$1", [stylist]);
await as("authenticated", stylist);
assert.equal(
  (await db.query("select * from salon_appointments")).rows.length,
  0,
);
console.log(
  "PASS owner manages services; deactivation immediately removes stylist access",
);
await as("service_role");
const msg = (
  await db.query(
    "insert into contact_messages(name,phone,message) values('Visitor','923008888888','Question about bridal makeup') returning id",
  )
).rows[0].id;
await as("anon");
await assert.rejects(db.query("select * from contact_messages"));
await as("authenticated", other);
assert.equal((await db.query("select * from contact_messages")).rows.length, 0);
await as("authenticated", reception);
assert.equal((await db.query("select * from contact_messages")).rows.length, 1);
await db.query("update contact_messages set status='Handled' where id=$1", [
  msg,
]);
await assert.rejects(
  db.query("update contact_messages set message='changed text' where id=$1", [
    msg,
  ]),
);
console.log(
  "PASS contact messages visible only to management; reception can mark handled but cannot rewrite messages",
);
await db.close();
