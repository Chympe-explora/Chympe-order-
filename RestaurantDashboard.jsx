import React, { useState, useEffect, useMemo, useRef } from "react";

/* ---------------------------------------------------------------
   Krem Chympe Waterfall — Restaurant Dashboard
   Phase 2: Password login (hashed, session-only) → Live Orders →
   Menu Management. Reads/writes the same shared storage as the
   customer ordering app (OrderingApp.jsx).
----------------------------------------------------------------*/

const AUTH_KEY = "restaurant-auth-v1";
const MENU_KEY = "menu-v1";

const STEPS = [
  { key: "waiting", label: "Waiting for Restaurant" },
  { key: "accepted", label: "Accepted" },
  { key: "payment_pending", label: "Payment Pending" },
  { key: "payment_verified", label: "Payment Verified" },
  { key: "preparing", label: "Preparing Food" },
  { key: "ready", label: "Ready for Pickup" },
  { key: "completed", label: "Completed" },
];

async function getShared(key, fallback) {
  try {
    const r = await window.storage.get(key, true);
    return r ? JSON.parse(r.value) : fallback;
  } catch (e) {
    return fallback;
  }
}
async function setShared(key, value) {
  try {
    await window.storage.set(key, JSON.stringify(value), true);
  } catch (e) {
    console.error("storage set failed", e);
  }
}
async function listShared(prefix) {
  try {
    const r = await window.storage.list(prefix, true);
    return r ? r.keys : [];
  } catch (e) {
    return [];
  }
}

function toHex(buf) {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function randomSalt() {
  return toHex(crypto.getRandomValues(new Uint8Array(16)));
}
async function hashPassword(password, salt) {
  const enc = new TextEncoder().encode(salt + ":" + password);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return toHex(buf);
}

function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return s + "s ago";
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  return Math.floor(s / 86400) + "d ago";
}

export default function App() {
  const [authState, setAuthState] = useState("checking"); // checking | setup | login | authed
  const [authRecord, setAuthRecord] = useState(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [tab, setTab] = useState("orders"); // orders | menu | settings

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Work+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap";
    document.head.appendChild(link);
    return () => { try { document.head.removeChild(link); } catch (e) {} };
  }, []);

  useEffect(() => {
    (async () => {
      const rec = await getShared(AUTH_KEY, null);
      setAuthRecord(rec);
      setAuthState(rec ? "login" : "setup");
    })();
  }, []);

  if (authState === "checking") {
    return (
      <div style={{ background: "var(--paper)" }} className="min-h-screen flex items-center justify-center">
        <Style />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div style={{ background: "var(--paper)" }} className="min-h-screen">
        <Style />
        {authState === "setup" ? (
          <SetupScreen onDone={(rec) => { setAuthRecord(rec); setAuthenticated(true); }} />
        ) : (
          <LoginScreen authRecord={authRecord} onSuccess={() => setAuthenticated(true)} />
        )}
      </div>
    );
  }

  return (
    <div style={{ background: "var(--paper)", minHeight: "100vh" }}>
      <Style />
      <DashHeader tab={tab} setTab={setTab} onLogout={() => setAuthenticated(false)} />
      {tab === "orders" && <OrdersTab />}
      {tab === "menu" && <MenuTab />}
      {tab === "settings" && <SettingsTab authRecord={authRecord} onPasswordChanged={(rec) => setAuthRecord(rec)} />}
    </div>
  );
}

function Style() {
  return (
    <style>{`
      :root {
        --ink: #16241F; --paper: #F3F0E6; --moss: #2F5D50; --moss-dark: #1F4038;
        --spring: #2FA98C; --bamboo: #C79A3C; --stone: #DCD6C5; --card: #FBF9F2; --danger: #B3452F;
        --font-display: 'Fraunces', serif; --font-body: 'Work Sans', sans-serif; --font-mono: 'IBM Plex Mono', monospace;
      }
      * { font-family: var(--font-body); }
      .font-display { font-family: var(--font-display); }
      .font-mono { font-family: var(--font-mono); }
      button { cursor: pointer; }
      button:focus-visible, input:focus-visible, textarea:focus-visible { outline: 2px solid var(--spring); outline-offset: 2px; }
      button:disabled { opacity: 0.5; cursor: not-allowed; }
      @media (prefers-reduced-motion: reduce) { * { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; } }
    `}</style>
  );
}

