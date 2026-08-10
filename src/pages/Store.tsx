import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "@/lib/router-compat";
import {
  ArrowRight, BadgeCheck, Banknote, CheckCircle2, ChevronDown, Clock3,
  Minus, Package, Plus, Search, ShoppingBag, ShoppingCart, Star,
  Store as StoreIcon, Truck, X, Shield,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";

type Product = {
  id: string; name: string; description: string; category: string; price: string;
  stock: number; brand: string; imageUrl: string; rating: string; reviewCount: number;
  prescriptionRequired: number;
};
type CartItem = Product & { quantity: number };
type Order = {
  id: string; orderNo: string; fulfillmentType: string; pickupBranch?: string | null; deliveryAddress?: string | null;
  deliveryFee: string; subtotal: string; total: string; status: string;
  trackingNo?: string | null; estimatedDelivery?: string | null; receivedAt?: string | null; createdAt: string;
  items: Array<{ productName: string; brand: string; unitPrice: string; quantity: number; lineTotal: string }>;
};
type StoreNotification = { id: string; title: string; message: string; kind: string; createdAt: string };

const money = (value: number | string) => `₱${Number(value).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const statusStyles: Record<string, string> = {
  Pending: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  Preparing: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  "Ready for Pickup": "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  "Out for Delivery": "bg-violet-500/10 text-violet-700 border-violet-500/20",
  Delivered: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  Completed: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
};

function StatusPill({ status }: { status: string }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyles[status] ?? "bg-muted text-muted-foreground border-border"}`}><CheckCircle2 className="h-3.5 w-3.5" />{status}</span>;
}

function ProductCard({ product, onAdd }: { product: Product; onAdd: (product: Product) => void }) {
  const out = product.stock === 0;
  return (
    <article className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative aspect-[4/3] overflow-hidden bg-accent/50">
        <img src={product.imageUrl} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {product.prescriptionRequired === 1 && <span className="rounded-full bg-white/90 px-2 py-1 text-[10px] font-bold text-primary shadow-sm">DEMO RX</span>}
          {product.stock < 10 && !out && <span className="rounded-full bg-amber-50/95 px-2 py-1 text-[10px] font-bold text-amber-700 shadow-sm">LOW STOCK</span>}
        </div>
      </div>
      <div className="space-y-3 p-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">{product.brand}</p>
          <h3 className="mt-1 min-h-11 font-semibold leading-5 text-foreground">{product.name}</h3>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{product.description}</p>
        </div>
        <div className="flex items-center gap-1 text-xs text-amber-600"><Star className="h-3.5 w-3.5 fill-current" /> {product.rating} <span className="text-muted-foreground">({product.reviewCount})</span></div>
        <div className="flex items-center justify-between gap-2">
          <div><p className="text-lg font-bold text-foreground">{money(product.price)}</p><p className="text-[11px] text-muted-foreground">{out ? "Out of stock" : `${product.stock} available`}</p></div>
          <button disabled={out} onClick={() => onAdd(product)} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"><Plus className="h-4 w-4" />Add</button>
        </div>
      </div>
    </article>
  );
}

