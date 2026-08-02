import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";

/* ---------------------------------------------------------------
   Krem Chympe Waterfall — Customer Ordering Flow
   Phase 1: Browse → Cart → Checkout → Live Tracking
   Data lives in shared window.storage so a customer's phone and
   (eventually) the restaurant dashboard see the same order state.
----------------------------------------------------------------*/

const MENU_KEY = "menu-v1";

const DEFAULT_MENU = {
  categories: [
    { id: "bamboo", name: "Bamboo Specials", note: "Cooked slow, inside green bamboo" },
    { id: "thali", name: "Thalis", note: "Full plate, local style" },
    { id: "snacks", name: "Momos & Snacks", note: "Quick bites" },
    { id: "drinks", name: "Beverages", note: "Hot & cold" },
  ],
  dishes: [
    { id: "d1", category: "bamboo", name: "Bamboo Chicken", desc: "Chicken slow-cooked in a sealed bamboo tube with local herbs.", price: 220, prepMinutes: 35, status: "available", featured: true, icon: "bamboo" },
    { id: "d2", category: "bamboo", name: "Bamboo Fish", desc: "River fish steamed in bamboo with wild garlic.", price: 240, prepMinutes: 35, status: "available", featured: false, icon: "bamboo" },
    { id: "d3", category: "bamboo", name: "Sticky Rice in Bamboo", desc: "Glutinous rice steamed inside bamboo, smoky finish.", price: 90, prepMinutes: 25, status: "available", featured: false, icon: "bamboo" },
    { id: "d4", category: "thali", name: "Khasi Veg Thali", desc: "Rice, dal, seasonal greens, pickle, papad.", price: 150, prepMinutes: 20, status: "available", featured: false, icon: "thali" },
    { id: "d5", category: "thali", name: "Jadoh Thali", desc: "Traditional Khasi red rice cooked with pork, served with a side.", price: 190, prepMinutes: 25, status: "available", featured: true, icon: "thali" },
    { id: "d6", category: "thali", name: "Pork Curry Thali", desc: "Slow-cooked pork curry with rice and local greens.", price: 210, prepMinutes: 25, status: "unavailable", featured: false, icon: "thali" },
    { id: "d7", category: "snacks", name: "Veg Momos (8pc)", desc: "Steamed dumplings, house chutney.", price: 90, prepMinutes: 15, status: "available", featured: false, icon: "momo" },
    { id: "d8", category: "snacks", name: "Pork Momos (8pc)", desc: "Steamed dumplings, house chutney.", price: 110, prepMinutes: 15, status: "available", featured: false, icon: "momo" },
    { id: "d9", category: "snacks", name: "Maggi Trekker's Bowl", desc: "Loaded with egg and vegetables.", price: 70, prepMinutes: 10, status: "soldout", featured: false, icon: "momo" },
    { id: "d10", category: "drinks", name: "Sha Saw (Black Tea)", desc: "Strong local black tea.", price: 30, prepMinutes: 5, status: "available", featured: false, icon: "cup" },
    { id: "d11", category: "drinks", name: "Butter Tea", desc: "Warming, slightly salted.", price: 45, prepMinutes: 5, status: "available", featured: false, icon: "cup" },
    { id: "d12", category: "drinks", name: "Fresh Sohphie Juice", desc: "Local passion fruit, chilled.", price: 60, prepMinutes: 5, status: "available", featured: true, icon: "cup" },
  ],
};

const STEPS = [
  { key: "waiting", label: "Waiting for Restaurant" },
  { key: "accepted", label: "Accepted" },
  { key: "payment_pending", label: "Payment Pending" },
  { key: "payment_verified", label: "Payment Verified" },
  { key: "preparing", label: "Preparing Food" },
  { key: "ready", label: "Ready for Pickup" },
  { key: "completed", label: "Completed" },
];

const QUICK_TAGS = ["Less spicy", "Extra spicy", "No onion", "Add spoon", "Arriving late"];

function genOrderId() {
  return "KC-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 5).toUpperCase();
}

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
async function getPersonal(key, fallback) {
  try {
    const r = await window.storage.get(key, false);
    return r ? JSON.parse(r.value) : fallback;
  } catch (e) {
    return fallback;
  }
}
async function setPersonal(key, value) {
  try {
    await window.storage.set(key, JSON.stringify(value), false);
  } catch (e) {
    console.error("storage set failed", e);
  }
}