const inputStyle = { background: "var(--card)", borderColor: "var(--stone)", color: "var(--ink)" };

function SetupScreen({ onDone }) {
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    setErr("");
    if (p1.length < 6) return setErr("Use at least 6 characters.");
    if (p1 !== p2) return setErr("Passwords don't match.");
    setBusy(true);
    const salt = randomSalt();
    const hash = await hashPassword(p1, salt);
    const rec = { salt, hash, updatedAt: new Date().toISOString() };
    await setShared(AUTH_KEY, rec);
    setBusy(false);
    onDone(rec);
  };

  return (
    <div className="max-w-sm mx-auto px-5 pt-20">
      <div className="font-display text-2xl mb-1" style={{ color: "var(--ink)", fontWeight: 600 }}>Set Up Restaurant Access</div>
      <p className="text-sm opacity-70 mb-5" style={{ color: "var(--ink)" }}>Create a password for this dashboard. It's stored as a salted hash, never in plain text — and you'll need it every time you log in.</p>
      <div className="space-y-3">
        <input type="password" value={p1} onChange={(e) => setP1(e.target.value)} placeholder="New password" style={inputStyle} className="w-full px-3.5 py-2.5 rounded-xl border text-sm" />
        <input type="password" value={p2} onChange={(e) => setP2(e.target.value)} placeholder="Confirm password" style={inputStyle} className="w-full px-3.5 py-2.5 rounded-xl border text-sm" />
      </div>
      {err && <p className="text-sm mt-2" style={{ color: "var(--danger)" }}>{err}</p>}
      <button disabled={busy} onClick={submit} style={{ background: "var(--moss-dark)" }} className="w-full mt-4 rounded-2xl py-3 text-white font-semibold text-sm">
        {busy ? "Setting up…" : "Create Password"}
      </button>
    </div>
  );
}

