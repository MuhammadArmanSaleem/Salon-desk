# SalonDesk

A responsive salon management sales demo built with Next.js, React, TypeScript and Lucide icons. Neutral sage-and-cream branding makes it reusable for salon demonstrations.

## Run

Node.js 20.9+ required.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Production: `npm run build` then `npm start`.

## Demo walkthrough

1. Open Overview to see today's sample appointments, total collections and outstanding balances.
2. Add a client under Clients and optionally add a service under Services.
3. Create an appointment, assign a specialist, choose its date/time and record an advance. Overlapping appointments for the same specialist are blocked.
4. Change appointment status in the appointment book. Cancelled appointments release the staff slot and are excluded from collection/balance summaries.
5. Open a receipt using the arrow beside an appointment or via Payments. Record another payment and print the receipt (or save as PDF using the browser print dialog).
6. Refresh to confirm browser persistence. Dates for sample bookings are initialized to the local date on first use.

All amounts are PKR. This is sample data: phone numbers are placeholders. Overview collections are booking advances/payments, not a daily cash ledger or recognized revenue. Receipts are payment summaries, not tax invoices. Service price and duration are snapshotted when booked.

## Important scope

Data lives only in localStorage (`salondesk:v1`) on the current browser. There is no authentication, shared database, server-side authorization, audit trail, automated messaging, payment processing or backup. Do not enter real customer data. Clearing browser storage deletes changes. Clear that key to reset sample data.

This demo uses custom CSS rather than Tailwind/shadcn. It has no required environment variables. Google Fonts are optional, with system font fallbacks.

## Checks

```sh
npm run test
npm run typecheck
npm run build
```

## Hosting

Import this repository into a suitable Next.js hosting provider. Deployments do not share browser records across devices. Before real business use, add authentication, a protected database, backups, payment history and server-side booking validation. Confirm the provider's commercial-use plan requirements before production hosting.
