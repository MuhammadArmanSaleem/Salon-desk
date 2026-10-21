"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Scissors,
  LayoutDashboard,
  CalendarDays,
  Users,
  Sparkles,
  Wallet,
  Plus,
  Search,
  ArrowUpRight,
  X,
  Printer,
  Menu,
  LogOut,
  Inbox,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import {
  Appointment,
  BookingRequest,
  PortalData,
  Profile,
  clock,
  day,
  money,
} from "@/lib/types";
import { canManage } from "@/lib/validation";
type Modal = "booking" | "client" | "service" | "team" | "confirm" | null;
const tabs = [
  ["Overview", LayoutDashboard],
  ["Requests", Inbox],
  ["Messages", Inbox],
  ["Appointments", CalendarDays],
  ["Clients", Users],
  ["Services", Sparkles],
  ["Payments", Wallet],
  ["Team", ShieldCheck],
] as const;
export default function Portal({ profile }: { profile: Profile }) {
  const [data, setData] = useState<PortalData | null>(null),
    [tab, setTab] = useState("Overview"),
    [query, setQuery] = useState(""),
    [date, setDate] = useState(day(new Date().toISOString())),
    [modal, setModal] = useState<Modal>(null),
    [request, setRequest] = useState<BookingRequest | null>(null),
    [receipt, setReceipt] = useState<Appointment | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [mobile, setMobile] = useState(false),
    [stale, setStale] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const sidebar = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!mobile) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () =>
      Array.from(
        sidebar.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex="0"]',
        ) || [],
      );
    focusable()[0]?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobile(false);
      }
      if (event.key === "Tab") {
        const items = focusable();
        const first = items[0],
          last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    const breakpoint = window.matchMedia("(min-width: 801px)");
    const resized = () => {
      if (breakpoint.matches) setMobile(false);
    };
    document.addEventListener("keydown", keydown);
    breakpoint.addEventListener("change", resized);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", keydown);
      breakpoint.removeEventListener("change", resized);
      menuButton.current?.focus({ preventScroll: true });
    };
  }, [mobile]);
  const manage = canManage(profile.role);
  const owner = profile.role === "owner";
  const load = useCallback(async () => {
    const r = await fetch("/api/portal", { cache: "no-store" });
    const b = await r.json();
    if (r.status === 401) {
      window.location.assign("/login");
      return;
    }
    if (!r.ok) throw Error(b.error);
    setData(b);
    setStale(false);
  }, []);
  useEffect(() => {
    load().catch((e) => setNotice(e.message));
  }, [load]);
  useEffect(() => {
    if (modal || receipt) dialog.current?.showModal();
    else dialog.current?.close();
  }, [modal, receipt]);
  async function mutate(
    action: string,
    values: Record<string, unknown>,
    team = false,
  ) {
    const r = await fetch(team ? "/api/team" : "/api/portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...values }),
    });
    const b = await r.json();
    if (!r.ok) throw Error(b.error);
    try {
      await load();
    } catch {
      setStale(true);
    }
  }
  async function quick(
    action: string,
    values: Record<string, unknown>,
    team = false,
  ) {
    if (busy || stale) return;
    setBusy(true);
    try {
      await mutate(action, values, team);
      setNotice("Changes saved.");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Unable to save.");
    } finally {
      setBusy(false);
    }
  }
  function open(m: Modal, r: BookingRequest | null = null) {
    setError("");
    setModal(m);
    setRequest(r);
  }
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || stale) return;
    setBusy(true);
    setError("");
    const values = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await mutate(
        modal === "confirm"
          ? "confirm-request"
          : modal === "team"
            ? "create"
            : modal!,
        modal === "confirm" ? { ...values, request_id: request?.id } : values,
        modal === "team",
      );
      setModal(null);
      setNotice("Saved successfully.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save.");
    } finally {
      setBusy(false);
    }
  }
  async function payment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || stale || !receipt) return;
    const form = e.currentTarget;
    setBusy(true);
    setError("");
    try {
      await mutate("payment", {
        ...Object.fromEntries(new FormData(form)),
        appointment_id: receipt.id,
      });
      form.reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save.");
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    try {
      const r = await fetch("/api/auth/logout", { method: "POST" });
      if (!r.ok) throw Error("Could not sign out. Please retry.");
      window.location.assign("/login");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Unable to sign out.");
      setBusy(false);
    }
  }
  const client = (id: string) => data?.clients.find((c) => c.id === id);
  const specialist = (id: string) =>
    data?.team.find((c) => c.id === id)?.name || "Assigned stylist";
  const payments = (id: string) =>
    data?.payments.filter((p) => p.appointment_id === id) || [];
  const paid = (id: string) =>
    payments(id).reduce((sum, p) => sum + p.amount, 0);
  const active =
    data?.appointments.filter((b) => b.status !== "Cancelled") || [];
  const pending = data?.requests.filter((r) => r.status === "Pending") || [];
  const appointments =
    data?.appointments
      .filter(
        (b) =>
          day(b.starts_at) === date &&
          `${client(b.client_id)?.name} ${b.service_name} ${specialist(b.staff_id)}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      )
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at)) || [];
  const totalPaid = data?.payments.reduce((sum, p) => sum + p.amount, 0) || 0;
  const balance = active.reduce((sum, b) => sum + b.total - paid(b.id), 0);
  const receiptCurrent =
    data?.appointments.find((b) => b.id === receipt?.id) || receipt;
  const stylists =
    data?.team.filter((p) => p.active && p.role === "stylist") || [];
  return (
    <div className="shell">
      {mobile && (
        <button
          type="button"
          className="menu-backdrop"
          aria-label="Close navigation backdrop"
          tabIndex={-1}
          onClick={() => setMobile(false)}
        />
      )}
      <aside
        ref={sidebar}
        id="workspace-navigation"
        role={mobile ? "dialog" : undefined}
        aria-modal={mobile ? true : undefined}
        aria-label="Workspace navigation"
        className={mobile ? "sidebar visible" : "sidebar"}
      >
        <button
          type="button"
          className="drawer-close"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        >
          <X size={22} />
        </button>
        <Link className="brand" href="/">
          <span className="brandmark">
            <Scissors size={24} />
          </span>
          Salon<span>Desk</span>
          <i />
        </Link>
        <div className="workspace">
          <span className="salonicon">M</span>
          <div>
            <strong>MUSK by Lubna Arif</strong>
            <small>Management studio</small>
          </div>
        </div>
        <p className="navlabel">WORKSPACE</p>
        <nav>
          {tabs
            .filter(([name]) =>
              manage
                ? name !== "Team" || owner
                : ["Overview", "Appointments"].includes(name),
            )
            .map(([name, Icon]) => (
              <button
                key={name}
                className={tab === name ? "navitem active" : "navitem"}
                onClick={() => {
                  setTab(name);
                  setQuery("");
                  setMobile(false);
                }}
              >
                <Icon size={19} />
                {name}
                {name === "Requests" && pending.length > 0 && (
                  <span>{pending.length}</span>
                )}
              </button>
            ))}
        </nav>
        <div className="sidebarbottom">
          <div className="help">
            <Sparkles size={20} />
            <strong>
              Your salon.
              <br />A little more in sync.
            </strong>
            <p>Bookings, people and moments.</p>
          </div>
          <div className="profile">
            <span className="avatar">
              {profile.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)}
            </span>
            <div>
              <strong>{profile.name}</strong>
              <small className="capitalize">{profile.role}</small>
            </div>
            <button
              className="iconbtn"
              aria-label="Sign out"
              disabled={busy}
              onClick={logout}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main" inert={mobile}>
        <header>
          <div className="breadcrumb">
            <button
              className="mobiletoggle iconbtn"
              aria-label="Toggle navigation"
              ref={menuButton}
              aria-expanded={mobile}
              aria-controls="workspace-navigation"
              onClick={() => setMobile(!mobile)}
            >
              <Menu />
            </button>
            Workspace <span>/</span>
            <strong>{tab}</strong>
          </div>
          <div className="headerend">
            <button
              className="iconbtn"
              aria-label="Refresh data"
              disabled={busy}
              onClick={() => {
                setBusy(true);
                load()
                  .catch((e) => setNotice(e.message))
                  .finally(() => setBusy(false));
              }}
            >
              <RefreshCw size={16} />
            </button>
            <Link href="/" className="visitlink">
              View salon ↗
            </Link>
          </div>
        </header>
        <main>
          <div className="heading">
            <div>
              <p className="eyebrow">MUSK · MANAGEMENT STUDIO</p>
              <h1>
                {tab === "Overview" ? "A beautiful day starts here." : tab}
              </h1>
              <p className="subtitle">
                {!manage
                  ? "Your assigned appointments, all in one place."
                  : "A little clarity for your busy salon day."}
              </p>
            </div>
            {manage &&
              [
                "Overview",
                "Appointments",
                "Clients",
                "Services",
                "Team",
              ].includes(tab) &&
              (tab !== "Services" || owner) && (
                <button
                  className="primary"
                  disabled={!data || busy || stale}
                  onClick={() =>
                    open(
                      tab === "Clients"
                        ? "client"
                        : tab === "Services"
                          ? "service"
                          : tab === "Team"
                            ? "team"
                            : "booking",
                    )
                  }
                >
                  <Plus size={18} />
                  {tab === "Clients"
                    ? "Add client"
                    : tab === "Services"
                      ? "Add service"
                      : tab === "Team"
                        ? "Add staff"
                        : "New appointment"}
                </button>
              )}
          </div>
          {notice && (
            <div role="status" className="notice">
              {notice}
              <button
                aria-label="Dismiss notification"
                onClick={() => setNotice("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {stale && (
            <p role="alert" className="error">
              The last change was saved, but the dashboard could not reload. Use
              Refresh data before making another change to avoid recording it
              twice.
            </p>
          )}
          {!data ? (
            <div className="empty">
              {notice
                ? "Unable to load the workspace. Use refresh to retry."
                : "Loading your salon…"}
            </div>
          ) : (
            <>
              {tab === "Overview" && (
                <>
                  <div className={"stats " + (!manage ? "two" : "")}>
                    {[
                      {
                        label: "Today's appointments",
                        value: String(
                          active.filter(
                            (b) =>
                              day(b.starts_at) ===
                              day(new Date().toISOString()),
                          ).length,
                        ).padStart(2, "0"),
                        note: "Salon time · Karachi",
                      },
                      ...(manage
                        ? [
                            {
                              label: "Payments collected",
                              value: money(totalPaid),
                              note: "All recorded payments, including cancelled bookings",
                            },
                            {
                              label: "Outstanding balance",
                              value: money(balance),
                              note: "Excludes cancelled appointments",
                            },
                            {
                              label: "Pending requests",
                              value: String(pending.length).padStart(2, "0"),
                              note: "Awaiting your confirmation",
                            },
                          ]
                        : [
                            {
                              label: "Completed appointments",
                              value: String(
                                active.filter((b) => b.status === "Completed")
                                  .length,
                              ),
                              note: "Your completed services",
                            },
                          ]),
                    ].map((s) => (
                      <div className="stat" key={s.label}>
                        <span>{s.label}</span>
                        <strong>{s.value}</strong>
                        <small>{s.note}</small>
                      </div>
                    ))}
                  </div>
                  {manage && (
                    <div className="feature">
                      <div>
                        <span className="pill">A MOMENT TO PLAN</span>
                        <h2>
                          Great experiences.
                          <br />
                          Effortlessly organised.
                        </h2>
                        <p>
                          {pending.length} appointment requests are waiting for
                          a personal touch.
                        </p>
                        <button onClick={() => setTab("Requests")}>
                          Review appointment requests <ArrowUpRight size={17} />
                        </button>
                      </div>
                      <div className="art" aria-hidden="true">
                        <div className="arch">
                          <Scissors size={70} strokeWidth={1} />
                          <span>
                            THE ART OF
                            <br />
                            <b>feeling beautiful.</b>
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
              {(tab === "Overview" || tab === "Appointments") && (
                <section className="panel">
                  <div className="sectionhead">
                    <div>
                      <h2>Your appointment book</h2>
                      <p>
                        {manage
                          ? "Every client. Every detail. Right on time."
                          : "Only appointments assigned to you."}
                      </p>
                    </div>
                    <input
                      aria-label="Appointment date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>
                  <div className="toolbar">
                    <span className="selected">
                      All appointments · {appointments.length}
                    </span>
                    <label className="search">
                      <Search size={16} />
                      <input
                        aria-label="Search appointments"
                        placeholder="Search clients or services…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </label>
                  </div>
                  <div className="tablewrap">
                    <table>
                      <thead>
                        <tr>
                          <th>CLIENT</th>
                          <th>SERVICE / SPECIALIST</th>
                          <th>TIME</th>
                          <th>STATUS</th>
                          {manage && (
                            <>
                              <th>BALANCE</th>
                              <th>RECEIPT</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {appointments.map((b) => (
                          <tr key={b.id}>
                            <td>
                              <div className="person">
                                <span className="initial">
                                  {client(b.client_id)
                                    ?.name.slice(0, 2)
                                    .toUpperCase()}
                                </span>
                                <div>
                                  <strong>{client(b.client_id)?.name}</strong>
                                  <small>{client(b.client_id)?.phone}</small>
                                </div>
                              </div>
                            </td>
                            <td>
                              <strong>{b.service_name}</strong>
                              <small>{specialist(b.staff_id)}</small>
                            </td>
                            <td>
                              <strong>{clock(b.starts_at)}</strong>
                              <small>{clock(b.ends_at)} finish</small>
                            </td>
                            <td>
                              {manage ? (
                                <select
                                  aria-label={`Status for ${client(b.client_id)?.name}`}
                                  className={"status " + b.status.toLowerCase()}
                                  disabled={busy || stale}
                                  value={b.status}
                                  onChange={(e) =>
                                    quick("status", {
                                      id: b.id,
                                      status: e.target.value,
                                    })
                                  }
                                >
                                  {["Confirmed", "Completed", "Cancelled"].map(
                                    (s) => (
                                      <option key={s}>{s}</option>
                                    ),
                                  )}
                                </select>
                              ) : b.status === "Confirmed" ? (
                                <button
                                  disabled={busy || stale}
                                  className="secondary"
                                  onClick={() =>
                                    quick("status", {
                                      id: b.id,
                                      status: "Completed",
                                    })
                                  }
                                >
                                  Mark completed
                                </button>
                              ) : (
                                <span className="status">{b.status}</span>
                              )}
                            </td>
                            {manage && (
                              <>
                                <td>
                                  <strong>{money(b.total - paid(b.id))}</strong>
                                  <small>{money(paid(b.id))} paid</small>
                                </td>
                                <td>
                                  <button
                                    className="iconbtn"
                                    aria-label={`Receipt for ${client(b.client_id)?.name}`}
                                    onClick={() => {
                                      setError("");
                                      setReceipt(b);
                                    }}
                                  >
                                    <ArrowUpRight size={18} />
                                  </button>
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!appointments.length && (
                      <div className="empty">
                        No appointments for this date.
                      </div>
                    )}
                  </div>
                  <div className="panelbottom">
                    <span>
                      {appointments.length} appointments · {date}
                    </span>
                    <span>All times are Asia/Karachi</span>
                  </div>
                </section>
              )}
              {tab === "Requests" && (
                <section className="panel">
                  <div className="sectionhead">
                    <div>
                      <h2>Requests from your website</h2>
                      <p>
                        Contact the customer, agree a time, then confirm their
                        appointment.
                      </p>
                    </div>
                  </div>
                  {!pending.length && (
                    <div className="empty">
                      All caught up. New website requests will appear here.
                    </div>
                  )}
                  {pending.map((r) => (
                    <article className="requestrow" key={r.id}>
                      <div>
                        <span className="category">
                          {data.services.find((s) => s.id === r.service_id)
                            ?.name || "Service request"}
                        </span>
                        <h3>{r.name}</h3>
                        <p>
                          <a href={`tel:+${r.phone}`}>+{r.phone}</a> ·{" "}
                          {r.preferred_date} at {r.preferred_time.slice(0, 5)}
                        </p>
                        {r.notes && <p className="requestnote">{r.notes}</p>}
                      </div>
                      <div className="requestactions">
                        <button
                          className="primary"
                          disabled={busy || stale}
                          onClick={() => open("confirm", r)}
                        >
                          Confirm booking
                        </button>
                        <button
                          className="secondary"
                          disabled={busy || stale}
                          onClick={() => quick("decline-request", { id: r.id })}
                        >
                          Decline
                        </button>
                      </div>
                    </article>
                  ))}
                </section>
              )}
              {tab === "Clients" && (
                <>
                  <label className="search standalone">
                    <Search size={16} />
                    <input
                      placeholder="Search name or phone…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </label>
                  <div className="cards">
                    {data.clients
                      .filter((c) =>
                        (c.name + c.phone)
                          .toLowerCase()
                          .includes(query.toLowerCase()),
                      )
                      .map((c) => (
                        <article className="clientcard" key={c.id}>
                          <span className="initial large">
                            {c.name.slice(0, 2).toUpperCase()}
                          </span>
                          <h2>{c.name}</h2>
                          <p>
                            <a href={`tel:+${c.phone}`}>+{c.phone}</a>
                          </p>
                          <div>
                            <span>
                              {
                                data.appointments.filter(
                                  (b) => b.client_id === c.id,
                                ).length
                              }{" "}
                              bookings
                            </span>
                            <strong>
                              {money(
                                active
                                  .filter((b) => b.client_id === c.id)
                                  .reduce(
                                    (sum, b) => sum + b.total - paid(b.id),
                                    0,
                                  ),
                              )}{" "}
                              due
                            </strong>
                          </div>
                        </article>
                      ))}
                  </div>
                  {!data.clients.length && (
                    <div className="empty">
                      Add your first client or confirm a website request.
                    </div>
                  )}
                </>
              )}
              {tab === "Services" && (
                <>
                  <p className="notice">
                    Concept package prices are samples. The owner can add
                    services and hide outdated ones.
                  </p>
                  <div className="cards">
                    {data.services.map((s) => (
                      <article className="servicecard" key={s.id}>
                        <Sparkles size={24} />
                        <span className="category">
                          {s.category} · {s.active ? "Published" : "Hidden"}
                        </span>
                        <h2>{s.name}</h2>
                        <p>{s.duration} minutes</p>
                        <div>
                          <strong>{money(s.price)}</strong>
                          {owner && (
                            <button
                              disabled={busy || stale}
                              className="secondary"
                              onClick={() =>
                                quick("service-toggle", {
                                  id: s.id,
                                  active: !s.active,
                                })
                              }
                            >
                              {s.active ? "Hide" : "Publish"}
                            </button>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              )}
              {tab === "Messages" && (
                <section className="panel">
                  <div className="sectionhead">
                    <div>
                      <h2>Website messages</h2>
                      <p>
                        Contact inquiries from the public website. Replies are
                        handled by phone or WhatsApp.
                      </p>
                    </div>
                  </div>
                  {!data.messages?.length && (
                    <div className="empty">No messages yet.</div>
                  )}
                  {data.messages?.map((m) => (
                    <article className="requestrow" key={m.id}>
                      <div>
                        <span className="category">
                          {m.status} · {day(m.created_at)}
                        </span>
                        <h3>{m.name}</h3>
                        <p>
                          <a href={`tel:+${m.phone}`}>+{m.phone}</a>
                        </p>
                        <p className="requestnote">{m.message}</p>
                      </div>
                      <button
                        className="secondary"
                        disabled={busy || stale}
                        onClick={() =>
                          quick("message-status", {
                            id: m.id,
                            status: m.status === "New" ? "Handled" : "New",
                          })
                        }
                      >
                        {m.status === "New" ? "Mark handled" : "Reopen"}
                      </button>
                    </article>
                  ))}
                </section>
              )}
              {tab === "Payments" && (
                <>
                  <div className="stats two">
                    <div className="stat">
                      <span>Total recorded collections</span>
                      <strong>{money(totalPaid)}</strong>
                    </div>
                    <div className="stat">
                      <span>Outstanding on active bookings</span>
                      <strong>{money(balance)}</strong>
                    </div>
                  </div>
                  <section className="panel">
                    <div className="sectionhead">
                      <div>
                        <h2>Payments & receipts</h2>
                        <p>
                          Open an appointment to record a payment or print its
                          receipt.
                        </p>
                      </div>
                    </div>
                    <div className="paymentlist">
                      {data.appointments.map((b) => (
                        <button
                          key={b.id}
                          onClick={() => {
                            setError("");
                            setReceipt(b);
                          }}
                        >
                          <div>
                            <strong>{client(b.client_id)?.name}</strong>
                            <small>
                              {b.service_name} · {day(b.starts_at)} · {b.status}
                            </small>
                          </div>
                          <div>
                            <strong>{money(paid(b.id))} paid</strong>
                            <small>{money(b.total - paid(b.id))} balance</small>
                          </div>
                          <ArrowUpRight size={18} />
                        </button>
                      ))}
                    </div>
                    {!data.appointments.length && (
                      <div className="empty">
                        Create an appointment to begin recording payments.
                      </div>
                    )}
                  </section>
                </>
              )}
              {tab === "Team" && (
                <>
                  <p className="notice">
                    Owners manage the salon. Receptionists manage bookings and
                    payments. Stylists see their own appointments and mark
                    services completed.
                  </p>
                  <div className="cards">
                    {data.team.map((p) => (
                      <article className="clientcard" key={p.id}>
                        <span className="initial large">
                          {p.name.slice(0, 2).toUpperCase()}
                        </span>
                        <h2>{p.name}</h2>
                        <p>
                          {p.active ? "Active" : "Inactive"} account{" "}
                          {p.id === profile.id ? "· You" : ""}
                        </p>
                        <label>
                          Role
                          <select
                            disabled={busy || stale || p.id === profile.id}
                            value={p.role}
                            onChange={(e) =>
                              quick(
                                "update",
                                {
                                  id: p.id,
                                  role: e.target.value,
                                  active: p.active,
                                },
                                true,
                              )
                            }
                          >
                            {["owner", "receptionist", "stylist"].map((r) => (
                              <option key={r}>{r}</option>
                            ))}
                          </select>
                        </label>
                        <button
                          className="secondary full"
                          disabled={busy || stale || p.id === profile.id}
                          onClick={() =>
                            quick(
                              "update",
                              { id: p.id, role: p.role, active: !p.active },
                              true,
                            )
                          }
                        >
                          {p.active ? "Deactivate" : "Activate"}
                        </button>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
          <footer>
            <span>SalonDesk · MUSK management studio</span>
            <span>Role: {profile.role} · Karachi time</span>
          </footer>
        </main>
      </div>
      <dialog
        ref={dialog}
        onCancel={(event) => {
          if (busy) {
            event.preventDefault();
            return;
          }
          if (!busy) {
            setModal(null);
            setReceipt(null);
          }
        }}
      >
        <div className="dialogtop">
          <span className="eyebrow">MUSK · SALONDESK</span>
          <button
            className="iconbtn"
            disabled={busy}
            aria-label="Close dialog"
            onClick={() => {
              setModal(null);
              setReceipt(null);
            }}
          >
            <X />
          </button>
        </div>
        {stale && (
          <p role="alert" className="error">
            Saved, but the dashboard could not reload. Close this receipt and
            use Refresh data before recording another payment.
          </p>
        )}
        {receiptCurrent ? (
          <>
            <div className="receipt">
              <h2>Payment receipt</h2>
              <p>MUSK by Lubna Arif · Karachi</p>
              <div className="receiptmeta">
                <strong>
                  SD-{receiptCurrent.id.slice(0, 8).toUpperCase()}
                </strong>
                <span>
                  {day(receiptCurrent.starts_at)} ·{" "}
                  {clock(receiptCurrent.starts_at)}
                </span>
              </div>
              <h3>{client(receiptCurrent.client_id)?.name}</h3>
              <p>+{client(receiptCurrent.client_id)?.phone}</p>
              <div className="receiptrow">
                <span>
                  {receiptCurrent.service_name}
                  <small>
                    {specialist(receiptCurrent.staff_id)} ·{" "}
                    {receiptCurrent.status}
                  </small>
                </span>
                <strong>{money(receiptCurrent.total)}</strong>
              </div>
              {payments(receiptCurrent.id).map((p) => (
                <div className="receiptrow" key={p.id}>
                  <span>
                    {p.method}
                    <small>
                      {day(p.created_at)} · {clock(p.created_at)} ·{" "}
                      {p.id.slice(0, 8)}
                    </small>
                  </span>
                  <strong>{money(p.amount)}</strong>
                </div>
              ))}
              <div className="receiptrow">
                <span>Total paid</span>
                <strong>{money(paid(receiptCurrent.id))}</strong>
              </div>
              <div className="receiptrow total">
                <span>Balance remaining</span>
                <strong>
                  {money(receiptCurrent.total - paid(receiptCurrent.id))}
                </strong>
              </div>
              <p className="receiptnote">
                Thank you for choosing MUSK.
                <br />
                Payment summary · Not a tax invoice
              </p>
            </div>
            {receiptCurrent.status === "Cancelled" && (
              <p className="notice noprint">
                Cancelled booking. Recorded payments are retained; refunds must
                be handled separately.
              </p>
            )}
            {receiptCurrent.status !== "Cancelled" &&
              paid(receiptCurrent.id) < receiptCurrent.total && (
                <form className="paymentform noprint" onSubmit={payment}>
                  <label>
                    Additional payment (PKR)
                    <input
                      name="amount"
                      aria-label="Payment amount"
                      type="number"
                      min="1"
                      max={receiptCurrent.total - paid(receiptCurrent.id)}
                      step="1"
                      required
                    />
                  </label>
                  <label>
                    Payment method
                    <select name="method">
                      <option>Cash</option>
                      <option>Bank transfer</option>
                    </select>
                  </label>
                  <button className="primary" disabled={busy || stale}>
                    {busy ? "Saving…" : "Record payment"}
                  </button>
                </form>
              )}
            {error && (
              <p className="error noprint" role="alert">
                {error}
              </p>
            )}
            <button
              className="secondary full noprint"
              onClick={() => window.print()}
            >
              <Printer size={17} /> Print receipt
            </button>
          </>
        ) : (
          <>
            <h2>
              {modal === "confirm"
                ? "Confirm this request"
                : modal === "client"
                  ? "Add a client"
                  : modal === "service"
                    ? "Add a service"
                    : modal === "team"
                      ? "Add a staff account"
                      : "A new appointment"}
            </h2>
            <form
              className="form"
              onSubmit={save}
              key={modal + (request?.id || "")}
            >
              {(modal === "booking" || modal === "confirm") && (
                <>
                  {modal === "confirm" ? (
                    <p className="notice">
                      {request?.name} · {request?.phone}
                      <br />
                      {
                        data?.services.find((s) => s.id === request?.service_id)
                          ?.name
                      }
                    </p>
                  ) : (
                    <>
                      <label>
                        Client
                        <select name="client_id" required defaultValue="">
                          <option value="" disabled>
                            Choose client
                          </option>
                          {data?.clients.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Service
                        <select name="service_id" required defaultValue="">
                          <option value="" disabled>
                            Choose service
                          </option>
                          {data?.services
                            .filter((s) => s.active)
                            .map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name} · {money(s.price)}
                              </option>
                            ))}
                        </select>
                      </label>
                    </>
                  )}
                  <label>
                    Stylist
                    <select name="staff_id" required defaultValue="">
                      <option value="" disabled>
                        Choose stylist
                      </option>
                      {stylists.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  {!stylists.length && (
                    <p className="notice">
                      An owner must add an active stylist under Team first.
                    </p>
                  )}
                  <div className="formrow">
                    <label>
                      Date
                      <input
                        type="date"
                        name="date"
                        required
                        defaultValue={request?.preferred_date || date}
                      />
                    </label>
                    <label>
                      Start time
                      <input
                        type="time"
                        name="time"
                        required
                        defaultValue={
                          request?.preferred_time.slice(0, 5) || "12:00"
                        }
                      />
                    </label>
                  </div>
                  <p className="consent">
                    Times are Karachi local time. Confirm availability with the
                    customer before saving. Record any advance from the receipt
                    after booking.
                  </p>
                </>
              )}
              {(modal === "client" ||
                modal === "service" ||
                modal === "team") && (
                <label>
                  {modal === "client"
                    ? "Client name"
                    : modal === "team"
                      ? "Staff name"
                      : "Service name"}
                  <input name="name" minLength={2} maxLength={80} required />
                </label>
              )}
              {modal === "client" && (
                <label>
                  Phone / WhatsApp
                  <input
                    type="tel"
                    name="phone"
                    required
                    placeholder="03XX XXXXXXX"
                    maxLength={25}
                  />
                </label>
              )}
              {modal === "service" && (
                <>
                  <label>
                    Category
                    <select name="category">
                      {["Makeup", "Hair", "Skin", "Nails", "Other"].map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                  <div className="formrow">
                    <label>
                      Price (PKR)
                      <input
                        type="number"
                        name="price"
                        min="1"
                        max="10000000"
                        required
                      />
                    </label>
                    <label>
                      Duration (minutes)
                      <input
                        type="number"
                        name="duration"
                        min="15"
                        max="720"
                        required
                      />
                    </label>
                  </div>
                </>
              )}
              {modal === "team" && (
                <>
                  <label>
                    Email
                    <input
                      type="email"
                      name="email"
                      required
                      autoComplete="off"
                    />
                  </label>
                  <label>
                    Initial password
                    <input
                      name="password"
                      type="password"
                      minLength={12}
                      maxLength={128}
                      required
                      autoComplete="new-password"
                    />
                  </label>
                  <label>
                    Role
                    <select name="role">
                      <option value="stylist">Stylist</option>
                      <option value="receptionist">Receptionist</option>
                      <option value="owner">Owner</option>
                    </select>
                  </label>
                  <p className="consent">
                    No email is sent. Share credentials with the staff member
                    privately.
                  </p>
                </>
              )}
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <button
                className="primary full"
                disabled={
                  busy ||
                  stale ||
                  ((modal === "booking" || modal === "confirm") &&
                    !stylists.length)
                }
              >
                {busy
                  ? "Saving…"
                  : modal === "confirm"
                    ? "Confirm appointment"
                    : "Save details"}
              </button>
            </form>
          </>
        )}
      </dialog>
    </div>
  );
}