function LoginScreen({ authRecord, onSuccess }) {
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    setErr("");
    setBusy(true);
    const hash = await hashPassword(pwd, authRecord.salt);
    setBusy(false);
    if (hash === authRecord.hash) onSuccess();
    else setErr("Incorrect password.");
  };

  return (
    <div className="max-w-sm mx-auto px-5 pt-24">
      <div className="font-display text-2xl mb-1" style={{ color: "var(--ink)", fontWeight: 600 }}>Restaurant Dashboard</div>
      <p className="text-sm opacity-70 mb-5" style={{ color: "var(--ink)" }}>Krem Chympe Waterfall</p>
      <input
        type="password"
        value={pwd}
        onChange={(e) => setPwd(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="Password"
        style={inputStyle}
        className="w-full px-3.5 py-2.5 rounded-xl border text-sm"
        autoFocus
      />
      {err && <p className="text-sm mt-2" style={{ color: "var(--danger)" }}>{err}</p>}
      <button disabled={busy || !pwd} onClick={submit} style={{ background: "var(--moss-dark)" }} className="w-full mt-4 rounded-2xl py-3 text-white font-semibold text-sm">
        {busy ? "Checking…" : "Log In"}
      </button>
    </div>
  );
}

function DashHeader({ tab, setTab, onLogout }) {
  const tabs = [
    { key: "orders", label: "Orders" },
    { key: "menu", label: "Menu" },
    { key: "settings", label: "Settings" },
  ];
  return (
    <div style={{ background: "var(--moss)" }} className="sticky top-0 z-20 shadow-sm">
      <div className="max-w-2xl mx-auto px-4 pt-3 flex items-center justify-between">
        <div className="font-display text-white text-lg" style={{ fontWeight: 600 }}>Krem Chympe · Restaurant</div>
        <button onClick={onLogout} className="text-xs text-white opacity-80 font-medium">Log out</button>
      </div>
      <div className="max-w-2xl mx-auto px-4 flex gap-1 mt-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{ background: tab === t.key ? "var(--paper)" : "transparent", color: tab === t.key ? "var(--moss-dark)" : "white" }}
            className="text-sm font-medium px-3.5 py-2 rounded-t-lg"
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Orders Tab ---------------- */

function OrdersTab() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("active"); // active | all
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef(null);

  const refresh = async () => {
    const keys = await listShared("order:");
    const list = await Promise.all(keys.map((k) => getShared(k, null)));
    const valid = list.filter(Boolean).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    setOrders(valid);
    setLoading(false);
    if (selected) {
      const updated = valid.find((o) => o.id === selected.id);
      if (updated) setSelected(updated);
    }
  };

  useEffect(() => {
    refresh();
    pollRef.current = setInterval(refresh, 6000);
    return () => clearInterval(pollRef.current);
  }, []);

  const visible = orders.filter((o) => (filter === "active" ? !["completed", "cancelled", "rejected"].includes(o.status) : true));

  if (selected) {
    return <OrderDetail order={selected} onBack={() => setSelected(null)} onChanged={refresh} />;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pt-4 pb-16">
      <div className="flex gap-2 mb-3">
        <FilterChip label="Active" active={filter === "active"} onClick={() => setFilter("active")} />
        <FilterChip label="All" active={filter === "all"} onClick={() => setFilter("all")} />
      </div>
      {loading ? (
        <p className="text-sm opacity-60" style={{ color: "var(--ink)" }}>Loading orders…</p>
      ) : visible.length === 0 ? (
        <p className="text-sm opacity-60 text-center py-16" style={{ color: "var(--ink)" }}>No orders here yet.</p>
      ) : (
        <div className="space-y-2.5">
          {visible.map((o) => (
            <OrderRow key={o.id} order={o} onClick={() => setSelected(o)} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{ background: active ? "var(--moss)" : "var(--card)", color: active ? "white" : "var(--ink)", borderColor: "var(--stone)" }} className="px-3.5 py-1.5 rounded-full text-sm font-medium border">
      {label}
    </button>
  );
}

const STATUS_COLORS = {
  waiting: "var(--bamboo)",
  accepted: "var(--spring)",
  payment_pending: "var(--bamboo)",
  payment_verified: "var(--spring)",
  preparing: "var(--spring)",
  ready: "var(--moss-dark)",
  completed: "var(--moss-dark)",
  rejected: "var(--danger)",
  cancelled: "var(--danger)",
  changes_requested: "var(--bamboo)",
};

function statusLabel(status) {
  const found = STEPS.find((s) => s.key === status);
  if (found) return found.label;
  if (status === "rejected") return "Rejected";
  if (status === "cancelled") return "Cancelled";
  if (status === "changes_requested") return "Changes Requested";
  return status;
}

function OrderRow({ order, onClick }) {
  const pendingReq = (order.requests || []).some((r) => r.status === "pending");
  return (
    <button onClick={onClick} style={{ background: "var(--card)", borderColor: "var(--stone)" }} className="w-full text-left rounded-xl border p-3.5 flex items-center justify-between">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{order.customer.name}</span>
          {pendingReq && <span style={{ background: "var(--bamboo)" }} className="w-1.5 h-1.5 rounded-full" />}
        </div>
        <div className="text-xs opacity-60 mt-0.5" style={{ color: "var(--ink)" }}>{order.items.length} item{order.items.length > 1 ? "s" : ""} · ₹{order.total} · {timeAgo(order.createdAt)}</div>
      </div>
      <span style={{ color: STATUS_COLORS[order.status] || "var(--ink)" }} className="text-xs font-semibold shrink-0 ml-2 text-right">{statusLabel(order.status)}</span>
    </button>
  );
}

function OrderDetail({ order, onBack, onChanged }) {
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [changeMsg, setChangeMsg] = useState("");
  const [showChange, setShowChange] = useState(false);
  const [busy, setBusy] = useState(false);

  const update = async (patch) => {
    setBusy(true);
    const fresh = await getShared("order:" + order.id, order);
    const updated = {
      ...fresh,
      ...patch,
      statusHistory: patch.status ? [...(fresh.statusHistory || []), { status: patch.status, at: new Date().toISOString() }] : fresh.statusHistory,
    };
    await setShared("order:" + order.id, updated);
    setBusy(false);
    onChanged();
  };

  const accept = () => update({ status: "accepted" });
  const reject = () => { if (!rejectReason.trim()) return; update({ status: "rejected", rejectReason: rejectReason.trim() }); setShowReject(false); };
  const requestChanges = () => { if (!changeMsg.trim()) return; update({ status: "changes_requested", rejectReason: changeMsg.trim() }); setShowChange(false); };
  const advance = () => {
    const idx = STEPS.findIndex((s) => s.key === order.status);
    if (idx < 0 || idx >= STEPS.length - 1) return;
    update({ status: STEPS[idx + 1].key });
  };
  const cancel = () => update({ status: "cancelled", rejectReason: "Cancelled by restaurant." });

  const respondToRequest = async (reqId, status, reply) => {
    setBusy(true);
    const fresh = await getShared("order:" + order.id, order);
    const requests = (fresh.requests || []).map((r) => (r.id === reqId ? { ...r, status, reply: reply || r.reply } : r));
    await setShared("order:" + order.id, { ...fresh, requests });
    setBusy(false);
    onChanged();
  };

  return (
    <div className="max-w-2xl mx-auto px-4 pt-4 pb-16">
      <button onClick={onBack} className="text-sm font-medium mb-3" style={{ color: "var(--moss-dark)" }}>← All orders</button>

      <div style={{ background: "var(--card)", borderColor: "var(--stone)" }} className="rounded-xl border p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="font-display text-lg" style={{ color: "var(--ink)", fontWeight: 600 }}>{order.customer.name}</div>
            <div className="text-sm opacity-70 font-mono mt-0.5" style={{ color: "var(--ink)" }}>{order.customer.mobile}</div>
          </div>
          <span style={{ color: STATUS_COLORS[order.status] || "var(--ink)" }} className="text-sm font-semibold">{statusLabel(order.status)}</span>
        </div>
        {order.customer.instructions && (
          <div className="text-sm mt-2 italic opacity-80" style={{ color: "var(--ink)" }}>“{order.customer.instructions}”</div>
        )}
        <div className="text-xs opacity-50 font-mono mt-2" style={{ color: "var(--ink)" }}>{order.id} · {timeAgo(order.createdAt)}</div>
      </div>

      <div style={{ background: "var(--card)", borderColor: "var(--stone)" }} className="rounded-xl border p-4 mt-3">
        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--moss-dark)" }}>Items</div>
        {order.items.map((it) => (
          <div key={it.dishId} className="flex justify-between text-sm py-0.5" style={{ color: "var(--ink)" }}>
            <span>{it.qty}× {it.name}</span>
            <span className="font-mono">₹{it.price * it.qty}</span>
          </div>
        ))}
        <div className="flex justify-between text-sm font-semibold mt-2 pt-2" style={{ borderTop: "1px solid var(--stone)", color: "var(--ink)" }}>
          <span>Total</span><span className="font-mono">₹{order.total}</span>
        </div>
        <div className="text-xs opacity-60 mt-1" style={{ color: "var(--ink)" }}>Est. prep: ~{order.estPrepMinutes} min</div>
      </div>

      {(order.requests || []).length > 0 && (
        <div style={{ background: "var(--card)", borderColor: "var(--stone)" }} className="rounded-xl border p-4 mt-3">
          <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--moss-dark)" }}>Correction Requests</div>
          <div className="space-y-3">
            {order.requests.map((r) => (
              <div key={r.id}>
                <div className="text-sm" style={{ color: "var(--ink)" }}>“{r.text}”</div>
                {r.status === "pending" ? (
                  <div className="flex gap-2 mt-1.5">
                    <button disabled={busy} onClick={() => respondToRequest(r.id, "accepted")} style={{ background: "var(--spring)" }} className="text-white text-xs font-semibold px-2.5 py-1 rounded-lg">Accept</button>
                    <button disabled={busy} onClick={() => respondToRequest(r.id, "rejected")} style={{ background: "var(--danger)" }} className="text-white text-xs font-semibold px-2.5 py-1 rounded-lg">Decline</button>
                  </div>
                ) : (
                  <div className="text-xs mt-1 font-medium" style={{ color: r.status === "accepted" ? "var(--spring)" : "var(--danger)" }}>
                    {r.status === "accepted" ? "Accepted" : "Declined"}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {order.status === "waiting" && (
          <>
            <button disabled={busy} onClick={accept} style={{ background: "var(--moss-dark)" }} className="w-full rounded-2xl py-3 text-white font-semibold text-sm">Accept Order</button>
            <button disabled={busy} onClick={() => setShowChange(!showChange)} style={{ background: "var(--card)", borderColor: "var(--stone)", color: "var(--ink)" }} className="w-full rounded-2xl py-3 border font-semibold text-sm">Request Changes</button>
            {showChange && (
              <div className="flex gap-2">
                <input value={changeMsg} onChange={(e) => setChangeMsg(e.target.value)} placeholder="What needs to change?" style={inputStyle} className="flex-1 px-3 py-2 rounded-lg border text-sm" />
                <button disabled={busy} onClick={requestChanges} style={{ background: "var(--bamboo)" }} className="text-white text-sm font-medium px-3.5 rounded-lg">Send</button>
              </div>
            )}
            <button disabled={busy} onClick={() => setShowReject(!showReject)} style={{ background: "transparent", color: "var(--danger)" }} className="w-full rounded-2xl py-2.5 font-semibold text-sm">Reject Order</button>
            {showReject && (
              <div className="flex gap-2">
                <input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason for the customer" style={inputStyle} className="flex-1 px-3 py-2 rounded-lg border text-sm" />
                <button disabled={busy} onClick={reject} style={{ background: "var(--danger)" }} className="text-white text-sm font-medium px-3.5 rounded-lg">Confirm</button>
              </div>
            )}
          </>
        )}

        {["accepted", "payment_pending", "payment_verified", "preparing", "ready"].includes(order.status) && (
          <>
            <button disabled={busy} onClick={advance} style={{ background: "var(--moss-dark)" }} className="w-full rounded-2xl py-3 text-white font-semibold text-sm">
              Mark as {STEPS[STEPS.findIndex((s) => s.key === order.status) + 1].label}
            </button>
            <button disabled={busy} onClick={cancel} style={{ background: "transparent", color: "var(--danger)" }} className="w-full rounded-2xl py-2.5 font-semibold text-sm">Cancel Order</button>
          </>
        )}

        {order.status === "changes_requested" && (
          <p className="text-sm opacity-70 text-center py-2" style={{ color: "var(--ink)" }}>Waiting for the customer to resubmit.</p>
        )}
      </div>
    </div>
  );
}

/* ---------------- Menu Tab ---------------- */

function MenuTab() {
  const [menu, setMenu] = useState(null);
  const [newDishCat, setNewDishCat] = useState(null);
  const [newCatName, setNewCatName] = useState("");
  const [showNewCat, setShowNewCat] = useState(false);

  const load = async () => setMenu(await getShared(MENU_KEY, { categories: [], dishes: [] }));
  useEffect(() => { load(); }, []);

  const save = async (m) => { setMenu(m); await setShared(MENU_KEY, m); };

  if (!menu) return <div className="max-w-2xl mx-auto px-4 pt-6 text-sm opacity-60" style={{ color: "var(--ink)" }}>Loading menu…</div>;

  const updateDish = (id, patch) => save({ ...menu, dishes: menu.dishes.map((d) => (d.id === id ? { ...d, ...patch } : d)) });
  const deleteDish = (id) => save({ ...menu, dishes: menu.dishes.filter((d) => d.id !== id) });
  const addDish = (catId, name, price) => {
    if (!name.trim() || !price) return;
    const id = "d" + Date.now();
    save({ ...menu, dishes: [...menu.dishes, { id, category: catId, name: name.trim(), desc: "", price: Number(price), prepMinutes: 15, status: "available", featured: false, icon: "thali" }] });
    setNewDishCat(null);
  };
  const addCategory = () => {
    if (!newCatName.trim()) return;
    const id = "c" + Date.now();
    save({ ...menu, categories: [...menu.categories, { id, name: newCatName.trim(), note: "" }] });
    setNewCatName("");
    setShowNewCat(false);
  };
  const deleteCategory = (id) => save({ ...menu, categories: menu.categories.filter((c) => c.id !== id), dishes: menu.dishes.filter((d) => d.category !== id) });

  return (
    <div className="max-w-2xl mx-auto px-4 pt-4 pb-16">
      {menu.categories.map((cat) => (
        <div key={cat.id} className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-display text-base" style={{ color: "var(--ink)", fontWeight: 600 }}>{cat.name}</h3>
            <button onClick={() => deleteCategory(cat.id)} className="text-xs" style={{ color: "var(--danger)" }}>Delete category</button>
          </div>
          <div className="space-y-2">
            {menu.dishes.filter((d) => d.category === cat.id).map((d) => (
              <div key={d.id} style={{ background: "var(--card)", borderColor: "var(--stone)" }} className="rounded-xl border p-3">
                <div className="flex items-center justify-between gap-2">
                  <input value={d.name} onChange={(e) => updateDish(d.id, { name: e.target.value })} style={{ color: "var(--ink)" }} className="font-medium text-sm bg-transparent flex-1 min-w-0" />
                  <div className="flex items-center gap-1 font-mono text-sm shrink-0">
                    <span style={{ color: "var(--ink)" }}>₹</span>
                    <input type="number" value={d.price} onChange={(e) => updateDish(d.id, { price: Number(e.target.value) })} style={{ color: "var(--ink)" }} className="bg-transparent w-14" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {["available", "unavailable", "soldout"].map((s) => (
                    <button key={s} onClick={() => updateDish(d.id, { status: s })} style={{ background: d.status === s ? "var(--moss)" : "var(--paper)", color: d.status === s ? "white" : "var(--ink)", borderColor: "var(--stone)" }} className="text-xs px-2 py-1 rounded-full border capitalize">
                      {s}
                    </button>
                  ))}
                  <button onClick={() => updateDish(d.id, { featured: !d.featured })} style={{ background: d.featured ? "var(--bamboo)" : "var(--paper)", color: d.featured ? "white" : "var(--ink)", borderColor: "var(--stone)" }} className="text-xs px-2 py-1 rounded-full border">Featured</button>
                  <button onClick={() => deleteDish(d.id)} style={{ color: "var(--danger)" }} className="text-xs px-2 py-1 ml-auto">Delete</button>
                </div>
              </div>
            ))}
          </div>

          {newDishCat === cat.id ? (
            <NewDishForm onAdd={(name, price) => addDish(cat.id, name, price)} onCancel={() => setNewDishCat(null)} />
          ) : (
            <button onClick={() => setNewDishCat(cat.id)} style={{ color: "var(--moss-dark)" }} className="text-sm font-medium mt-2">+ Add dish</button>
          )}
        </div>
      ))}

      {showNewCat ? (
        <div className="flex gap-2 mt-2">
          <input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="Category name" style={inputStyle} className="flex-1 px-3 py-2 rounded-lg border text-sm" />
          <button onClick={addCategory} style={{ background: "var(--moss)" }} className="text-white text-sm font-medium px-3.5 rounded-lg">Add</button>
        </div>
      ) : (
        <button onClick={() => setShowNewCat(true)} style={{ background: "var(--card)", borderColor: "var(--stone)", color: "var(--ink)" }} className="text-sm font-medium mt-1 px-3.5 py-2 rounded-xl border">+ New category</button>
      )}
    </div>
  );
}

function NewDishForm({ onAdd, onCancel }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  return (
    <div style={{ background: "var(--card)", borderColor: "var(--stone)" }} className="rounded-xl border p-3 mt-2 flex gap-2">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dish name" style={inputStyle} className="flex-1 px-2.5 py-1.5 rounded-lg border text-sm" />
      <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="₹" type="number" style={inputStyle} className="w-16 px-2.5 py-1.5 rounded-lg border text-sm" />
      <button onClick={() => onAdd(name, price)} style={{ background: "var(--moss)" }} className="text-white text-xs font-semibold px-2.5 rounded-lg">Add</button>
      <button onClick={onCancel} className="text-xs opacity-60" style={{ color: "var(--ink)" }}>Cancel</button>
    </div>
  );
}

/* ---------------- Settings Tab ---------------- */

function SettingsTab({ authRecord, onPasswordChanged }) {
  const [current, setCurrent] = useState("");
  const [next1, setNext1] = useState("");
  const [next2, setNext2] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setMsg("");
    const curHash = await hashPassword(current, authRecord.salt);
    if (curHash !== authRecord.hash) return setMsg("err:Current password is incorrect.");
    if (next1.length < 6) return setMsg("err:New password must be at least 6 characters.");
    if (next1 !== next2) return setMsg("err:New passwords don't match.");
    setBusy(true);
    const salt = randomSalt();
    const hash = await hashPassword(next1, salt);
    const rec = { salt, hash, updatedAt: new Date().toISOString() };
    await setShared(AUTH_KEY, rec);
    setBusy(false);
    setCurrent(""); setNext1(""); setNext2("");
    onPasswordChanged(rec);
    setMsg("ok:Password updated.");
  };

  return (
    <div className="max-w-sm mx-auto px-4 pt-6 pb-16">
      <h3 className="font-display text-lg mb-1" style={{ color: "var(--ink)", fontWeight: 600 }}>Change Password</h3>
      <p className="text-xs opacity-60 mb-4" style={{ color: "var(--ink)" }}>Stored as a salted hash only. No email or notification is sent to anyone when it changes.</p>
      <div className="space-y-2.5">
        <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Current password" style={inputStyle} className="w-full px-3.5 py-2.5 rounded-xl border text-sm" />
        <input type="password" value={next1} onChange={(e) => setNext1(e.target.value)} placeholder="New password" style={inputStyle} className="w-full px-3.5 py-2.5 rounded-xl border text-sm" />
        <input type="password" value={next2} onChange={(e) => setNext2(e.target.value)} placeholder="Confirm new password" style={inputStyle} className="w-full px-3.5 py-2.5 rounded-xl border text-sm" />
      </div>
      {msg && (
        <p className="text-sm mt-2" style={{ color: msg.startsWith("ok:") ? "var(--spring)" : "var(--danger)" }}>{msg.slice(3)}</p>
      )}
      <button disabled={busy} onClick={submit} style={{ background: "var(--moss-dark)" }} className="w-full mt-4 rounded-2xl py-3 text-white font-semibold text-sm">
        {busy ? "Saving…" : "Update Password"}
      </button>
    </div>
  );
}