function DishIcon({ kind }) {
  const stroke = "var(--moss)";
  if (kind === "bamboo") {
    return (
      <svg viewBox="0 0 64 64" width="100%" height="100%">
        <rect x="20" y="6" width="24" height="52" rx="7" fill="none" stroke={stroke} strokeWidth="2.5" />
        <line x1="20" y1="22" x2="44" y2="22" stroke={stroke} strokeWidth="2.5" />
        <line x1="20" y1="40" x2="44" y2="40" stroke={stroke} strokeWidth="2.5" />
        <path d="M25 12 q7 4 14 0" fill="none" stroke={stroke} strokeWidth="1.5" opacity="0.6" />
      </svg>
    );
  }
  if (kind === "thali") {
    return (
      <svg viewBox="0 0 64 64" width="100%" height="100%">
        <circle cx="32" cy="32" r="24" fill="none" stroke={stroke} strokeWidth="2.5" />
        <circle cx="32" cy="32" r="9" fill="none" stroke={stroke} strokeWidth="2" opacity="0.7" />
        <circle cx="20" cy="20" r="4" fill="none" stroke={stroke} strokeWidth="1.8" opacity="0.6" />
        <circle cx="46" cy="18" r="3.5" fill="none" stroke={stroke} strokeWidth="1.8" opacity="0.6" />
        <circle cx="47" cy="44" r="4" fill="none" stroke={stroke} strokeWidth="1.8" opacity="0.6" />
      </svg>
    );
  }
  if (kind === "momo") {
    return (
      <svg viewBox="0 0 64 64" width="100%" height="100%">
        <path d="M12 30 Q32 14 52 30 Q46 46 32 48 Q18 46 12 30 Z" fill="none" stroke={stroke} strokeWidth="2.5" />
        <path d="M32 16 L32 20" stroke={stroke} strokeWidth="2" />
        <path d="M24 18 L26 22" stroke={stroke} strokeWidth="1.5" opacity="0.7" />
        <path d="M40 18 L38 22" stroke={stroke} strokeWidth="1.5" opacity="0.7" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%">
      <path d="M18 24 h20 v18 a10 10 0 0 1 -10 10 h0 a10 10 0 0 1 -10 -10 Z" fill="none" stroke={stroke} strokeWidth="2.5" />
      <path d="M38 28 h6 a6 6 0 0 1 0 12 h-4" fill="none" stroke={stroke} strokeWidth="2.2" />
      <path d="M22 14 q3 4 0 8" fill="none" stroke={stroke} strokeWidth="1.5" opacity="0.6" />
      <path d="M29 14 q3 4 0 8" fill="none" stroke={stroke} strokeWidth="1.5" opacity="0.6" />
    </svg>
  );
}

function StatusBadge({ status }) {
  const map = {
    available: null,
    unavailable: { text: "Unavailable", bg: "var(--stone)", color: "var(--ink)" },
    soldout: { text: "Sold Out", bg: "var(--stone)", color: "var(--ink)" },
  };
  const m = map[status];
  if (!m) return null;
  return (
    <span style={{ background: m.bg, color: m.color }} className="text-[11px] font-semibold tracking-wide px-2 py-0.5 rounded-full uppercase">
      {m.text}
    </span>
  );
}

export default function App() {
  const [menu, setMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState({}); // dishId -> qty
  const [view, setView] = useState("home"); // home | cart | checkout | tracking
  const [customer, setCustomer] = useState({ name: "", mobile: "", instructions: "" });
  const [order, setOrder] = useState(null);
  const [requestText, setRequestText] = useState("");
  const pollRef = useRef(null);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Work+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap";
    document.head.appendChild(link);
    return () => { try { document.head.removeChild(link); } catch (e) {} };
  }, []);

  useEffect(() => {
    (async () => {
      let m = await getShared(MENU_KEY, null);
      if (!m) {
        m = DEFAULT_MENU;
        await setShared(MENU_KEY, m);
      }
      setMenu(m);
      const activeId = await getPersonal("active-order-id", null);
      if (activeId) {
        const o = await getShared("order:" + activeId, null);
        if (o && o.status !== "completed" && o.status !== "cancelled") {
          setOrder(o);
          setView("tracking");
        }
      }
      setLoading(false);
    })();
  }, []);

  // poll active order for status changes
  useEffect(() => {
    if (view !== "tracking" || !order) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(async () => {
      const fresh = await getShared("order:" + order.id, null);
      if (fresh) setOrder(fresh);
    }, 4000);
    return () => clearInterval(pollRef.current);
  }, [view, order && order.id]);

  const dishById = useMemo(() => {
    const map = {};
    if (menu) menu.dishes.forEach((d) => (map[d.id] = d));
    return map;
  }, [menu]);

  const filteredDishes = useMemo(() => {
    if (!menu) return [];
    return menu.dishes.filter((d) => {
      if (activeCategory !== "all" && d.category !== activeCategory) return false;
      if (search.trim() && !d.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
      return true;
    });
  }, [menu, activeCategory, search]);

  const cartItems = useMemo(() => {
    return Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => ({ dish: dishById[id], qty }))
      .filter((c) => c.dish);
  }, [cart, dishById]);

  const cartCount = cartItems.reduce((s, c) => s + c.qty, 0);
  const cartTotal = cartItems.reduce((s, c) => s + c.qty * c.dish.price, 0);
  const estPrep = cartItems.length ? Math.max(...cartItems.map((c) => c.dish.prepMinutes)) + 5 : 0;

  const addQty = (id, delta) => {
    setCart((prev) => {
      const next = { ...prev };
      const cur = next[id] || 0;
      const nv = Math.max(0, cur + delta);
      if (nv === 0) delete next[id];
      else next[id] = nv;
      return next;
    });
  };

  const submitOrder = async () => {
    if (!customer.name.trim() || !customer.mobile.trim()) return;
    const id = genOrderId();
    const newOrder = {
      id,
      items: cartItems.map((c) => ({ dishId: c.dish.id, name: c.dish.name, price: c.dish.price, qty: c.qty })),
      total: cartTotal,
      estPrepMinutes: estPrep,
      customer: { name: customer.name.trim(), mobile: customer.mobile.trim(), instructions: customer.instructions.trim() },
      status: "waiting",
      rejectReason: null,
      requests: [],
      createdAt: new Date().toISOString(),
      statusHistory: [{ status: "waiting", at: new Date().toISOString() }],
    };
    await setShared("order:" + id, newOrder);
    await setPersonal("active-order-id", id);
    setOrder(newOrder);
    setCart({});
    setView("tracking");
  };

  const sendRequest = async (text) => {
    if (!text.trim() || !order) return;
    const fresh = await getShared("order:" + order.id, order);
    const req = { id: genOrderId(), text: text.trim(), status: "pending", reply: null, createdAt: new Date().toISOString() };
    const updated = { ...fresh, requests: [...(fresh.requests || []), req] };
    await setShared("order:" + order.id, updated);
    setOrder(updated);
    setRequestText("");
  };

  const startNewOrder = async () => {
    await setPersonal("active-order-id", null);
    setOrder(null);
    setView("home");
  };

  if (loading) {
    return (
      <div style={{ background: "var(--paper)" }} className="min-h-screen flex items-center justify-center">
        <Style />
        <div className="text-center">
          <div className="w-10 h-10 mx-auto mb-3 rounded-full border-2 animate-spin" style={{ borderColor: "var(--stone)", borderTopColor: "var(--moss)" }} />
          <p style={{ fontFamily: "var(--font-body)", color: "var(--ink)" }} className="text-sm opacity-70">Loading menu…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "var(--paper)", minHeight: "100vh" }}>
      <Style />
      <Header cartCount={cartCount} onCartClick={() => setView("cart")} showCart={view === "home"} />

      {view === "home" && (
        <HomeView
          menu={menu}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          search={search}
          setSearch={setSearch}
          dishes={filteredDishes}
          cart={cart}
          addQty={addQty}
          cartCount={cartCount}
          cartTotal={cartTotal}
          onViewCart={() => setView("cart")}
        />
      )}

      {view === "cart" && (
        <CartView
          items={cartItems}
          addQty={addQty}
          total={cartTotal}
          estPrep={estPrep}
          onBack={() => setView("home")}
          onCheckout={() => setView("checkout")}
        />
      )}

      {view === "checkout" && (
        <CheckoutView
          customer={customer}
          setCustomer={setCustomer}
          items={cartItems}
          total={cartTotal}
          onBack={() => setView("cart")}
          onSubmit={submitOrder}
        />
      )}

      {view === "tracking" && order && (
        <TrackingView
          order={order}
          requestText={requestText}
          setRequestText={setRequestText}
          sendRequest={sendRequest}
          onNewOrder={startNewOrder}
        />
      )}
    </div>
  );
}

