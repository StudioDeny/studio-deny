import type { CartItem } from "@/context/CartContext";
import { supabase } from "@/lib/supabase";

export type OrderStatus =
  | "PLACED"
  | "PACKED"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED";

export type InvoiceLine = { label: string; amount: number };

export type Order = {
  id: string;
  order_number: string;
  invoiceNo: string;
  userEmail: string;
  items: { slug: string; name: string; image: string; size: string; qty: number; price: number; variantId?: string }[];
  subtotal: number;
  shipping: number;
  taxRate: number;
  tax: number;
  discount: number;
  extraLines: InvoiceLine[];
  total: number;
  status: OrderStatus;
  address: { name: string; phone: string; line1: string; city: string; state: string; pincode: string };
  paymentId: string;
  payment_method?: "razorpay" | "cod";
  cod_advance_paid?: boolean;
  cod_advance_amount?: number;
  notes?: string;
  refundAmount?: number;
  refundedAt?: number;
  cancelledAt?: number;
  createdAt: number;
};

const KEY = "sd_orders";

const read = (): Order[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw: any[] = JSON.parse(localStorage.getItem(KEY) || "[]");
    return raw.map((o) => ({
      invoiceNo: o.invoiceNo ?? "INV-" + o.id,
      order_number: o.order_number ?? o.id,
      taxRate: o.taxRate ?? 0,
      tax: o.tax ?? 0,
      discount: o.discount ?? 0,
      extraLines: o.extraLines ?? [],
      payment_method: o.payment_method ?? "razorpay",
      ...o,
    }));
  } catch { return []; }
};
const write = (orders: Order[]) => {
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(orders));
};

export const listOrders = read;
export const ordersFor = (email: string) => read().filter((o) => o.userEmail === email);
export const getOrder = (id: string) => read().find((o) => o.id === id);

export const recomputeTotal = (o: Order): number => {
  const tax = Math.round((o.subtotal * (o.taxRate || 0)) / 100);
  const extras = (o.extraLines || []).reduce((s, l) => s + l.amount, 0);
  return Math.max(0, o.subtotal + o.shipping + tax + extras - (o.discount || 0));
};

function generateOrderNumber(): string {
  const hex = Math.floor(Math.random() * 0xffffffff)
    .toString(16)
    .toUpperCase()
    .padStart(8, "0");
  return `SD-${hex}`;
}

export const createOrder = (params: {
  email: string;
  items: CartItem[];
  shipping: number;
  address: Order["address"];
  paymentId: string;
  discount?: number;
  payment_method?: Order["payment_method"];
  cod_advance_paid?: boolean;
  cod_advance_amount?: number;
}): Order => {
  const subtotal = params.items.reduce((s, i) => s + i.qty * i.product.price, 0);
  const id = "SD" + Date.now().toString(36).toUpperCase();
  const order_number = generateOrderNumber();
  const discount = params.discount ?? 0;
  const order: Order = {
    id,
    order_number,
    invoiceNo: "INV-" + order_number,
    userEmail: params.email,
    items: params.items.map((i) => ({
      slug: i.product.slug, name: i.product.name, image: i.product.image,
      size: i.size, qty: i.qty, price: i.product.price,
      variantId: i.variantId,
    })),
    subtotal,
    shipping: params.shipping,
    taxRate: 0,
    tax: 0,
    discount,
    extraLines: [],
    total: Math.max(0, subtotal - discount + params.shipping),
    status: "PLACED",
    address: params.address,
    paymentId: params.paymentId,
    payment_method: params.payment_method ?? "razorpay",
    cod_advance_paid: params.cod_advance_paid,
    cod_advance_amount: params.cod_advance_amount,
    createdAt: Date.now(),
  };
  write([order, ...read()]);

  // Fire-and-forget write to Supabase order_items
  supabase.from("order_items").insert(
    params.items.map((i) => ({
      order_id: order.id,
      product_id: i.product.slug,
      variant_id: i.variantId ?? null,
      size: i.size,
      qty: i.qty,
      unit_price: i.product.price,
      total_price: i.qty * i.product.price,
    }))
  ).then(({ error }) => {
    if (error) console.warn("order_items sync:", error.message);
  });

  return order;
};

export const updateOrderStatus = (id: string, status: OrderStatus) => {
  write(read().map((o) => (o.id === id ? { ...o, status } : o)));
};

export const cancelOrder = (id: string) => {
  write(read().map((o) => (o.id === id ? { ...o, status: "CANCELLED" as OrderStatus, cancelledAt: Date.now() } : o)));
};

export const refundOrder = (id: string, amount?: number) => {
  write(read().map((o) => {
    if (o.id !== id) return o;
    return { ...o, status: "REFUNDED" as OrderStatus, refundAmount: amount ?? o.total, refundedAt: Date.now() };
  }));
};

export const updateInvoice = (id: string, patch: Partial<Order>) => {
  write(read().map((o) => {
    if (o.id !== id) return o;
    const next = { ...o, ...patch };
    next.tax = Math.round((next.subtotal * (next.taxRate || 0)) / 100);
    next.total = recomputeTotal(next);
    return next;
  }));
};