export default function Store() {
  const [, setLocation] = useLocation();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [branches, setBranches] = useState<Array<{ id: string; name: string; address: string; hours: string }>>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<StoreNotification[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All products");
  const [activeTab, setActiveTab] = useState<"shop" | "orders">("shop");
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<Order | null>(null);
  const [fulfillment, setFulfillment] = useState<"pickup" | "delivery">("pickup");
  const [pickupBranch, setPickupBranch] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [confirmingReceipt, setConfirmingReceipt] = useState<string | null>(null);

  useEffect(() => {
    const loadStore = () => Promise.all([apiClient.getStoreProducts(), apiClient.getStoreOrders(), apiClient.getStoreNotifications()]).then(([productResult, orderResult, notificationResult]) => {
      if (productResult.data) {
        setProducts(productResult.data.products as Product[]);
        setCategories(productResult.data.categories);
        setBranches(productResult.data.branches ?? []);
        if (!pickupBranch && productResult.data.branches?.[0]) setPickupBranch(productResult.data.branches[0].id);
      }
      else toast.error(productResult.error ?? "Could not load the Medical Store.");
      if (orderResult.data) setOrders(orderResult.data.orders as Order[]);
      if (notificationResult.data) setNotifications(notificationResult.data.notifications as StoreNotification[]);
    }).finally(() => setLoading(false));
    loadStore();
    const interval = window.setInterval(loadStore, 15000);
    return () => window.clearInterval(interval);
  }, []);

  const filteredProducts = useMemo(() => products.filter(product =>
    (category === "All products" || product.category === category) &&
    `${product.name} ${product.brand} ${product.description}`.toLowerCase().includes(search.toLowerCase()),
  ), [products, search, category]);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
  const deliveryFee = fulfillment === "delivery" ? (subtotal >= 1500 ? 0 : 120) : 0;
  const total = subtotal + deliveryFee;

  const addToCart = (product: Product) => {
    setCart(prev => {
      const current = prev.find(item => item.id === product.id);
      if (current) return prev.map(item => item.id === product.id ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) } : item);
      return [...prev, { ...product, quantity: 1 }];
    });
    toast.success(`${product.name} added to cart`, { duration: 1800 });
  };
  const setQuantity = (id: string, quantity: number) => setCart(prev => prev.map(item => item.id === id ? { ...item, quantity } : item).filter(item => item.quantity > 0));
  const placeOrder = async () => {
    if (!cart.length) return;
    if (fulfillment === "delivery" && address.trim().length < 10) { toast.error("Enter a complete delivery address."); return; }
    if (fulfillment === "pickup" && !pickupBranch) { toast.error("Choose a pickup branch."); return; }
    setPlacing(true);
    const result = await apiClient.createStoreOrder({
      items: cart.map(item => ({ productId: item.id, quantity: item.quantity })),
      fulfillmentType: fulfillment,
      deliveryAddress: fulfillment === "delivery" ? address : undefined,
      pickupBranch: fulfillment === "pickup" ? pickupBranch : undefined,
    });
    setPlacing(false);
    if (result.error || !result.data) { toast.error(result.error ?? "Could not place your order."); return; }
    const order = result.data.order as Order;
    setOrders(prev => [order, ...prev]); setProducts(prev => prev.map(product => { const item = cart.find(cartItem => cartItem.id === product.id); return item ? { ...product, stock: product.stock - item.quantity } : product; }));
    setCart([]); setCheckoutOpen(false); setCartOpen(false); setConfirmation(order); setActiveTab("orders");
    toast.success("Order placed successfully");
  };
  const confirmReceipt = async (order: Order) => {
    setConfirmingReceipt(order.id);
    const result = await apiClient.confirmStoreOrderReceived(order.id);
    setConfirmingReceipt(null);
    if (result.error || !result.data) {
      toast.error(result.error ?? "Could not confirm receipt.");
      return;
    }
    setOrders(prev => prev.map(item => item.id === order.id ? { ...item, ...(result.data!.order as Order) } : item));
    toast.success("Order receipt confirmed");
  };

  if (loading) return <div className="space-y-6 animate-pulse"><div className="h-32 rounded-2xl bg-muted" /><div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[1, 2, 3, 4].map(item => <div key={item} className="h-64 rounded-2xl bg-muted" />)}</div></div>;

  return (
    <div className="space-y-7 pb-8">
      <section className="relative overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/[0.12] via-card to-accent/60 p-6 md:p-8">
        <div className="relative z-10 max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card/80 px-3 py-1.5 text-xs font-semibold text-primary"><ShoppingBag className="h-3.5 w-3.5" />SugboDoc Medical Store</div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Everyday care, delivered with confidence.</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Order trusted health essentials for pickup at the hospital pharmacy or delivery to your door. Prescription products are for demonstration only.</p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1.5"><BadgeCheck className="h-4 w-4 text-primary" />Verified products</span><span className="inline-flex items-center gap-1.5"><Banknote className="h-4 w-4 text-primary" />Secure billing</span><span className="inline-flex items-center gap-1.5"><Package className="h-4 w-4 text-primary" />Order tracking</span></div>
        </div>
        <ShoppingBag className="absolute -bottom-8 -right-4 h-44 w-44 rotate-12 text-primary/10" />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
         <div className="flex flex-wrap gap-2"><div className="flex rounded-xl bg-muted p-1"><button onClick={() => setActiveTab("shop")} className={`rounded-lg px-4 py-2 text-sm font-semibold ${activeTab === "shop" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}>Browse products</button><button onClick={() => setActiveTab("orders")} className={`rounded-lg px-4 py-2 text-sm font-semibold ${activeTab === "orders" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}>Order history <span className="ml-1 text-xs">({orders.length})</span></button></div><button onClick={() => setLocation("/insurance")} className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/15"><Shield className="h-4 w-4" />Insurance Plans</button></div>
        {activeTab === "shop" && <button onClick={() => setCartOpen(true)} className="relative inline-flex min-h-11 items-center gap-2 rounded-xl border border-primary/20 bg-card px-4 py-2 text-sm font-semibold text-primary shadow-sm hover:bg-accent"><ShoppingCart className="h-4 w-4" />Cart{cartCount > 0 && <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{cartCount}</span>}</button>}
      </div>

      {notifications.length > 0 && <section className="rounded-2xl border border-primary/15 bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Recent updates</p><h2 className="mt-1 font-semibold">Your store notifications</h2></div><span className="rounded-full bg-accent px-2 py-1 text-xs font-semibold text-primary">{notifications.length}</span></div>
        <div className="grid gap-2 md:grid-cols-2">
          {notifications.slice(0, 4).map(notification => <div key={notification.id} className="flex gap-3 rounded-xl bg-muted/50 p-3"><div className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary"><Clock3 className="h-4 w-4" /></div><div className="min-w-0"><p className="text-sm font-semibold">{notification.title}</p><p className="mt-0.5 text-xs leading-5 text-muted-foreground">{notification.message}</p></div></div>)}
        </div>
      </section>}

      {activeTab === "shop" ? <section className="space-y-5">
        <div className="flex flex-col gap-3 md:flex-row">
          <label className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search medicines, supplies, vitamins..." className="min-h-11 w-full rounded-xl border border-input bg-card pl-10 pr-4 text-sm outline-none ring-primary transition focus:ring-2" /></label>
          <div className="relative"><select value={category} onChange={event => setCategory(event.target.value)} className="min-h-11 w-full appearance-none rounded-xl border border-input bg-card py-2 pl-4 pr-10 text-sm font-medium outline-none focus:ring-2 focus:ring-primary md:min-w-64"><option>All products</option>{categories.map(item => <option key={item}>{item}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /></div>
        </div>
        {filteredProducts.length ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{filteredProducts.map(product => <ProductCard key={product.id} product={product} onAdd={addToCart} />)}</div> : <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center"><Search className="mx-auto h-9 w-9 text-muted-foreground/50" /><h2 className="mt-3 font-semibold">No products found</h2><p className="mt-1 text-sm text-muted-foreground">Try another search or category.</p></div>}
      </section> : <section className="space-y-4">
          {orders.length ? orders.map(order => <article key={order.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm"><div className="flex flex-col justify-between gap-4 sm:flex-row"><div><div className="flex flex-wrap items-center gap-2"><StatusPill status={order.status} /><span className="font-mono text-xs text-muted-foreground">{order.orderNo}</span></div><p className="mt-2 text-sm text-muted-foreground">{new Date(order.createdAt).toLocaleDateString("en-PH", { dateStyle: "long" })} · {order.fulfillmentType === "pickup" ? `Pickup · ${branches.find(branch => branch.id === order.pickupBranch)?.name ?? order.pickupBranch ?? "Hospital pharmacy"}` : "Home delivery"}</p><div className="mt-3 space-y-1 text-sm">{order.items.map(item => <p key={`${order.id}-${item.productName}`}><span className="font-medium">{item.quantity} × {item.productName}</span> <span className="text-muted-foreground">· {money(item.lineTotal)}</span></p>)}</div></div><div className="text-left sm:text-right"><p className="text-xl font-bold">{money(order.total)}</p><p className="mt-1 text-xs text-muted-foreground">{order.fulfillmentType === "pickup" ? order.estimatedDelivery : `Estimated ${order.estimatedDelivery}`}</p>{order.trackingNo && <p className="mt-3 rounded-lg bg-accent px-2.5 py-2 text-xs font-medium text-primary">Tracking: {order.trackingNo}</p>}{order.status === "Delivered" && <button disabled={confirmingReceipt === order.id} onClick={() => confirmReceipt(order)} className="mt-3 inline-flex min-h-10 items-center justify-center rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60">{confirmingReceipt === order.id ? "Saving..." : "Confirm order received"}</button>}{order.status === "Received" && order.receivedAt && <p className="mt-3 text-xs font-medium text-emerald-700">Received {new Date(order.receivedAt).toLocaleString("en-PH")}</p>}</div></div></article>) : <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center"><Package className="mx-auto h-10 w-10 text-primary/50" /><h2 className="mt-3 font-semibold">No medical store orders yet</h2><p className="mt-1 text-sm text-muted-foreground">Your completed orders and tracking details will appear here.</p><button onClick={() => setActiveTab("shop")} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">Browse the store <ArrowRight className="h-4 w-4" /></button></div>}
      </section>}

      {cartOpen && <div className="fixed inset-0 z-50 bg-black/30" onClick={() => setCartOpen(false)}><aside onClick={event => event.stopPropagation()} className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-card shadow-2xl"><div className="flex items-center justify-between border-b border-border p-5"><div><h2 className="text-lg font-bold">Your cart</h2><p className="text-xs text-muted-foreground">{cartCount} item{cartCount === 1 ? "" : "s"}</p></div><button onClick={() => setCartOpen(false)} className="rounded-lg p-2 hover:bg-muted" aria-label="Close cart"><X className="h-5 w-5" /></button></div>{cart.length ? <><div className="flex-1 space-y-3 overflow-y-auto p-5">{cart.map(item => <div key={item.id} className="flex gap-3 rounded-xl border border-border p-3"><img src={item.imageUrl} alt="" className="h-16 w-16 rounded-lg object-cover" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.name}</p><p className="text-xs text-muted-foreground">{money(item.price)} each</p><div className="mt-2 flex items-center gap-2"><button onClick={() => setQuantity(item.id, item.quantity - 1)} className="rounded-md border p-1" aria-label="Decrease quantity"><Minus className="h-3 w-3" /></button><span className="w-5 text-center text-xs font-bold">{item.quantity}</span><button onClick={() => setQuantity(item.id, Math.min(item.quantity + 1, item.stock))} className="rounded-md border p-1" aria-label="Increase quantity"><Plus className="h-3 w-3" /></button></div></div><button onClick={() => setQuantity(item.id, 0)} className="self-start p-1 text-muted-foreground hover:text-destructive" aria-label={`Remove ${item.name}`}><X className="h-4 w-4" /></button></div>)}</div><div className="space-y-3 border-t border-border p-5"><div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>{money(subtotal)}</span></div><div className="flex justify-between text-sm"><span className="text-muted-foreground">Estimated delivery</span><span>{fulfillment === "delivery" ? (deliveryFee ? money(deliveryFee) : "Free") : "Pickup"}</span></div><div className="flex justify-between border-t border-border pt-3 text-base font-bold"><span>Total</span><span className="text-primary">{money(total)}</span></div><button onClick={() => setCheckoutOpen(true)} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground">Continue to checkout <ArrowRight className="h-4 w-4" /></button></div></> : <div className="flex flex-1 flex-col items-center justify-center p-8 text-center"><ShoppingCart className="h-12 w-12 text-muted-foreground/30" /><p className="mt-3 font-semibold">Your cart is empty</p><p className="mt-1 text-sm text-muted-foreground">Add health essentials to get started.</p></div>}</aside></div>}

      {checkoutOpen && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"><div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-primary">Final step</p><h2 className="mt-1 text-xl font-bold">How should we get it to you?</h2></div><button onClick={() => setCheckoutOpen(false)} className="rounded-lg p-2 hover:bg-muted"><X className="h-5 w-5" /></button></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><button onClick={() => setFulfillment("pickup")} className={`rounded-xl border p-4 text-left ${fulfillment === "pickup" ? "border-primary bg-accent ring-1 ring-primary" : "border-border"}`}><StoreIcon className="h-5 w-5 text-primary" /><p className="mt-2 text-sm font-semibold">Pharmacy pickup</p><p className="mt-1 text-xs text-muted-foreground">Ready within 2 hours. No delivery fee.</p></button><button onClick={() => setFulfillment("delivery")} className={`rounded-xl border p-4 text-left ${fulfillment === "delivery" ? "border-primary bg-accent ring-1 ring-primary" : "border-border"}`}><Truck className="h-5 w-5 text-primary" /><p className="mt-2 text-sm font-semibold">Home delivery</p><p className="mt-1 text-xs text-muted-foreground">Estimated delivery in 2–3 business days.</p></button></div>{fulfillment === "pickup" && <label className="mt-4 block text-sm font-medium">Pickup branch<select value={pickupBranch} onChange={event => setPickupBranch(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary">{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name} · {branch.address}</option>)}</select>{branches.find(branch => branch.id === pickupBranch) && <span className="mt-1 block text-xs font-normal text-muted-foreground">{branches.find(branch => branch.id === pickupBranch)?.hours}</span>}</label>}{fulfillment === "delivery" && <label className="mt-4 block text-sm font-medium">Delivery address<textarea value={address} onChange={event => setAddress(event.target.value)} rows={3} placeholder="House/building, street, barangay, city" className="mt-1.5 w-full resize-none rounded-xl border border-input bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-primary" /></label>}<div className="mt-5 rounded-xl bg-muted/60 p-4 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Items</span><span>{money(subtotal)}</span></div><div className="mt-1 flex justify-between"><span className="text-muted-foreground">Delivery</span><span>{deliveryFee ? money(deliveryFee) : "Free"}</span></div><div className="mt-3 flex justify-between border-t border-border pt-3 text-base font-bold"><span>Total</span><span className="text-primary">{money(total)}</span></div></div><button disabled={placing} onClick={placeOrder} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground disabled:opacity-60">{placing ? "Placing order..." : <>Place order · {money(total)} <ArrowRight className="h-4 w-4" /></>}</button></div></div>}

      {confirmation && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"><div className="w-full max-w-md rounded-2xl border border-border bg-card p-7 text-center shadow-2xl"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600"><CheckCircle2 className="h-8 w-8" /></div><h2 className="mt-4 text-xl font-bold">Order confirmed</h2><p className="mt-1 text-sm text-muted-foreground">Your order has been saved to Order History and a bill was added to Pay Bills.</p><div className="mt-5 rounded-xl bg-accent p-4 text-left"><div className="flex justify-between text-sm"><span className="text-muted-foreground">Order number</span><span className="font-mono font-semibold">{confirmation.orderNo}</span></div><div className="mt-2 flex justify-between text-sm"><span className="text-muted-foreground">Pickup / delivery</span><span className="font-medium">{confirmation.fulfillmentType === "pickup" ? `Pickup · ${branches.find(branch => branch.id === confirmation.pickupBranch)?.name ?? confirmation.pickupBranch ?? "Hospital pharmacy"}` : "Home delivery"}</span></div><div className="mt-2 flex justify-between text-sm"><span className="text-muted-foreground">Status</span><StatusPill status={confirmation.status} /></div></div><div className="mt-5 flex gap-2"><button onClick={() => setConfirmation(null)} className="flex-1 rounded-xl border border-border px-4 py-3 text-sm font-semibold">Continue shopping</button><button onClick={() => { setConfirmation(null); setLocation("/billing"); }} className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground">View Pay Bills</button></div></div></div>}
    </div>
  );
}