function Style() {
  return (
    <style>{`
      :root {
        --ink: #16241F;
        --paper: #F3F0E6;
        --moss: #2F5D50;
        --moss-dark: #1F4038;
        --spring: #2FA98C;
        --bamboo: #C79A3C;
        --stone: #DCD6C5;
        --card: #FBF9F2;
        --danger: #B3452F;
        --font-display: 'Fraunces', serif;
        --font-body: 'Work Sans', sans-serif;
        --font-mono: 'IBM Plex Mono', monospace;
      }
      * { font-family: var(--font-body); }
      .font-display { font-family: var(--font-display); }
      .font-mono { font-family: var(--font-mono); }
      button { cursor: pointer; }
      button:focus-visible, input:focus-visible, textarea:focus-visible {
        outline: 2px solid var(--spring); outline-offset: 2px;
      }
      @media (prefers-reduced-motion: reduce) {
        * { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; }
      }
      .contour {
        height: 14px;
        background-image: repeating-radial-gradient(circle at 0 100%, transparent 0, transparent 8px, var(--stone) 9px, transparent 10px);
        opacity: 0.5;
      }
    `}</style>
  );
}

function Header({ cartCount, onCartClick, showCart }) {
  return (
    <div style={{ background: "var(--moss)" }} className="sticky top-0 z-20 shadow-sm">
      <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
        <div>
          <div className="font-display text-white text-lg leading-tight" style={{ fontWeight: 600 }}>Krem Chympe</div>
          <div className="text-[11px] uppercase tracking-widest" style={{ color: "var(--stone)" }}>Food Pickup Counter</div>
        </div>
        {showCart && cartCount > 0 && (
          <button onClick={onCartClick} className="relative flex items-center gap-1.5 px-3 py-2 rounded-full" style={{ background: "var(--spring)" }}>
            <CartIcon />
            <span className="text-white text-sm font-semibold font-mono">{cartCount}</span>
          </button>
        )}
      </div>
    </div>
  );
}

function CartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
      <circle cx="9" cy="21" r="1.2" fill="white" stroke="none" />
      <circle cx="18" cy="21" r="1.2" fill="white" stroke="none" />
      <path d="M2 3h2l2.6 12.6a2 2 0 0 0 2 1.6h8a2 2 0 0 0 2-1.6L21 7H6" />
    </svg>
  );
}

function HomeView({ menu, activeCategory, setActiveCategory, search, setSearch, dishes, cart, addQty, cartCount, cartTotal, onViewCart }) {
  return (
    <div className="max-w-md mx-auto pb-28">
      <div className="px-4 pt-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search dishes…"
          style={{ background: "var(--card)", borderColor: "var(--stone)", color: "var(--ink)" }}
          className="w-full px-4 py-2.5 rounded-xl border text-sm"
        />
      </div>

      <div className="px-4 pt-3 flex gap-2 overflow-x-auto no-scrollbar">
        <CategoryChip label="All" active={activeCategory === "all"} onClick={() => setActiveCategory("all")} />
        {menu.categories.map((c) => (
          <CategoryChip key={c.id} label={c.name} active={activeCategory === c.id} onClick={() => setActiveCategory(c.id)} />
        ))}
      </div>

      <div className="contour mt-4 mx-4" />

      <div className="px-4 pt-4 grid grid-cols-1 gap-3">
        {dishes.map((d) => (
          <DishCard key={d.id} dish={d} qty={cart[d.id] || 0} onAdd={(delta) => addQty(d.id, delta)} />
        ))}
        {dishes.length === 0 && (
          <p className="text-sm opacity-60 text-center py-10" style={{ color: "var(--ink)" }}>No dishes match your search.</p>
        )}
      </div>

      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-20">
          <div className="max-w-md mx-auto px-4 pb-4">
            <button
              onClick={onViewCart}
              style={{ background: "var(--moss-dark)" }}
              className="w-full rounded-2xl px-4 py-3.5 flex items-center justify-between text-white shadow-lg"
            >
              <span className="text-sm font-semibold">{cartCount} item{cartCount > 1 ? "s" : ""} · ₹{cartTotal}</span>
              <span className="text-sm font-semibold flex items-center gap-1">View Cart →</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryChip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? "var(--moss)" : "var(--card)",
        color: active ? "white" : "var(--ink)",
        borderColor: "var(--stone)",
      }}
      className="whitespace-nowrap px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors"
    >
      {label}
    </button>
  );
}

