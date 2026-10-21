# SalonDesk — MUSK salon concept

A simple single-salon website and staff portal. Next.js App Router, TypeScript, Supabase Auth/Postgres, custom responsive CSS and Lucide icons.

## Admin login and passwords

**Yes: the owner/admin, receptionist and stylist each need their own email address and password.** There is no default admin account or shared password.

- The password is the one you choose when creating that user's **Supabase Auth** account.
- The SQL migration creates database tables and permissions; it does **not** create a login or password.
- The `staff_profiles` record links the Auth user to the owner/receptionist/stylist role. Creating only the Auth user is not enough to access the portal.
- `SUPABASE_SECRET_KEY` is an application server key, **not** the password you type on the login page.
- Customers submitting appointment requests or contact messages do not need accounts.

### First admin checklist

1. Open your SalonDesk Supabase project → **Authentication → Users → Add user → Create new user**.
2. Enter your chosen admin email and a strong, unique password (at least 12 characters). Use the dashboard's email-confirmed/auto-confirm option; do not choose an email invitation if you want to create the account directly.
3. Run the owner-profile SQL in [First owner without running a local script](#first-owner-without-running-a-local-script), replacing `YOUR_ADMIN_EMAIL` with the same email.
4. Add the three Supabase environment variables listed below to the hosting project. Redeploy after changing them.
5. Visit `/login`, enter that **email and password**, then open `/admin`.
6. In **Team**, create other staff with individual emails, initial passwords and roles. Team creation needs the server secret. Share credentials privately.

### Password recovery

This version has no in-app “Forgot password” or password-change screen. Manage recovery through Supabase Auth's supported dashboard/Auth recovery flow. Do not change a password in `staff_profiles`: passwords are managed by Supabase Auth. Deactivating a profile removes salon access without deleting payment or appointment history.

Never put passwords, server secrets or real account credentials in this README, source code or GitHub commits.

## What is included

- `/`: MUSK-branded public landing page, service menu, illustrative moodboard and appointment request form. No customer account required.
- `/login`: email/password staff login.
- `/admin`: dashboard, incoming requests, appointments, clients, services, payments, printable receipts and owner-only team management.
- Requests are **not confirmed bookings**. Reception contacts the customer, chooses a stylist/time and confirms. Client creation, appointment creation and request status update happen in one database transaction.
- Staff scheduling conflicts are rejected by a Postgres exclusion constraint, including concurrent submissions. Service prices/durations are copied by the database when booking.
- Cash and bank-transfer payments are recorded manually. Each payment is preserved in receipt history. Overpayments are rejected while locking the appointment row.

## Roles

| Role         | Access                                                                                       |
| ------------ | -------------------------------------------------------------------------------------------- |
| Owner        | All management screens; creates/deactivates staff, changes roles, adds/hides services        |
| Receptionist | Clients, website requests, appointments, payments and receipts; reads services/stylist names |
| Stylist      | Only assigned appointments and their clients; can mark confirmed appointments completed      |

Permissions are enforced in API handlers **and** Supabase RLS/column grants. Roles come from protected `staff_profiles`, never editable user metadata. Deactivation takes effect without waiting for JWT refresh. Stylists cannot read payment records or modify booking fields. Service list prices are public.

## Run locally

Node.js 20.9+ required.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. Without credentials the landing page works with clearly labeled sample packages. Requests and login stay disabled; there is no fake-success or localStorage fallback.

## Connect a dedicated Supabase project

1. Create a separate project for SalonDesk. Do not use another client's database.
2. In the Supabase SQL Editor, apply `supabase/migrations/20261021104711_salon_portal.sql`, then `supabase/migrations/20261021152753_contact_messages.sql` in that order. This creates the schema, policies, triggers, transaction function and sample service menu. Run it once in a fresh project. Alternatively link the CLI and apply with `npx supabase db push`.
3. Set `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`: project API URL.
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: public publishable key.
   - `SUPABASE_SECRET_KEY`: server secret key (or legacy service_role key). **Never** use a `NEXT_PUBLIC_` prefix for this key.
4. In Authentication settings, disable public sign-ups. Accounts are staff-only and created by an owner. Set the Site URL to the final deployed URL.
5. Create the initial owner: add `SALON_OWNER_EMAIL`, `SALON_OWNER_PASSWORD` (12+ characters), and `SALON_OWNER_NAME` to `.env.local`, then run:

```sh
npm run setup:owner
```

No email is sent. Remove the `SALON_OWNER_*` values afterward. This setup script refuses to run when an owner exists.

6. Sign in at `/login`; under Team add a receptionist and at least one stylist. Privately share their initial credentials. Use Supabase Auth's dashboard for credential recovery in this version.
7. Replace sample prices, verify the salon contact/address, and obtain approved images before any official launch.

Owner staff creation is the only authenticated endpoint using the server secret, after verifying the current owner. Normal staff operations use their own session and remain subject to RLS. Public booking requests use the server secret only after validating allowed fields; the public cannot read request/customer tables. A honeypot and database-backed phone cooldown (2 minutes, 5 requests/day) deter basic duplicate spam; there is no CAPTCHA or advanced bot protection.

## Deployment

Import the repo into a Next.js-compatible hosting service, set the three Supabase environment variables, and deploy. Use an appropriate commercial hosting plan. No credentials are committed. The root website can render without a configured database; management stays protected. This repository does not automatically provision or deploy a Supabase project.

## Verify

```sh
npm run test
npm run test:db
npm run typecheck
npm run build
```

Database tests execute the actual migration in embedded Postgres (PGlite), with emulated Supabase Auth roles, to test RLS, role escalation denial, overlap rejection, payment bounds, request conversion and deactivation. They do not replace end-to-end tests against the connected Supabase project.

Live walkthrough: submit a request as a visitor → sign in as reception → confirm with a stylist → record an advance → print receipt → sign in as that stylist and complete the service → confirm another stylist cannot access it. Check the API directly too; hiding a menu is not an authorization test.

## Deliberate limits

One salon, three fixed roles, one service per appointment, PKR only, Karachi timezone. No online payment gateway, customer login, WhatsApp automation, payroll, inventory, refunds, multi-branch or multi-tenant support. Staff confirmation/contact is manual. Cancelled bookings retain their payment history; refunds are handled outside this version and recorded collections are not net revenue. Records have no hard-delete UI.

The public site is an independent **concept demo**, not an official MUSK website. All prices are illustrative. No testimonials or actual MUSK portfolio photos are claimed. The moodboard uses illustrative Unsplash imagery, stored locally for reliable rendering:

- `photo-1560066984-138dadb4c035` — salon interior
- `photo-1522335789203-aabd1fc54bc9` — beauty essentials
- `photo-1521590832167-7bcbfaa6381f` — styling space

Search indexing is disabled until the demo is approved for launch.

## General contact inbox

The second migration `20261021152753_contact_messages.sql` adds general website inquiries. Apply migrations in filename order on a new project. On the existing SalonDesk project both migrations have already been applied. Public form → `/api/contact` → `contact_messages` → management **Messages**. Owners and receptionists can read and mark messages handled; stylists cannot see them. Replies are manual. The server secret is required, just as for public appointment requests. Without it the form is disabled rather than pretending to send.

## First owner without running a local script

1. In your dedicated Supabase project, open **Authentication → Users → Add user → Create new user**. Enter your chosen admin email and a strong password, and confirm the email using the dashboard's auto-confirm option. This should not send an invitation email.
2. In the SQL Editor, run the following after replacing `YOUR_ADMIN_EMAIL` with that exact email:

```sql
insert into public.staff_profiles (id, name, role, active)
select id, 'Arman', 'owner', true
from auth.users
where email = 'YOUR_ADMIN_EMAIL'
on conflict (id) do nothing;
```

3. Ensure the hosted app has `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and server-only `SUPABASE_SECRET_KEY`, then redeploy if you changed environment variables.
4. Sign in at `/login`. Use **Team** to create other staff accounts. That screen requires the server secret. The database migration alone never creates authentication users or chooses passwords.

Never commit your password or server secret to this repository.
