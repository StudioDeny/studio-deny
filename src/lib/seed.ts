// One-shot dummy data seeder for analytics demo. Idempotent via flag key.
import type { Product } from "./products";
import type { Order, OrderStatus } from "./orders";

const FLAG = "sd_seeded_v3";

const IMG = (q: string) =>
  `https://images.unsplash.com/${q}?auto=format&fit=crop&w=900&q=70`;

const DUMMY_PRODUCTS: Product[] = [
  // Tops
  { slug: "static-runner-tee", name: "Static Runner Tee", category: "Tops", brand: "studio-deny", price: 1399, compareAt: 1799, image: IMG("photo-1521572163474-6864f9cf17ab"), hoverImage: IMG("photo-1583743814966-8936f5b7be1a"), badge: "NEW DROP", sizes: ["S","M","L","XL"], colors: [{ name: "Bone", hex: "#f0e9dc" }, { name: "Black", hex: "#0a0a0a" }], description: "Boxy fit oversized tee with high-density screen print.", material: "240 GSM combed cotton.", stock: 24 },
  { slug: "void-pocket-tee", name: "Void Pocket Tee", category: "Tops", brand: "studio-deny", price: 1199, image: IMG("photo-1576566588028-4147f3842f27"), hoverImage: IMG("photo-1503341504253-dff4815485f1"), sizes: ["S","M","L","XL","XXL"], colors: [{ name: "Onyx", hex: "#0a0a0a" }], description: "Minimal pocket tee with reinforced collar.", material: "220 GSM premium cotton.", stock: 32 },
  { slug: "after-dark-crew", name: "After Dark Crewneck", category: "Tops", brand: "studio-deny", price: 2299, compareAt: 2799, image: IMG("photo-1556905055-8f358a7a47b2"), hoverImage: IMG("photo-1620799140408-edc6dcb6d633"), badge: "SALE", sizes: ["S","M","L","XL"], colors: [{ name: "Slate", hex: "#3a3a3a" }], description: "Brushed-fleece crewneck with rib trims.", material: "380 GSM loopback cotton.", stock: 14 },
  // Bottoms
  { slug: "iron-cargo-short", name: "Iron Cargo Short", category: "Bottoms", brand: "studio-deny", price: 1899, image: IMG("photo-1591195853828-11db59a44f6b"), hoverImage: IMG("photo-1473966968600-fa801b869a1a"), sizes: ["S","M","L","XL"], colors: [{ name: "Olive", hex: "#3d4029" }], description: "Knee-length cargo with bungee cord.", material: "Ripstop cotton blend.", stock: 16 },
  { slug: "raw-selvedge-jean", name: "Raw Selvedge Jean", category: "Bottoms", brand: "studio-deny", price: 3899, image: IMG("photo-1542272604-787c3835535d"), hoverImage: IMG("photo-1602293589930-45aad59ba3ab"), badge: "NEW DROP", sizes: ["28","30","32","34","36"], colors: [{ name: "Indigo", hex: "#1d2b4a" }], description: "14oz raw selvedge denim, slim straight.", material: "100% cotton, Japanese mill.", stock: 10 },
  { slug: "techwear-jogger", name: "Techwear Jogger", category: "Bottoms", brand: "studio-deny", price: 2499, image: IMG("photo-1517445312882-bc9910d016b7"), hoverImage: IMG("photo-1542272604-787c3835535d"), sizes: ["S","M","L","XL"], colors: [{ name: "Carbon", hex: "#1a1a1a" }], description: "Articulated knee, zip-pocket jogger.", material: "Stretch nylon-poly.", stock: 20 },
  // Outerwear
  { slug: "noir-puffer", name: "Noir Puffer", category: "Outerwear", brand: "studio-deny", price: 6499, compareAt: 7999, image: IMG("photo-1544022613-e87ca75a784a"), hoverImage: IMG("photo-1591047139829-d91aecb6caea"), badge: "LAST PIECE", sizes: ["M","L","XL"], colors: [{ name: "Obsidian", hex: "#0a0a0a" }], description: "Down-fill puffer with matte ripstop shell.", material: "Recycled poly, 700 fill down.", stock: 3 },
  { slug: "city-trench", name: "City Trench Coat", category: "Outerwear", brand: "studio-deny", price: 5999, image: IMG("photo-1539109136881-3be0616acf4b"), hoverImage: IMG("photo-1591047139829-d91aecb6caea"), sizes: ["S","M","L","XL"], colors: [{ name: "Asphalt", hex: "#2c2c2c" }], description: "Drop-shoulder trench with belt and storm flap.", material: "Cotton-poly twill.", stock: 8 },
  { slug: "deny-windbreaker", name: "Deny Windbreaker", category: "Outerwear", brand: "studio-deny", price: 3499, image: IMG("photo-1551537482-f2075a1d41f2"), hoverImage: IMG("photo-1614786269829-d24616faf56d"), badge: "NEW DROP", sizes: ["S","M","L","XL"], colors: [{ name: "Acid", hex: "#C8FF00" }], description: "Lightweight packable shell.", material: "Coated nylon.", stock: 18 },
  // Accessories
  { slug: "side-shoulder-bag", name: "Side Shoulder Bag", category: "Accessories", brand: "studio-deny", price: 1599, image: IMG("photo-1547949003-9792a18a2601"), hoverImage: IMG("photo-1564422170194-896b89110ef8"), sizes: ["One Size"], colors: [{ name: "Black", hex: "#0a0a0a" }], description: "Compact crossbody with magnetic flap.", material: "Recycled nylon.", stock: 28 },
  { slug: "static-beanie", name: "Static Beanie", category: "Accessories", brand: "studio-deny", price: 699, image: IMG("photo-1578587018452-892bacefd3f2"), hoverImage: IMG("photo-1576871337632-b9aef4c17ab9"), sizes: ["One Size"], colors: [{ name: "Charcoal", hex: "#2a2a2a" }, { name: "Cream", hex: "#f5efe6" }], description: "Ribbed knit beanie with woven tab.", material: "Wool-acrylic blend.", stock: 40 },
  { slug: "field-belt", name: "Field Web Belt", category: "Accessories", brand: "studio-deny", price: 899, image: IMG("photo-1624222247344-550fb60583dc"), hoverImage: IMG("photo-1553062407-98eeb64c6a62"), sizes: ["One Size"], colors: [{ name: "Black", hex: "#0a0a0a" }], description: "Webbing belt with metal G-clip.", material: "Heavy nylon webbing.", stock: 35 },
];

