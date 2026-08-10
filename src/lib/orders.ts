import type { CartItem } from "@/context/CartContext";
import { supabase } from "@/lib/supabase";
import type { DBOrder } from "@/types/database";

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

function mapRow(row: DBOrder): Order {
  return {
    id: row.id,
    order_number: row.order_number,
    invoiceNo: row.invoice_no ?? "INV-" + row.order_number,
    userEmail: row.user_email,
    items: (row.items as unknown as Order["items"]) ?? [],
    subtotal: Number(row.subtotal),
    shipping: Number(row.shipping),
    taxRate: Number(row.tax_rate),
    tax: Number(row.tax),
    discount: Number(row.discount),
    extraLines: (row.extra_lines as unknown as InvoiceLine[]) ?? [],
    total: Number(row.total),
    status: row.status,
    address: row.address as unknown as Order["address"],
    paymentId: row.payment_id ?? "",
    payment_method: row.payment_method,
    cod_advance_paid: row.cod_advance_paid,
    cod_advance_amount: row.cod_advance_amount != null ? Number(row.cod_advance_amount) : undefined,
    notes: row.notes ?? undefined,
    refundAmount: row.refund_amount != null ? Number(row.refund_amount) : undefined,
    refundedAt: row.refunded_at ? new Date(row.refunded_at).getTime() : undefined,
    cancelledAt: row.cancelled_at ? new Date(row.cancelled_at).getTime() : undefined,
    createdAt: new Date(row.created_at).getTime(),
  };
}

// Partial patch (from admin's invoice editor, which edits a local copy of
// the whole Order then saves it in one shot) → the DB columns it touches.
function patchToRow(patch: Partial<Order>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (patch.invoiceNo !== undefined) row.invoice_no = patch.invoiceNo;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.subtotal !== undefined) row.subtotal = patch.subtotal;
  if (patch.shipping !== undefined) row.shipping = patch.shipping;
  if (patch.taxRate !== undefined) row.tax_rate = patch.taxRate;
  if (patch.tax !== undefined) row.tax = patch.tax;
  if (patch.discount !== undefined) row.discount = patch.discount;
  if (patch.extraLines !== undefined) row.extra_lines = patch.extraLines;
  if (patch.total !== undefined) row.total = patch.total;
  if (patch.notes !== undefined) row.notes = patch.notes;
  if (patch.refundAmount !== undefined) row.refund_amount = patch.refundAmount;
  return row;
}

export async function listOrders(): Promise<Order[]> {
  const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
  if (error) { console.warn("listOrders:", error.message); return []; }
  return (data ?? []).map(mapRow);
}

export async function ordersFor(email: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("user_email", email)
    .order("created_at", { ascending: false });
  if (error) { console.warn("ordersFor:", error.message); return []; }
  return (data ?? []).map(mapRow);
}

export async function getOrder(id: string): Promise<Order | undefined> {
  const { data, error } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
  if (error || !data) return undefined;
  return mapRow(data);
}

export const recomputeTotal = (o: Order): number => {
  const tax = Math.round((o.subtotal * (o.taxRate || 0)) / 100);
  const extras = (o.extraLines || []).reduce((s, l) => s + l.amount, 0);
  return Math.max(0, o.subtotal + o.shipping + tax + extras - (o.discount || 0));
};

export async function createOrder(params: {
  email: string;
  userId?: string;
  items: CartItem[];
  shipping: number;
  address: Order["address"];
  paymentId: string;
  discount?: number;
  payment_method?: Order["payment_method"];
  cod_advance_paid?: boolean;
  cod_advance_amount?: number;
}): Promise<Order> {
  const subtotal = params.items.reduce((s, i) => s + i.qty * i.product.price, 0);
  const id = "SD" + Date.now().toString(36).toUpperCase();
  const discount = params.discount ?? 0;
  const items = params.items.map((i) => ({
    slug: i.product.slug, name: i.product.name, image: i.product.image,
    size: i.size, qty: i.qty, price: i.product.price,
    variantId: i.variantId,
  }));

  const { data, error } = await supabase
    .from("orders")
    .insert({
      id,
      user_id: params.userId ?? null,
      user_email: params.email,
      items,
      subtotal,
      shipping: params.shipping,
      tax_rate: 0,
      tax: 0,
      discount,
      extra_lines: [],
      total: Math.max(0, subtotal - discount + params.shipping),
      status: "PLACED",
      address: params.address,
      payment_id: params.paymentId,
      payment_method: params.payment_method ?? "razorpay",
      cod_advance_paid: params.cod_advance_paid ?? false,
      cod_advance_amount: params.cod_advance_amount ?? null,
    })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? "Could not save order");
  const order = mapRow(data);

  const { error: itemsError } = await supabase.from("order_items").insert(
    params.items.map((i) => ({
      order_id: order.id,
      product_slug: i.product.slug,
      product_name: i.product.name,
      variant_id: i.variantId ?? null,
      size: i.size,
      color: null,
      qty: i.qty,
      unit_price: i.product.price,
    }))
  );
  if (itemsError) console.warn("order_items sync:", itemsError.message);

  return order;
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<void> {
  const { error } = await supabase.from("orders").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function cancelOrder(id: string): Promise<void> {
  const { error } = await supabase
    .from("orders")
    .update({ status: "CANCELLED", cancelled_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function refundOrder(id: string, amount?: number): Promise<void> {
  let refundAmount = amount;
  if (refundAmount === undefined) {
    const o = await getOrder(id);
    refundAmount = o?.total ?? 0;
  }
  const { error } = await supabase
    .from("orders")
    .update({ status: "REFUNDED", refund_amount: refundAmount, refunded_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function updateInvoice(id: string, patch: Partial<Order>): Promise<void> {
  const { error } = await supabase.from("orders").update(patchToRow(patch)).eq("id", id);
  if (error) throw new Error(error.message);
}
