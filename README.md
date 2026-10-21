# SalonDesk — MUSK salon concept

A simple single-salon website and staff portal. Next.js App Router, TypeScript, Supabase Auth/Postgres, custom responsive CSS and Lucide icons.

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
2. In the Supabase SQL Editor, run `supabase/migrations/20261021104711_salon_portal.sql`. This creates the schema, policies, triggers, transaction function and sample service menu. Run it once in a fresh project. Alternatively link the CLI and apply with `npx supabase db push`.
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