const NAMES = ["Aarav","Diya","Kabir","Mira","Ishaan","Riya","Vihaan","Anika","Arjun","Zara","Reyansh","Aanya","Kian","Saanvi","Aditya","Avani","Dev","Ira","Krish","Tara"];
const CITIES: [string, string, string][] = [
  ["Mumbai", "Maharashtra", "400001"],
  ["Bengaluru", "Karnataka", "560001"],
  ["Delhi", "Delhi", "110001"],
  ["Pune", "Maharashtra", "411001"],
  ["Hyderabad", "Telangana", "500001"],
  ["Chennai", "Tamil Nadu", "600001"],
  ["Kolkata", "West Bengal", "700001"],
  ["Jaipur", "Rajasthan", "302001"],
];
const STATUSES: OrderStatus[] = ["DELIVERED","DELIVERED","DELIVERED","SHIPPED","PACKED","PLACED","CANCELLED","REFUNDED"];

function rand<T>(arr: T[]) { return arr[Math.floor(Math.random() * arr.length)]; }

function buildOrders(allProducts: Product[]): Order[] {
  const orders: Order[] = [];
  const now = Date.now();
  const DAY = 86400000;
  for (let i = 0; i < 42; i++) {
    const daysAgo = Math.floor(Math.random() * 60);
    const created = now - daysAgo * DAY - Math.floor(Math.random() * DAY);
    const itemCount = 1 + Math.floor(Math.random() * 3);
    const items = Array.from({ length: itemCount }, () => {
      const p = rand(allProducts);
      return { slug: p.slug, name: p.name, image: p.image, size: rand(p.sizes), qty: 1 + Math.floor(Math.random() * 2), price: p.price };
    });
    const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);
    const shipping = subtotal > 2499 ? 0 : 99;
    const taxRate = 5;
    const tax = Math.round((subtotal * taxRate) / 100);
    const total = subtotal + shipping + tax;
    const name = rand(NAMES);
    const [city, state, pin] = rand(CITIES);
    const id = "SD" + (created.toString(36).toUpperCase()) + i;
    const status = rand(STATUSES);
    orders.push({
      id, invoiceNo: "INV-" + id, userEmail: `${name.toLowerCase()}${i}@example.com`,
      items, subtotal, shipping, taxRate, tax, discount: 0, extraLines: [], total,
      status,
      address: { name, phone: "+91 98" + Math.floor(10000000 + Math.random() * 89999999), line1: `${Math.floor(Math.random() * 200) + 1} Studio Lane`, city, state, pincode: pin },
      paymentId: "pay_" + Math.random().toString(36).slice(2, 14),
      createdAt: created,
      ...(status === "REFUNDED" ? { refundAmount: total, refundedAt: created + DAY } : {}),
      ...(status === "CANCELLED" ? { cancelledAt: created + 3600_000 } : {}),
    });
  }
  return orders.sort((a, b) => b.createdAt - a.createdAt);
}

export function seedIfEmpty() {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(FLAG)) return;
  try {
    // Add dummy products as custom products. On version bump, refresh images for existing seed products.
    const existingCustom: Product[] = JSON.parse(localStorage.getItem("sd_products_custom") || "[]");
    const seedSlugs = new Set(DUMMY_PRODUCTS.map((p) => p.slug));
    const migrated = existingCustom.map((p: Product) => {
      if (!seedSlugs.has(p.slug)) return p;
      const seed = DUMMY_PRODUCTS.find((d) => d.slug === p.slug)!;
      return { ...p, image: seed.image, hoverImage: seed.hoverImage };
    });
    const existingSlugs = new Set(migrated.map((p: Product) => p.slug));
    const merged = [...migrated, ...DUMMY_PRODUCTS.filter((p) => !existingSlugs.has(p.slug))];
    localStorage.setItem("sd_products_custom", JSON.stringify(merged));

    // Seed orders only if none exist.
    const existingOrders = JSON.parse(localStorage.getItem("sd_orders") || "[]");
    if (existingOrders.length === 0) {
      // Need to pull all products inc base — but to avoid circular import we just use dummy list.
      const orders = buildOrders(DUMMY_PRODUCTS);
      localStorage.setItem("sd_orders", JSON.stringify(orders));
    }

    localStorage.setItem(FLAG, "1");
  } catch (e) {
    console.warn("seed failed", e);
  }
}