function DishCard({ dish, qty, onAdd }) {
  const disabled = dish.status !== "available";
  return (
    <div
      style={{ background: "var(--card)", borderColor: "var(--stone)", opacity: disabled ? 0.55 : 1 }}
      className="rounded-2xl border p-3 flex gap-3"
    >
      <div style={{ background: "var(--paper)" }} className="w-16 h-16 rounded-xl p-2.5 shrink-0">
        <DishIcon kind={dish.icon} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-[15px] leading-tight" style={{ color: "var(--ink)", fontWeight: 600 }}>{dish.name}</h3>
          {dish.featured && !disabled && (
            <span style={{ background: "var(--bamboo)", color: "white" }} className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0">Featured</span>
          )}
        </div>
        <p className="text-[12.5px] mt-0.5 leading-snug opacity-70" style={{ color: "var(--ink)" }}>{dish.desc}</p>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold" style={{ color: "var(--moss-dark)" }}>₹{dish.price}</span>
            <StatusBadge status={dish.status} />
          </div>
          {!disabled && (
            qty === 0 ? (
              <button onClick={() => onAdd(1)} style={{ background: "var(--moss)" }} className="text-white text-xs font-semibold px-3 py-1.5 rounded-lg">
                Add
              </button>
            ) : (
              <div style={{ background: "var(--moss)" }} className="flex items-center gap-2.5 rounded-lg px-1">
                <button onClick={() => onAdd(-1)} className="text-white w-6 h-7 text-base font-bold">−</button>
                <span className="text-white text-sm font-mono font-semibold">{qty}</span>
                <button onClick={() => onAdd(1)} className="text-white w-6 h-7 text-base font-bold">+</button>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function CartView({ items, addQty, total, estPrep, onBack, onCheckout }) {
  return (
    <div className="max-w-md mx-auto pb-28 px-4 pt-4">
      <button onClick={onBack} className="text-sm font-medium mb-3 flex items-center gap-1" style={{ color: "var(--moss-dark)" }}>← Back to menu</button>
      <h2 className="font-display text-xl mb-3" style={{ color: "var(--ink)", fontWeight: 600 }}>Your Cart</h2>

      {items.length === 0 ? (
        <p className="text-sm opacity-60 py-10 text-center" style={{ color: "var(--ink)" }}>Your cart is empty.</p>
      ) : (
        <div className="space-y-2.5">
          {items.map(({ dish, qty }) => (
            <div key={dish.id} style={{ background: "var(--card)", borderColor: "var(--stone)" }} className="rounded-xl border p-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium" style={{ color: "var(--ink)" }}>{dish.name}</div>
                <div className="font-mono text-xs opacity-70 mt-0.5">₹{dish.price} each</div>
              </div>
              <div className="flex items-center gap-3">
                <div style={{ background: "var(--moss)" }} className="flex items-center gap-2 rounded-lg px-1">
                  <button onClick={() => addQty(dish.id, -1)} className="text-white w-6 h-7 font-bold">−</button>
                  <span className="text-white text-sm font-mono font-semibold">{qty}</span>
                  <button onClick={() => addQty(dish.id, 1)} className="text-white w-6 h-7 font-bold">+</button>
                </div>
                <span className="font-mono text-sm font-semibold w-14 text-right" style={{ color: "var(--moss-dark)" }}>₹{dish.price * qty}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <>
          <div className="mt-5 pt-4 space-y-1.5" style={{ borderTop: "1px solid var(--stone)" }}>
            <div className="flex justify-between text-sm" style={{ color: "var(--ink)" }}>
              <span className="opacity-70">Estimated preparation</span>
              <span className="font-mono">~{estPrep} min</span>
            </div>
            <div className="flex justify-between text-base font-semibold" style={{ color: "var(--ink)" }}>
              <span>Total</span>
              <span className="font-mono">₹{total}</span>
            </div>
          </div>
          <button onClick={onCheckout} style={{ background: "var(--moss-dark)" }} className="w-full mt-5 rounded-2xl py-3.5 text-white font-semibold text-sm">
            Continue
          </button>
        </>
      )}
    </div>
  );
}

function CheckoutView({ customer, setCustomer, items, total, onBack, onSubmit }) {
  const valid = customer.name.trim() && customer.mobile.trim().length >= 7;
  return (
    <div className="max-w-md mx-auto pb-16 px-4 pt-4">
      <button onClick={onBack} className="text-sm font-medium mb-3" style={{ color: "var(--moss-dark)" }}>← Back to cart</button>
      <h2 className="font-display text-xl mb-1" style={{ color: "var(--ink)", fontWeight: 600 }}>Your Details</h2>
      <p className="text-xs opacity-60 mb-4" style={{ color: "var(--ink)" }}>We only need enough to call your name at pickup.</p>

      <div className="space-y-3">
        <Field label="Full Name">
          <input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} placeholder="e.g. Bhakti Sen" style={inputStyle} className="w-full px-3.5 py-2.5 rounded-xl border text-sm" />
        </Field>
        <Field label="Mobile Number">
          <input value={customer.mobile} onChange={(e) => setCustomer({ ...customer, mobile: e.target.value })} placeholder="e.g. 98765 43210" style={inputStyle} className="w-full px-3.5 py-2.5 rounded-xl border text-sm" inputMode="tel" />
        </Field>
        <Field label="Special Instructions (optional)">
          <textarea value={customer.instructions} onChange={(e) => setCustomer({ ...customer, instructions: e.target.value })} placeholder="e.g. one thali less spicy" rows={2} style={inputStyle} className="w-full px-3.5 py-2.5 rounded-xl border text-sm resize-none" />
        </Field>
      </div>

      <div style={{ background: "var(--card)", borderColor: "var(--stone)" }} className="rounded-xl border p-3 mt-4">
        <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--moss-dark)" }}>Pickup Location</div>
        <div className="text-sm" style={{ color: "var(--ink)" }}>Krem Chympe Waterfall Food Pickup Counter</div>
      </div>

      <div className="mt-4 pt-4 flex justify-between text-base font-semibold" style={{ borderTop: "1px solid var(--stone)", color: "var(--ink)" }}>
        <span>{items.length} item{items.length > 1 ? "s" : ""}</span>
        <span className="font-mono">₹{total}</span>
      </div>

      <button
        disabled={!valid}
        onClick={onSubmit}
        style={{ background: valid ? "var(--moss-dark)" : "var(--stone)" }}
        className="w-full mt-5 rounded-2xl py-3.5 text-white font-semibold text-sm disabled:cursor-not-allowed"
      >
        Send Order to Restaurant
      </button>
    </div>
  );
}

const inputStyle = { background: "var(--card)", borderColor: "var(--stone)", color: "var(--ink)" };

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs font-medium block mb-1 opacity-70" style={{ color: "var(--ink)" }}>{label}</label>
      {children}
    </div>
  );
}

function TrackingView({ order, requestText, setRequestText, sendRequest, onNewOrder }) {
  const isCancelled = order.status === "cancelled";
  const isRejected = order.status === "rejected";
  const currentIndex = STEPS.findIndex((s) => s.key === order.status);

  return (
    <div className="max-w-md mx-auto pb-16 px-4 pt-5">
      <div className="text-center mb-5">
        <div className="text-xs font-mono opacity-60" style={{ color: "var(--ink)" }}>Order {order.id}</div>
        <h2 className="font-display text-xl mt-1" style={{ color: "var(--ink)", fontWeight: 600 }}>
          {isCancelled ? "Order Cancelled" : isRejected ? "Order Declined" : "Tracking Your Order"}
        </h2>
      </div>

      {(isRejected || isCancelled) ? (
        <div style={{ background: "var(--card)", borderColor: "var(--danger)" }} className="rounded-xl border p-4 text-sm" >
          <p style={{ color: "var(--danger)" }} className="font-medium">
            {order.rejectReason || "The restaurant was unable to take this order."}
          </p>
        </div>
      ) : (
        <BambooStepper currentIndex={currentIndex} />
      )}

      <div style={{ background: "var(--card)", borderColor: "var(--stone)" }} className="rounded-xl border p-3.5 mt-5">
        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--moss-dark)" }}>Order Summary</div>
        {order.items.map((it) => (
          <div key={it.dishId} className="flex justify-between text-sm py-0.5" style={{ color: "var(--ink)" }}>
            <span>{it.qty}× {it.name}</span>
            <span className="font-mono">₹{it.price * it.qty}</span>
          </div>
        ))}
        <div className="flex justify-between text-sm font-semibold mt-2 pt-2" style={{ borderTop: "1px solid var(--stone)", color: "var(--ink)" }}>
          <span>Total</span>
          <span className="font-mono">₹{order.total}</span>
        </div>
      </div>

      {!isCancelled && !isRejected && (
        <div style={{ background: "var(--card)", borderColor: "var(--stone)" }} className="rounded-xl border p-3.5 mt-3">
          <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--moss-dark)" }}>Correction or Request</div>
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {QUICK_TAGS.map((t) => (
              <button key={t} onClick={() => sendRequest(t)} style={{ background: "var(--paper)", borderColor: "var(--stone)", color: "var(--ink)" }} className="text-xs px-2.5 py-1 rounded-full border">
                {t}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={requestText}
              onChange={(e) => setRequestText(e.target.value)}
              placeholder="Type a message…"
              style={inputStyle}
              className="flex-1 px-3 py-2 rounded-lg border text-sm"
            />
            <button onClick={() => sendRequest(requestText)} style={{ background: "var(--moss)" }} className="text-white text-sm font-medium px-3.5 rounded-lg">Send</button>
          </div>

          {order.requests && order.requests.length > 0 && (
            <div className="mt-3 space-y-2">
              {order.requests.slice().reverse().map((r) => (
                <div key={r.id} className="text-sm">
                  <div style={{ color: "var(--ink)" }}>“{r.text}”</div>
                  <div className="text-xs mt-0.5 font-medium" style={{ color: r.status === "accepted" ? "var(--spring)" : r.status === "rejected" ? "var(--danger)" : "var(--bamboo)" }}>
                    {r.status === "pending" ? "Waiting for restaurant" : r.status === "accepted" ? "Accepted" : "Declined"}{r.reply ? ` — ${r.reply}` : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {(order.status === "completed" || isCancelled || isRejected) && (
        <button onClick={onNewOrder} style={{ background: "var(--moss-dark)" }} className="w-full mt-5 rounded-2xl py-3.5 text-white font-semibold text-sm">
          Start a New Order
        </button>
      )}
    </div>
  );
}

function BambooStepper({ currentIndex }) {
  return (
    <div style={{ background: "var(--card)", borderColor: "var(--stone)" }} className="rounded-xl border p-4">
      {STEPS.map((s, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        const future = i > currentIndex;
        return (
          <div key={s.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                style={{
                  background: done ? "var(--moss)" : active ? "var(--spring)" : "var(--stone)",
                  boxShadow: active ? "0 0 0 4px rgba(47,169,140,0.18)" : "none",
                }}
                className={`w-3.5 h-3.5 rounded-full shrink-0 ${active ? "animate-pulse" : ""}`}
              />
              {i < STEPS.length - 1 && (
                <div style={{ background: done ? "var(--moss)" : "var(--stone)" }} className="w-0.5 flex-1 min-h-[22px]" />
              )}
            </div>
            <div className="pb-4 -mt-0.5">
              <div className="text-sm font-medium" style={{ color: future ? "var(--ink)" : "var(--ink)", opacity: future ? 0.45 : 1 }}>
                {s.label}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
